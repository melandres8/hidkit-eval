# Architecture

The service has no server. `createApp({ root })` returns an object with a `handle(request)` function and a `runJob(name, options)` function.

A request has a `method`, a `path`, and an optional `body`. The layer in front of the app checks who the caller is. The vault has one owner, so every request that reaches the app is allowed to use every file.

The parts:

| Part | Folder | Job |
|---|---|---|
| Routes | `src/api/` | Map a route to storage and job calls. |
| Storage | `src/storage/` | Keep the files of the vault on disk. |
| Preview | `src/preview/` | Make the short text of a file. |
| Jobs | `src/jobs/` | Work that does not come from one file route. |
