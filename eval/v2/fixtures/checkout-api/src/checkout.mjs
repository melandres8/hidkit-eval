// req is { idempotencyKey, amountCents, cardToken }.
export function createCheckout({ gateway, store }) {
  return async function checkout({ idempotencyKey, amountCents, cardToken }) {
    if (!Number.isInteger(amountCents) || amountCents <= 0) throw new RangeError('amountCents must be a positive integer');
    if (idempotencyKey && store.has(idempotencyKey)) return store.get(idempotencyKey);
    const charge = await gateway.charge({ amountCents, cardToken });
    const result = { status: 'paid', chargeId: charge.id, amountCents };
    if (idempotencyKey) store.set(idempotencyKey, result);
    return result;
  };
}
