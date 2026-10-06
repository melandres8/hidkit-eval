# Architecture

The gateway has no server. `createGateway({ config, clock, sessions })` returns an object with `handle(request)` and `audit`.

A request has `method`, `path`, `headers`, `remoteAddress` and `body`. Header names are in lower case. A response has `status`, `body` and sometimes `headers`.

`handle` runs these steps in order:

1. Refuse the request with `403` when its address is on the blocklist.
2. Find the user. A request with a header `authorization: Bearer <token>` belongs to the user of that token in `sessions`.
3. Find the route. Answer `404` when there is none.
4. Answer `401` when the route needs a user and there is none.
5. Check the limiter of the route. Answer `429` when the caller is over the limit.
6. Run the route.

The audit log gets one entry for each request.

The blocklist and the audit log use the address of the connection (`remoteAddress`). They do not read `x-forwarded-for`, and they do not use the user.

The config comes from `config/gateway.json`. Tests pass their own object with the same shape.
