# file-vault

A small file store for one team. People upload text files, read them, preview them and pack several of them into a bundle.

## Run the tests

    npm test

## Layout

- `src/app.mjs` builds the service: `createApp({ root, clock })`. `root` is the folder where the vault keeps its data.
- `src/api/` has one module per group of routes. `src/api/index.mjs` mounts them.
- `src/storage/` reads and writes the files.
- `src/preview/` makes the short text of a preview.
- `src/jobs/` holds the jobs. `src/jobs/index.mjs` is the job table.
- `docs/` has the rules of the service. Read `docs/paths.md` before you build a file path from a name.
