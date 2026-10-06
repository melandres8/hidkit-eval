# events-service

A small service that tells other systems about events. A client posts an event. The service sends it to every subscribed endpoint as a webhook.

## Run the tests

    npm test

## Layout

- `src/app.mjs` builds the service from a clock and a transport.
- `src/api/` has one module per group of routes. `src/api/index.mjs` mounts them.
- `src/store/` keeps events, subscriptions and deliveries in memory.
- `src/delivery/` builds a webhook request and sends it.
- `src/jobs/` holds the scheduled jobs. `src/jobs/index.mjs` is the job table.
- `docs/` has the rules of the service. `docs/webhooks.md` is the delivery contract.
