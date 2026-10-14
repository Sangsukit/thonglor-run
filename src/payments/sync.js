// Single place that turns an Omise charge into our payment state.
import { retrieveCharge } from './omise.js';
import { getByRef, markPaid } from '../registrations.js';
import { sendPaidEmail } from '../email.js';

export async function syncCharge(chargeId) {
  const charge = await retrieveCharge(chargeId); // never trust webhook bodies; ask Omise directly
  const ref = charge?.metadata?.ref;
  if (!ref) return { ignored: 'no ref' };
  const reg = await getByRef(ref);
  if (!reg) return { ignored: 'unknown ref' };
  if (charge.status === 'successful' && charge.paid) {
    if (charge.amount !== reg.price_thb * 100 || charge.currency?.toLowerCase() !== 'thb') {
      console.error(`amount mismatch on ${ref}: charge ${charge.amount} ${charge.currency}`);
      return { ignored: 'amount mismatch' };
    }
    const method = charge.source?.type === 'promptpay' ? 'promptpay' : 'card';
    const { reg: paid, changed } = await markPaid(ref, { method, actor: 'omise', chargeId: charge.id });
    if (changed) sendPaidEmail(paid).catch(e => console.error('mail failed', e.message));
    return { paid: true, ref };
  }
  return { status: charge.status, ref };
}
