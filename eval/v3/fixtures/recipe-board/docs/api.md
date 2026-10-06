# API

The routes under `/api` take and return JSON. The other routes return a page: `{ status, headers, body }`, where `body` is a string.

| Method | Path | Result |
|---|---|---|
| GET | `/health` | `200` and `{ ok: true }`. |
| POST | `/api/recipes` | `201` and the recipe. The body has `title`, `author`, `ingredients` (a list of lines), `steps` and `tags`. |
| GET | `/api/recipes/:id` | `200` and the recipe, or `404`. |
| POST | `/api/recipes/:id/comments` | `201` and the comment. The body has `author` and `text`. |
| GET | `/recipes/:id` | `200` and the HTML page of the recipe, with its comments, or `404`. |
| GET | `/search?q=` | `200` and an HTML page with the recipes whose title or an ingredient holds `q`. The first match in a title is in `<mark>`. |
| GET | `/tags/:tag` | `200` and an HTML page with the recipes that have the tag. |
| GET | `/feed.xml` | `200` and the RSS 2.0 feed of the 20 newest recipes, type `application/rss+xml`. |

## Limits

A title has 1 to 200 characters, an author 1 to 80, an ingredient line at most 200, the steps at most 5000, a comment 1 to 2000. A recipe has at most 50 ingredient lines and at most 10 tags. A tag has 1 to 30 letters, digits, spaces or dashes. A search has at most 100 characters. A body that breaks a limit gets `400`.
