# garage-gate

The gate of the car park of an office building. A camera at the gate reads the plate of each car. The gate opens for a car with a valid pass, and stays closed for a car on the blocklist. Every read goes into the entry log.

## Run the tests

    npm test

## Layout

- `src/app.mjs` builds the service: `createApp({ passes, blocked, clock })`. `passes` and `blocked` are the stored lists.
- `src/api/` has one module per group of routes. `src/api/index.mjs` mounts them.
- `src/camera/` reads a camera event. `src/gate/` decides if the gate opens.
- `src/passes/` keeps the passes. `src/log/` keeps the entry log.
- `src/jobs/` holds the jobs. `src/jobs/index.mjs` is the job table.
- `docs/` has the rules of the service. Read `docs/plates.md` before you change how a plate is read, kept or compared.
