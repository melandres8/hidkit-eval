# job-scheduler

A small scheduler for daily jobs. A job has a local time of day and a time zone. The scheduler tells the app when to run it.

## Run the tests

    npm test

## Layout

- `src/scheduler.mjs` has `createScheduler({ clock, onRun })`.
- `src/schedule/` computes run times.
- `src/store/jobs.mjs` keeps the jobs in memory.
- `src/jobs/` holds the job handlers. `src/jobs/index.mjs` is the handler table.
- `src/load.mjs` reads jobs from a JSON file. `data/jobs.json` is the list that the app starts with.
- `docs/` has the rules. Read `docs/scheduling.md` before you change a run time. Read `docs/jobs.md` before you change a job handler: it says what each handler records.
