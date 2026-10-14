import crypto from 'node:crypto';
import { config } from './config.js';

const COOKIE = 'tgr_admin';
const sign = v => crypto.createHmac('sha256', config.admin.sessionSecret).update(v).digest('base64url');
const safeEq = (a, b) => {
  const x = crypto.createHash('sha256').update(a).digest(), y = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(x, y);
};

export const adminConfigured = () => Boolean(config.admin.password && config.admin.sessionSecret);

export function checkPassword(pw) {
  return adminConfigured() && typeof pw === 'string' && safeEq(pw, config.admin.password);
}

export function issueSession(res, name) {
  const exp = Date.now() + config.admin.sessionHours * 3600e3;
  const payload = Buffer.from(JSON.stringify({ n: String(name || 'staff').slice(0, 40), exp })).toString('base64url');
  res.cookie(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true, sameSite: 'strict', secure: config.baseUrl.startsWith('https'), maxAge: exp - Date.now(), path: '/'
  });
}

export function clearSession(res) { res.clearCookie(COOKIE, { path: '/' }); }

export function readSession(req) {
  if (!adminConfigured()) return null;
  const raw = req.cookies?.[COOKIE];
  if (!raw || !raw.includes('.')) return null;
  const [payload, sig] = raw.split('.');
  if (!safeEq(sig, sign(payload))) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return s.exp > Date.now() ? s : null;
  } catch { return null; }
}

export function requireAdmin(req, res, next) {
  const s = readSession(req);
  if (!s) return res.status(401).json({ error: 'unauthorized', message: 'Sign in as organizer.' });
  req.admin = s;
  next();
}
