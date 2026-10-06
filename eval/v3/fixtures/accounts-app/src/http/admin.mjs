import { forbidden } from './errors.mjs';

export function requireAdmin(actor) {
  if (actor?.role !== 'admin') throw forbidden();
}
