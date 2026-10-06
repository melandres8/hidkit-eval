// Tax on an amount for a rate in basis points, in minor units.
export function taxOn(amountMinor, rateBps) {
  return Math.round((amountMinor * rateBps) / 10000);
}
