// A line is { name, priceCents, quantity }. priceCents is the price of one unit.
export function lineTotal({ priceCents, quantity }) {
  return priceCents * quantity;
}
