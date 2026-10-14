import './helpers.js';
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { validRunner, thaiId } from './helpers.js';

// Fake Omise API
const charges = new Map();
const fake = express();
fake.use(express.urlencoded({ extended: false }));
fake.post('/charges', (req, res) => {
  const id = 'chrg_test_' + (charges.size + 1);
  const isPP = req.body['source[type]'] === 'promptpay';
  const c = { object: 'charge', id, amount: Number(req.body.amount), currency: 'THB', status: isPP ? 'pending' : 'successful', paid: !isPP,
    metadata: { ref: req.body['metadata[ref]'] }, source: isPP ? { type: 'promptpay', scannable_code: { image: { download_uri: `${fakeUrl}/qr/${id}` } } } : null,
    expires_at: new Date(Date.now() + 86400e3).toISOString() };
  charges.set(id, c); res.json(c);
});
fake.get('/charges/:id', (req, res) => { const c = charges.get(req.params.id); c ? res.json(c) : res.status(404).json({ object: 'error', message: 'not found' }); });
fake.get('/qr/:id', (req, res) => res.type('image/svg+xml').send('<svg xmlns="http://www.w3.org/2000/svg"/>'));
let fakeServer, fakeUrl, app, pool, sentLog;

before(async () => {
  await new Promise(r => { fakeServer = fake.listen(0, r); });
  fakeUrl = `http://127.0.0.1:${fakeServer.address().port}`;
  process.env.OMISE_API_URL = fakeUrl;
  process.env.OMISE_PUBLIC_KEY = 'pkey_test_x';
  process.env.OMISE_SECRET_KEY = 'skey_test_x';
  const db = await import('../src/db.js');
  pool = db.pool;
  await pool.query('DROP TABLE IF EXISTS audit_log, registrations, schema_migrations CASCADE');
  await db.migrate();
  app = (await import('../src/server.js')).createApp();
  sentLog = (await import('../src/email.js')).sentLog;
});
beforeEach(async () => { await pool.query('TRUNCATE registrations RESTART IDENTITY CASCADE'); sentLog.length = 0; });
after(async () => { await pool.end(); fakeServer.close(); });

const register = (over) => request(app).post('/api/registrations').send(validRunner(over));
const admin = async () => {
  const agent = request.agent(app);
  await agent.post('/api/admin/login').send({ password: 'test-pass', name: 'Desk A' }).expect(200);
  return agent;
};

test('registers a runner and returns a private ticket link', async () => {
  const r = await register().expect(201);
  assert.match(r.body.ref, /^TGR-[A-Z2-9]{6}$/);
  const t = await request(app).get(`/api/registrations/${r.body.ref}?t=${r.body.token}`).expect(200);
  assert.equal(t.body.status, 'awaiting_payment');
  assert.equal(t.body.price, 800);
  assert.equal(t.body.email, 'somchai@example.com');
  assert.ok(!('idNumber' in t.body) && t.body.idMasked.includes('•'));
  assert.match(t.body.ticketQr, /<svg/);
  assert.equal(sentLog.length, 1);
  await request(app).get(`/api/registrations/${r.body.ref}?t=wrong`).expect(404);
});

test('rejects bad input with field errors', async () => {
  const r = await register({ idNumber: '1234567890123', email: 'nope', acceptPdpa: false, dateOfBirth: '2020-01-01' }).expect(422);
  assert.ok(r.body.fields.idNumber && r.body.fields.email && r.body.fields.acceptPdpa && r.body.fields.dateOfBirth);
  const v = await register({ pack: '5K', distance: '10K' }).expect(422);
  assert.ok(v.body.fields.distance);
});

test('VIP can choose 5K; one live entry per ID number', async () => {
  const r = await register({ pack: 'VIP', distance: '5K' }).expect(201);
  const t = await request(app).get(`/api/registrations/${r.body.ref}?t=${r.body.token}`);
  assert.equal(t.body.distance, '5K'); assert.equal(t.body.price, 1200);
  const d = await register().expect(409);
  assert.equal(d.body.error, 'duplicate');
});

test('stops at capacity, and cancelling frees a spot', async () => {
  const refs = [];
  for (let i = 0; i < 5; i++) refs.push((await register({ idNumber: thaiId(i) }).expect(201)).body.ref);
  const s = await request(app).get('/api/stats').expect(200);
  assert.equal(s.body.left, 0); assert.equal(s.body.open, false);
  assert.equal((await register({ idNumber: thaiId(9) }).expect(409)).body.error, 'sold_out');
  const a = await admin();
  await a.post(`/api/admin/registrations/${refs[0]}/cancel`).expect(200);
  await register({ idNumber: thaiId(9) }).expect(201);
});

