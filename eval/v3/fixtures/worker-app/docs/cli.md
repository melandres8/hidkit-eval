# Command line

| Command | What it does |
|---|---|
| `start --config <file>` | Connects to the database and starts the queue. |
| `migrate --config <file>` | Runs the migrations. It prints the database it works on, with the password masked. |
| `config check <file>` | Checks a settings file. It prints `config ok` and returns 0, or prints one line for each problem and returns 1. |
| `config show <file>` | Prints the settings as JSON. Passwords in URLs are masked. A key that a release renamed is shown under its new name only. The old key is not in the loaded settings. |
| `config get <file> <key>` | Prints the value of one key, such as `queue.name`. Passwords in URLs are masked. A key with no value prints an error and returns 1. |
| `version` | Prints the version. |

An unknown command returns 2. The default value of `--config` is `config/worker.json`.
