// Shared helpers for every page: language, API calls, formatting.
const TH = {
  'nav.packs': 'แพ็กเกจ', 'nav.route': 'เส้นทาง', 'nav.register': 'สมัคร', 'nav.mine': 'การสมัครของฉัน', 'nav.cause': 'เพื่อใคร',
  'how.1': 'เลือก 5K, 10K หรือ VIP', 'how.2': 'กรอกข้อมูลนักวิ่ง', 'how.3': 'ชำระผ่านพร้อมเพย์ รับ e-ticket QR',
  'packs.swipe': 'ปัดเพื่อดูแพ็กเกจอื่น', 'merch.title': 'เสื้อที่ระลึก', 'merch.lead': 'ทุกแพ็กเกจได้รับเสื้อที่ระลึก ระยะ 10K และ 5K มีสีแตกต่างกัน (ด้านหน้าและด้านหลัง)', 'merch.note': 'VIP ได้รับเสื้อตามระยะที่เลือก ภาพตัวอย่างดีไซน์ สินค้าจริงอาจแตกต่างเล็กน้อย', 'f.seeshirt': 'ดูดีไซน์เสื้อ', 'f.sizechart': 'ตารางไซซ์', 'mbar.submit': 'สมัครและชำระเงิน',
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
  'f.waiver': 'ข้าพเจ้าได้อ่านและยอมรับ<a href="/terms" target="_blank" rel="noopener">ข้อกำหนดผู้เข้าร่วมและการสละสิทธิเรียกร้อง</a> ข้าพเจ้ามีสุขภาพพร้อม เข้าใจความเสี่ยงของการวิ่งบนถนนสาธารณะ และจะปฏิบัติตามคำแนะนำของเจ้าหน้าที่และตำรวจตลอดเส้นทาง',
  'f.pdpa': 'ข้าพเจ้ายินยอมให้ผู้จัดงานใช้ข้อมูลส่วนบุคคล รวมถึงข้อมูลสุขภาพและผู้ติดต่อฉุกเฉิน สำหรับงานนี้ตาม<a href="/terms#privacy" target="_blank" rel="noopener">ประกาศความเป็นส่วนตัว</a> (PDPA)',
  'f.guardian': 'นักวิ่งคนนี้อายุต่ำกว่า 18 ปี ข้าพเจ้าเป็นบิดามารดาหรือผู้แทนโดยชอบธรรม ยินยอมให้เข้าร่วม และยอมรับข้อกำหนดแทนนักวิ่ง',
  'nav.terms': 'ข้อกำหนดและความเป็นส่วนตัว',
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

// Phone menu
document.addEventListener('click', e => {
  const hdr = document.querySelector('header.top');
  if (!hdr) return;
  const btn = e.target.closest('.menu-btn');
  if (btn) { const open = hdr.classList.toggle('open'); btn.setAttribute('aria-expanded', open); return; }
  if (hdr.classList.contains('open') && (e.target.closest('nav.main a') || !e.target.closest('header.top'))) {
    hdr.classList.remove('open'); hdr.querySelector('.menu-btn')?.setAttribute('aria-expanded', 'false');
  }
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const hdr = document.querySelector('header.top.open');
  if (hdr) { hdr.classList.remove('open'); const b = hdr.querySelector('.menu-btn'); b?.setAttribute('aria-expanded', 'false'); b?.focus(); }
});

document.addEventListener('DOMContentLoaded', () => window.applyI18n());
