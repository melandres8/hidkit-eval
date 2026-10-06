import { compare } from '../lib/order.mjs';

// A list of SKUs in stored order, read with a binary search.
export function createIndex(sorted = []) {
  let skus = [...sorted];
  // The position of the SKU, or -(insert position) - 1 when it is not in the list.
  const locate = (sku) => {
    let low = 0;
    let high = skus.length - 1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      const order = compare(skus[mid], sku);
      if (order === 0) return mid;
      if (order < 0) low = mid + 1;
      else high = mid - 1;
    }
    return -low - 1;
  };
  return {
    list: () => [...skus],
    // Replaces the list. The new list must already be in stored order.
    load(list) {
      skus = [...list];
    },
    has: (sku) => locate(sku) >= 0,
    // Adds the SKU in its place. It returns false when the SKU is already in the list.
    add(sku) {
      const at = locate(sku);
      if (at >= 0) return false;
      skus.splice(-at - 1, 0, sku);
      return true;
    },
  };
}
