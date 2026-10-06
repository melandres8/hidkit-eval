# accounts-app

The accounts part of a small web product. It stores users, shows profiles, searches users, suggests handles when someone writes an @mention, exports users for the admin team, and sends a nightly digest.

## Run the tests

    npm test

## Layout

- `data/users.jsonl` holds the users, one JSON object per line.
- `src/store/users.mjs` reads and writes that file.
- `src/api/` has the routes. `src/api/index.mjs` mounts them.
- Each feature that reads the users has its own folder under `src/`.
- `src/jobs/` has the nightly jobs. `src/jobs/index.mjs` lists them.
- `docs/` has the rules of the product. Read `docs/data-retention.md` before you change how users are removed.
