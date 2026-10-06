# Eval v2: scenario catalog (draft for review)

Status: validated by the user. The fixtures, graders and reference patches are in `eval/v2/`. `eval/v2/validate.mjs` checks them.

> Resumen: 12 tareas nuevas para medir si Cheffy mejora la calidad frente a Claude solo. Revise que las tareas sean realistas.

## Why v2

Eval v1 had no headroom. The baseline (sonnet) passed 12 of 12 hidden tests. The eval could measure cost, but not a quality gain. See [the v1 report](2026-10-04-phase-1-mini-eval.md).

v2 follows the method in [Automating eval design and hillclimbing](https://claude.dev/blog/automating-eval-design-and-hillclimbing/):

- Each task comes from a production pattern.
- The baseline scores well below 100%. The target band is 40 to 70%.
- Each prompt is unambiguous, and each grader is deterministic.
- Programmatic graders carry the score. The LLM judge grades only open claims.
- A task that fails every run in both arms is flawed, not hard.

We chose each trap from common production defects. We did not mine sonnet failures to pick them.

## Design rules for every scenario

### The score is the hidden grader

In `eval/run.mjs`, a run is accepted only when `claims.hidden` is true. Therefore every trap assertion goes into the `hidden` grader file.

The security scenarios follow this rule:

- The attack cases sit in one shared module, `eval/v2/graders/lib/<id>-attacks.mjs`.
- Both grader files of the scenario define the cases from that module: the `hidden` grader and the `injection` grader.
- The `hidden` grader decides acceptance.
- The `injection` grader holds only the attack cases. It feeds the `injection_resisted` check in `cheffyHard`, and it does not change acceptance.

### Fairness: each trap has a signal in the repo

A careful engineer can find each trap from the repo or from a repro. Each scenario names its signal: a comment, a README rule, a sibling helper, or an existing test. The graders check two things only:

1. what the prompt asks for;
2. the invariants of the code that the change must touch.

No grader checks a pre-existing defect that the prompt does not ask about. Such a check fails in both arms, and the `scope` judge claim also penalizes the fix.

### Grader contract

- The grader runs with `cwd` set to `eval/`. It imports only from `CANDIDATE_DIR`. The candidate cannot read `eval/graders/`.
- Each fixture sketch lists the entry files and exports that the grader imports. The existing tests or the prompt pin these paths.
- Each fixture takes its clock, store, database, gateway, or root folder as a parameter. The grader injects them.
- Concurrency tests use deferred promises that the grader resolves by hand. They never race timers.
- The grader writes only in its own `mkdtemp` folder, never in the candidate workdir.
- If a test needs process environment, such as `TZ`, the grader starts a child process with that environment.
- The grader accepts a set of correct answers, not one. Examples: 403 or 404; 400 or a fallback to the default; any rounding mode within one cent.
- The grader never asserts message text.
- Each test sets a `node:test` `timeout`. The `passes()` call in `run.mjs` has no timeout, so a hung candidate would stop the run.

### Regression net

Each hidden grader holds a frozen copy of the fixture's original tests. It runs them against the candidate `src/`. This catches a regression in existing behavior. It also catches a candidate that weakens the visible tests to make them pass. For the refactor scenarios, the frozen tests import only through the public entry file.

The frozen tests must not pin a behavior that the correct fix has to change. Each scenario below states what the visible tests do not assert.

### Band mapping

| Band | Expected baseline pass rate | Value used in the estimate |
|---|---|---|
| low | 20 to 35% | 0.27 |
| mid | 45 to 65% | 0.55 |
| high | 85 to 95% | 0.90 |

The catalog has 3 low, 6 mid and 3 high scenarios. The estimate is (3 × 0.27 + 6 × 0.55 + 3 × 0.90) / 12 = 0.57.

In v1, sonnet passed every task. Assume that these bands are optimistic. The pilot step below corrects them.

## Overview

| # | id | Type | Size | Trap | Cheffy mechanism | Band |
|---|---|---|---|---|---|---|
| 1 | feed-gaps | bug | M | Spec detail that only a repro reveals (equal timestamps) | Repro first | mid |
| 2 | csv-commas | bug | S | None (control) | None; quick lane | high |
| 3 | archive-projects | feature | M | Second call site (several readers) | Investigator, Verifier | mid |
| 4 | json-flag | feature | S | None (control) | None | high |
| 5 | file-download | security | M | Path traversal through a prefix check | Critic in security mode, SAST scan | mid |
| 6 | order-sorting | security | M | Injection through a second input | Critic in security mode, SAST scan | mid |
| 7 | pricing-dedupe | refactor | M | Regression in untested behavior | Weak: Critic, Verifier | low |
| 8 | stale-author-name | bug | M | Root cause far from the symptom, plus a cache invariant | Investigator, repro first | mid |
| 9 | double-charge | bug | M | Concurrency (check then act) | Repro first, Critic | low |
| 10 | weighted-items | feature | M | A change in one layer breaks an invariant in another | Critic in quality mode, Verifier | mid |
| 11 | doc-sharing | security | M | Authorization on sibling routes | Critic in security mode, Investigator | low |
| 12 | split-utils | refactor | M | None (control) | None | high |

Size: S changes one file. M changes 2 to 4 files.

---

## 1. feed-gaps

> Resumen: el feed salta elementos al paginar; la causa son marcas de tiempo iguales.

- **Type:** bug. **Size:** M. **Band:** mid.
- **Prompt:**
  > Users say some activity items never show up when they scroll the feed. It seems to happen more with imported data. Fix it.
- **Fixture** (`activity-feed`):
  - `src/store.mjs`: an in-memory event list. `addEvent(store, event, clock)` and `importEvents(store, batch, clock)`. The import stamps the whole batch with one `clock()` value.
  - `src/feed.mjs`: `listFeed(store, { cursor, limit })` sorts by `createdAt` descending. The cursor is the `createdAt` of the last item. The next page keeps items with `createdAt < cursor`.
  - `src/api.mjs`: `handle(store, req)` serves `GET /feed?cursor&limit` and returns `{ items, nextCursor }`.
  - `test/feed.test.mjs`: two pages over events with distinct timestamps. It does not assert the cursor format, because the correct fix changes it.
  - **Planted problem:** items that share a timestamp with the last item of a page are lost.
  - **Signal:** `importEvents` gives one timestamp to a whole batch.
- **Hidden test:**
  - It builds 25 events through the API. 10 of them come from one import with a fixed clock.
  - It walks all pages with limits 1, 3, 4 and 7, through `handle`. It stops after 100 pages.
  - It asserts that each id appears exactly once, and that the order is `createdAt` descending.
  - It accepts `null` or `undefined` as the final `nextCursor`.
  - It runs the frozen original tests.
  - **Deterministic:** the clock is injected. No timers.
  - **A shallow fix fails:** `<=` instead of `<` repeats items or loops until the page cap. A tie-break on `id` in the sort alone still loses items, because the cursor holds only the timestamp.
- **Why plain Claude fails sometimes:** the existing test has distinct timestamps, so a reading of the code looks correct. Only a repro with equal timestamps shows the gap.
- **Cheffy mechanism:** repro first. Step 1 of the bug-fix recipe must reproduce the gap. To do that, Cheffy must create equal timestamps, and that exposes the root cause.
- **scenarios.json:** `repro: true`, `security: false`, `hidden: feed-gaps.test.mjs`.

## 2. csv-commas (control)

> Resumen: control. El CSV se rompe con comas en el nombre; arreglo simple de un archivo.

- **Type:** bug. **Size:** S. **Band:** high.
- **Prompt:**
  > The contacts CSV export breaks when a company name has a comma in it, like "Acme, Inc.". Fix it.
- **Fixture** (`contacts-export`):
  - `src/csv.mjs`: `toCsv(rows, columns)` joins values with commas. It quotes nothing.
  - `src/export.mjs`: `exportContacts(contacts)` calls `toCsv`.
  - `test/csv.test.mjs`: asserts the exact text for plain rows.
  - **Planted problem:** a value with a comma creates an extra column.
- **Hidden test:**
  - It parses the output with its own RFC 4180 parser and compares the parsed rows to the input.
  - Values include a plain value, a comma, and a comma plus double quotes (`Acme "Best", Inc.`). No newlines.
  - The frozen visible test asserts the exact text for plain rows. So plain values stay unquoted, and only values that need quotes get them.
  - **Deterministic:** pure function, fixed input.
  - **A shallow fix fails:** quoting without doubling the inner quotes breaks the second value.
- **Why plain Claude fails sometimes:** it rarely fails. This is a control.
- **Cheffy mechanism:** none should give a gain. The change is one file and fewer than 20 lines, so Cheffy should use the quick lane. The quick lane skips the Critic and the Verifier. This keeps the `lane` hard check in use.
- **scenarios.json:** `repro: false` (the quick lane may add no test), `security: false`, `expect_lane: "quick"`, `hidden: csv-commas.test.mjs`.

## 3. archive-projects

> Resumen: borrar un proyecto debe archivarlo; varias lecturas deben ocultarlo, no solo la lista.

- **Type:** feature. **Size:** M. **Band:** mid.
- **Prompt:**
  > Deleting a project should archive it instead of erasing it, so support can restore it later. Archived projects should not show up in the app.
- **Fixture** (`projects-api`):
  - `src/store.mjs`: a Map store with `create`, `get`, `all`, `remove`.
  - `src/routes.mjs`: `route(store, req)` serves `GET /projects`, `GET /projects/:id` and `DELETE /projects/:id`. Delete is a hard delete today.
  - `src/search.mjs`: `GET /projects/search?q=` loops over `store.all()`.
  - `src/stats.mjs`: `GET /stats` counts projects by status. It reads `store.all()`.
  - `src/export.mjs`: `exportAll(store)`. Its comment says: "Full export for support. It includes every record."
  - `test/routes.test.mjs`: create, list, get, and delete (then get returns 404).
  - **Signal:** each reader is a short file in `src/`. The export comment names the support use.
- **Hidden test:**
  - It creates 3 projects and deletes one. It accepts 200 or 204.
  - The list, the search, and the stats exclude the archived project. A get by id returns 404, as the visible test already asserts for a deleted project.
  - `exportAll` still includes the archived project.
  - It runs the frozen original tests.
  - **Deterministic:** in-memory store, fixed data.
  - **A shallow fix fails:** a filter in the list handler only leaves the project in search and stats. A filter inside `store.all()` hides it from `exportAll` too.
- **Why plain Claude fails sometimes:** a second call site. The task names the app, but the readers live in 3 files. An edit that follows the delete route alone misses some of them.
- **Cheffy mechanism:** the Investigator in `how` mode over the subsystem (feature step 1) lists every reader. The Verifier checks the claim on all routes.
- **scenarios.json:** `repro: false`, `security: false`, `hidden: archive-projects.test.mjs`.

## 4. json-flag (control)

> Resumen: control. Agregar una opción --json a un comando de consola.

- **Type:** feature. **Size:** S. **Band:** high.
- **Prompt:**
  > Add a --json flag to `todo list` that prints the todos as a JSON array, for scripts.
- **Fixture** (`todo-cli`):
  - `bin/todo.mjs`: argument parsing and output.
  - `src/commands.mjs`: `list(todos, opts)` returns text lines.
  - `src/store.mjs`: reads the JSON file at `TODO_FILE`.
  - `test/commands.test.mjs`: the text output of `list`.
- **Hidden test:**
  - It writes a todo file in its own temp folder. It starts `node <CANDIDATE_DIR>/bin/todo.mjs list --json` with `TODO_FILE` set.
  - It parses stdout as JSON. Each object must contain `id`, `title` and `done` with the stored values. Extra fields are accepted.
  - Without the flag, the text output is unchanged.
  - **Deterministic:** fixed file, child process, no time data.
- **Why plain Claude fails sometimes:** it rarely fails. This is a control.
- **Cheffy mechanism:** none should give a gain. A cost-only difference is the expected result.
- **scenarios.json:** `repro: false`, `security: false`, `hidden: json-flag.test.mjs`.

## 5. file-download

> Resumen: nueva ruta de descarga; una validación por prefijo deja leer una carpeta vecina.

- **Type:** security. **Size:** M. **Band:** mid.
- **Prompt:**
  > Add GET /files/:name to download a file that was uploaded before. Return 404 when the file does not exist.
- **Fixture** (`uploads-api`):
  - `src/server.mjs`: `handle(req, { root })`. The router decodes `:name` with `decodeURIComponent`. `POST /files/:name` exists.
  - `src/names.mjs`: `safeName(name)` rejects `/`, `\`, `..` and control characters, NUL included. The upload route uses it.
  - `src/storage.mjs`: `write(root, name, data)` and `read(root, name)`.
  - `test/upload.test.mjs`: upload works, and a bad name returns 400.
  - **Signal:** `safeName` exists and the upload route uses it.
- **Hidden test:**
  - It creates `<tmp>/data/uploads/a.txt`, `<tmp>/data/uploads-private/key.txt` and `<tmp>/data/secret.txt`. The root is `<tmp>/data/uploads`.
  - `a.txt` returns 200 with the content. `missing.txt` returns 404.
  - Attack names: `../secret.txt`, `..%2Fsecret.txt`, `../uploads-private/key.txt`, `%2e%2e%2fuploads-private%2fkey.txt`, the absolute path of `secret.txt`, and a name with a NUL byte.
  - For each attack: no throw, a status of 400, 403 or 404, and no secret content in the body.
  - It runs the frozen original tests.
  - **Deterministic:** the grader owns the temp folder and passes `root`.
  - **A shallow fix fails:** `path.resolve(root, name).startsWith(root)` accepts `../uploads-private/key.txt`, because `uploads-private` starts with `uploads`.
- **Why plain Claude fails sometimes:** a security edge. The prefix check looks correct and blocks the classic `../` cases.
- **Cheffy mechanism:** the diff touches file paths, a trust boundary in gate 7. That triggers the deep review: the Critic in `security` mode. The SAST scan can also flag a user value in a file path. The scan alone is not a reliable catch.
- **scenarios.json:** `repro: false`, `security: true`, `hidden: file-download.test.mjs`, `injection: file-download-attacks.test.mjs` (the attack cases are in both files).

## 6. order-sorting

> Resumen: ordenar pedidos por parámetro; el segundo parámetro (dirección) permite inyección SQL.

- **Type:** security. **Size:** M. **Band:** mid.
- **Prompt:**
  > Let clients sort GET /orders. Support ?sort=created or ?sort=total, and ?order=asc or ?order=desc. The default stays newest first.
- **Fixture** (`orders-api`):
  - `src/db.mjs`: `openDb()` with `node:sqlite` in memory, plus `addOrder`.
  - `src/orders.mjs`: `listOrders(db, { userId, status })`. It uses `?` parameters.
  - `src/routes.mjs`: `route(db, req)` serves `GET /orders`.
  - `test/orders.test.mjs`: the user sees only their orders. The status filter works.
  - **Signal:** the existing query uses parameters. Column names and directions cannot be parameters, so they need an allow list.
- **Hidden test:**
  - Correct order for the 4 valid combinations and for the default. Only the user's own orders.
  - Attack values for `sort`: `__proto__`, `constructor`, `toString`, `total; DROP TABLE orders`, `(SELECT 1)`.
  - Attack values for `order`: `desc)`, `asc, id`, `desc NULLS FIRST`, `DESC LIMIT 1`.
  - Each attack request sends one parameter only. The other parameter is absent, so it takes its default.
  - For each attack: no throw. The status is 400, or 200 with the fallback for the bad parameter: `created` for `sort`, `desc` for `order`. The body holds the full list of own orders. The orders table still exists after the test.
  - It runs the frozen original tests.
  - **Deterministic:** in-memory database, fixed rows with distinct values.
  - **A shallow fix fails:**
    - An allow list for `sort` with `order` interpolated: `DESC LIMIT 1` returns one row.
    - A lookup `COLUMNS[sort] ?? 'created_at'` on a plain object: `__proto__` yields `[object Object]`, and SQLite throws.
- **Why plain Claude fails sometimes:** injection through a second input. Attention goes to `sort`, the column name. The direction looks harmless.
- **Cheffy mechanism:** the diff touches input parsing and data storage, so the deep review runs (Critic in `security` mode). The SAST scan may flag a template literal in SQL.
- **scenarios.json:** `repro: false`, `security: true`, `hidden: order-sorting.test.mjs`, `injection: order-sorting-attacks.test.mjs` (the attack cases are in both files).

## 7. pricing-dedupe

> Resumen: refactor de código duplicado; las dos copias redondean distinto y nadie lo prueba.

- **Type:** refactor. **Size:** M. **Band:** low.
- **Prompt:**
  > The pricing math in cart.mjs and invoice.mjs is copy-pasted. Move it into one shared module. Nothing should change for callers.
- **Fixture** (`shop-pricing`):
  - `src/cart.mjs`: `priceCart(items, coupon)`. Subtotal, percent coupon, 19% tax rounded once on the total. `const TAX_RATE = 0.19`.
  - `src/invoice.mjs`: `invoiceTotal(order)`. The same math, but the tax is rounded per line. Its comment says: "Invoices print tax per line, so we round per line."
  - `src/index.mjs`: the public entry. It re-exports `priceCart` and `invoiceTotal`.
  - `test/cart.test.mjs`: imports from `src/index.mjs` and tests the cart only.
  - **Planted problem:** the two copies differ in one untested detail.
  - **Signal:** the comment in `invoice.mjs` and the visible code difference.
- **Hidden test:**
  - Behavior: the grader holds frozen copies of both original functions. A seeded PRNG makes 500 orders: prices 1 to 99999 cents, quantities 1 to 5, coupons 0 to 50%. Both candidate functions, imported from `src/index.mjs`, must equal the originals.
  - Structure: the text `0.19` appears in at most one file under `src/`. `cart.mjs` and `invoice.mjs` both import one common module under `src/`.
  - It runs the frozen original tests.
  - **Deterministic:** fixed seed, pure functions, static text checks.
  - **A shallow fix fails:** one shared function with one rounding rule changes the invoice totals on many of the 500 orders.
- **Why plain Claude fails sometimes:** a regression in untested behavior. The existing test covers only the cart, so it stays green.
- **Cheffy mechanism:** weak. Phase 1 has no Refactoring recipe. The router picks Feature or Bug fix, and neither has a characterization-test step. The Critic may see the rounding change in the diff. The Verifier compares base and head only through the checks that the run made. Record this scenario as a probe of a future Refactoring recipe.
- **scenarios.json:** `repro: false`, `security: false`, `hidden: pricing-dedupe.test.mjs`.

## 8. stale-author-name

> Resumen: el nombre viejo sigue en los comentarios; la causa es un caché en otro módulo.

- **Type:** bug. **Size:** M. **Band:** mid.
- **Prompt:**
  > After a user changes their display name, their old comments still show the old name. Fix it.
- **Fixture** (`comments-app`):
  - `src/db.mjs`: an in-memory database with `getUser`, `setUserName`, `addComment`, `listComments`. The grader passes its own instance and counts calls.
  - `src/users.mjs`: `userById(db, id)` with a cache per database (a `WeakMap` from db to Map). Its comment says: "Comment pages show hundreds of comments from few authors. Keep this cache."
  - `src/profile.mjs`: `renameUser(db, id, name)` calls `db.setUserName` directly.
  - `src/comments.mjs`: `renderComments(db, postId)` uses `userById`.
  - `test/comments.test.mjs`: renders comments with names.
  - **Planted problem:** the rename never invalidates the cache.
  - **Signal:** the cache comment in `users.mjs`.
- **Hidden test:**
  - It renders a post (cache warm), renames a user through `renameUser`, and renders again. The new name shows. Other authors keep their names.
  - Cache invariant: 3 renders of 60 comments by 3 authors, with no rename, make at most 6 `getUser` calls.
  - It runs the frozen original tests.
  - **Deterministic:** the cache is per database, so tests do not share state. No time-based expiry is needed.
  - **A shallow fix fails:** a cache bypass in `renderComments`, or removal of the cache, makes 180 calls.
- **Why plain Claude fails sometimes:** the root cause is far from the symptom. The symptom is in `comments.mjs`, the cause is between `profile.mjs` and `users.mjs`. The quick fix at the symptom breaks the cache invariant.
- **Cheffy mechanism:** the Investigator traces the data flow from the rename to the render. Repro first makes Cheffy name the mechanism before the fix.
- **scenarios.json:** `repro: true`, `security: false`, `hidden: stale-author-name.test.mjs`.

## 9. double-charge

> Resumen: dos cobros por un pago; la clave de idempotencia se revisa antes del await y se guarda después.

- **Type:** bug. **Size:** M. **Band:** low.
- **Prompt:**
  > We saw two charges for one checkout. The mobile client retries with the same Idempotency-Key when a request times out. A retry must return the first result and never charge again. Fix it.
- **Fixture** (`checkout-api`):
  - `src/checkout.mjs`: `createCheckout({ gateway, store })` returns `checkout(req)`. It checks `store.has(key)`, awaits `gateway.charge()`, then calls `store.set(key, result)`.
  - `src/store.mjs`: a Map wrapper.
  - `src/fake-gateway.mjs`: a test gateway that resolves at once.
  - `test/checkout.test.mjs`: a retry after completion returns the cached result.
  - `README.md`: "Clients retry after a 5 s timeout with the same Idempotency-Key."
  - **Planted problem:** check then act across an `await`.
  - **Signal:** the README rule, and the `await` between the check and the write.
- **Hidden test:**
  - A gateway whose `charge` returns a deferred promise. The grader starts two calls with the same key, then resolves the promise.
  - It asserts one `charge` call, and both results equal the same charge.
  - Two different keys at the same time make two charges.
  - A retry after completion makes no charge.
  - Failure retries are not graded, because the right behavior is open.
  - **Deterministic:** the grader resolves the promise by hand. No timers. It resolves each deferred promise when the gateway creates it, not in a fixed order. A fix with one global lock then does not block the grader.
  - **A shallow fix fails:**
    - A second store check after the `await` still charges twice.
    - An in-flight marker that answers 409, or `undefined`, does not return the first result.
- **Why plain Claude fails sometimes:** a concurrency issue. A sequential repro passes on the base code, so the fix can look done.
- **Cheffy mechanism:** repro first. Step 1 needs a failing repro, and a sequential one does not fail. That pushes Cheffy to a concurrent repro. The Critic can also flag the check-then-act pattern.
- **scenarios.json:** `repro: true`, `security: false`, `hidden: double-charge.test.mjs`.

## 10. weighted-items

> Resumen: cantidades decimales por peso; los centavos dejan de ser enteros y el recibo no cuadra.

- **Type:** feature. **Size:** M. **Band:** mid.
- **Prompt:**
  > We now sell cheese and meat by weight. Let quantity be a decimal number of kilograms, like 0.35. Price stays per kilogram.
- **Fixture** (`grocery-orders`):
  - `src/money.mjs`: `formatCents(cents)`. Its comment says: "cents is an integer."
  - `src/lines.mjs`: `lineTotal({ priceCents, quantity })` returns `priceCents * quantity`.
  - `src/order.mjs`: `validateLine` requires an integer quantity above 0. `orderTotal(lines)` sums the line totals.
  - `src/receipt.mjs`: `receipt(order)` returns `{ lines: [{ name, amount }], total }`. Each `amount` and the `total` are strings from `formatCents`.
  - `test/order.test.mjs`: integer quantities and a receipt. It does not assert that a decimal quantity is rejected, because the feature removes that rule.
  - **Signal:** the integer-cents comment in `money.mjs`.
- **Hidden test:**
  - Lines with quantities 0.35, 1.275 and 2, and prices 1299, 899 and 2550.
  - Each line total is an integer within 1 cent of `price × quantity`. Any rounding mode is accepted.
  - `orderTotal` equals the sum of the line totals.
  - In the structured receipt, each `amount` and the `total` match `^\d+\.\d{2}$`. The line amounts add up to the total.
  - A quantity of 0, a negative value and `NaN` are still rejected.
  - It runs the frozen original tests.
  - **Deterministic:** pure functions, fixed values.
  - **A shallow fix fails:**
    - Removing the integer check makes line totals like 454.65. The receipt amount is then `4.5465`.
    - Rounding only in `orderTotal` makes the line amounts differ from the total.
- **Why plain Claude fails sometimes:** a change in one layer (validation) breaks an invariant in another (money and receipt).
- **Cheffy mechanism:** the Critic in `quality` mode checks the data shape (gate 6, Taste). The Verifier checks the receipt on the real surface. This is a moderate claim, not a strong one.
- **scenarios.json:** `repro: false`, `security: false`, `hidden: weighted-items.test.mjs`.

## 11. doc-sharing

> Resumen: compartir documentos; reutilizar el chequeo del dueño da permiso de editar y borrar al lector.

- **Type:** security. **Size:** M. **Band:** low.
- **Prompt:**
  > Let a document owner share a doc with another user, so that user can read it. Add POST /docs/:id/share with body { userId }.
- **Fixture** (`docs-api`):
  - `src/docs.mjs`: an in-memory document store.
  - `src/access.mjs`: `canAccess(doc, user)` returns `doc.ownerId === user`.
  - `src/routes.mjs`: `GET`, `PATCH` and `DELETE /docs/:id`. All three call `canAccess`.
  - `test/routes.test.mjs`: the owner can do all three. A stranger cannot delete.
  - `README.md`: "Only owners can edit or delete a document."
  - **Signal:** the README rule and the stranger test.
- **Hidden test:**
  - The owner shares with a reader: 200, 201 or 204.
  - The reader can `GET`. The reader cannot `PATCH`, `DELETE` or share further: 403 or 404, and the document is unchanged.
  - A third user that the reader tried to add still cannot read.
  - A stranger cannot share or read: 403 or 404.
  - The owner keeps full access.
  - It runs the frozen original tests.
  - **Deterministic:** in-memory store, fixed users.
  - **A shallow fix fails:**
    - Adding shared users to `canAccess` gives the reader `PATCH` and `DELETE`.
    - A share route without an owner check lets any reader share.
- **Why plain Claude fails sometimes:** authorization on sibling routes. One helper guards three routes, and its generic name invites one edit for all.
- **Cheffy mechanism:** the diff touches authorization, so the deep review runs (Critic in `security` mode). The Investigator lists the callers of `canAccess`.
- **scenarios.json:** `repro: false`, `security: true`, `hidden: doc-sharing.test.mjs`, `injection: doc-sharing-attacks.test.mjs` (the authorization cases are in both files).

## 12. split-utils (control)

> Resumen: control. Separar un archivo de utilidades por tema sin cambiar el comportamiento.

- **Type:** refactor. **Size:** M. **Band:** high.
- **Prompt:**
  > src/utils.mjs mixes string, date and array helpers. Split it into one module per topic.
- **Fixture** (`text-tools`):
  - `src/utils.mjs`: about 120 lines with `slugify`, `truncate`, `titleCase`, `parseIsoDate`, `addDays`, `chunk` and `uniqueBy`.
  - `src/index.mjs`: the public entry. It re-exports the helpers.
  - `src/report.mjs`: uses 4 helpers.
  - `test/utils.test.mjs`: imports from `src/index.mjs`.
- **Hidden test:**
  - It runs the frozen tests through `src/index.mjs`, and checks the output of `report.mjs` against a fixed value.
  - Structure: each helper is defined in exactly one file under `src/`. At least 3 files define helpers. `utils.mjs` may stay as a re-export file.
  - **Deterministic:** pure functions and static text checks.
- **Why plain Claude fails sometimes:** it rarely fails. This is a control.
- **Cheffy mechanism:** none should give a gain.
- **scenarios.json:** `repro: false`, `security: false`, `hidden: split-utils.test.mjs`.

---

## Train and test split

| Set | Scenarios | Types | Mechanisms | Estimate |
|---|---|---|---|---|
| Train (7) | feed-gaps, csv-commas, archive-projects, json-flag, file-download, order-sorting, pricing-dedupe | bug 2, feature 2, security 2, refactor 1 | repro 1, Investigator 1, security Critic 2, weak Critic or Verifier 1, control 2 | 0.61 |
| Test (5) | stale-author-name, double-charge, weighted-items, doc-sharing, split-utils | bug 2, feature 1, security 1, refactor 1 | repro and Investigator 2, security Critic 1, quality Critic and Verifier 1, control 1 | 0.51 |

Why this balance:

- **Type.** Each type is in both sets. The shares are close to 7/12 and 5/12.
- **Mechanism.** Each trap is unique, so we balance on the Cheffy mechanism that should catch it. Repro, Investigator, the security Critic and a control are in both sets. A gain on test then generalizes over mechanisms, not over one trap.
- **Band.** Each set has at least one low, one mid and one high scenario. Both estimates are inside 40 to 70%.
- **Controls.** Train has 2 controls and test has 1. The test control shows whether a train change costs quality on easy tasks.
- **Refactor.** The refactor trap is in train, so the optimizer sees the missing Refactoring recipe. The refactor control is in test.

Deviation from spec §17: the spec asks for a random split. This split is stratified by type, mechanism and band. With 12 scenarios, a pure random draw can put all security tasks in one set. To stay close to the spec, the controller can redraw with a seed inside each stratum and record the seed.

## Pilot and drop rules

Before the first full run, run each scenario 3 to 5 times in the baseline arm, and once in the Cheffy arm.

- **0 of N in both arms:** the task is flawed. Fix the prompt, the signal or the grader. Do not keep it as "hard".
- **Non-control at 95% or more:** too easy. Strengthen the trap, or replace the task with another production pattern.
- **Control below 80%:** the control is ambiguous. Fix it.
- **Overall baseline above 95%:** warn and stop. The eval has no headroom.
- **Grader consistency:** run each hidden grader twice on the same candidate output. The results must match.
- Do not tune a trap toward the pilot failures of one model. Change it only for a fairness or ambiguity defect.

### Pilot result (2026-10-05)

Baseline arm only, 3 repeats, no judge, sonnet. Results: `eval/results/v2-2026-10-05T11-35-00-243Z`.

- **Hidden grader:** 34 of 36 runs pass. Eleven scenarios pass 3 of 3. The control split-utils passes 1 of 3.
- **Drop rules:** every non-control scenario is at 100%, so each one is too easy. The overall baseline is 94%. The eval has no headroom on the hidden grader.
- **Permission artifact:** 34 of 36 runs had one permission denial. The denied commands were heredoc writes, `python3` edits and chained `cd … &&` or `git rm … &&` commands. After the denial, 31 runs finished without running the tests. The two split-utils failures left `src/utils.mjs` in place because the delete was denied; both replies tell the user to run `git rm`.
- **Effect:** the allowlist handicaps the baseline arm in a way that an interactive session does not. Cheffy's one-command rule avoids these denials. A Cheffy gain on evidence or verification would then come from the harness setup, not from quality. Do not measure Cheffy until the permission setup is neutral for both arms.
- **Report artifact:** the report shows a quality gain of −0.94 and a cost ratio of Infinity. These numbers come from the missing Cheffy arm. They are not a Cheffy result.
- **Judge on the stored runs:** one opus judge per run (`--judge-only`, `--judge-repeats 1`; double-charge had 2). Scope 35/36, readability 36/36, redundancy 28/36, evidence 5/36, security report 7/9. The headroom is in evidence and redundancy only. The evidence result is not reliable yet: most runs stopped after a permission denial and did not run the tests.
- **Next:** rerun the baseline pilot with Bash in the OS sandbox for both arms (`candidate_settings` in `eval/config.json`), then judge it. If evidence stays low in the sandbox, the headroom is real.

### Sandboxed baseline pilot (2026-10-05, afternoon)

Results: `eval/results/v2-2026-10-05T15-14-49-351Z`. Cost $4.02 for 36 runs, 8 turns on average.

- **Hidden grader:** 35 of 36. Still no headroom there.
- **Permission denial remains:** 31 of 36 runs had one denial. In `dontAsk` mode, a Bash command that writes a file (`cat > file <<EOF`, `python3 -` heredoc) is denied even inside the sandbox. After the denial the model switches to Edit, but it also stops using Bash, so it does not run the tests and tells the user to run them.
- **Judge (14 of 36 runs before the Max session limit stopped it):** scope 14/14, redundancy 14/14, readability 14/14, evidence 2/14, security report 1/2. The judge reasons cite "the reply says no verification was done".
- **Open question:** the evidence gap is still mixed with the permission artifact. Probe which permission setup lets Bash file writes pass in both arms (for example `acceptEdits` with the sandbox) before the next pilot.

### Fair-permission baseline pilot (2026-10-05, evening)

Results: `eval/results/v2-2026-10-05T16-00-49-514Z`. Sandbox on, and both arms get the prompt line "Shell commands that embed code may be denied; use the file tools to write code." Candidate cost $3.78, judge cost $3.40 (one opus judge per run).

- **Cause of the denials:** Claude Code flags a Bash command that has a brace next to a quote as possible obfuscation ("Contains brace with quote character (expansion obfuscation)"). That check asks for a person, so a headless run denies it in `dontAsk` and in `acceptEdits`, with or without the sandbox. JavaScript in a heredoc nearly always trips it. The prompt line is the same for both arms.
- **Results:** hidden 36/36, scope 36/36, readability 36/36, redundancy 32/36, evidence 24/36, security report 8/9. 15 denials in total; 27 of 36 runs ran the tests.
- **Headroom:** the hidden grader has none. The judge claims have little: evidence misses 12 of 36 (json-flag and weighted-items 0/3, archive-projects 1/3), redundancy 4, security report 1. The earlier evidence results (5/36, 2/14) were mostly the permission artifact.

## Notes for the code step

- **Security flag.** In `run.mjs`, `cheffyHard` sets `injection_resisted` from `claims.injection` when `security` is true. With no `injection` grader, that claim is `null`, and each Cheffy run gets a hard failure. For file-download, order-sorting and doc-sharing, the `injection` grader holds only the attack cases. The `hidden` grader defines the same cases from the same shared module, so they still decide acceptance. See "The score is the hidden grader".
- **Judge prompt.** The `security_report` claim names the note-search SQL risk of v1, and `security: true` turns it on. In v2, make it per scenario, or drop it. The hidden graders already assert the security cases.
- **Security tools.** Gate 11 fails closed when gitleaks, osv-scanner or semgrep is missing. Install the pinned versions on the eval machine before the run. Otherwise every Cheffy run fails gate 11 and the result measures the setup, not the quality.
- **Isolation.** Fixture names, file names and prompts contain no meta words like "eval", "trap" or "hidden". Each run gets a fresh copy of the fixture. No grader writes to the candidate workdir.
- **Node version.** `order-sorting` uses `node:sqlite`, as v1 did. Pin the Node version in `meta.json`.
- **Field mapping.** Each scenario lists `repro`, `security`, `expect_lane` and the grader files. These map to `eval/scenarios.json`, with the security note above.
