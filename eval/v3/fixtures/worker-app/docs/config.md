# Settings

The worker reads one JSON file. Defaults fill the keys that the file leaves out. An environment variable overrides the file. `src/config/env.mjs` lists the variables.

## Keys

| Key | Meaning | Default |
|---|---|---|
| `db.url` | URL of the database. Required. | none |
| `cache.url` | URL of the cache. | none |
| `queue.name` | Name of the queue. Required. | `jobs` |
| `queue.pollIntervalMs` | Time between two reads of the queue. | `500` |
| `pool.size` | Number of database connections. | `5` |
| `log.level` | `debug`, `info`, `warn` or `error`. | `info` |

## Environment variables

| Variable | Key |
|---|---|
| `WORKER_DB_URL` | the database URL |
| `WORKER_CACHE_URL` | `cache.url` |
| `WORKER_QUEUE` | `queue.name` |
| `WORKER_LOG_LEVEL` | `log.level` |

## Deprecation policy

A release can rename a key. Follow these rules when it does.

- The old key keeps working for at least two releases. Existing settings files must load with no change.
- The loader moves the value of the old key to the new key. It calls `warn` once for each deprecated key in a file. One load gives one warning for one key, however many parts of the worker read the value.
- When a file sets both keys, the new key wins. The warning names the old key and the new key.
- A key name that a person types, such as the argument of a command, accepts the old name too. It gives the same warning as a file does.
- The examples in `examples/` and the output of `config check` use the new key only.
