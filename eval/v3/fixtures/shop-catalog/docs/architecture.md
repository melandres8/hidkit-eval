# Architecture

The service has no server. `createApp({ stored, clock })` returns an object with a `handle(request)` function, a `runJob(name, options)` function and a `snapshot()` function.

- `stored` is a list of products. It is in stored order, the same order that `snapshot()` returns. The service does not sort it again when it starts.
- `snapshot()` returns copies of all products in stored order.

A request has a `method`, a `path`, and an optional `body` and `query`.

The parts:

| Part | Folder | Job |
|---|---|---|
| Routes | `src/api/` | Map a route to catalog calls. |
| Catalog | `src/catalog/` | Keep the products, the SKU index and the merge. |
| Search | `src/search/` | Find products by text. |
| Jobs | `src/jobs/` | Work that does not come from one route. |
