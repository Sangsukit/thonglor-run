import crypto from 'node:crypto';
import { config } from './config.js';
import { query, tx } from './db.js';

export class AppError extends Error {
  constructor(status, code, message, extra = {}) { super(message); this.status = status; this.code = code; this.extra = extra; }
}

const ACTIVE = ['awaiting_payment', 'verifying', 'paid'];
const CAPACITY_LOCK = 724260115; // advisory lock key for capacity + bib allocation
const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function newRef() {
  const bytes = crypto.randomBytes(6);
  let s = '';
  for (const b of bytes) s += REF_ALPHABET[b % REF_ALPHABET.length];
  return 'TGR-' + s;
}
const newToken = () => crypto.randomBytes(24).toString('base64url');

export function tokenMatches(reg, token) {
  if (!reg || typeof token !== 'string') return false;
  const a = Buffer.from(reg.access_token), b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function registrationOpen(now = new Date()) {
  if (config.event.closesAt && now > new Date(config.event.closesAt)) return false;
  return now < new Date(config.event.raceDate + 'T00:00:00+07:00');
}

async function audit(c, regId, action, actor, detail = {}) {
  await c.query('INSERT INTO audit_log (registration_id, action, actor, detail) VALUES ($1,$2,$3,$4)', [regId, action, actor, detail]);
}

export async function stats() {
  const { rows } = await query(
    `SELECT pack, status, count(*)::int AS n, coalesce(sum(price_thb),0)::int AS thb
       FROM registrations GROUP BY pack, status`);
  const byPack = { '5K': 0, '10K': 0, 'VIP': 0 };
  let taken = 0;
  for (const r of rows) if (ACTIVE.includes(r.status)) { byPack[r.pack] += r.n; taken += r.n; }
  return { capacity: config.event.capacity, taken, left: Math.max(0, config.event.capacity - taken), byPack, rows };
}

export async function createRegistration(input, actor = 'public') {
  if (!registrationOpen()) throw new AppError(409, 'closed', 'Registration is closed.');
  const pack = config.packs[input.pack];
  const distance = input.distance && pack.distances.includes(input.distance) ? input.distance : pack.distances[pack.distances.length - 1];
  return tx(async c => {
    await c.query('SELECT pg_advisory_xact_lock($1)', [CAPACITY_LOCK]);
    const { rows: [{ n }] } = await c.query(`SELECT count(*)::int AS n FROM registrations WHERE status = ANY($1)`, [ACTIVE]);
    if (n >= config.event.capacity) throw new AppError(409, 'sold_out', 'All spots are taken.');
    const dup = await c.query(`SELECT ref FROM registrations WHERE upper(id_number) = $1 AND status = ANY($2)`, [input.idNumber, ACTIVE]);
    if (dup.rowCount) throw new AppError(409, 'duplicate', 'This ID or passport number is already registered.');

    for (let attempt = 0; attempt < 5; attempt++) {
      const ref = newRef();
      try {
        const { rows: [reg] } = await c.query(
          `INSERT INTO registrations (ref, access_token, pack, distance, price_thb, first_name, last_name, bib_name, gender,
             date_of_birth, nationality, id_number, phone, email, emergency_name, emergency_phone, medical, shirt_size,
             expires_at, consent_at, terms_version, guardian_consent)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18, now() + make_interval(hours => $19), now(), $20, $21)
           RETURNING *`,
          [ref, newToken(), input.pack, distance, pack.price, input.firstName, input.lastName,
           (input.bibName || input.firstName).slice(0, 12).toUpperCase(), input.gender, input.dateOfBirth, input.nationality,
           input.idNumber, input.phone, input.email, input.emergencyName, input.emergencyPhone, input.medical || '',
           input.shirtSize, config.holdHours, config.termsVersion, !!input.acceptGuardian]);
        await audit(c, reg.id, 'created', actor);
        return reg;
      } catch (e) {
        if (e.code === '23505' && /ref/.test(e.constraint || '')) continue; // ref collision: retry
        throw e;
      }
    }
    throw new AppError(500, 'ref_failed', 'Could not allocate a reference.');
  });
}

export async function getByRef(ref) {
  const { rows } = await query('SELECT * FROM registrations WHERE ref = $1', [String(ref).toUpperCase()]);
  return rows[0] || null;
}

function formatBib(packKey, n) {
  const p = config.packs[packKey];
  return p.bibPrefix + (p.bibPad ? String(n).padStart(p.bibPad, '0') : String(n));
}

/** Mark an entry paid and allocate its bib. Idempotent. */
export async function markPaid(ref, { method, actor, note, chargeId } = {}) {
  return tx(async c => {
    await c.query('SELECT pg_advisory_xact_lock($1)', [CAPACITY_LOCK]);
    const { rows: [reg] } = await c.query('SELECT * FROM registrations WHERE ref = $1 FOR UPDATE', [ref]);
    if (!reg) throw new AppError(404, 'not_found', 'Entry not found.');
    if (reg.status === 'paid') return { reg, changed: false };
    if (reg.status === 'cancelled' && actor !== 'omise') throw new AppError(409, 'cancelled', 'This entry was cancelled. Restore it first.');
    const { rows: [{ next }] } = await c.query(
      'SELECT coalesce(max(bib_no), $2 - 1) + 1 AS next FROM registrations WHERE pack = $1 AND bib_no IS NOT NULL',
      [reg.pack, config.packs[reg.pack].bibStart]);
    const { rows: [updated] } = await c.query(
      `UPDATE registrations SET status='paid', bib_no=$2, bib=$3, paid_at=now(), payment_method=coalesce($4, payment_method),
         payment_note=coalesce($5, payment_note), omise_charge_id=coalesce($6, omise_charge_id), expires_at=NULL, updated_at=now()
       WHERE id=$1 RETURNING *`,
      [reg.id, next, formatBib(reg.pack, next), method || null, note || null, chargeId || null]);
    await audit(c, reg.id, 'paid', actor || 'system', { method, chargeId, previous: reg.status });
    return { reg: updated, changed: true };
  });
}

export async function claimTransfer(ref, note) {
  const { rows: [reg] } = await query(
    `UPDATE registrations SET status='verifying', payment_method='promptpay_manual', payment_note=$2, expires_at=NULL, updated_at=now()
     WHERE ref=$1 AND status='awaiting_payment' RETURNING *`, [ref, (note || '').slice(0, 80)]);
  if (reg) await query('INSERT INTO audit_log (registration_id, action, actor) VALUES ($1,$2,$3)', [reg.id, 'transfer_claimed', 'runner']);
  return reg;
}

export async function setChargeId(ref, chargeId, method) {
  await query('UPDATE registrations SET omise_charge_id=$2, payment_method=$3, updated_at=now() WHERE ref=$1', [ref, chargeId, method]);
}

export async function setStatus(ref, status, actor) {
  return tx(async c => {
    const { rows: [reg] } = await c.query('SELECT * FROM registrations WHERE ref=$1 FOR UPDATE', [ref]);
    if (!reg) throw new AppError(404, 'not_found', 'Entry not found.');
    if (status === 'cancelled') {
      await c.query(`UPDATE registrations SET status='cancelled', updated_at=now() WHERE id=$1`, [reg.id]);
    } else if (status === 'restore') {
      if (!['cancelled', 'expired'].includes(reg.status)) return reg;
      await c.query('SELECT pg_advisory_xact_lock($1)', [CAPACITY_LOCK]);
      const dup = await c.query(`SELECT 1 FROM registrations WHERE upper(id_number)=upper($1) AND status = ANY($2) AND id<>$3`, [reg.id_number, ACTIVE, reg.id]);
      if (dup.rowCount) throw new AppError(409, 'duplicate', 'Another live entry uses this ID number.');
      const next = reg.bib ? 'paid' : (reg.payment_method === 'promptpay_manual' ? 'verifying' : 'awaiting_payment');
      await c.query(`UPDATE registrations SET status=$2, expires_at = CASE WHEN $2='awaiting_payment' THEN now() + make_interval(hours => $3) ELSE NULL END, updated_at=now() WHERE id=$1`,
        [reg.id, next, config.holdHours]);
    }
    await audit(c, reg.id, status, actor);
    const { rows: [out] } = await c.query('SELECT * FROM registrations WHERE id=$1', [reg.id]);
    return out;
  });
}

export async function markPickedUp(ref, actor) {
  const { rows: [reg] } = await query(
    `UPDATE registrations SET picked_up_at=coalesce(picked_up_at, now()), updated_at=now() WHERE ref=$1 AND status='paid' RETURNING *`, [ref]);
  if (!reg) throw new AppError(409, 'not_paid', 'Only confirmed entries can collect a race pack.');
  await query('INSERT INTO audit_log (registration_id, action, actor) VALUES ($1,$2,$3)', [reg.id, 'picked_up', actor]);
  return reg;
}

/** Release spots held by entries that were never paid. */
export async function expireUnpaid() {
  const { rows } = await query(
    `UPDATE registrations SET status='expired', updated_at=now()
     WHERE status='awaiting_payment' AND expires_at < now() RETURNING id`);
  for (const r of rows) await query('INSERT INTO audit_log (registration_id, action, actor) VALUES ($1,$2,$3)', [r.id, 'expired', 'system']);
  return rows.length;
}

/** What the runner (holder of the access token) may see. */
export function publicView(reg) {
  const mask = reg.id_number.length > 4 ? reg.id_number.slice(0, 1) + '•'.repeat(reg.id_number.length - 4) + reg.id_number.slice(-3) : '••••';
  return {
    ref: reg.ref, pack: reg.pack, distance: reg.distance, price: reg.price_thb, status: reg.status,
    firstName: reg.first_name, lastName: reg.last_name, bibName: reg.bib_name, bib: reg.bib,
    shirtSize: reg.shirt_size, email: reg.email, idMasked: mask,
    paymentMethod: reg.payment_method, expiresAt: reg.expires_at, paidAt: reg.paid_at, pickedUpAt: reg.picked_up_at,
    createdAt: reg.created_at
  };
}
