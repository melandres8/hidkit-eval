# gradebook

The gradebook of a school course. Teachers add the scores of each student. The service shows the final grade in a report card, in the API and in the grades export.

## Run the tests

    npm test

## Layout

- `src/app.mjs` builds the service: `createApp({ terms, clock })`. `terms` is the stored data, in the shape of `data/terms.json`.
- `src/api/` has one module per group of routes. `src/api/index.mjs` mounts them.
- `src/grades/` has the grade rules. `src/report/` makes the report card.
- `src/jobs/` holds the jobs. `src/jobs/index.mjs` is the job table.
- `docs/` has the rules of the service. Read `docs/grading.md` before you change how a grade is computed or shown.
