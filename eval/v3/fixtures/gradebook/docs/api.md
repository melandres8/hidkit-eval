# API

Bodies are JSON. The report card is plain text and the export is CSV.

| Method | Path | Result |
|---|---|---|
| GET | `/health` | `200` and `{ ok: true }`. |
| GET | `/terms/:term/students/:id/grade` | `200` and `{ student, percent, letter }`. `409` if the grade is not ready (`docs/grading.md`). |
| GET | `/terms/:term/students/:id/report-card` | `200` and the report card as text. `409` as above. |
| POST | `/terms/:term/students/:id/scores` | `201` and the score. The body has `category`, `points`, `max` and, for an excused score, `excused: true`. |
| GET | `/terms/:term/export.csv` | `200` and the CSV of the job `export-grades`. |

`points` and `max` are whole numbers, with `0 <= points <= max` and `1 <= max <= 1000`. `excused` is `true` or `false`. An unknown term, student or category gets `404` or `400`.

## The report card

One line per category, `<name>: <percent>%`, then the line `Final: <percent>% (<letter>)`.
