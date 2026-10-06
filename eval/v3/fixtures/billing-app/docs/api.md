# API

| Method | Path | Result |
|---|---|---|
| POST | `/invoices` | `201` and a draft invoice. The body has `customer`, `taxRateBps` and `lines`. |
| GET | `/invoices/:id` | `200` and the invoice with its `totals`, or `404`. |
| POST | `/invoices/:id/issue` | `200` and the issued invoice. |
| GET | `/invoices/:id/pdf` | `200` and the document text. |
| GET | `/exports/invoices.csv` | `200` and the CSV text of every invoice. |

A line has `description`, `quantity` and `unitPriceMinor`.

`totals` has `subtotal`, `tax` and `total`, in minor units.
