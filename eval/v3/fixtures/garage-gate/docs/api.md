# API

Bodies and results are JSON.

| Method | Path | Result |
|---|---|---|
| GET | `/health` | `200` and `{ ok: true }`. |
| POST | `/camera` | The camera read a plate. The body is `{ camera, plate }`. `200` and `{ open, reason }`: `reason` is `pass`, `no-pass` or `blocked`. The read goes into the entry log. |
| GET | `/entries` | `200` and the entries of the day `?date=YYYY-MM-DD` (UTC), oldest first: `{ at, camera, plate, open, reason }`. |
| GET | `/passes` | `200` and the list of passes, in the order they were added. |
| POST | `/passes` | `201` and the pass. The body is `{ plate, holder, until }`. `409` if the plate already has a pass. |
| GET | `/blocked` | `200` and the blocklist. |
| POST | `/blocked` | `201` and the entry. The body is `{ plate, reason }`. |

A plate text has 1 to 16 characters: letters, digits, spaces and dashes. A holder and a reason have 1 to 100 characters. A value that breaks a rule gets `400`.

A car on the blocklist stays out, also when it has a pass. A pass is valid up to and including its `until` day.
