import { isStored, mergeLists } from '../catalog/merge.mjs';
import { badRequest } from '../http/errors.mjs';
import { requireProduct } from '../lib/validate.mjs';

// Merges a feed that is in stored order into the catalog. It changes nothing when the feed is not valid.
export function mergeSupplierFeed({ store }, { feed } = {}) {
  if (!Array.isArray(feed)) throw badRequest('feed must be a list');
  const products = feed.map((item) => requireProduct(item));
  if (!isStored(products)) throw badRequest('feed is not in stored order');
  const { list, added, updated } = mergeLists(store.snapshot(), products);
  store.replaceAll(list);
  return { added, updated };
}
