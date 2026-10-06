# API

Bodies and results are JSON. A name that breaks `docs/paths.md` gets `400`.

| Method | Path | Result |
|---|---|---|
| GET | `/health` | `200` and `{ ok: true }`. |
| GET | `/files` | `200` and `{ files }`, the names of all files in order. |
| GET | `/files/*name` | `200` and `{ name, content }`, or `404`. |
| PUT | `/files/*name` | `200` and `{ name, size }`. The body has `content`, a string. `413` if it is longer than 1 000 000 bytes. |
| DELETE | `/files/*name` | `200` and `{ removed: name }`, or `404`. |
| GET | `/previews/*name` | `200` and `{ name, text }`, or `404`. See below. |
| POST | `/bundles` | `201` and `{ bundle, files }`. It runs the job `build-bundle`. |
| GET | `/folders/*name` | `200` and `{ folder, entries }`, or `404`. |

`*name` is the rest of the path. It may hold `/`.

## Previews

The text of a preview is the first 200 characters of the file, with each run of white space cut to one space. The service keeps the text in `previews/<name>.preview`, so the next call is fast.

## Folders

`entries` are the names directly in the folder, in order. A name that ends with `/` is a folder.
