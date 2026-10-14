/* Landing page + entry form */
const PACKS = {
  '5K':  { price: 600,  sub: 'Run for community',    incl: ['shirt', 'medal', 'food'] },
  '10K': { price: 800,  sub: 'Run further together', incl: ['shirt', 'medal', 'food'] },
  'VIP': { price: 1200, sub: 'More than a run',      incl: ['shirt', 'medal', 'headband', 'food'] }
};
const INCL = { shirt: ['Event shirt', 'เสื้อที่ระลึก'], medal: ['Finisher medal', 'เหรียญที่ระลึก'], headband: ['VIP headband', 'ผ้าโพกหัว'], food: ['Post-run meal', 'อาหารหลังวิ่ง'] };
const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
// Waypoints numbered as on the course map (public/img/route-map.jpg): blue 1-9 for 10K, yellow 2-4 for 5K.
const ROUTES = {
  '10K': [['อุทยานเบญจสิริ', 'Benjasiri Park · start', 'S'], ['เอ็มสเฟียร์', 'EmSphere', 1], ['สวนเบญจกิติ / ศูนย์สิริกิติ์', 'Benjakitti Park · Queen Sirikit Centre', 2], ['ถนนพระราม 4', 'Rama IV Road', 3], ['แยกพระราม 4 - เอกมัย', 'Rama IV × Ekkamai', 4], ['ถนนเอกมัย', 'Ekkamai Road', 5], ['ถนนเพชรบุรี', 'Phetchaburi Road', 6], ['ซอยทองหล่อ', 'Soi Thonglor', 7], ['สถานีตำรวจนครบาลทองหล่อ', 'Thonglor Police Station', 8], ['ถนนสุขุมวิท', 'Sukhumvit Road', 9], ['อุทยานเบญจสิริ', 'Benjasiri Park · finish', 'F']],
  '5K': [['อุทยานเบญจสิริ', 'Benjasiri Park · start', 'S'], ['สุขุมวิท 22', 'Sukhumvit 22', 2], ['ถนนพระราม 4', 'Rama IV Road', 3], ['สุขุมวิท 26', 'Sukhumvit 26', 4], ['อุทยานเบญจสิริ', 'Benjasiri Park · finish', 'F']]
};
const ICONS = {
  shirt: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M8 3l-5 3 2 4 2-1v12h10V9l2 1 2-4-5-3c-.5 1.5-2 2.5-4 2.5S8.5 4.5 8 3z"/></svg>',
  medal: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 2l3 7M17 2l-3 7"/><circle cx="12" cy="15" r="6"/></svg>',
  headband: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 11c3-3 15-3 18 0v3c-3-3-15-3-18 0z"/><path d="M19 13l2 7-3-2"/></svg>',
  food: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 2v8M4 2v5a2 2 0 004 0V2M6 10v12M17 2c-2 0-3 3-3 6s1 4 3 4v10"/></svg>'
};
let selPack = '10K';
let open = true;

function thaiIdValid(id) { if (!/^\d{13}$/.test(id)) return false; let s = 0; for (let i = 0; i < 12; i++) s += +id[i] * (13 - i); return (11 - s % 11) % 10 === +id[12]; }
// Runners under 18 need a parent or guardian to accept the terms; the box only shows for them.
function updateGuardian() {
  const dob = $('#dob').value, minor = !!dob && ageOnRaceDay(dob) < 18;
  $('#guardianRow').hidden = !minor;
  return minor;
}
function ageOnRaceDay(dob) { const d = new Date(dob), r = new Date('2026-11-15'); let a = r.getFullYear() - d.getFullYear(); if (r < new Date(r.getFullYear(), d.getMonth(), d.getDate())) a--; return a; }

