# Jobs

A job is a function that takes the app context. The table in `src/jobs/index.mjs` lists the jobs by name. Run one with `app.runJob(name)`.

| Name | What it does |
|---|---|
| `settlement` | Returns `{ payouts }`, an object with the amount to pay out for each currency, as integers in minor units. |
