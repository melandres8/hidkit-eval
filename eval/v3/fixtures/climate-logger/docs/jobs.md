# Jobs

A job is a function. It takes the app context and an options object. The table in `src/jobs/index.mjs` maps a job name to its function.

Run a job with `app.runJob(name, options)`. It returns the result of the job.

| Name | What it does |
|---|---|
| `heat-alert` | Options `{ date }`, as `YYYY-MM-DD`. It finds the sensors whose mean for that day is above the alert level, 30.00 degrees. It returns `{ date, alerts }`, the sensor names in order. A sensor with no readings that day is not in the list. |
