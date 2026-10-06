# Architecture

The service has no server. `createApp()` returns an object with a `handle(request)` function. A request has a `method`, a `path` and an optional `body`. A response has a `status` and a `body`.

The layer in front of the app checks who the caller is.

Every part that shows, sends or totals a payment amount follows `docs/money.md`.

The app takes two inputs: a `clock` (a function that returns a `Date`) and a `transport` (an object with a `send(event)` function). Tests pass their own.

The parts:

| Part | Folder | Job |
|---|---|---|
| Handlers | `src/handlers/` | Map a route to a service call. |
| Services | `src/services/` | Check the rules and change the state. |
| Payment store | `src/store/payments.mjs` | Keep the payments in memory. |
| Ledger | `src/store/ledger.mjs` | Keep the balance. |
| Jobs | `src/jobs/` | Run by name with `app.runJob(name)`. See `docs/jobs.md`. |
