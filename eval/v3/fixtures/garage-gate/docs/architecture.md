# Architecture

The service has no server. `createApp({ passes, blocked, clock })` returns an object with a `handle(request)` function and a `runJob(name, options)` function. `clock` returns the current `Date`.

- `passes` is the stored list of passes: `{ plate, holder, until }`. `until` is the last day of the pass, `YYYY-MM-DD`, in UTC.
- `blocked` is the stored blocklist: `{ plate, reason }`.

A request has a `method`, a `path`, an optional `query` and an optional `body`. The camera and the desk of the building send them. The layer in front of the app checks that they come from there.

| Part | Folder | Job |
|---|---|---|
| Routes | `src/api/` | Map a route to the parts below. |
| Camera | `src/camera/` | Check a camera event and read its plate. |
| Gate | `src/gate/` | Decide if the gate opens. Keep the blocklist. |
| Passes | `src/passes/` | Keep the passes. |
| Log | `src/log/` | Keep the entry log. |
| Jobs | `src/jobs/` | Work on the log or the passes. |
