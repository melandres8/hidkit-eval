# Architecture

The app has no server. `createApp()` returns an object with these members:

- `handle(request)` answers a request. A request has `method`, `path`, `query`, `body` and `actor`. A response has `status` and `body`.
- `store` is the user store.
- `runJob(name)` runs a nightly job.

The layer in front of the app finds out who the caller is and sets `actor`. The app trusts it.

`createApp()` takes `usersFile` (the path of the JSON lines file), `clock` (a function that returns a `Date`) and `mailer` (an object with a `send(message)` function). Tests pass their own.

Features read users from the store. Each feature has its own folder under `src/`, and the nightly jobs are in `src/jobs/`. A feature that shows or counts users goes through the store, as the others do.
