# Jobs

A job is a function that takes `{ store, mailer, clock }`. The table in `src/jobs/index.mjs` lists the jobs by name. Run one with `app.runJob(name)`.

| Name | What it does |
|---|---|
| `digest` | Sends each user a list of the people who joined in the last 24 hours. |
| `team-report` | Mails `support@example.test` the number of users and their handles. |
