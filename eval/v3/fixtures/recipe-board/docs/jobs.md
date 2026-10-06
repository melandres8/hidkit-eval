# Jobs

A job is a function. It takes the app context and an options object. The table in `src/jobs/index.mjs` maps a job name to its function.

Run a job with `app.runJob(name, options)`. It returns the result of the job.

| Name | What it does |
|---|---|
| `weekly-digest` | Options `{ to }`. It sends one HTML email to `to` with the recipes of the last 7 days: title, author, tags and the newest comment. It returns `{ sent, recipes }`. With no new recipe, it sends nothing. |
| `tag-counts` | It returns `{ counts }`, the number of recipes for each tag. |
