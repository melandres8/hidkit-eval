# Architecture

The service has no server. `createApp({ clock, mailer })` returns an object with a `handle(request)` function and a `runJob(name, options)` function. `clock` returns the current `Date`. `mailer` has a `send({ to, subject, html })` function.

A request has a `method`, a `path`, an optional `query` object and an optional `body`. The layer in front of the app checks who the caller is. Every member may post a recipe and a comment.

| Part | Folder | Job |
|---|---|---|
| Routes | `src/api/` | Map a route to the store and to a view. |
| Store | `src/store/` | Keep the recipes in memory. |
| Views | `src/views/` | Make the HTML pages. |
| Feed | `src/feed/` | Make the RSS feed. |
| Mail | `src/mail/` | Make the body of an email. |
| Jobs | `src/jobs/` | Work that does not come from one request. |
