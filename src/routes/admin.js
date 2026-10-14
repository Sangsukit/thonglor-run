import express from 'express';
import QRCode from 'qrcode';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import { query } from '../db.js';
import { checkPassword, issueSession, clearSession, requireAdmin, readSession, adminConfigured } from '../auth.js';
import { AppError, stats, getByRef, markPaid, setStatus, markPickedUp } from '../registrations.js';
import { sendPaidEmail, sendTicketLinkEmail } from '../email.js';

export const router = express.Router();
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.post('/login', rateLimit({ windowMs: 15 * 60e3, limit: 10, skip: () => process.env.NODE_ENV === 'test', message: { error: 'rate_limited', message: 'Too many attempts. Try again in 15 minutes.' } }), (req, res) => {
  if (!adminConfigured()) return res.status(503).json({ error: 'not_configured', message: 'Set ADMIN_PASSWORD and SESSION_SECRET on the server.' });
  if (!checkPassword(req.body?.password)) return res.status(401).json({ error: 'bad_password', message: 'Wrong password.' });
  issueSession(res, req.body?.name);
  res.json({ ok: true });
});
router.post('/logout', (req, res) => { clearSession(res); res.json({ ok: true }); });
router.get('/me', (req, res) => { const s = readSession(req); res.json({ signedIn: !!s, name: s?.n || null }); });

router.use(requireAdmin);
const actor = req => `staff:${req.admin.n}`;

const row = r => ({
  ref: r.ref, pack: r.pack, distance: r.distance, price: r.price_thb, status: r.status, bib: r.bib,
  firstName: r.first_name, lastName: r.last_name, bibName: r.bib_name, gender: r.gender, dateOfBirth: r.date_of_birth,
  nationality: r.nationality, idNumber: r.id_number, phone: r.phone, email: r.email,
  emergencyName: r.emergency_name, emergencyPhone: r.emergency_phone, medical: r.medical, shirtSize: r.shirt_size,
  paymentMethod: r.payment_method, paymentNote: r.payment_note, paidAt: r.paid_at, pickedUpAt: r.picked_up_at, tagPrintedAt: r.tag_printed_at,
  consentAt: r.consent_at, termsVersion: r.terms_version, guardianConsent: r.guardian_consent,
  expiresAt: r.expires_at, createdAt: r.created_at
});

router.get('/summary', wrap(async (req, res) => {
  const s = await stats();
  const { rows: shirts } = await query(`SELECT pack, shirt_size, count(*)::int AS n FROM registrations
    WHERE status IN ('awaiting_payment','verifying','paid') GROUP BY pack, shirt_size`);
  const { rows: [p] } = await query(`SELECT count(*) FILTER (WHERE picked_up_at IS NOT NULL)::int AS picked FROM registrations WHERE status='paid'`);
  const by = (status) => s.rows.filter(r => r.status === status);
  const sum = (rows, f) => rows.reduce((a, r) => a + r[f], 0);
  const packs = Object.keys(config.packs).map(k => ({
    pack: k,
    entries: s.byPack[k],
    paid: sum(by('paid').filter(r => r.pack === k), 'n'),
    revenue: sum(by('paid').filter(r => r.pack === k), 'thb')
  }));
  res.json({
    capacity: s.capacity, taken: s.taken, left: s.left,
    paid: sum(by('paid'), 'n'), verifying: sum(by('verifying'), 'n'), awaiting: sum(by('awaiting_payment'), 'n'),
    revenue: sum(by('paid'), 'thb'), unconfirmed: sum(by('awaiting_payment'), 'thb') + sum(by('verifying'), 'thb'),
    pickedUp: p.picked, packs, shirts, sizes: config.shirtSizes
  });
}));

router.get('/registrations', wrap(async (req, res) => {
  const where = [], params = [];
  const add = (sql, v) => { params.push(v); where.push(sql.replace('?', '$' + params.length)); };
  if (req.query.status) add('status = ?', String(req.query.status));
  if (req.query.pack) add('pack = ?', String(req.query.pack));
  if (req.query.q) {
    const q = '%' + String(req.query.q).trim().replace(/[%_\\]/g, m => '\\' + m) + '%';
    add(`(ref ILIKE ? OR first_name ILIKE $X OR last_name ILIKE $X OR (first_name || ' ' || last_name) ILIKE $X OR phone ILIKE $X OR email ILIKE $X OR coalesce(bib,'') ILIKE $X OR id_number ILIKE $X)`, q);
    where[where.length - 1] = where[where.length - 1].replaceAll('$X', '$' + params.length);
  }
  const page = Math.max(1, parseInt(req.query.page, 10) || 1), size = 50;
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const { rows: [{ total }] } = await query(`SELECT count(*)::int AS total FROM registrations ${w}`, params);
  const { rows } = await query(`SELECT * FROM registrations ${w} ORDER BY created_at DESC LIMIT ${size} OFFSET ${(page - 1) * size}`, params);
  res.json({ total, page, pageSize: size, items: rows.map(row) });
}));

