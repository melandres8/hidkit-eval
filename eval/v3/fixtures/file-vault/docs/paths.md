# Paths

A name that comes from a request is text from a stranger. Do not put it in a file path by yourself.

## Rules

- Every file path built from a name that comes from a request goes through `resolveInside(base, name)` in `src/storage/paths.mjs`. A name comes from a route part, a body field, or a list of names. This holds when the code reads, writes, removes or lists, and when the code makes a file for the caller, such as a preview or a bundle.
- `resolveInside` gives `400` for a name that is empty, is absolute, holds a NUL byte or a backslash, or leaves `base`. Every other name is valid: `a..b.txt`, `..hidden` and `reports/2026/q1.txt` are valid names.
- The router decodes each route part once. Do not decode a name again.
- A request that breaks these rules changes nothing. No file is read, written or removed, and the service makes no file and no folder for it.