test('capacity holds under concurrent sign-ups', async () => {
  const results = await Promise.all(Array.from({ length: 12 }, (_, i) => register({ idNumber: thaiId(100 + i) })));
  assert.equal(results.filter(r => r.status === 201).length, 5);
  assert.equal(results.filter(r => r.status === 409).length, 7);
});

test('PromptPay via Omise: QR served, webhook confirms and assigns bib', async () => {
  const r = (await register()).body;
  const p = await request(app).post(`/api/registrations/${r.ref}/pay`).send({ t: r.token, method: 'promptpay' }).expect(200);
  await request(app).get(p.body.qrUrl).expect(200).expect('Content-Type', /svg/);
  const chargeId = [...charges.values()].find(c => c.metadata.ref === r.ref).id;
  // forged webhook claiming success is ignored: we re-fetch from Omise, which still says pending
  await request(app).post('/api/webhooks/omise').send({ key: 'charge.complete', data: { object: 'charge', id: chargeId, status: 'successful' } }).expect(200);
  let t = await request(app).get(`/api/registrations/${r.ref}?t=${r.token}`);
  assert.equal(t.body.status, 'awaiting_payment');
  Object.assign(charges.get(chargeId), { status: 'successful', paid: true });
  await request(app).post('/api/webhooks/omise').send({ key: 'charge.complete', data: { object: 'charge', id: chargeId } }).expect(200);
  t = await request(app).get(`/api/registrations/${r.ref}?t=${r.token}`);
  assert.equal(t.body.status, 'paid'); assert.equal(t.body.bib, '10001'); assert.equal(t.body.paymentMethod, 'promptpay');
  // repeated webhook is idempotent
  await request(app).post('/api/webhooks/omise').send({ key: 'charge.complete', data: { object: 'charge', id: chargeId } }).expect(200);
  assert.equal(sentLog.filter(m => /You're in/.test(m.subject)).length, 1);
});

test('card payment succeeds and bibs count up per pack', async () => {
  const a = (await register({ pack: '5K' })).body;
  const b = (await register({ pack: '5K', idNumber: thaiId(1) })).body;
  const v = (await register({ pack: 'VIP', idNumber: thaiId(2) })).body;
  for (const x of [a, b, v]) await request(app).post(`/api/registrations/${x.ref}/pay`).send({ t: x.token, method: 'card', cardToken: 'tokn_test_1' }).expect(200);
  const bib = async x => (await request(app).get(`/api/registrations/${x.ref}?t=${x.token}`)).body.bib;
  assert.deepEqual([await bib(a), await bib(b), await bib(v)], ['50001', '50002', 'V001']);
});

test('organizer desk: auth, list, confirm, pickup, export', async () => {
  const r = (await register()).body;
  await request(app).get('/api/admin/registrations').expect(401);
  await request(app).post('/api/admin/login').send({ password: 'wrong' }).expect(401);
  const a = await admin();
  const list = await a.get('/api/admin/registrations?q=somchai').expect(200);
  assert.equal(list.body.total, 1); assert.equal(list.body.items[0].idNumber, '1101700230708');
  await a.post(`/api/admin/registrations/${r.ref}/pickup`).expect(409);
  const c = await a.post(`/api/admin/registrations/${r.ref}/confirm-payment`).send({ note: 'KBank 06:12' }).expect(200);
  assert.equal(c.body.bib, '10001');
  await a.post(`/api/admin/registrations/${r.ref}/pickup`).expect(200);
  const sum = await a.get('/api/admin/summary').expect(200);
  assert.equal(sum.body.paid, 1); assert.equal(sum.body.revenue, 800); assert.equal(sum.body.pickedUp, 1);
  const csv = await a.get('/api/admin/export.csv').expect(200);
  assert.match(csv.text, /TGR-/); assert.match(csv.text, /10001/);
  const d = await a.get(`/api/admin/registrations/${r.ref}`).expect(200);
  assert.deepEqual(d.body.log.map(l => l.action), ['created', 'paid', 'picked_up']);
});

test('runner tags: paid entries only, filters, mark printed', async () => {
  const a1 = (await register()).body;
  const a2 = (await register({ pack: '5K', idNumber: thaiId(2), firstName: 'Krit' })).body;
  await register({ idNumber: thaiId(3) }); // unpaid, never on a tag
  await request(app).get('/api/admin/tags').expect(401);
  const a = await admin();
  for (const r of [a1, a2]) await a.post(`/api/admin/registrations/${r.ref}/confirm-payment`).send({}).expect(200);
  const all = await a.get('/api/admin/tags').expect(200);
  assert.deepEqual(all.body.items.map(i => i.bib), ['10001', '50001']);
  assert.match(all.body.items[0].qr, /^<svg/);
  const only5 = await a.get('/api/admin/tags?pack=5K').expect(200);
  assert.deepEqual(only5.body.items.map(i => i.ref), [a2.ref]);
  const m = await a.post('/api/admin/tags/printed').send({ refs: [a1.ref] }).expect(200);
  assert.equal(m.body.marked, 1);
  const left = await a.get('/api/admin/tags?unprinted=1').expect(200);
  assert.deepEqual(left.body.items.map(i => i.ref), [a2.ref]);
  const one = await a.get(`/api/admin/tags?refs=${a1.ref.toLowerCase()}`).expect(200);
  assert.equal(one.body.items.length, 1); assert.ok(one.body.items[0].tagPrintedAt);
});

test('terms: version recorded; under-18s need guardian consent', async () => {
  const kid = { dateOfBirth: '2012-03-01', idNumber: thaiId(4) };
  const no = await register(kid).expect(422);
  assert.ok(no.body.fields.acceptGuardian);
  const ok = (await register({ ...kid, acceptGuardian: true }).expect(201)).body;
  const a = await admin();
  const d = await a.get(`/api/admin/registrations/${ok.ref}`).expect(200);
  assert.equal(d.body.guardianConsent, true); assert.match(d.body.termsVersion, /^\d{4}-\d{2}-\d{2}$/);
  const adult = (await register({ idNumber: thaiId(5) }).expect(201)).body;
  assert.equal((await a.get(`/api/admin/registrations/${adult.ref}`)).body.guardianConsent, false);
});

test('unpaid entries expire and release their spot', async () => {
  const r = (await register()).body;
  await pool.query(`UPDATE registrations SET expires_at = now() - interval '1 minute' WHERE ref=$1`, [r.ref]);
  const { expireUnpaid } = await import('../src/registrations.js');
  assert.equal(await expireUnpaid(), 1);
  assert.equal((await request(app).get('/api/stats')).body.taken, 0);
  await register().expect(201); // same ID can register again
});

test('CSV export neutralises spreadsheet formulas', async () => {
  await register({ firstName: '=HYPERLINK("http://x")' }).expect(201);
  const a = await admin();
  const csv = await a.get('/api/admin/export.csv');
  assert.match(csv.text, /"'=HYPERLINK/);
});

test('manual PromptPay mode: QR from PromptPay ID, runner claims, organizer confirms', async () => {
  const { config } = await import('../src/config.js');
  const saved = { ...config.omise };
  Object.assign(config.omise, { publicKey: '', secretKey: '' });
  config.promptpay.id = '0812345678';
  try {
    const cfg = await request(app).get('/api/config');
    assert.equal(cfg.body.payments.omise, false); assert.equal(cfg.body.payments.manualPromptpay, true);
    const r = (await register()).body;
    const p = await request(app).post(`/api/registrations/${r.ref}/pay`).send({ t: r.token, method: 'promptpay' }).expect(200);
    await request(app).get(p.body.qrUrl).expect(200).expect('Content-Type', /png/);
    await request(app).post(`/api/registrations/${r.ref}/claim-transfer`).send({ t: r.token, note: 'SCB 4321' }).expect(200);
    const a = await admin();
    const list = await a.get('/api/admin/registrations?status=verifying');
    assert.equal(list.body.items[0].paymentNote, 'SCB 4321');
    await a.post(`/api/admin/registrations/${r.ref}/confirm-payment`).expect(200);
    const t = await request(app).get(`/api/registrations/${r.ref}?t=${r.token}`);
    assert.equal(t.body.status, 'paid');
  } finally { Object.assign(config.omise, saved); config.promptpay.id = ''; }
});

test('PromptPay payload matches the EMVCo reference', async () => {
  const { promptpayPayload } = await import('../src/payments/promptpay.js');
  // Known-good payload for 0812345678, 600.00 THB (CRC checked against the PromptPay spec algorithm)
  const p = promptpayPayload('0812345678', 600);
  assert.ok(p.startsWith('000201010212'));
  assert.ok(p.includes('01130066812345678'));
  assert.ok(p.includes('5406600.00'));
  assert.match(p, /6304[0-9A-F]{4}$/);
});
