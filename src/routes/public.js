import express from 'express';
import rateLimit from 'express-rate-limit';
import QRCode from 'qrcode';
import { config, omiseEnabled, manualPromptpayEnabled } from '../config.js';
import { validateRegistration } from '../validation.js';
import {
  AppError, createRegistration, getByRef, tokenMatches, publicView, stats, claimTransfer, setChargeId, registrationOpen
} from '../registrations.js';
import { query } from '../db.js';
import * as omise from '../payments/omise.js';
import { syncCharge } from '../payments/sync.js';
import { promptpayPayload } from '../payments/promptpay.js';
import { sendRegisteredEmail, sendTicketLinkEmail } from '../email.js';

export const router = express.Router();
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const limit = (max, minutes) => rateLimit({ windowMs: minutes * 60e3, limit: max, standardHeaders: 'draft-7', legacyHeaders: false, skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'rate_limited', message: 'Too many attempts. Wait a few minutes and try again.' } });

router.get('/config', (req, res) => {
  res.json({
    event: config.event,
    packs: Object.fromEntries(Object.entries(config.packs).map(([k, p]) => [k, { price: p.price, distances: p.distances }])),
    shirtSizes: config.shirtSizes,
    holdHours: config.holdHours,
    payments: {
      omise: omiseEnabled(), omisePublicKey: omiseEnabled() ? config.omise.publicKey : null,
      manualPromptpay: manualPromptpayEnabled(), promptpayName: manualPromptpayEnabled() ? config.promptpay.name : null
    }
  });
});

router.get('/stats', wrap(async (req, res) => {
  const s = await stats();
  res.set('Cache-Control', 'public, max-age=15');
  res.json({ capacity: s.capacity, taken: s.taken, left: s.left, byPack: s.byPack, open: registrationOpen() && s.left > 0 });
}));

router.post('/registrations', limit(20, 15), wrap(async (req, res) => {
  const v = validateRegistration(req.body || {});
  if (v.fields) return res.status(422).json({ error: 'invalid', message: 'Check the highlighted fields.', fields: v.fields });
  const reg = await createRegistration(v.data);
  sendRegisteredEmail(reg).catch(e => console.error('mail failed', e.message));
  res.status(201).json({ ref: reg.ref, token: reg.access_token, ticketUrl: `/ticket?ref=${reg.ref}&t=${reg.access_token}` });
}));

async function loadAuthorized(req) {
  const reg = await getByRef(req.params.ref);
  const token = req.query.t || req.body?.t;
  if (!reg || !tokenMatches(reg, token)) throw new AppError(404, 'not_found', 'We could not find that entry. Check the link in your email.');
  return reg;
}

router.get('/registrations/:ref', limit(240, 5), wrap(async (req, res) => {
  let reg = await loadAuthorized(req);
  if (reg.status === 'awaiting_payment' && reg.omise_charge_id && omiseEnabled()) {
    await syncCharge(reg.omise_charge_id).catch(e => console.error('sync failed', e.message));
    reg = await getByRef(reg.ref);
  }
  const ticketQr = await QRCode.toString(`TGR26:${reg.ref}`, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
  res.json({ ...publicView(reg), ticketQr });
}));

router.post('/registrations/:ref/pay', limit(30, 15), wrap(async (req, res) => {
  const reg = await loadAuthorized(req);
  if (reg.status !== 'awaiting_payment') throw new AppError(409, 'not_payable', 'This entry does not need payment right now.');
  const method = req.body?.method;
  if (!omiseEnabled()) {
    if (method === 'promptpay' && manualPromptpayEnabled()) return res.json({ method: 'promptpay_manual', qrUrl: `/api/registrations/${reg.ref}/promptpay-qr?t=${reg.access_token}` });
    throw new AppError(503, 'payments_off', 'Online payment is not set up yet.');
  }
  if (method === 'promptpay') {
    if (reg.omise_charge_id && reg.payment_method === 'promptpay') {
      const existing = await omise.retrieveCharge(reg.omise_charge_id);
      if (existing.status === 'pending' && (!existing.expires_at || new Date(existing.expires_at) > new Date())) {
        return res.json({ method: 'promptpay', qrUrl: `/api/registrations/${reg.ref}/promptpay-qr?t=${reg.access_token}`, expiresAt: existing.expires_at });
      }
    }
    const charge = await omise.createPromptpayCharge(reg);
    await setChargeId(reg.ref, charge.id, 'promptpay');
    return res.json({ method: 'promptpay', qrUrl: `/api/registrations/${reg.ref}/promptpay-qr?t=${reg.access_token}`, expiresAt: charge.expires_at });
  }
  if (method === 'card') {
    const token = req.body?.cardToken;
    if (typeof token !== 'string' || !token.startsWith('tokn_')) throw new AppError(422, 'invalid', 'Card details are missing.');
    const charge = await omise.createCardCharge(reg, token);
    await setChargeId(reg.ref, charge.id, 'card');
    if (charge.status === 'successful') await syncCharge(charge.id);
    if (charge.status === 'failed') throw new AppError(402, 'card_declined', charge.failure_message || 'The card was declined.');
    return res.json({ method: 'card', status: charge.status, authorizeUri: charge.authorize_uri || null });
  }
  throw new AppError(422, 'invalid', 'Choose a payment method.');
}));

router.get('/registrations/:ref/promptpay-qr', limit(120, 5), wrap(async (req, res) => {
  const reg = await loadAuthorized(req);
  res.set('Cache-Control', 'private, max-age=300');
  if (omiseEnabled() && reg.omise_charge_id) {
    const img = await omise.fetchQrImage(await omise.retrieveCharge(reg.omise_charge_id));
    if (!img) throw new AppError(404, 'no_qr', 'QR code not available. Start the payment again.');
    return res.type(img.type).send(img.body);
  }
  if (!manualPromptpayEnabled()) throw new AppError(404, 'no_qr', 'PromptPay is not set up.');
  const png = await QRCode.toBuffer(promptpayPayload(config.promptpay.id, reg.price_thb), { width: 420, margin: 2 });
  res.type('png').send(png);
}));

router.post('/registrations/:ref/claim-transfer', limit(20, 15), wrap(async (req, res) => {
  const reg = await loadAuthorized(req);
  if (!manualPromptpayEnabled()) throw new AppError(409, 'not_manual', 'Payments are confirmed automatically.');
  const updated = await claimTransfer(reg.ref, String(req.body?.note || ''));
  if (!updated) throw new AppError(409, 'not_payable', 'This entry does not need payment right now.');
  res.json({ status: updated.status });
}));

router.post('/resend-link', limit(5, 15), wrap(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (email.includes('@')) {
    const { rows } = await query(`SELECT * FROM registrations WHERE lower(email)=$1 AND status IN ('awaiting_payment','verifying','paid') LIMIT 10`, [email]);
    for (const r of rows) sendTicketLinkEmail(r).catch(e => console.error('mail failed', e.message));
  }
  res.json({ ok: true }); // same answer either way, so emails can't be probed
}));

router.post('/webhooks/omise', express.json({ limit: '200kb' }), wrap(async (req, res) => {
  const { key, data } = req.body || {};
  if (omiseEnabled() && typeof key === 'string' && key.startsWith('charge.') && data?.object === 'charge' && typeof data.id === 'string') {
    await syncCharge(data.id);
  }
  res.json({ ok: true });
}));
