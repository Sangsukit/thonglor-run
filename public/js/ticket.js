/* Entry page: pay, then show the e-ticket */
const qs = new URLSearchParams(location.search);
const REF = (qs.get('ref') || '').toUpperCase(), TOKEN = qs.get('t') || '';
let reg = null, cfg = null, method = null, pollTimer = null, payState = {};

async function load() {
  try {
    [cfg, reg] = await Promise.all([api('/api/config'), api(`/api/registrations/${encodeURIComponent(REF)}?t=${encodeURIComponent(TOKEN)}`)]);
    myEntries.add({ ref: reg.ref, t: TOKEN, name: `${reg.firstName} ${reg.lastName}`, pack: reg.pack });
    render();
  } catch (e) {
    $('#root').innerHTML = `<div class="empty">${esc(L('We could not find that entry. Open the link from your confirmation email, or go to My entries to get it resent.', 'ไม่พบข้อมูลการสมัคร กรุณาเปิดลิงก์จากอีเมล หรือขอรับลิงก์ใหม่ที่หน้า การสมัครของฉัน'))}
      <div style="margin-top:14px"><a class="btn" href="/my">${L('My entries', 'การสมัครของฉัน')}</a></div></div>`;
  }
}

function ticketCard() {
  return `<article class="ticket bigticket" style="--pc:var(${packColor(reg.pack)})">
    <div class="tb"><span class="n">${reg.pack}${reg.pack === 'VIP' ? ' · ' + reg.distance : ''}</span><span style="font-family:var(--mono);font-size:13px">15.11.2026 · 06:00</span></div>
    <div class="tm"><div style="display:grid;gap:6px;min-width:0"><div class="name">${esc(reg.firstName)} ${esc(reg.lastName)}</div>
      <div class="kv">BIB</div><div class="bib">${reg.bib ? esc(reg.bib) : '—'}</div>
      <div class="kv">${L('Name on bib', 'ชื่อบน BIB')} <b>${esc(reg.bibName)}</b> · ${L('Shirt', 'เสื้อ')} <b>${esc(reg.shirtSize)}</b></div>
      <div class="kv">${L('Ref', 'รหัส')} <b style="font-family:var(--mono)">${esc(reg.ref)}</b></div></div>
      <div class="tqr">${reg.ticketQr}</div></div>
    <div class="tf">${stChip(reg.status)}${reg.pickedUpAt ? `<span class="chip st-paid">${L('Race pack collected', 'รับ race pack แล้ว')}</span>` : ''}</div>
  </article>`;
}

