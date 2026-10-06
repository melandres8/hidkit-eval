# Queue

The queue is in memory. `enqueue(job)` adds a job. `take()` returns the oldest job, or `null`. The worker reads `queue.name` and `queue.pollIntervalMs` from the settings.
