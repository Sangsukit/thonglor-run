// Printable runner tags for the gate. Staff hand each runner their tag with the race pack;
// the QR is the same TGR26:<ref> code as the e-ticket, so the check-in scanner reads both.
let items = [], capped = false;

// Static labels on this page carry both languages inline (data-en / data-th).
function localize() {
  document.querySelectorAll('[data-th]').forEach(el => { el.textContent = LANG === 'th' ? el.dataset.th : el.dataset.en; });
  document.querySelectorAll('[data-ph-th]').forEach(el => {
    if (!el.dataset.phEn) el.dataset.phEn = el.placeholder;
    el.placeholder = LANG === 'th' ? el.dataset.phTh : el.dataset.phEn;
  });
}

async function boot() {
  localize();
  const me = await api('/api/admin/me').catch(() => ({ signedIn: false }));
  $('#authErr').hidden = me.signedIn;
  $('#tagFilter').hidden = !me.signedIn;
  if (!me.signedIn) return;
  const p = new URLSearchParams(location.search);
  if (p.get('refs')) { $('#tRefs').value = p.get('refs'); $('#tWhich').value = ''; }
  if (p.get('pack')) $('#tPack').value = p.get('pack');
  $('#tagFilter').onsubmit = e => { e.preventDefault(); load(); };
  $('#tPack').onchange = $('#tWhich').onchange = load;
  $('#tPrint').onclick = () => window.print();
  $('#tMark').onclick = markPrinted;
  load();
}

async function load() {
  const qs = new URLSearchParams();
  const v = { pack: $('#tPack').value, unprinted: $('#tWhich').value, from: $('#tFrom').value, to: $('#tTo').value, refs: $('#tRefs').value.replace(/\s+/g, '') };
  for (const [k, x] of Object.entries(v)) if (x) qs.set(k, x);
  try {
    const r = await api('/api/admin/tags?' + qs);
    items = r.items;
    capped = r.capped; render();
  } catch (err) {
    if (err.status === 401) return boot();
    toast(err.message);
  }
}

const distLabel = it => it.pack === 'VIP' ? `VIP<small>${esc(it.distance)}</small>` : esc(it.pack);

function tag(it) {
  const cls = { '5K': 'k5', '10K': 'k10', VIP: 'vip' }[it.pack] || 'k10';
  return `<div class="rtag ${cls}">
    <div class="band"><span class="dist">${distLabel(it)}</span><span class="ev">Thonglor Charity Run 2026<br>Sun 15.11.2026 · 06:00</span></div>
    <div class="body">
      <div class="left">
        <span class="lbl">BIB</span>
        <div class="bib">${esc(it.bib || '—')}</div>
        <div class="bibname">${esc(it.bibName)}</div>
        <div class="full">${esc(it.firstName)} ${esc(it.lastName)}</div>
        <div class="meta">
          <div class="size"><span class="lbl">Shirt · เสื้อ</span><b>${esc(it.shirtSize)}</b></div>
          <div class="emg">Emergency · ฉุกเฉิน<b>${esc(it.emergencyPhone)}</b></div>
        </div>
      </div>
      <div class="right"><div class="qr">${it.qr}</div><div class="ref">${esc(it.ref)}</div></div>
    </div>
  </div>`;
}

function render() {
  const n = items.length;
  const sheets = [];
  for (let i = 0; i < n; i += 8) {
    const page = items.slice(i, i + 8).map(tag);
    while (page.length < 8) page.push('<div class="rtag blank"></div>');
    sheets.push(`<div class="sheet">${page.join('')}</div>`);
  }
  $('#sheets').innerHTML = sheets.join('') || `<p class="empty">${L('No confirmed entries match. Tags appear once payment is confirmed and a bib is issued.', 'ไม่พบผู้สมัครที่ชำระเงินแล้วตามเงื่อนไข ป้ายจะแสดงเมื่อยืนยันการชำระเงินและออก BIB แล้ว')}</p>`;
  const pages = sheets.length;
  $('#tCount').textContent = n
    ? L(`${n} tag${n > 1 ? 's' : ''} on ${pages} A4 sheet${pages > 1 ? 's' : ''}`, `${n} ป้าย บนกระดาษ A4 ${pages} แผ่น`) + (capped ? L(' (first 500, narrow the bib range for more)', ' (500 รายการแรก กรุณาระบุช่วง BIB)') : '')
    : '';
  $('#tPrint').disabled = !n;
  const unprinted = items.filter(i => !i.tagPrintedAt).length;
  $('#tMark').disabled = !unprinted;
  $('#tMark').textContent = L(`Mark ${unprinted} as printed`, `บันทึกว่าพิมพ์แล้ว ${unprinted} ป้าย`);
}

async function markPrinted() {
  const refs = items.filter(i => !i.tagPrintedAt).map(i => i.ref);
  if (!refs.length) return;
  try {
    const r = await api('/api/admin/tags/printed', { method: 'POST', body: { refs } });
    toast(L(`${r.marked} tags marked as printed.`, `บันทึกแล้ว ${r.marked} ป้าย`));
    load();
  } catch (err) { toast(err.message); }
}

window.onLangChange = () => { localize(); if (!$('#tagFilter').hidden) render(); };
document.addEventListener('DOMContentLoaded', boot);
