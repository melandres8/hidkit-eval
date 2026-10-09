# Jobs

A job is a function. It takes the app context and an options object. The table in `src/jobs/index.mjs` maps a job name to its function.

Run a job with `app.runJob(name, options)`. It returns the result of the job.

| Name | What it does |
|---|---|
| `import-proposals` | Options `{ caller, talks }`. It adds each proposal as a new talk of the caller, a speaker. The proposals come from a spreadsheet: the service removes the spaces at the ends of a title, and it reads `track` and `level` in any case. A proposal that breaks a value rule stops the job, and it adds nothing. It returns `{ talks }`. The route `POST /talks/import` runs it. |
| `assign-rooms` | Gives each accepted talk with no room the room of its track (`src/talks/rooms.mjs`). It returns `{ assigned }`, the ids of the talks that got a room. |
| `talk-stats` | Returns `{ byStatus, byTrack }`, the number of talks for each status and each track. |
