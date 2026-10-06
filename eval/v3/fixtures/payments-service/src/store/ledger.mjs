import { createIds } from './ids.mjs';

// The ledger is the source of truth for the balance.
// Every money event must be an entry. Do not change a balance in any other way.
// The amount of an entry is signed minor units: money in is positive, money out is negative.
export function createLedger({ clock = () => new Date() } = {}) {
  const nextId = createIds('led');
  const entries = [];
  return {
    record({ type, paymentId, currency, amount }) {
      const entry = Object.freeze({ id: nextId(), type, paymentId, currency, amount, at: clock().toISOString() });
      entries.push(entry);
      return entry;
    },
    entries: ({ paymentId } = {}) => entries.filter((e) => paymentId === undefined || e.paymentId === paymentId),
    balance: (currency) => entries.filter((e) => e.currency === currency).reduce((sum, e) => sum + e.amount, 0),
  };
}
