# Jobs

A job is a function. It takes the app context and an options object. The table in `src/jobs/index.mjs` maps a job name to its function.

Run a job with `app.runJob(name, options)`. It returns the result of the job.

| Name | What it does |
|---|---|
| `daily-summary` | Options `{ date }`. It returns `{ date, opened, refused }`, the number of reads of the day that opened the gate and that did not. |
| `expire-passes` | Removes the passes whose `until` day is before today. It returns `{ removed }`, the number of passes removed. |
| `permit-export` | Options `{ date }`. It returns `{ date, file }`. `file` is the text that the parking office of the city reads: the line `plate;until`, then one line for each pass that is valid on `date`, in the order of the passes. The city reads a plate only in its own form: the text in upper case, with each run of spaces and dashes made into one dash, like `AB-123-CD`. |
