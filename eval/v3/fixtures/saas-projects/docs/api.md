# API

All routes need `ctx`. Bodies and results are JSON.

| Method | Path | Result |
|---|---|---|
| GET | `/health` | `200`. No `ctx` needed. |
| GET | `/projects` | `200` and the projects of the tenant. The query `status` filters the list. |
| POST | `/projects` | `201` and the project. The body has `name`. |
| GET | `/projects/:id` | `200` and the project, or `404`. |
| PATCH | `/projects/:id` | `200` and the project, or `404`. The body may have `name` and `status`. |
| POST | `/projects/bulk` | `200` and `{ updated: [ids] }`. The body has `ids` and `changes`. Only `changes.status` applies. |
| GET | `/projects/:id/tasks` | `200` and the tasks of the project, or `404`. |
| POST | `/projects/:id/tasks` | `201` and the task, or `404`. The body has `title`. |
| GET | `/projects/:id/comments` | `200` and the comments, or `404`. |
| POST | `/projects/:id/comments` | `201` and the comment, or `404`. The body has `body`. |
| GET | `/search?q=text` | `200` and `{ projects, tasks }`. See `docs/search.md`. |
| POST | `/exports` | `201` and `{ filename, csv }`. It runs the job `export-projects`. |

A project has `status` `active` or `archived`.

The bulk route skips the ids that the caller cannot see. The list `updated` has the ids that changed.
