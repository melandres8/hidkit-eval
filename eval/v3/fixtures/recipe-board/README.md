# recipe-board

A recipe board for a cooking club. Members post recipes and comments. Visitors read the recipe pages, search, follow the feed, and the club gets a weekly email.

## Run the tests

    npm test

## Layout

- `src/app.mjs` builds the service: `createApp({ clock, mailer })`. `mailer.send({ to, subject, html })` sends one email.
- `src/api/` has one module per group of routes. `src/api/index.mjs` mounts them.
- `src/store/` keeps the recipes and their comments in memory.
- `src/views/` makes the HTML pages.
- `src/jobs/` holds the jobs. `src/jobs/index.mjs` is the job table.
- `docs/` has the rules of the service. Read `docs/output.md` before you put text from a person in a page.
