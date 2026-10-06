import fs from 'node:fs';
import path from 'node:path';
import { computeTotals } from '../billing/totals.mjs';

// One JSON file for each invoice. The store reads the folder once and writes a file when an invoice changes.
export function createInvoiceStore({ dir, clock = () => new Date() }) {
  fs.mkdirSync(dir, { recursive: true });
  const invoices = new Map();
  for (const name of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    const invoice = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
    invoices.set(invoice.id, invoice);
  }

  const save = (invoice) => fs.writeFileSync(path.join(dir, `${invoice.id}.json`), `${JSON.stringify(invoice, null, 2)}\n`);

  function nextId() {
    const year = clock().getUTCFullYear();
    const used = [...invoices.keys()].map((id) => id.split('-')).filter(([, y]) => Number(y) === year).map(([, , n]) => Number(n));
    return `inv-${year}-${String(Math.max(0, ...used) + 1).padStart(4, '0')}`;
  }

  return {
    list: () => [...invoices.values()],
    get: (id) => invoices.get(id) ?? null,
    createDraft({ customer, currency = 'USD', taxRateBps = 0, lines }) {
      const id = nextId();
      const invoice = { id, number: id.toUpperCase(), customer, currency, status: 'draft', taxRateBps, lines };
      invoices.set(id, invoice);
      save(invoice);
      return invoice;
    },
    issue(id) {
      const invoice = invoices.get(id);
      if (!invoice || invoice.status !== 'draft') return null;
      invoice.totals = computeTotals(invoice);
      invoice.status = 'issued';
      invoice.issuedAt = clock().toISOString();
      save(invoice);
      return invoice;
    },
  };
}