router.get('/registrations/:ref', wrap(async (req, res) => {
  const reg = await getByRef(req.params.ref);
  if (!reg) throw new AppError(404, 'not_found', 'Entry not found.');
  const { rows: log } = await query('SELECT action, actor, detail, created_at FROM audit_log WHERE registration_id=$1 ORDER BY created_at', [reg.id]);
  res.json({ ...row(reg), log });
}));

router.post('/registrations/:ref/confirm-payment', wrap(async (req, res) => {
  const { reg, changed } = await markPaid(req.params.ref.toUpperCase(), { method: 'promptpay_manual', actor: actor(req), note: req.body?.note });
  if (changed) sendPaidEmail(reg).catch(e => console.error('mail failed', e.message));
  res.json(row(reg));
}));
router.post('/registrations/:ref/cancel', wrap(async (req, res) => res.json(row(await setStatus(req.params.ref.toUpperCase(), 'cancelled', actor(req))))));
router.post('/registrations/:ref/restore', wrap(async (req, res) => res.json(row(await setStatus(req.params.ref.toUpperCase(), 'restore', actor(req))))));
router.post('/registrations/:ref/pickup', wrap(async (req, res) => res.json(row(await markPickedUp(req.params.ref.toUpperCase(), actor(req))))));
router.post('/registrations/:ref/resend', wrap(async (req, res) => {
  const reg = await getByRef(req.params.ref);
  if (!reg) throw new AppError(404, 'not_found', 'Entry not found.');
  await (reg.status === 'paid' ? sendPaidEmail(reg) : sendTicketLinkEmail(reg));
  res.json({ ok: true });
}));

// Printable gate tags: confirmed entries only, in bib order.
router.get('/tags', wrap(async (req, res) => {
  const where = ["status = 'paid'"], params = [];
  const add = (sql, v) => { params.push(v); where.push(sql.replaceAll('?', '$' + params.length)); };
  if (req.query.refs) add('ref = ANY(?)', String(req.query.refs).toUpperCase().split(',').map(x => x.trim()).filter(Boolean).slice(0, 500));
  if (req.query.pack) add('pack = ?', String(req.query.pack));
  if (req.query.unprinted === '1') where.push('tag_printed_at IS NULL');
  if (req.query.from) add('bib_no >= ?', parseInt(req.query.from, 10) || 0);
  if (req.query.to) add('bib_no <= ?', parseInt(req.query.to, 10) || 0);
  const { rows } = await query(`SELECT * FROM registrations WHERE ${where.join(' AND ')} ORDER BY pack, bib_no LIMIT 500`, params);
  const items = await Promise.all(rows.map(async r => ({
    ...row(r), tagPrintedAt: r.tag_printed_at,
  consentAt: r.consent_at, termsVersion: r.terms_version, guardianConsent: r.guardian_consent,
    qr: await QRCode.toString(`TGR26:${r.ref}`, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' })
  })));
  res.json({ items, capped: rows.length === 500 });
}));
router.post('/tags/printed', wrap(async (req, res) => {
  const refs = (Array.isArray(req.body?.refs) ? req.body.refs : []).map(x => String(x).toUpperCase()).slice(0, 500);
  const { rows } = await query(`UPDATE registrations SET tag_printed_at=now(), updated_at=now() WHERE ref = ANY($1) AND status='paid' RETURNING id`, [refs]);
  for (const r of rows) await query('INSERT INTO audit_log (registration_id, action, actor) VALUES ($1,$2,$3)', [r.id, 'tag_printed', actor(req)]);
  res.json({ marked: rows.length });
}));

router.get('/export.csv', wrap(async (req, res) => {
  const { rows } = await query('SELECT * FROM registrations ORDER BY created_at');
  const cols = ['ref', 'status', 'bib', 'pack', 'distance', 'price_thb', 'first_name', 'last_name', 'bib_name', 'gender', 'date_of_birth',
    'nationality', 'id_number', 'phone', 'email', 'emergency_name', 'emergency_phone', 'medical', 'shirt_size',
    'payment_method', 'payment_note', 'paid_at', 'picked_up_at', 'created_at'];
  const cell = v => {
    let s = v instanceof Date ? v.toISOString() : String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // stop spreadsheet formula injection
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const csv = '﻿' + [cols.join(',')].concat(rows.map(r => cols.map(c => cell(r[c])).join(','))).join('\r\n');
  res.set('Content-Disposition', `attachment; filename="thonglor-run-entries-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.type('text/csv').send(csv);
}));
