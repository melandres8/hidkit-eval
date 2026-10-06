# API

| Method | Path | Result |
|---|---|---|
| POST | `/users` | `201` and the user. The body has `name`, `email` and `handle`. |
| GET | `/users/:id` | `200` and the public profile, or `404`. |
| DELETE | `/users/:id` | `204`. |
| GET | `/search?q=text` | `200` and a list of users. |
| GET | `/mentions?prefix=text` | `200` and a list of handles. |
| GET | `/admin/users/export` | `200` and every user. |
| POST | `/admin/users/:id/restore` | `200` and the user. Works for 30 days after the delete. |

Routes under `/admin/` need `actor: { role: 'admin' }`. Other actors get `403`.

An error answers with a status from `400` to `499` and a body `{ "error": "..." }`.
