import { createIds } from './ids.mjs';

export function createPaymentStore({ clock = () => new Date() } = {}) {
  const nextId = createIds('pay');
  const payments = new Map();
  return {
    create({ amount, currency }) {
      const payment = { id: nextId(), currency, amount, status: 'authorized', capturedAmount: 0, createdAt: clock().toISOString() };
      payments.set(payment.id, payment);
      return payment;
    },
    get: (id) => payments.get(id) ?? null,
    list: () => [...payments.values()],
  };
}
