import nodemailer from 'nodemailer';
import { config } from './config.js';

const transport = config.mail.smtpUrl ? nodemailer.createTransport(config.mail.smtpUrl) : null;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ticketUrl = r => `${config.baseUrl}/ticket?ref=${r.ref}&t=${r.access_token}`;
export const sentLog = []; // used by tests and the dev console when SMTP is off

async function send(to, subject, html) {
  if (!transport) { sentLog.push({ to, subject }); console.log(`[mail disabled] to=${to} subject="${subject}"`); return; }
  await transport.sendMail({ from: config.mail.from, to, subject, html });
}

const shell = body => `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111">
  <div style="background:#EE7A12;color:#fff;padding:16px 20px;font-size:20px;font-weight:bold">THONGLOR CHARITY RUN 2026</div>
  <div style="padding:20px;border:1px solid #ddd;border-top:0">${body}
  <p style="color:#666;font-size:12px;margin-top:24px">Sunday 15 November 2026 · Start 06:00 · Benjasiri Park, Sukhumvit<br>
  วันอาทิตย์ที่ 15 พฤศจิกายน 2569 · ปล่อยตัว 06:00 น.</p></div></div>`;

export function sendRegisteredEmail(r) {
  return send(r.email, `Your entry ${r.ref}: complete your payment`, shell(`
    <p>Hi ${esc(r.first_name)},</p>
    <p>We've saved your <b>${esc(r.pack)}</b> entry (${esc(r.distance)}). Pay <b>${r.price_thb.toLocaleString()} THB</b> to confirm your spot and receive your bib number.</p>
    <p>ลงทะเบียนเรียบร้อย กรุณาชำระเงินเพื่อยืนยันสิทธิ์</p>
    <p><a href="${ticketUrl(r)}" style="background:#111;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px">Pay and view your entry</a></p>
    <p>Reference: <b>${esc(r.ref)}</b></p>`));
}

export function sendPaidEmail(r) {
  return send(r.email, `You're in! Bib ${r.bib} · Thonglor Charity Run`, shell(`
    <p>Hi ${esc(r.first_name)},</p>
    <p>Payment received. Your bib number is</p>
    <p style="font-size:36px;font-weight:bold;margin:8px 0">${esc(r.bib)}</p>
    <p>${esc(r.pack)} · ${esc(r.distance)} · Shirt ${esc(r.shirt_size)}</p>
    <p>ชำระเงินเรียบร้อย หมายเลข BIB ของคุณคือ <b>${esc(r.bib)}</b></p>
    <p><a href="${ticketUrl(r)}" style="background:#111;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px">Open your e-ticket</a></p>
    <p>Show the e-ticket QR code when you collect your race pack.</p>`));
}

export function sendTicketLinkEmail(r) {
  return send(r.email, `Your Thonglor Charity Run entry ${r.ref}`, shell(`
    <p>Hi ${esc(r.first_name)}, here is the link to your entry:</p>
    <p><a href="${ticketUrl(r)}">${esc(ticketUrl(r))}</a></p>`));
}
