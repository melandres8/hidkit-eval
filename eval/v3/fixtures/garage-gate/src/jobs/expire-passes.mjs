export function expirePasses({ passes, clock }) {
  return { removed: passes.removeBefore(clock().toISOString().slice(0, 10)) };
}