function renderPacks() {
  $('#packList').innerHTML = Object.entries(PACKS).map(([k, p]) => `
    <button type="button" class="pack" data-pack="${k}" aria-pressed="${k === selPack}" style="--pc:var(${packColor(k)})">
      <div class="band"><span class="n">${k}</span><span class="s">Race pack<br>${esc(p.sub)}</span></div>
      <div class="body">
        <div class="price num">${fmt(p.price)}<small>THB</small></div>
        <ul class="incl">${p.incl.map(i => `<li>${ICONS[i]}<span>${L(...INCL[i])}</span></li>`).join('')}</ul>
        ${k === 'VIP' ? `<div class="kv">${L('Run 5 KM or 10 KM, your choice', 'เลือกวิ่ง 5 หรือ 10 กม.')}</div>` : ''}
        <span class="pick">${k === selPack ? L('Selected', 'เลือกแล้ว') : L('Select ' + k, 'เลือก ' + k)}</span>
      </div>
    </button>`).join('');
  document.querySelectorAll('.pack').forEach(b => b.onclick = () => { selPack = b.dataset.pack; renderPacks(); renderChosen(); $('#register').scrollIntoView({ behavior: 'smooth' }); });
  centerSelectedPack();
}
function renderChosen() {
  const p = PACKS[selPack];
  const dist = selPack === 'VIP' ? L('5 or 10 KM, your choice', 'เลือก 5 หรือ 10 กม.') : selPack.replace('K', ' KM');
  $('#summary').style.setProperty('--pc', `var(${packColor(selPack)})`);
  $('#summary').innerHTML = `<div class="sb"><span class="n">${selPack}</span><span class="p num">${fmt(p.price)} THB</span></div>
    <div class="sbody"><div class="kv">${L('Distance', 'ระยะทาง')} <b>${dist}</b> · <b>15 Nov 2026, 06:00</b></div>
      <ul>${p.incl.map(i => `<li>${ICONS[i]}<span>${L(...INCL[i])}</span></li>`).join('')}</ul>
      <a class="change" href="#packs">${L('Change race pack', 'เปลี่ยนแพ็กเกจ')}</a>
      <div class="next">${L('Next: pay by PromptPay QR. Your spot is held for 24 hours while you pay.', 'ขั้นต่อไป: ชำระผ่าน QR พร้อมเพย์ เราจองที่ให้ 24 ชั่วโมง')}</div></div>`;
  $('#vipDist').hidden = selPack !== 'VIP';
  if (document.querySelector('#regForm legend')) numberLegends();
  $('#mbarPack').textContent = selPack;
  $('#mbarPack').className = `chip ${selPack === '5K' ? 'k5' : selPack === '10K' ? 'k10' : 'vip'}`;
  $('#mbarPrice').textContent = `${fmt(p.price)} THB`;
}
function centerSelectedPack() {
  const list = $('#packList'), el = list.querySelector(`[data-pack="${selPack}"]`);
  if (el && list.scrollWidth > list.clientWidth) list.scrollLeft = el.offsetLeft - (list.clientWidth - el.offsetWidth) / 2;
}
function numberLegends() {
  document.querySelectorAll('#regForm legend').forEach((lg, i, all) => {
    if (lg.querySelector('.ln')) lg.querySelector('.ln').remove();
    const vip = !$('#vipDist').hidden; const n = vip ? i + 1 : i; if (!vip && i === 0) return;
    lg.insertAdjacentHTML('afterbegin', `<span class="ln">${n}</span>`);
  });
}
function renderShirts() {
  const cur = (document.querySelector('input[name=shirt]:checked') || {}).value;
  $('#shirtSeg').innerHTML = SIZES.map(s => `<label><input type="radio" name="shirt" value="${s}" ${s === cur ? 'checked' : ''}> ${s}</label>`).join('');
}
let selRoute = '10K';
function renderRoutes() {
  $('#routes').innerHTML = ['10K', '5K'].map(k => `
    <div class="route r${k} ${k === selRoute ? 'active' : ''}" role="tabpanel" data-k="${k}"><h3>${k === '10K' ? '10 KM' : '5 KM'}</h3>
      <ol>${ROUTES[k].map((r, i) => `<li class="${typeof r[2] === 'string' ? 'sf' : ''}" data-cp="${r[2]}"><button type="button" class="cpbtn"><span class="dot">${r[2]}</span><span>${L(r[1], r[0])}<small>${L(r[0], r[1])}</small></span></button></li>`).join('')}</ol></div>`).join('');
  document.querySelectorAll('[data-rt]').forEach(b => { b.setAttribute('aria-selected', b.dataset.rt === selRoute); b.onclick = () => { selRoute = b.dataset.rt; renderRoutes(); window.CourseMap?.setActive(selRoute); }; });
  document.querySelectorAll('.route li[data-cp]').forEach(li => { li.querySelector('button').onclick = () => window.CourseMap?.focus(li.closest('.route').dataset.k, /^\d+$/.test(li.dataset.cp) ? +li.dataset.cp : li.dataset.cp); });
  window.CourseMap?.refresh();
}
function renderCause() {
  const items = LANG === 'th' ? [
    'สนับสนุนสวัสดิการข้าราชการตำรวจ สน.ทองหล่อ และครอบครัว เช่น ประกันสุขภาพ ค่ารักษาพยาบาล และทุนการศึกษาบุตร',
    'เสริมคุณภาพชีวิตและขวัญกำลังใจให้เจ้าหน้าที่ที่ดูแลความปลอดภัยให้ประชาชน',
    'สร้างความสัมพันธ์ที่ดีระหว่างตำรวจและประชาชนผ่านกิจกรรมที่เข้าถึงง่าย',
    'ส่งเสริมการออกกำลังกายและสังคมสุขภาพดี'
  ] : [
    'Welfare for Thonglor police officers and their families: health insurance, medical support and scholarships for officers\' children.',
    'Better quality of life and morale for the officers who keep the neighbourhood safe.',
    'A closer relationship between police and residents, built through an event anyone can join.',
    'More people exercising together for a healthier city.'
  ];
  $('#causeList').innerHTML = items.map(i => `<li>${esc(i)}</li>`).join('');
  const pil = [
    ['<path d="M7 11a3 3 0 100-6 3 3 0 000 6zM17 11a3 3 0 100-6 3 3 0 000 6zM2 21c0-3 2.5-5 5-5s5 2 5 5M12 21c0-3 2.5-5 5-5s5 2 5 5"/>', ['Beside you', 'เคียงข้าง'], ['We look out for each other', 'ดูแลกันและกัน']],
    ['<path d="M12 21s-8-4.5-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 6.5-8 11-8 11z"/>', ['Understanding', 'เข้าใจ'], ['With respect', 'ด้วยความเคารพ']],
    ['<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>', ['Trust', 'เชื่อมั่น'], ['In a safe city', 'ในความปลอดภัย']]
  ];
  $('#pillars').innerHTML = pil.map(([ic, t, d]) => `<div class="pillar"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${ic}</svg><b>${L(...t)}</b><span>${L(...d)}</span></div>`).join('');
}
function renderSponsors() {
  const tiers = [
    { n: 'VIP Sponsor', p: L('from 300,000 THB', '300,000 บาทขึ้นไป'), b: [L('Logo on the front of the event shirt', 'โลโก้ด้านหน้าเสื้อ'), L('Logo on every runner\'s bib', 'โลโก้บน BIB'), L('6 beach flags along the course', 'ธงริมเส้นทาง 6 ผืน'), L('50 complimentary entries', 'สิทธิ์สมัครฟรี 50 คน'), L('3×6 m booth at the event area', 'บูธขนาด 3×6 ม.')] },
    { n: 'Co-Sponsor', p: L('100,000 THB', '100,000 บาท'), b: [L('Logo on the back of the event shirt', 'โลโก้ด้านหลังเสื้อ'), L('Logo on every runner\'s bib', 'โลโก้บน BIB'), L('2 beach flags along the course', 'ธงริมเส้นทาง 2 ผืน'), L('10 complimentary entries', 'สิทธิ์สมัครฟรี 10 คน'), L('3×3 m booth at the event area', 'บูธขนาด 3×3 ม.')] }
  ];
  $('#sponList').innerHTML = tiers.map(t => `<div class="spon"><h3>${esc(t.n)}</h3><div class="price num">${esc(t.p)}</div><ul>${t.b.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('');
}
async function loadShirts() {
  let d = 1; try { d = (await api('/api/config')).shirtDesign || 1; } catch {}
  $('#shirt10').src = `/img/shirts/o${d}-10k.jpg`; $('#shirt5').src = `/img/shirts/o${d}-5k.jpg`;
}
async function loadStats() {
  try {
    const s = await api('/api/stats');
    $('#spotsLeft').textContent = fmt(s.left);
    $('#spotsBar').style.width = (100 * s.taken / s.capacity).toFixed(1) + '%';
    open = s.open;
    if (!open) {
      $('#submitBtn').disabled = true;
      $('#submitBtn').textContent = s.left === 0 ? L('Sold out', 'เต็มแล้ว') : L('Registration closed', 'ปิดรับสมัครแล้ว');
    }
  } catch { /* the page still works without the counter */ }
}

function updateIdLabel() {
  const th = $('#nationality').value === 'TH';
  const lab = $('#idLabel');
  lab.dataset.i18n = th ? 'f.idth' : 'f.idpp';
  lab.dataset.en = th ? 'Thai ID card number (13 digits)' : 'Passport number';
  applyI18n();
}
function fieldErr(id, msg) {
  const el = document.getElementById(id);
  const err = el.closest('.field')?.querySelector('.err');
  el.classList.toggle('invalid', !!msg);
  if (err) err.textContent = msg || '';
  return !msg;
}
function validate() {
  let ok = true; const v = id => document.getElementById(id).value.trim();
  const req = L('Required', 'กรุณากรอก');
  ok &= fieldErr('first', v('first') ? '' : req);
  ok &= fieldErr('last', v('last') ? '' : req);
  const g = document.querySelector('input[name=gender]:checked'); $('#gender').parentElement.querySelector('.err').textContent = g ? '' : req; ok &= !!g;
  const dob = v('dob'); ok &= fieldErr('dob', !dob ? req : ageOnRaceDay(dob) < 10 ? L('Runners must be at least 10 on race day', 'ผู้สมัครต้องมีอายุอย่างน้อย 10 ปี') : '');
  const id = v('idNo').replace(/[\s-]/g, '');
  if ($('#nationality').value === 'TH') ok &= fieldErr('idNo', !id ? req : thaiIdValid(id) ? '' : L('This isn\'t a valid 13-digit Thai ID number. Check the digits.', 'เลขบัตรประชาชนไม่ถูกต้อง กรุณาตรวจสอบ'));
  else ok &= fieldErr('idNo', /^[A-Za-z0-9]{6,20}$/.test(id) ? '' : L('Enter your passport number', 'กรุณากรอกหมายเลขพาสปอร์ต'));
  ok &= fieldErr('phone', /^\+?\d{9,15}$/.test(v('phone').replace(/[\s()-]/g, '')) ? '' : L('Enter a mobile number, e.g. 0812345678', 'กรอกเบอร์มือถือ เช่น 0812345678'));
  ok &= fieldErr('email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('email')) ? '' : L('Enter a valid email address', 'อีเมลไม่ถูกต้อง'));
  ok &= fieldErr('emName', v('emName') ? '' : req);
  ok &= fieldErr('emPhone', /^\+?\d{9,15}$/.test(v('emPhone').replace(/[\s()-]/g, '')) ? '' : L('Enter a phone number', 'กรอกเบอร์โทร'));
  const sh = document.querySelector('input[name=shirt]:checked'); $('#shirtErr').textContent = sh ? '' : L('Pick a shirt size', 'เลือกไซซ์เสื้อ'); ok &= !!sh;
  const minor = updateGuardian();
  const c = $('#waiver').checked && $('#pdpa').checked && (!minor || $('#guardian').checked);
  $('#consentErr').textContent = c ? '' : minor ? L('Tick all three boxes to continue', 'กรุณายอมรับเงื่อนไขทั้งสามข้อ') : L('Tick both boxes to continue', 'กรุณายอมรับเงื่อนไขทั้งสองข้อ'); ok &= c;
  return !!ok;
}
const SERVER_FIELD = { firstName: 'first', lastName: 'last', dateOfBirth: 'dob', idNumber: 'idNo', phone: 'phone', email: 'email', emergencyName: 'emName', emergencyPhone: 'emPhone' };

async function submit(e) {
  e.preventDefault();
  $('#formError').hidden = true;
  if (!validate()) { const bad = document.querySelector('.invalid, .err:not(:empty)'); bad?.scrollIntoView({ behavior: 'smooth', block: 'center' }); (bad?.matches('input,select,textarea') ? bad : bad?.closest('.field,.formsec')?.querySelector('input'))?.focus({ preventScroll: true }); return; }
  const v = id => document.getElementById(id).value.trim();
  const body = {
    pack: selPack, distance: selPack === 'VIP' ? document.querySelector('input[name=vipDistance]:checked').value : undefined,
    firstName: v('first'), lastName: v('last'), bibName: v('bibName'), gender: document.querySelector('input[name=gender]:checked').value,
    dateOfBirth: v('dob'), nationality: $('#nationality').value, idNumber: v('idNo'), phone: v('phone'), email: v('email'),
    emergencyName: v('emName'), emergencyPhone: v('emPhone'), medical: v('medical'),
    shirtSize: document.querySelector('input[name=shirt]:checked').value, acceptWaiver: $('#waiver').checked, acceptPdpa: $('#pdpa').checked,
    acceptGuardian: !$('#guardianRow').hidden && $('#guardian').checked
  };
  const btn = $('#submitBtn'); btn.disabled = true; const label = btn.innerHTML; btn.innerHTML = `<span class="spinner"></span> ${L('Saving your entry…', 'กำลังบันทึก…')}`;
  try {
    const r = await api('/api/registrations', { body });
    myEntries.add({ ref: r.ref, t: r.token, name: `${body.firstName} ${body.lastName}`, pack: selPack });
    location.href = r.ticketUrl;
  } catch (err) {
    btn.disabled = false; btn.innerHTML = label;
    const f = err.data?.fields;
    if (f) for (const [k, msg] of Object.entries(f)) if (SERVER_FIELD[k]) fieldErr(SERVER_FIELD[k], msg);
    const msgs = {
      duplicate: L('This ID or passport number already has an entry. Check My entries, or ask us to resend your link.', 'เลขบัตรนี้ลงทะเบียนแล้ว ตรวจสอบที่หน้า การสมัครของฉัน'),
      sold_out: L('Sorry, all 3,000 spots are taken.', 'ขออภัย ที่ว่างเต็มแล้ว'),
      closed: L('Registration is closed.', 'ปิดรับสมัครแล้ว')
    };
    const el = $('#formError'); el.textContent = msgs[err.data?.error] || err.message; el.hidden = false;
  }
}

function renderAll() { renderPacks(); renderChosen(); renderShirts(); renderRoutes(); renderCause(); renderSponsors(); numberLegends(); }

// Phone action bar: "Register" while browsing, "Register & pay" inside the form, hidden when the form's own button is on screen.
function setupMbar() {
  const bar = $('#mbar'); if (!bar || !('IntersectionObserver' in window)) return;
  document.body.classList.add('has-mbar');
  const seen = { hero: true, form: false, actions: false };
  const update = () => {
    bar.hidden = seen.hero || seen.actions;
    $('#mbarGo').hidden = seen.form; $('#mbarSubmit').hidden = !seen.form;
  };
  const io = new IntersectionObserver(es => { es.forEach(e => { seen[e.target.dataset.io] = e.isIntersecting; }); update(); }, { threshold: 0 });
  const tag = (el, k) => { if (el) { el.dataset.io = k; io.observe(el); } };
  tag(document.querySelector('.hero .facts .btn'), 'hero'); tag($('#regPanel'), 'form'); tag($('#formActions'), 'actions');
}
window.onLangChange = () => { renderAll(); updateIdLabel(); };
// Tapping a route line or checkpoint on the map switches the list below it.
window.onCourseRoute = k => { if (k !== selRoute) { selRoute = k; renderRoutes(); } };
document.addEventListener('DOMContentLoaded', () => {
  renderAll(); loadStats(); loadShirts(); setupMbar(); requestAnimationFrame(centerSelectedPack);
  $('#nationality').onchange = updateIdLabel;
  $('#dob').onchange = () => { const v = $('#dob').value; $('#ageHint').textContent = v ? L('Age on race day: ', 'อายุ ณ วันแข่ง: ') + ageOnRaceDay(v) : ''; updateGuardian(); };
  $('#regForm').addEventListener('submit', submit);
});
