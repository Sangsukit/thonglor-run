// Shared helpers for every page: language, API calls, formatting.
const TH = {
  'nav.packs': 'แพ็กเกจ', 'nav.route': 'เส้นทาง', 'nav.register': 'สมัคร', 'nav.mine': 'การสมัครของฉัน',
  'hero.eyebrow': 'วิ่งไปกับตำรวจ · สน.ทองหล่อ', 'hero.dow': 'วันอาทิตย์', 'hero.start': 'ปล่อยตัว', 'hero.where': 'จุดเริ่ม/เส้นชัย',
  'venue': 'อุทยานเบญจสิริ สุขุมวิท', 'hero.dist': 'ระยะทาง', 'hero.spots': 'ที่ว่างคงเหลือ', 'hero.cta': 'สมัครเลย',
  'hero.tag': 'ค่าสมัครทุกบาทสมทบกองทุนสวัสดิการข้าราชการตำรวจ สน.ทองหล่อ และครอบครัว',
  'packs.eyebrow': 'ขั้นที่ 1', 'packs.title': 'เลือกแพ็กเกจ', 'reg.eyebrow': 'ใบสมัคร', 'reg.title': 'สมัครวิ่ง',
  'reg.lead': 'กรอกข้อมูลให้ตรงกับบัตรประชาชนหรือพาสปอร์ต หมายเลข BIB จะออกให้หลังชำระเงินเรียบร้อย',
  'f.vipdist': 'ระยะทางสำหรับ VIP', 'f.runner': 'ข้อมูลนักวิ่ง', 'f.first': 'ชื่อ', 'f.last': 'นามสกุล', 'f.bibname': 'ชื่อบน BIB',
  'f.bibhint': 'ไม่เกิน 12 ตัวอักษร เว้นว่างเพื่อใช้ชื่อจริง', 'f.gender': 'เพศ', 'g.m': 'ชาย', 'g.f': 'หญิง', 'g.x': 'ไม่ระบุ',
  'f.dob': 'วันเกิด', 'f.nat': 'สัญชาติ', 'n.th': 'ไทย', 'n.other': 'อื่น ๆ', 'f.idth': 'เลขบัตรประชาชน (13 หลัก)', 'f.idpp': 'หมายเลขพาสปอร์ต',
  'f.contact': 'ข้อมูลติดต่อ', 'f.phone': 'เบอร์มือถือ', 'f.email': 'อีเมล', 'f.emailhint': 'ใช้สำหรับส่งการยืนยันและ e-ticket',
  'f.emname': 'ชื่อผู้ติดต่อกรณีฉุกเฉิน', 'f.emphone': 'เบอร์ผู้ติดต่อกรณีฉุกเฉิน', 'f.medical': 'โรคประจำตัว / แพ้ยา / ยาที่ใช้ (ถ้ามี)',
  'f.shirt': 'ไซซ์เสื้อที่ระลึก', 'f.size': 'ไซซ์', 'f.chest': 'รอบอก (นิ้ว)', 'f.length': 'ความยาว (นิ้ว)',
  'f.waiver': 'ข้าพเจ้ามีสุขภาพพร้อมเข้าร่วมกิจกรรม และยอมรับความเสี่ยงด้วยตนเอง จะปฏิบัติตามคำแนะนำของเจ้าหน้าที่และตำรวจตลอดเส้นทาง',
  'f.pdpa': 'ข้าพเจ้ายินยอมให้ผู้จัดงานจัดเก็บข้อมูลส่วนบุคคลเพื่อใช้ในงานนี้เท่านั้น ตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล (PDPA)',
  'f.submit': 'สมัครและไปหน้าชำระเงิน', 'f.back': 'เปลี่ยนแพ็กเกจ',
  'route.eyebrow': 'เส้นทางวิ่ง', 'route.title': 'เส้นทาง', 'route.lead': 'ทั้งสองระยะเริ่มและจบที่สวนเดียวกัน วิ่งผ่านย่านทองหล่อ ปิดถนนและดูแลความปลอดภัยโดยเจ้าหน้าที่ตำรวจ',
  'cause.eyebrow': 'ค่าสมัครของคุณไปที่ไหน', 'cause.title': 'ดูแลผู้ที่ดูแลเรา', 'sp.eyebrow': 'ผู้สนับสนุน', 'sp.title': 'ร่วมเป็นผู้สนับสนุน',
  'footer': 'Thonglor Charity Run 2026 · ร่วมกับ สน.ทองหล่อ · จัดโดย MI6 Bangkok',
  'mine.eyebrow': 'E-ticket ของคุณ', 'mine.title': 'การสมัครของฉัน', 'mine.add': 'สมัครให้นักวิ่งคนอื่น'
};

window.LANG = (() => { try { return localStorage.getItem('tgr-lang') || 'en'; } catch { return 'en'; } })();
window.L = (en, th) => (window.LANG === 'th' ? th : en);
window.$ = s => document.querySelector(s);
window.fmt = n => Number(n).toLocaleString('en-US');
window.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

window.applyI18n = function () {
  document.documentElement.lang = window.LANG;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    if (!el.dataset.en) el.dataset.en = el.innerHTML;
    const th = TH[el.dataset.i18n];
    el.innerHTML = window.LANG === 'th' && th ? th : el.dataset.en;
  });
  document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === window.LANG));
};
window.onLangChange = () => {};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-lang]');
  if (!b) return;
  window.LANG = b.dataset.lang;
  try { localStorage.setItem('tgr-lang', window.LANG); } catch {}
  window.applyI18n(); window.onLangChange();
});

window.api = async function (path, opts = {}) {
  const res = await fetch(path, {
    method: opts.method || (opts.body ? 'POST' : 'GET'),
    headers: opts.body ? { 'Content-Type': 'application/json' } : {},
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: 'same-origin'
  });
  const data = res.headers.get('content-type')?.includes('json') ? await res.json() : null;
  if (!res.ok) { const e = new Error(data?.message || `Request failed (${res.status})`); e.status = res.status; e.data = data; throw e; }
  return data;
};

window.toast = function (msg) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(() => (t.hidden = true), 3200);
};

// Entries this device has made, so "My entries" works without an account.
window.myEntries = {
  list() { try { return JSON.parse(localStorage.getItem('tgr-entries') || '[]'); } catch { return []; } },
  add(e) { try { const l = this.list().filter(x => x.ref !== e.ref); l.push(e); localStorage.setItem('tgr-entries', JSON.stringify(l)); } catch {} }
};

window.STATUS = {
  awaiting_payment: ['Awaiting payment', 'รอชำระเงิน', 'awaiting'], verifying: ['Checking transfer', 'กำลังตรวจสอบยอด', 'verifying'],
  paid: ['Confirmed', 'ยืนยันแล้ว', 'paid'], cancelled: ['Cancelled', 'ยกเลิก', 'cancelled'], expired: ['Expired', 'หมดเวลาชำระ', 'cancelled']
};
window.stChip = s => `<span class="chip st-${STATUS[s][2]}">${L(STATUS[s][0], STATUS[s][1])}</span>`;
window.packColor = p => ({ '5K': '--k5', '10K': '--k10', 'VIP': '--vip' }[p]);

document.addEventListener('DOMContentLoaded', () => window.applyI18n());
