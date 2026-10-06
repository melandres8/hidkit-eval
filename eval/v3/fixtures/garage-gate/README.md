# garage-gate

The gate of the car park of an office building. A camera at the gate reads the plate of each car. The gate opens for a car with a valid pass. Every read goes into the entry log. Each day, the service sends the city a file of the valid passes, so that those cars may also park in the street zone of the building.

## Run the tests

    npm test

## Layout

- `src/app.mjs` builds the service: `createApp({ passes, clock })`. `passes` is the stored list of passes.
- `src/api/` has one module per group of routes. `src/api/index.mjs` mounts them.
- `src/camera/` reads a camera event. `src/gate/` decides if the gate opens.
- `src/passes/` keeps the passes. `src/log/` keeps the entry log. `src/plates/` has the plate rules.
- `src/jobs/` holds the jobs. `src/jobs/index.mjs` is the job table, and `docs/jobs.md` describes each job.
- `docs/` has the rules of the service. Read `docs/plates.md` before you change how a plate is read, kept or compared.
