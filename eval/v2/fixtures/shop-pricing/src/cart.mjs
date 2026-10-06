const TAX_RATE = 0.19;

// items is a list of { priceCents, quantity }. coupon is { percent } or null.
// The tax is rounded once, on the amount after the discount.
export function priceCart(items, coupon = null) {
  const subtotal = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  const percent = coupon ? coupon.percent : 0;
  const discount = Math.round((subtotal * percent) / 100);
  const tax = Math.round((subtotal - discount) * TAX_RATE);
  return { subtotal, discount, tax, total: subtotal - discount + tax };
}
