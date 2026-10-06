# Jobs

A job is a function. It takes the app context and an options object. The table in `src/jobs/index.mjs` maps a job name to its function.

Run a job with `app.runJob(name, options)`. It returns the result of the job.

| Name | What it does |
|---|---|
| `export-catalog` | Builds a CSV of all products for a person to open in a spreadsheet. It returns `{ filename, csv }`. The columns are `sku`, `name`, `category` and `stock`. The `POST /exports` route runs this job. |
| `merge-supplier-feed` | Options `{ feed }`. The feed is a list of products in stored order. The job adds the new SKUs and replaces the products of the SKUs that exist. It returns `{ added, updated }`. A feed that is not in stored order gets an error with `status` 400, and the job changes nothing. |
