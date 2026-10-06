import { toCsv } from '../lib/csv.mjs';
import { compare } from '../lib/order.mjs';

// Builds the CSV of all products, one row for each product.
export function exportCatalog({ store, clock }) {
  const rows = store.all()
    .sort((a, b) => compare(a.name, b.name))
    .map((p) => [p.sku, p.name, p.category, p.stock]);
  return { filename: `catalog-${clock().toISOString().slice(0, 10)}.csv`, csv: toCsv(['sku', 'name', 'category', 'stock'], rows) };
}
