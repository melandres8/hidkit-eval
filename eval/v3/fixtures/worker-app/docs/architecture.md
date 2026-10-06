# Architecture

`createWorker({ configFile, env, driver, warn })` loads the settings and returns the worker. The worker has `config`, `queue`, `connect()` and `migrate()`.

- `configFile` is the path of a JSON settings file.
- `env` holds the environment variables. The default is `process.env`.
- `driver` talks to the database. It has `connect(url)` and `migrate(url)`. `connect` returns a handle. `migrate` returns the list of applied migrations. Tests pass their own driver.
- `warn(message)` receives each warning of the loader.

The command line wraps the worker. `runCli(argv, { stdout, stderr, env, driver })` runs one command and returns the exit code. It writes each warning to `stderr` with the prefix `warning: `.
