# Architecture

The service has no server. `createApp()` returns an object with a `handle(request)` function and a `runJob(name, options)` function.

A request has a `method`, a `path`, an optional `body` and `query`, and a `ctx`. The layer in front of the app checks who the caller is and sets `ctx` to `{ tenantId, userId }`. A request with no `ctx` gets `401`.

The parts:

| Part | Folder | Job |
|---|---|---|
| Routes | `src/api/` | Map a route to database calls. |
| Database | `src/db/` | Keep projects, tasks and comments in memory. |
| Search | `src/search/` | Find projects and tasks by text. |
| Jobs | `src/jobs/` | Work that does not come from a request. |
| Tenancy | `src/tenancy/` | Helpers for the tenant rules. |
