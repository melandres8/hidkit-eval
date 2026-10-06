import { conflict } from '../http/errors.mjs';
import { createIndex } from './index.mjs';

// The products of the shop. `stored` is a list in stored order: the service keeps that order.
export function createStore(stored = []) {
  const byKey = new Map(stored.map((p) => [p.sku, { ...p }]));
  const index = createIndex(stored.map((p) => p.sku));
  return {
    all: () => index.list().map((sku) => ({ ...byKey.get(sku) })),
    snapshot: () => index.list().map((sku) => ({ ...byKey.get(sku) })),
    get: (sku) => (index.has(sku) ? { ...byKey.get(sku) } : null),
    add(product) {
      if (!index.add(product.sku)) throw conflict('sku exists');
      byKey.set(product.sku, { ...product });
      return { ...product };
    },
    // Replaces every product with a list that is already in stored order.
    replaceAll(list) {
      byKey.clear();
      for (const p of list) byKey.set(p.sku, { ...p });
      index.load(list.map((p) => p.sku));
    },
  };
}
