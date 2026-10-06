# Jobs

A job handler is a function `(job, scheduledAt)`. The table in `src/jobs/index.mjs` maps a task name to its handler.

| Task | What it does |
|---|---|
| `send-digest` | Counts the digests that went out. |
| `cleanup-temp` | Counts the cleanups of the temp folder. |
| `sync-ledger` | Counts the ledger syncs. Each run syncs the calendar day that ended before the run, in the zone of the job. `stats.lastWindow` holds the window as `{ from, to }`, two ISO 8601 strings. `from` is the start of that day and `to` is the start of the day of the run. |

The jobs that the app starts with are in `data/jobs.json`.
