# billing-app

The invoicing part of a small business app. It keeps invoices as JSON files, issues them, shows them as a text document (the PDF source) and exports them to CSV for the accountants.

## Run the tests

    npm test

## Layout

- `data/invoices/` holds one JSON file for each invoice.
- `src/store/invoices.mjs` reads and writes those files.
- `src/billing/` has the money math of an invoice.
- `src/pdf/render.mjs` builds the document text of an invoice.
- `src/export/csv.mjs` builds the CSV of many invoices.
- `src/api/` has the routes. `src/api/index.mjs` mounts them.
- `docs/` has the rules of the app. Read `docs/billing.md` before you touch an amount.
