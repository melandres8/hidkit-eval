// A payment gateway for tests. It charges at once and records each call.
export function createFakeGateway() {
  const calls = [];
  return {
    calls,
    async charge({ amountCents, cardToken }) {
      calls.push({ amountCents, cardToken });
      return { id: `ch_${calls.length}`, amountCents };
    },
  };
}
