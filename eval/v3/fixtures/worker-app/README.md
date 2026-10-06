# worker-app

A background worker. It reads jobs from a queue and runs them. It keeps its settings in one JSON file.

## Run the tests

    npm test

## Use

    node bin/worker.mjs config check examples/production.json
    node bin/worker.mjs migrate --config examples/production.json
    node bin/worker.mjs start --config examples/production.json

## Layout

- `bin/worker.mjs` is the command line entry. It calls `runCli` from `src/cli/index.mjs`.
- `src/worker.mjs` has `createWorker({ configFile, env, driver, warn })`.
- `src/config/` loads, checks and shows the settings. `src/config/load.mjs` has `loadConfig`.
- `src/db/` connects to the database and runs the migrations through a driver.
- `src/queue/` holds the job queue.
- `src/cli/` holds the commands. `src/cli/commands/index.mjs` is the command table.
- `examples/` has example settings files.
- `docs/` has the rules. Read `docs/config.md` before you change a setting.
