import { badRequest } from '../http/errors.mjs';

const text = (value, name) => {
  if (typeof value !== 'string' || value.trim() === '') throw badRequest(`${name} is required`);
  return value.trim();
};

export function requireProduct(body) {
  if (!Number.isInteger(body.stock) || body.stock < 0) throw badRequest('stock must be a whole number, zero or more');
  return { sku: text(body.sku, 'sku'), name: text(body.name, 'name'), category: text(body.category, 'category'), stock: body.stock };
}
