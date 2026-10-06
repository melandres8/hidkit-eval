# Search

`GET /search?q=text` finds projects by name and tasks by title. The match is a case-insensitive part of the text. A request with no `q` gets `400`.

The result is `{ projects, tasks }`. Both are lists.
