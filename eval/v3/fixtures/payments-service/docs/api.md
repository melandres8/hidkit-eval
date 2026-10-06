# API

| Method | Path | Result |
|---|---|---|
| GET | `/health` | `200` |
| POST | `/payments` | `201` and the payment. The body has `amount` and `currency`. |
| GET | `/payments/:id` | `200` and the payment, or `404`. |
| POST | `/payments/:id/captures` | `201` and the payment. Captures the full amount. |
| GET | `/ledger/balance?currency=USD` | `200` and the balance. |
| GET | `/reports/payments.csv` | `200` and the CSV text. |

An action on a payment is a sub-resource with a plural name, under `/payments/:id`. A `POST` that creates something answers `201`.

An error answers with a status from `400` to `499` and a body `{ "error": "..." }`.

The payment body has `id`, `currency`, `amount`, `status` and `capturedAmount`. Amounts follow `docs/money.md`.
