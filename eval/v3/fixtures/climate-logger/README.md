# climate-logger

Collects temperature readings from sensors in a warehouse and reports the mean temperature of a sensor for a day or a week.

## Run the tests

    npm test

## Layout

- `src/app.mjs` builds the service: `createApp()`.
- `src/api/` has one module per group of routes. `src/api/index.mjs` mounts them.
- `src/db/` keeps the readings in memory.
- `src/rollup/` computes the numbers that the service reports for a period.
- `src/jobs/` holds the jobs. `src/jobs/index.mjs` is the job table.
- `src/lib/` has the small shared helpers.
- `docs/` has the rules of the service. Read `docs/rollups.md` before you change a number that the service reports or stores.
