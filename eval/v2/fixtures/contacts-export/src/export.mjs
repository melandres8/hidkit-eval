import { toCsv } from './csv.mjs';

export const CONTACT_COLUMNS = ['name', 'company', 'email'];

export function exportContacts(contacts) {
  return toCsv(contacts, CONTACT_COLUMNS);
}
