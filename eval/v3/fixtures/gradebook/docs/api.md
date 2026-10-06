# API

Bodies are JSON. The report card is plain text and the export is CSV.

| Method | Path | Result |
|---|---|---|
| GET | `/health` | `200` and `{ ok: true }`. |
| GET | `/terms/:term/students/:id/grade` | `200` and `{ student, percent, letter }`. `409` if a category of the student has no score yet. |
| GET | `/terms/:term/students/:id/report-card` | `200` and the report card as text. `409` as above. |
| POST | `/terms/:term/students/:id/scores` | `201` and the score. The body has `category`, `points` and `max`. `409` for a closed term. |
| GET | `/terms/:term/export.csv` | `200` and the CSV of the job `export-grades`. |
| POST | `/terms/:term/close` | `200` and `{ term, students }`. It runs the job `close-term`. |

`points` and `max` are whole numbers, with `0 <= points <= max` and `1 <= max <= 1000`. An unknown term, student or category gets `404` or `400`.

## The report card

One line per category, `<name>: <percent>%`, then the line `Final: <percent>% (<letter>)`.
