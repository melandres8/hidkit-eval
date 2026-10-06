import { compare } from '../lib/order.mjs';

// True when the products are in stored order, with no SKU twice.
export const isStored = (list) => list.every((p, i) => i === 0 || compare(list[i - 1].sku, p.sku) < 0);

// Merges two lists in stored order. A product of `feed` replaces the product of `base` with the same SKU.
export function mergeLists(base, feed) {
  const out = [];
  let added = 0;
  let updated = 0;
  let i = 0;
  let j = 0;
  while (i < base.length || j < feed.length) {
    const order = i >= base.length ? 1 : j >= feed.length ? -1 : compare(base[i].sku, feed[j].sku);
    if (order < 0) out.push(base[i++]);
    else if (order > 0) { out.push(feed[j++]); added += 1; }
    else { out.push(feed[j++]); i += 1; updated += 1; }
  }
  return { list: out, added, updated };
}
