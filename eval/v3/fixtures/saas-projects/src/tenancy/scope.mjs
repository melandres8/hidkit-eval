// Adds the tenant of the caller to a query. See docs/tenancy.md.
export function scopeToTenant(query, ctx) {
  return { ...query, where: { ...query.where, tenantId: ctx.tenantId } };
}
