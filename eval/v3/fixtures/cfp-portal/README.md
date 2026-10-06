# cfp-portal

The call for papers of a small developer conference. Speakers send talk proposals and edit them. Organizers review them and give each accepted talk a room. The public program lists the accepted talks.

## Run the tests

    npm test

## Layout

- `src/app.mjs` builds the service: `createApp({ clock })`.
- `src/api/` has one module per group of routes. `src/api/index.mjs` mounts them.
- `src/talks/` keeps the talks and the rules for their fields.
- `src/jobs/` holds the jobs. `src/jobs/index.mjs` is the job table.
- `docs/` has the rules of the service. Read `docs/fields.md` before you change how a talk is written.
