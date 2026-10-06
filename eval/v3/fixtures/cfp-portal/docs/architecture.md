# Architecture

The service has no server. `createApp({ clock })` returns an object with a `handle(request)` function and a `runJob(name, options)` function. `clock` returns the current `Date`.

A request has a `method`, a `path`, an optional `query`, an optional `body` and a `caller`. The layer in front of the app checks the login and sets `caller`:

- a speaker: `{ role: "speaker", speakerId }`;
- an organizer: `{ role: "organizer" }`;
- `null` for a visitor who is not logged in.

A speaker sees and changes only their own talks. A talk of another speaker looks like a missing talk (`404`).

| Part | Folder | Job |
|---|---|---|
| Routes | `src/api/` | Check the caller, then call the talk store or a job. |
| Talks | `src/talks/` | Keep the talks in memory; the rules for fields and values. |
| Jobs | `src/jobs/` | Work on many talks at once. |
