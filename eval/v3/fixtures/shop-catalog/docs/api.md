# API

Bodies and results are JSON.

| Method | Path | Result |
|---|---|---|
| GET | `/health` | `200` and `{ ok: true }`. |
| GET | `/products` | `200` and the list of products. The query `category` keeps one category. |
| POST | `/products` | `201` and the product. The body has `sku`, `name`, `category` and `stock`. `409` if the SKU exists. |
| GET | `/skus/:sku` | `200` and the product, or `404`. |
| GET | `/categories` | `200` and the list of category names. Each name is in the list once. |
| GET | `/search?q=text` | `200` and `{ products }`. The match is a case-insensitive part of the name. A request with no `q` gets `400`. |
| POST | `/exports` | `201` and `{ filename, csv }`. It runs the job `export-catalog`. |

A SKU is a non-empty string. SKUs that differ only in case are different SKUs: `a-1` and `A-1` can both exist. `stock` is a whole number, zero or more.
