# Tenancy

Each record belongs to one tenant. A tenant must never read or change the records of another tenant.

## Rules

- Every query goes through `scopeToTenant(query, ctx)` from `src/tenancy/scope.mjs`. The helper adds the tenant of the caller to the `where` clause.
- Every new record gets `tenantId: ctx.tenantId`.
- The tenant comes from `ctx` only. Never read a tenant from the body, the query string or a path.
- A caller never learns that a record of another tenant exists. Such a record looks like a missing record: a `404` for one record, and no entry in a list.
- People of one tenant share the tenant data. A project that a colleague made is visible to everyone in the tenant.
