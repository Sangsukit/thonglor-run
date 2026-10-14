/* Organizer desk */
let page = 1, searchTimer = null;

async function boot() {
  const me = await api('/api/admin/me').catch(() => ({ signedIn: false }));
  $('#loginView').hidden = me.signedIn; $('#deskView').hidden = !me.signedIn; $('#logout').hidden = !me.signedIn;
  $('#who').textContent = me.signedIn ? me.name : '';
  if (me.signedIn) { loadSummary(); loadList(); } else $('#password').focus();
}

document.addEventListener('DOMContentLoaded', () => {
  $('#loginForm').onsubmit = async e => {
    e.preventDefault(); $('#loginErr').hidden = true;
    try { await api('/api/admin/login', { body: { password: $('#password').value, name: $('#staffName').value.trim() || 'staff' } }); $('#password').value = ''; boot(); }
    catch (err) { $('#loginErr').textContent = err.message; $('#loginErr').hidden = false; }
  };
  $('#logout').onclick = async () => { await api('/api/admin/logout', { method: 'POST' }); boot(); };
  $('#q').oninput = () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { page = 1; loadList(); }, 250); };
  $('#fStatus').onchange = $('#fPack').onchange = () => { page = 1; loadList(); };
  $('#checkin').onsubmit = async e => {
    e.preventDefault();
    const raw = $('#checkinInput').value.trim().replace(/^TGR26:/i, '');
    if (!raw) return;
    try {
      const r = await api(`/api/admin/registrations?q=${encodeURIComponent(raw)}`);
      const exact = r.items.find(x => x.ref === raw.toUpperCase() || x.bib === raw.toUpperCase()) || (r.items.length === 1 ? r.items[0] : null);
      if (exact) openDetail(exact.ref); else { $('#q').value = raw; page = 1; loadList(); toast(`${r.total} matching entries listed below.`); }
      $('#checkinInput').value = '';
    } catch (err) { handle(err); }
  };
  $('#overlay').onclick = e => { if (e.target.id === 'overlay') closeModal(); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  boot();
});

function handle(err) { if (err.status === 401) boot(); else toast(err.message); }
const closeModal = () => { $('#overlay').hidden = true; };

async function loadSummary() {
  try {
    const s = await api('/api/admin/summary');
    $('#tiles').innerHTML = [
      [L('Entries', 'ผู้สมัคร'), fmt(s.taken), `${fmt(s.left)} ${L('of', 'จาก')} ${fmt(s.capacity)} ${L('spots left', 'ที่ว่าง')}`],
      [L('Confirmed', 'ยืนยันแล้ว'), fmt(s.paid), `${fmt(s.pickedUp)} ${L('race packs collected', 'รับ race pack แล้ว')}`],
      [L('To check', 'รอตรวจยอด'), fmt(s.verifying), `${fmt(s.awaiting)} ${L('awaiting payment', 'รอชำระ')}`],
      [L('Raised (THB)', 'ยอดรับ (บาท)'), fmt(s.revenue), `+${fmt(s.unconfirmed)} ${L('not yet paid', 'ยังไม่ชำระ')}`]
    ].map(t => `<div class="tile"><div class="l">${t[0]}</div><div class="v num">${t[1]}</div><div class="s">${t[2]}</div></div>`).join('');
    $('#packTable').innerHTML = `<thead><tr><th>${L('Pack', 'แพ็กเกจ')}</th><th>${L('Entries', 'สมัคร')}</th><th>${L('Confirmed', 'ยืนยัน')}</th><th>THB</th></tr></thead>
      <tbody>${s.packs.map(p => `<tr><td>${p.pack}</td><td class="num">${fmt(p.entries)}</td><td class="num">${fmt(p.paid)}</td><td class="num">${fmt(p.revenue)}</td></tr>`).join('')}</tbody>`;
    const n = (pk, sz) => s.shirts.find(x => x.pack === pk && x.shirt_size === sz)?.n || 0;
    $('#shirtTable').innerHTML = `<thead><tr><th>${L('Shirts', 'เสื้อ')}</th>${s.sizes.map(z => `<th>${z}</th>`).join('')}</tr></thead>
      <tbody>${s.packs.map(p => `<tr><td>${p.pack}</td>${s.sizes.map(z => `<td class="num">${n(p.pack, z) || '·'}</td>`).join('')}</tr>`).join('')}</tbody>`;
  } catch (err) { handle(err); }
}

