async function renderList() {
  const entries = myEntries.list();
  const el = $('#list');
  $('#resendTitle').textContent = L('Registered on another device?', 'สมัครจากอุปกรณ์อื่น?');
  $('#resendLead').textContent = L('Enter the email you registered with and we\'ll send your entry links again.', 'กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงก์การสมัครให้อีกครั้ง');
  $('#resendBtn').textContent = L('Send my links', 'ส่งลิงก์ให้ฉัน');
  if (!entries.length) {
    el.innerHTML = `<div class="empty">${L('No entries on this device yet. Register, or get your links by email below.', 'ยังไม่มีการสมัครในอุปกรณ์นี้')}</div>`;
    return;
  }
  const results = await Promise.all(entries.map(e => api(`/api/registrations/${encodeURIComponent(e.ref)}?t=${encodeURIComponent(e.t)}`).then(r => ({ e, r })).catch(() => ({ e, r: null }))));
  el.innerHTML = `<div class="tickets">${results.reverse().map(({ e, r }) => {
    if (!r) return `<article class="ticket"><div class="tm"><div><div class="name">${esc(e.name)}</div><div class="kv">${esc(e.ref)} · ${L('Not found', 'ไม่พบข้อมูล')}</div></div></div></article>`;
    const url = `/ticket?ref=${encodeURIComponent(r.ref)}&t=${encodeURIComponent(e.t)}`;
    return `<article class="ticket" style="--pc:var(${packColor(r.pack)})">
      <div class="tb"><span class="n">${r.pack}${r.pack === 'VIP' ? ' · ' + r.distance : ''}</span><span style="font-family:var(--mono);font-size:13px">15.11.2026 · 06:00</span></div>
      <div class="tm"><div style="display:grid;gap:6px;min-width:0"><div class="name">${esc(r.firstName)} ${esc(r.lastName)}</div>
        <div class="kv">BIB</div><div class="bib">${r.bib ? esc(r.bib) : '—'}</div>
        <div class="kv">${L('Ref', 'รหัส')} <b style="font-family:var(--mono)">${esc(r.ref)}</b></div></div>
        <div class="tqr">${r.ticketQr}</div></div>
      <div class="tf">${stChip(r.status)}<a class="btn small ${r.status === 'awaiting_payment' ? '' : 'ghost'}" href="${url}">${r.status === 'awaiting_payment' ? L('Pay now', 'ชำระเงิน') : L('Open', 'เปิด')}</a></div></article>`;
  }).join('')}</div>`;
}
document.addEventListener('DOMContentLoaded', () => {
  renderList();
  $('#resend').onsubmit = async ev => {
    ev.preventDefault();
    const email = $('#resendEmail').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast(L('Enter a valid email address.', 'อีเมลไม่ถูกต้อง')); return; }
    try { await api('/api/resend-link', { body: { email } }); toast(L('If that email has an entry, the links are on their way.', 'หากอีเมลนี้มีการสมัคร เราได้ส่งลิงก์ไปแล้ว')); }
    catch (e) { toast(e.message); }
  };
});
window.onLangChange = renderList;
