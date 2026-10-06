# shop-catalog

The product catalog of a small online shop. A product has a SKU, a name, a category and a stock count. People list, search and export the products. A supplier sends a feed that the service merges into the catalog.

## Run the tests

    npm test

## Layout

- `src/app.mjs` builds the service: `createApp({ stored, clock })`.
- `src/api/` has one module per group of routes. `src/api/index.mjs` mounts them.
- `src/catalog/` keeps the products, the SKU index and the merge of a supplier feed.
- `src/search/` finds products by text.
- `src/jobs/` holds the jobs. `src/jobs/index.mjs` is the job table.
- `src/lib/` has the small shared helpers.
- `docs/` has the rules of the service. Read `docs/ordering.md` before you sort or compare text.
