# Jobs

A job is an async function that takes the app context: `{ clock, transport, events, subscriptions, deliveries, ids }`. The table in `src/jobs/index.mjs` maps a job name to its function.

The service has no timers. The scheduler outside the service runs a job with `app.runJob(name)`.

| Name | Runs | What it does |
|---|---|---|
| `prune-events` | each night | Removes the events that are older than 7 days. |
