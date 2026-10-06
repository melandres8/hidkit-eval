const TAX_RATE = 0.19;

// order is { lines: [{ priceCents, quantity }], coupon: { percent } or null }.
// Invoices print tax per line, so we round per line.
export function invoiceTotal(order) {
  const subtotal = order.lines.reduce((sum, line) => sum + line.priceCents * line.quantity, 0);
  const percent = order.coupon ? order.coupon.percent : 0;
  const discount = Math.round((subtotal * percent) / 100);
  const tax = order.lines.reduce((sum, line) => {
    const net = (line.priceCents * line.quantity * (100 - percent)) / 100;
    return sum + Math.round(net * TAX_RATE);
  }, 0);
  return { subtotal, discount, tax, total: subtotal - discount + tax };
}
