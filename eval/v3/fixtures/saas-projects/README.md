# saas-projects

A project tracker for companies. Each company is a tenant. A tenant has projects, and a project has tasks and comments.

## Run the tests

    npm test

## Layout

- `src/app.mjs` builds the service.
- `src/api/` has one module per group of routes. `src/api/index.mjs` mounts them.
- `src/db/` is the in-memory database.
- `src/search/` holds the search code.
- `src/jobs/` holds the jobs. `src/jobs/index.mjs` is the job table.
- `src/tenancy/` holds the tenant helpers.
- `docs/` has the rules of the service. Read `docs/tenancy.md` before you write a query.
