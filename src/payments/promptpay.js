// EMVCo "Thai QR" payload for PromptPay with a fixed amount.
const tlv = (tag, value) => tag + String(value.length).padStart(2, '0') + value;

function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function promptpayPayload(id, amountThb) {
  const digits = String(id).replace(/\D/g, '');
  const account = digits.length >= 13
    ? tlv('02', digits)                                                   // national / tax ID
    : tlv('01', ('0066' + digits.replace(/^0/, '')).padStart(13, '0'));  // mobile number
  const body = tlv('00', '01') + tlv('01', '12') +
    tlv('29', tlv('00', 'A000000677010111') + account) +
    tlv('53', '764') + tlv('54', Number(amountThb).toFixed(2)) + tlv('58', 'TH') + '6304';
  return body + crc16(body);
}
