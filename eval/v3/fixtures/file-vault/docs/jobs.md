# Jobs

A job is a function. It takes the app context and an options object. The table in `src/jobs/index.mjs` maps a job name to its function.

Run a job with `app.runJob(name, options)`. It returns the result of the job.

| Name | What it does |
|---|---|
| `build-bundle` | Options `{ name, files }`. It writes the text of the listed files in one file, `bundles/<name>.bundle`. The name may hold `/`, so a bundle can go in a folder. For each file the bundle has the line `== <file name> ==`, then the content, then a line break. It returns `{ bundle, files }`. A missing file stops the job, and it writes nothing. The route `POST /bundles` runs this job. |
| `clean-previews` | Removes all cached previews. It returns `{ removed }`, the number of files removed. |
