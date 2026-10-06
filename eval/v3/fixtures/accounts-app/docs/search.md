# Search

The search index keeps one entry per user. It holds the name, the handle and the email in lower case. A query matches when the text contains the query.

The index builds again each time the store changes. See `src/search/index.mjs`.
