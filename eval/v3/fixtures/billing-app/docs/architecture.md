# Architecture

The app has no server. `createApp({ dataDir, clock })` returns an object with `handle(request)` and `store`. A request has `method`, `path`, `query` and `body`. A response has `status` and `body`.

`dataDir` is the folder of the invoice files. `clock` is a function that returns a `Date`. Tests pass their own.

Each output reads an invoice:

| Output | Code |
|---|---|
| API | `src/api/invoices.mjs` |
| Document (PDF source) | `src/pdf/render.mjs` |
| CSV export | `src/export/csv.mjs` |

The money math is in `src/billing/`.
