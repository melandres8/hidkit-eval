# payments-service

A small payments service. It creates payments, captures them, keeps a ledger, and tells other systems about changes.

## Run the tests

    npm test

## Layout

- `src/app.mjs` builds the service from a clock and a webhook transport.
- `src/handlers/` has one module per group of routes. `src/handlers/index.mjs` mounts them.
- `src/services/` holds the payment logic.
- `src/store/` holds the payment store and the ledger.
- `src/jobs/` holds the jobs. `src/jobs/index.mjs` lists the ones that run by name.
- `docs/` has the rules of the service. Read `docs/money.md` before you touch an amount.
