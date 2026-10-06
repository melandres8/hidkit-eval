# Jobs

A job is a function. It takes the app context and an options object. The table in `src/jobs/index.mjs` maps a job name to its function.

Run a job with `app.runJob(name, options)`. It returns the result of the job.

| Name | What it does |
|---|---|
| `daily-summary` | Options `{ date }`. It returns `{ date, opened, refused }`, the number of reads of the day that opened the gate and that did not. |
| `expire-passes` | Removes the passes whose `until` day is before today. It returns `{ removed }`, the number of passes removed. |
