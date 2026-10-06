# api-gateway

The front door of a small API. It refuses blocked addresses, signs users in, limits how often a caller can hit a route, and keeps an audit log.

## Run the tests

    npm test

## Layout

- `config/gateway.json` holds the proxies, the limits and the blocked addresses.
- `src/gateway.mjs` builds the gateway. Its `handle(request)` function answers one request.
- `src/routes/` has the routes. `src/routes/index.mjs` lists them.
- `src/limits/` has the limiter of each route that has a limit.
- `src/lib/` has small helpers: the limiter, the address helper and the key helper.
- `docs/` has the rules of the gateway.
