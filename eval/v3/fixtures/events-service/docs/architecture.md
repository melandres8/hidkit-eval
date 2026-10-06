# Architecture

The service has no server. `createApp()` returns an object with a `handle(request)` function and a `runJob(name)` function. A request has a `method`, a `path` and an optional `body`. A response has a `status` and a `body`. Both functions return a promise.

The app takes two inputs: a `clock` (a function that returns a `Date`) and a `transport` (an object with an async `send({ url, headers, body })` function). The transport resolves with `{ status }`. It rejects when the network fails. Tests pass their own.

The parts:

| Part | Folder | Job |
|---|---|---|
| Routes | `src/api/` | Map a route to the stores and to the delivery code. |
| Stores | `src/store/` | Keep events, subscriptions and deliveries in memory. |
| Delivery | `src/delivery/` | Build a webhook request and send it through the transport. |
| Jobs | `src/jobs/` | Work that the scheduler starts. |