function render() {
  clearInterval(pollTimer);
  const s = reg.status;
  let top = '';
  if (s === 'paid') {
    top = `<div class="head"><div><div class="eyebrow">${L('You\'re in', 'สมัครเรียบร้อย')}</div><h2>${L('See you on 15 November', 'พบกันวันที่ 15 พฤศจิกายน')}</h2>
      <p>${L('Show this QR code when you collect your race pack. We\'ve also emailed it to', 'แสดง QR นี้ตอนรับ race pack และเราได้ส่งไปที่')} ${esc(reg.email)}.</p></div></div>${ticketCard()}`;
  } else if (s === 'awaiting_payment') {
    const by = reg.expiresAt ? new Date(reg.expiresAt).toLocaleString(LANG === 'th' ? 'th-TH' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '';
    top = `<div class="head"><div><div class="eyebrow">${L('Step 2 of 2', 'ขั้นตอนที่ 2 จาก 2')}</div><h2>${L('Pay to confirm your spot', 'ชำระเงินเพื่อยืนยันสิทธิ์')}</h2>
      <p>${by ? L(`We're holding your spot until ${by}.`, `เราจองที่ให้คุณถึง ${by}`) : ''}</p></div></div>
      <div class="panel" id="payPanel"></div>`;
  } else if (s === 'verifying') {
    top = `<div class="head"><div><div class="eyebrow">${L('Payment sent', 'แจ้งโอนแล้ว')}</div><h2>${L('We\'re checking your transfer', 'กำลังตรวจสอบยอดโอน')}</h2>
      <p>${L('The organizer confirms transfers by hand, usually within a day. Your bib number appears here and in your email once it\'s confirmed.', 'ผู้จัดจะตรวจสอบยอดโอนภายใน 1 วัน หมายเลข BIB จะแสดงที่นี่และส่งทางอีเมล')}</p></div></div>${ticketCard()}`;
    pollTimer = setInterval(refresh, 20000);
  } else {
    top = `<div class="notice bad">${s === 'expired'
      ? L('This entry expired because it wasn\'t paid in time, and the spot was released. You can register again if spots are left.', 'การสมัครนี้หมดเวลาชำระเงินแล้ว คุณสามารถสมัครใหม่ได้หากยังมีที่ว่าง')
      : L('This entry was cancelled. Contact the organizer if this is a mistake.', 'การสมัครนี้ถูกยกเลิก กรุณาติดต่อผู้จัดหากไม่ถูกต้อง')}</div>
      <div style="margin-top:14px"><a class="btn" href="/#register">${L('Register again', 'สมัครใหม่')}</a></div>`;
  }
  $('#root').innerHTML = top + `
    <div class="panel review" style="margin-top:18px"><div class="eyebrow" style="margin-bottom:10px">${L('Entry details', 'รายละเอียดการสมัคร')}</div><dl>
      <dt>${L('Race pack', 'แพ็กเกจ')}</dt><dd>${reg.pack}${reg.pack === 'VIP' ? ' · ' + reg.distance : ''} · ${fmt(reg.price)} THB</dd>
      <dt>${L('Runner', 'นักวิ่ง')}</dt><dd>${esc(reg.firstName)} ${esc(reg.lastName)}</dd>
      <dt>${L('ID / passport', 'บัตร/พาสปอร์ต')}</dt><dd>${esc(reg.idMasked)}</dd>
      <dt>${L('Email', 'อีเมล')}</dt><dd>${esc(reg.email)}</dd>
      <dt>${L('Reference', 'รหัสอ้างอิง')}</dt><dd style="font-family:var(--mono)">${esc(reg.ref)}</dd></dl></div>`;
  if (s === 'awaiting_payment') renderPay();
}

function renderPay() {
  const p = cfg.payments;
  const methods = [];
  if (p.omise || p.manualPromptpay) methods.push(['promptpay', 'PromptPay QR']);
  if (p.omise) methods.push(['card', L('Credit / debit card', 'บัตรเครดิต / เดบิต')]);
  if (!methods.length) {
    $('#payPanel').innerHTML = `<p>${L('Online payment opens soon. We\'ll email you as soon as you can pay; your spot stays held until then.', 'ระบบชำระเงินออนไลน์จะเปิดเร็ว ๆ นี้ เราจะแจ้งทางอีเมล')}</p>`;
    return;
  }
  method = method || methods[0][0];
  $('#payPanel').innerHTML = `<div class="amount num" style="margin-bottom:14px">${fmt(reg.price)} <span style="font-size:20px">THB</span></div>
    <div class="paytabs" role="group" aria-label="Payment method">${methods.map(([k, n]) => `<button type="button" data-m="${k}" aria-pressed="${k === method}">${n}</button>`).join('')}</div>
    <div id="payBody"></div><div class="notice bad" id="payErr" hidden style="margin-top:12px"></div>`;
  document.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { method = b.dataset.m; renderPay(); });
  if (method === 'promptpay') renderPromptpay(); else renderCard();
}
const showErr = msg => { const e = $('#payErr'); e.textContent = msg; e.hidden = !msg; };

async function renderPromptpay() {
  const manual = cfg.payments.manualPromptpay;
  $('#payBody').innerHTML = `<div class="pay"><div class="qrbox" id="qr"><span class="spinner" style="color:#59606D"></span></div>
    <div style="display:grid;gap:10px;min-width:0">
      <ol style="margin:0;padding-left:20px;display:grid;gap:4px">
        <li>${L('Open your banking app and scan the QR code.', 'เปิดแอปธนาคารแล้วสแกน QR')}</li>
        <li>${L('Check the amount is', 'ตรวจสอบยอด')} <b>${fmt(reg.price)} THB</b>${manual && cfg.payments.promptpayName ? ` ${L('to', 'ไปยัง')} <b>${esc(cfg.payments.promptpayName)}</b>` : ''}.</li>
        <li>${manual ? L('After paying, tell us below so we can check it.', 'โอนแล้วแจ้งด้านล่าง') : L('This page updates by itself once the payment goes through.', 'หน้านี้จะอัปเดตเองเมื่อชำระสำเร็จ')}</li>
      </ol>
      ${manual ? `<div class="field"><label for="payNote">${L('Transfer time or last 4 digits of your account (optional)', 'เวลาโอน หรือเลขท้ายบัญชี 4 หลัก (ถ้ามี)')}</label><input type="text" id="payNote" maxlength="60"></div>
        <div><button class="btn" type="button" id="claimBtn">${L('I\'ve transferred', 'โอนเงินแล้ว')}</button></div>`
      : `<div class="kv"><span class="spinner"></span> ${L('Waiting for payment…', 'รอการชำระเงิน…')}</div>`}
    </div></div>`;
  try {
    if (!payState.qrUrl) payState = await api(`/api/registrations/${REF}/pay`, { body: { t: TOKEN, method: 'promptpay' } });
    $('#qr').innerHTML = `<img src="${esc(payState.qrUrl)}" alt="PromptPay QR code for ${fmt(reg.price)} THB" width="196" height="196">`;
  } catch (e) { showErr(e.message); $('#qr').innerHTML = ''; return; }
  if (manual) {
    $('#claimBtn').onclick = async () => {
      try { await api(`/api/registrations/${REF}/claim-transfer`, { body: { t: TOKEN, note: $('#payNote').value } }); await refresh(); }
      catch (e) { showErr(e.message); }
    };
  } else {
    pollTimer = setInterval(refresh, 4000);
  }
}

function loadOmise() {
  return new Promise((res, rej) => {
    if (window.Omise) return res(window.Omise);
    const s = document.createElement('script'); s.src = 'https://cdn.omise.co/omise.js';
    s.onload = () => res(window.Omise); s.onerror = () => rej(new Error(L('Could not load the card form. Check your connection.', 'โหลดฟอร์มบัตรไม่สำเร็จ')));
    document.head.appendChild(s);
  });
}
function renderCard() {
  $('#payBody').innerHTML = `<form class="cardform" id="cardForm" novalidate autocomplete="on">
    <div class="field"><label for="cName">${L('Name on card', 'ชื่อบนบัตร')}</label><input type="text" id="cName" autocomplete="cc-name" required></div>
    <div class="field"><label for="cNum">${L('Card number', 'หมายเลขบัตร')}</label><input type="text" id="cNum" inputmode="numeric" autocomplete="cc-number" required></div>
    <div class="row">
      <div class="field"><label for="cMon">${L('Month', 'เดือน')}</label><input type="text" id="cMon" inputmode="numeric" placeholder="MM" maxlength="2" autocomplete="cc-exp-month"></div>
      <div class="field"><label for="cYear">${L('Year', 'ปี')}</label><input type="text" id="cYear" inputmode="numeric" placeholder="YYYY" maxlength="4" autocomplete="cc-exp-year"></div>
      <div class="field"><label for="cCvc">CVC</label><input type="text" id="cCvc" inputmode="numeric" maxlength="4" autocomplete="cc-csc"></div>
    </div>
    <div><button class="btn" type="submit" id="cardBtn">${L('Pay', 'ชำระ')} ${fmt(reg.price)} THB</button></div>
    <div class="kv">${L('Card details go straight to our payment provider, Omise. We never see or store them.', 'ข้อมูลบัตรส่งตรงไปยังผู้ให้บริการชำระเงิน Omise เราไม่เห็นและไม่เก็บข้อมูลบัตร')}</div></form>`;
  $('#cardForm').onsubmit = async e => {
    e.preventDefault(); showErr('');
    const btn = $('#cardBtn'); btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> ${L('Processing…', 'กำลังดำเนินการ…')}`;
    const done = msg => { btn.disabled = false; btn.textContent = `${L('Pay', 'ชำระ')} ${fmt(reg.price)} THB`; if (msg) showErr(msg); };
    try {
      const Omise = await loadOmise();
      Omise.setPublicKey(cfg.payments.omisePublicKey);
      const token = await new Promise((res, rej) => Omise.createToken('card', {
        name: $('#cName').value.trim(), number: $('#cNum').value.replace(/\s/g, ''),
        expiration_month: $('#cMon').value, expiration_year: $('#cYear').value, security_code: $('#cCvc').value
      }, (code, r) => (code === 200 ? res(r.id) : rej(new Error(r.message || L('Check your card details.', 'ตรวจสอบข้อมูลบัตร'))))));
      const r = await api(`/api/registrations/${REF}/pay`, { body: { t: TOKEN, method: 'card', cardToken: token } });
      if (r.authorizeUri) { location.href = r.authorizeUri; return; } // 3-D Secure
      await refresh(); done();
    } catch (err) { done(err.message); }
  };
}

async function refresh() {
  try {
    const next = await api(`/api/registrations/${REF}?t=${encodeURIComponent(TOKEN)}`);
    const changed = next.status !== reg.status;
    reg = next;
    if (changed) { render(); if (reg.status === 'paid') toast(L('Payment received. You\'re in!', 'ชำระเงินเรียบร้อย')); }
  } catch { /* keep polling */ }
}

window.onLangChange = () => reg && render();
document.addEventListener('DOMContentLoaded', load);
