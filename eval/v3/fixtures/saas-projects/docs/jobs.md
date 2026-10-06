# Jobs

A job is a function. It takes the app context and an options object. The table in `src/jobs/index.mjs` maps a job name to its function.

Run a job with `app.runJob(name, options)`. It returns the result of the job. The options hold `{ caller }`, the `ctx` of the person that the job works for.

| Name | What it does |
|---|---|
| `export-projects` | Builds a CSV of the projects of a tenant. It returns `{ filename, csv }`. The columns are `id`, `name`, `status`, `owner` and `tasks`. The `POST /exports` route runs this job. |
