import { compare } from '../lib/order.mjs';

// Finds the products whose name holds the text, ignoring case.
export function searchProducts(store, text) {
  const needle = text.toLowerCase();
  return store.all()
    .filter((p) => p.name.toLowerCase().includes(needle))
    .sort((a, b) => compare(a.name, b.name));
}