async function loadList() {
  const qs = new URLSearchParams({ page });
  if ($('#q').value.trim()) qs.set('q', $('#q').value.trim());
  if ($('#fStatus').value) qs.set('status', $('#fStatus').value);
  if ($('#fPack').value) qs.set('pack', $('#fPack').value);
  try {
    const r = await api('/api/admin/registrations?' + qs);
    $('#regTable').innerHTML = `<thead><tr><th>${L('Ref', 'รหัส')}</th><th>${L('Runner', 'นักวิ่ง')}</th><th>${L('Pack', 'แพ็กเกจ')}</th><th>${L('Shirt', 'เสื้อ')}</th><th>${L('Status', 'สถานะ')}</th><th>BIB</th><th>${L('Payment', 'การชำระ')}</th><th>${L('Registered', 'วันที่สมัคร')}</th></tr></thead>
      <tbody>${r.items.length ? r.items.map(x => `<tr data-ref="${esc(x.ref)}" style="cursor:pointer">
        <td style="font-family:var(--mono)"><a href="#" data-open="${esc(x.ref)}">${esc(x.ref)}</a></td>
        <td>${esc(x.firstName)} ${esc(x.lastName)}<div class="kv">${esc(x.phone)}</div></td>
        <td>${x.pack}${x.pack === 'VIP' ? ' · ' + x.distance : ''}</td><td>${esc(x.shirtSize)}</td><td>${stChip(x.status)}${x.pickedUpAt ? ' <span class="chip st-paid">✓ pack</span>' : ''}</td>
        <td style="font-family:var(--mono)">${esc(x.bib || '—')}</td><td>${esc(x.paymentMethod || '')}${x.paymentNote ? `<div class="kv">${esc(x.paymentNote)}</div>` : ''}</td>
        <td class="num">${new Date(x.createdAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</td></tr>`).join('')
      : `<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:28px">${r.total === 0 && !qs.has('q') && !qs.has('status') && !qs.has('pack') ? L('No entries yet. They appear here as runners register.', 'ยังไม่มีผู้สมัคร') : L('No entries match these filters.', 'ไม่พบรายการที่ตรงกับตัวกรอง')}</td></tr>`}</tbody>`;
    const pages = Math.max(1, Math.ceil(r.total / r.pageSize));
    $('#pager').innerHTML = `<span>${fmt(r.total)} ${L('entries', 'รายการ')} · ${L('page', 'หน้า')} ${page}/${pages}</span>
      <button class="btn small ghost" ${page <= 1 ? 'disabled' : ''} id="prev">←</button><button class="btn small ghost" ${page >= pages ? 'disabled' : ''} id="next">→</button>`;
    $('#prev').onclick = () => { page--; loadList(); }; $('#next').onclick = () => { page++; loadList(); };
    document.querySelectorAll('#regTable tr[data-ref]').forEach(tr => tr.onclick = e => { e.preventDefault(); openDetail(tr.dataset.ref); });
  } catch (err) { handle(err); }
}

async function openDetail(ref) {
  let r;
  try { r = await api(`/api/admin/registrations/${encodeURIComponent(ref)}`); } catch (err) { return handle(err); }
  const rows = [
    [L('Pack', 'แพ็กเกจ'), `${r.pack} · ${r.distance} · ${fmt(r.price)} THB`], ['BIB', r.bib || '—'], [L('Name on bib', 'ชื่อบน BIB'), r.bibName],
    [L('Gender', 'เพศ'), r.gender], [L('Date of birth', 'วันเกิด'), r.dateOfBirth], [L('ID / passport', 'บัตร/พาสปอร์ต'), `${r.idNumber} (${r.nationality})`],
    [L('Mobile', 'มือถือ'), r.phone], [L('Email', 'อีเมล'), r.email], [L('Emergency contact', 'ผู้ติดต่อฉุกเฉิน'), `${r.emergencyName} · ${r.emergencyPhone}`],
    [L('Medical', 'ข้อมูลสุขภาพ'), r.medical || '—'], [L('Shirt', 'เสื้อ'), r.shirtSize],
    [L('Payment', 'การชำระ'), [r.paymentMethod, r.paymentNote].filter(Boolean).join(' · ') || '—'],
    [L('Race pack', 'Race pack'), r.pickedUpAt ? L('Collected ', 'รับแล้ว ') + new Date(r.pickedUpAt).toLocaleString('en-GB') : L('Not collected', 'ยังไม่รับ')]
  ];
  const acts = [];
  if (['awaiting_payment', 'verifying', 'expired'].includes(r.status)) acts.push(['confirm-payment', L('Confirm payment received', 'ยืนยันได้รับเงิน'), '']);
  if (r.status === 'paid' && !r.pickedUpAt) acts.push(['pickup', L('Hand over race pack', 'มอบ race pack'), '']);
  if (['awaiting_payment', 'verifying', 'paid'].includes(r.status)) acts.push(['cancel', L('Cancel entry', 'ยกเลิก'), 'ghost']);
  if (['cancelled', 'expired'].includes(r.status)) acts.push(['restore', L('Restore entry', 'คืนสถานะ'), 'ghost']);
  acts.push(['resend', L('Resend email', 'ส่งอีเมลอีกครั้ง'), 'ghost']);
  $('#modal').innerHTML = `<div style="display:flex;justify-content:space-between;gap:12px;align-items:start;flex-wrap:wrap">
      <div><div class="eyebrow" style="font-family:var(--mono)">${esc(r.ref)}</div><h3 id="mTitle" style="font-size:22px;margin:4px 0">${esc(r.firstName)} ${esc(r.lastName)}</h3>${stChip(r.status)}</div>
      <button class="btn small ghost" type="button" id="mClose">${L('Close', 'ปิด')}</button></div>
    <div class="detail" style="margin-top:16px"><dl>${rows.map(x => `<dt>${esc(x[0])}</dt><dd>${esc(x[1])}</dd>`).join('')}</dl></div>
    <div class="actions" style="justify-content:flex-start;margin-top:18px" id="mActs">${acts.map(a => `<button class="btn small ${a[2]}" data-act="${a[0]}">${a[1]}</button>`).join('')}</div>
    <div class="notice" id="mConfirm" hidden style="margin-top:12px"></div>
    <div class="log">${r.log.map(l => `<div>${new Date(l.created_at).toLocaleString('en-GB')} · ${esc(l.action)} · ${esc(l.actor)}</div>`).join('')}</div>`;
  $('#overlay').hidden = false;
  $('#mClose').onclick = closeModal;
  document.querySelectorAll('#mActs [data-act]').forEach(b => b.onclick = () => {
    const act = b.dataset.act;
    if (act === 'cancel') { // irreversible-feeling action gets an in-page confirmation
      const c = $('#mConfirm'); c.hidden = false;
      c.innerHTML = `${L('Cancel this entry and release the spot?', 'ยกเลิกการสมัครนี้และคืนที่ว่าง?')} <button class="btn small" id="mYes">${L('Yes, cancel', 'ยืนยันยกเลิก')}</button>`;
      $('#mYes').onclick = () => run(ref, act);
      return;
    }
    run(ref, act);
  });
}

async function run(ref, act) {
  try {
    await api(`/api/admin/registrations/${encodeURIComponent(ref)}/${act}`, { method: 'POST', body: {} });
    toast({ 'confirm-payment': 'Payment confirmed and bib issued.', pickup: 'Race pack handed over.', cancel: 'Entry cancelled.', restore: 'Entry restored.', resend: 'Email sent.' }[act]);
    loadSummary(); loadList(); openDetail(ref);
  } catch (err) { handle(err); }
}
window.onLangChange = () => { if (!$('#deskView').hidden) { loadSummary(); loadList(); } };
