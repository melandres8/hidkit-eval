# Architecture

The service has no server. `createApp()` returns an object with a `handle(request)` function and a `runJob(name, options)` function.

A request has a `method`, a `path`, and an optional `body` and `query`.

The parts:

| Part | Folder | Job |
|---|---|---|
| Routes | `src/api/` | Map a route to database and rollup calls. |
| Database | `src/db/` | Keep the readings in memory. |
| Rollups | `src/rollup/` | Compute the numbers for a period. |
| Jobs | `src/jobs/` | Work that does not come from one route. |
