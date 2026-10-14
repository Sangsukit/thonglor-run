// Minimal Omise REST client (https://docs.opn.ooo). Amounts are in satang.
import { config } from '../config.js';

async function call(method, path, form) {
  const res = await fetch(config.omise.apiUrl + path, {
    method,
    headers: {
      Authorization: 'Basic ' + Buffer.from(config.omise.secretKey + ':').toString('base64'),
      ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {})
    },
    body: form ? new URLSearchParams(form).toString() : undefined
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.object === 'error') {
    const err = new Error(json.message || `Omise ${res.status}`);
    err.omise = json; err.status = res.status;
    throw err;
  }
  return json;
}

export function createPromptpayCharge(reg) {
  return call('POST', '/charges', {
    amount: String(reg.price_thb * 100),
    currency: 'thb',
    'source[type]': 'promptpay',
    description: `Thonglor Charity Run ${reg.pack} ${reg.ref}`,
    'metadata[ref]': reg.ref,
    return_uri: `${config.baseUrl}/ticket?ref=${reg.ref}&t=${reg.access_token}`
  });
}

export function createCardCharge(reg, cardToken) {
  return call('POST', '/charges', {
    amount: String(reg.price_thb * 100),
    currency: 'thb',
    card: cardToken,
    description: `Thonglor Charity Run ${reg.pack} ${reg.ref}`,
    'metadata[ref]': reg.ref,
    return_uri: `${config.baseUrl}/ticket?ref=${reg.ref}&t=${reg.access_token}`
  });
}

export const retrieveCharge = id => call('GET', `/charges/${encodeURIComponent(id)}`);

/** Fetch the PromptPay QR image (SVG/PNG) for a charge, authenticated. */
export async function fetchQrImage(charge) {
  const uri = charge?.source?.scannable_code?.image?.download_uri;
  if (!uri) return null;
  const res = await fetch(uri, { headers: { Authorization: 'Basic ' + Buffer.from(config.omise.secretKey + ':').toString('base64') } });
  if (!res.ok) return null;
  return { type: res.headers.get('content-type') || 'image/svg+xml', body: Buffer.from(await res.arrayBuffer()) };
}
