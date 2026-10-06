# API

Bodies and results are JSON. A value that breaks a limit gets `400`. A route for speakers answers `403` to an organizer or a visitor, and the reverse.

| Method | Path | Who | Result |
|---|---|---|---|
| GET | `/health` | anyone | `200` and `{ ok: true }`. |
| GET | `/talks` | speaker, organizer | `200` and the list of talks: a speaker gets their own, an organizer gets all. |
| GET | `/talks/:id` | speaker, organizer | `200` and the talk, or `404`. |
| POST | `/talks` | speaker | `201` and the new talk. The body has the speaker fields. |
| PATCH | `/talks/:id` | speaker | `200` and the talk. The body has the speaker fields to change. |
| POST | `/talks/:id/copy` | speaker | `201` and a new talk with the speaker fields of the talk `:id`. Fields in the body replace them. |
| POST | `/talks/import` | speaker | `201` and `{ talks }`. The body has `talks`, a list of at most 20 proposals. It runs the job `import-proposals`. |
| POST | `/talks/invited` | organizer | `201` and the new talk of an invited speaker, such as a keynote. The body has the speaker fields, `speakerId` and `room` (a room of `src/talks/rooms.mjs`). The talk starts with `status: "accepted"`. |
| POST | `/talks/:id/review` | organizer | `200` and the talk. The body has `status` (`accepted` or `rejected`) and `score` (1 to 5). |
| GET | `/program` | anyone | `200` and the accepted talks: `{ id, title, track, level, room }`, by track and then by title. |

## Values

A title has 1 to 200 characters and an abstract at most 3000. `track` is one of `web`, `data`, `ops`. `level` is `intro` or `deep`.
