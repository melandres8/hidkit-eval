# Eval v3: hard scenario catalog (draft for review)

Status: validated by the user. Batch A (scenarios 1 to 4: currency-refunds, soft-delete-users, rate-limit-keys, invoice-rounding) and batch B (scenarios 5 to 8: webhook-retries, tenant-isolation, config-migration, schedule-dst) are built in `eval/v3/`. Batch C (scenarios 9 to 11: file-vault, shop-catalog, climate-logger) adds three test scenarios and moves tenant-isolation to train. Batch D (scenarios 12 to 15: recipe-board, cfp-portal, gradebook, garage-gate) adds four test scenarios, moves the batch C test split to train and retires climate-logger. `eval/v3/validate.mjs` checks all fifteen.

> Resumen: 8 tareas difíciles candidatas. El piloto conserva las 5 o 6 en las que Claude solo falla entre el 30 y el 60% de las veces. Revise que sean realistas.

## Why v3

The fair v2 pilot (2026-10-05) gave the baseline hidden 36/36 and evidence 24/36. Even a Cheffy arm that passes every claim cannot beat the noise on v2: the largest possible gain is 0.07 on train and 0.11 on test, against noise of 0.10 and 0.14. v2 stays as the efficiency and no-regression gate. v3 is the quality gate of the phase 1 exit criterion: a Cheffy gain above noise on the v3 test split.

## What made v2 easy, and what v3 changes

v2 lessons:

- Each v2 task had one trap, a small repo (4 to 6 files) and a signal next to the code. Sonnet reads the whole repo in one or two turns, so it sees the signal every time.
- The hidden grader checked one invariant per task.

v3 levers, from the method in [Automating eval design and hillclimbing](https://claude.dev/blog/automating-eval-design-and-hillclimbing/):

1. **Several acceptance criteria per task.** A real ticket has 3 to 5. If each one passes 85% of the time, all of them pass about half the time. Each criterion has its own grader test.
2. **Larger repos (20 to 40 files).** Reading everything costs many turns, so the agent must search. The signal is in the repo, but not next to the code that changes: in `docs/`, a sibling module, or a migration note.
3. **Callers that a text search for the obvious name does not find:** a registry, a route table, or a re-export under another name.
4. **Old data on disk.** The fixture ships records in the old format. The change must keep reading them.

The fairness rule of v2 stays: each criterion has a signal that a careful engineer finds from the repo. No grader checks a defect that the prompt and the docs do not ask about. The grader contract, the regression net and the security rules of v2 apply without change.

## Overview

| # | id | Type | Repo | Criteria | Main difficulty | Split |
|---|---|---|---|---|---|---|
| 1 | currency-refunds | feature | 27 files | 5 | Second and third money paths found only through a registry | train |
| 2 | soft-delete-users | feature | 31 files | 7 | Old records on disk, export and search must hide deleted users | train |
| 3 | rate-limit-keys | bug | 20 files | 3 | Root cause in a shared helper; two callers depend on the old key | train |
| 4 | invoice-rounding | bug | 22 files | 4 | Rounding rule in `docs/billing.md`; totals, taxes and CSV must agree | train |
| 5 | webhook-retries | feature | 25 files | 6 | Idempotency and backoff with an injected clock; dead-letter after N | train |
| 6 | tenant-isolation | security | 30 files | 4 | A tenant filter is missing on a bulk route, a search route and an export job | train |
| 7 | config-migration | refactor | 25 files | 6 | Rename a config key; old files keep working, with a deprecation warning | train |
| 8 | schedule-dst | bug | 20 files | 5 | Daily jobs across a DST change in a time zone given by the user | train |
| 9 | file-vault | security | 30 files | 4 + attack cases | The same path defect on five paths; the prompt names only the download | train |
| 10 | shop-catalog | bug | 32 files | 6 | The obvious fix, a change of the shared comparator, breaks the SKU index and the merge | train |
| 11 | climate-logger | bug | 30 files | 5 | Exact means from sums and counts, in a route, a second route and a job | retired |
| 12 | recipe-board | security | 35 files | 5 + attack cases | The same escaping defect on the page, the search page, the feed and a digest job; the prompt names only the page | test |
| 13 | cfp-portal | security | 29 files | 4 + attack cases | The same mass-assignment defect on the edit, the create, the copy and an import job; the prompt names only the edit | test |
| 14 | gradebook | bug | 30 files | 4 | Exact final percent, rounded once, a half up, in a route, the report card and an export job | test |
| 15 | garage-gate | bug | 29 files | 4 | Compare plates by key everywhere; the obvious change of the shared reader breaks the entry log | test |

Split: 5 train and 3 test before the pilot. After the pilot, the split is rebalanced to keep at least 2 test scenarios. Batch C (2026-10-06) gives 6 train (1 to 4, 6, 8) and 5 test (5, 7, 9, 10, 11). Batch D (2026-10-06) gives 10 train (1 to 10), 4 test (12 to 15) and 1 retired (11).

---

## 1. currency-refunds

> Resumen: agregar reembolsos parciales en varias monedas; hay tres rutas de dinero y solo una es obvia.

- **Prompt:**
  > Support needs partial refunds. Add them to the payments service. Follow the money rules in the docs.
- **Fixture** (`payments-service`): about 25 files. Amounts are integer minor units; `docs/money.md` says that JPY has 0 decimals and KWD has 3. `src/handlers/index.mjs` builds the route table from a registry. A ledger module, a CSV report job and a webhook emitter each read payment amounts.
- **Criteria (one hidden test each):**
  1. A refund never exceeds the captured amount minus earlier refunds.
  2. Amounts use the minor units of the currency (JPY, USD, KWD).
  3. The ledger records the refund as its own entry, so the balance is right.
  4. The CSV report and the webhook payload show the refund.
  5. (Hardening) The job `settlement`, run with `app.runJob('settlement')`, pays out the net: captured minus refunded.
- **Signal:** `docs/money.md` (rule 7: a payout is the net); the registry in `src/handlers/index.mjs`; a comment in the ledger module that every money event must be an entry; `docs/jobs.md` for the job and its result shape. `docs/architecture.md` and the README no longer list the CSV job and the webhook emitter.
- **Cheffy mechanism:** Investigator maps every reader of payment amounts; Verifier checks each criterion.

## 2. soft-delete-users

> Resumen: borrar usuarios sin perder datos; los usuarios borrados no deben aparecer en búsqueda ni exportación.

- **Prompt:**
  > Deleting a user must keep their data for 30 days so support can restore it. Deleted users must not show up anywhere else.
- **Fixture** (`accounts-app`): about 30 files. User records are JSON lines on disk; some old records have no `status` field. Readers: profile API, search index, admin export, mention autocomplete, and a nightly digest.
- **Criteria:** delete keeps the record; restore within 30 days works; each of the five readers hides deleted users; old records without `status` still load as active; a purge after 30 days removes the record (injected clock). (Hardening) The job `team-report` does not count or list a deleted user; the handle of a deleted user stays reserved until the purge.
- **Signal:** `docs/data-retention.md` (the rule that a deleted user does not show in the product or count in any reported number; the Handles section); the old records in `data/users.jsonl`; `docs/jobs.md` for `team-report`. The reader table is gone from `docs/architecture.md` and the README.
- **Cheffy mechanism:** Investigator; Critic in quality mode for the missed readers.

## 3. rate-limit-keys

> Resumen: el límite de peticiones bloquea a usuarios distintos detrás del mismo proxy.

- **Prompt:**
  > Users behind the same corporate proxy block each other with "too many requests". Fix it.
- **Fixture** (`api-gateway`): about 20 files. `src/lib/client-key.mjs` builds the rate-limit key from the remote address. The login limiter and the upload limiter also use it. `docs/proxy.md` says to trust `X-Forwarded-For` only from the listed proxies.
- **Criteria:** authenticated requests are keyed by user id; anonymous requests behind a trusted proxy are keyed by the first untrusted address in `X-Forwarded-For`; a spoofed header from an untrusted address does not change the key.
- **Signal:** `docs/proxy.md`; the trusted proxy list in the config.
- **Cheffy mechanism:** repro first; Critic in security mode (spoofing).

## 4. invoice-rounding

> Resumen: los totales de factura no cuadran por un centavo; la regla de redondeo está en la documentación.

- **Prompt:**
  > Some invoices are off by one cent between the PDF total and the CSV export. Fix it.
- **Fixture** (`billing-app`): about 22 files. Line totals, tax, the invoice total and the CSV export each round in a different place. `docs/billing.md` says to round tax per invoice, half-even, after summing lines.
- **Criteria:** line sums use exact minor units; tax rounds once per invoice, half-even; the PDF total, the API total and the CSV agree for a set of 50 generated invoices; existing invoices in `data/` keep their stored totals (no rewrite).
- **Signal:** `docs/billing.md`.
- **Cheffy mechanism:** repro first (generated invoices); Verifier.

## 5. webhook-retries

> Resumen: reintentar webhooks fallidos sin duplicarlos.

- **Prompt:**
  > Webhook deliveries that fail are lost. Retry them, and follow the delivery contract in the docs.
- **Fixture** (`events-service`): about 25 files. `docs/webhooks.md` gives the contract: at most 5 attempts, exponential backoff from 1 s, an idempotency header equal on every attempt, and a dead-letter list after the last attempt.
- **Criteria:** retries follow the backoff (injected clock and transport); the idempotency header is the same on every attempt; a 4xx other than 429 does not retry; the dead-letter list gets the event after the fifth attempt. (Hardening) Removing a subscription stops its pending retries; `POST /subscriptions/:id/test` sends one ping that is never retried and never dead-lettered.
- **Signal:** `docs/webhooks.md`; the two new rules are in `docs/api.md`, the route table, not in the contract file. The ping route calls `deliver`, so a retry change in `deliver` reaches it.
- **Cheffy mechanism:** Verifier against the contract; Critic in quality mode.

## 6. tenant-isolation

> Resumen: un cliente puede ver datos de otro cliente en algunas rutas.

- **Prompt:**
  > A customer reported that they saw another company's project in an export. Find and fix the leak.
- **Fixture** (`saas-projects`): about 30 files. Most routes call `scopeToTenant(query, ctx)`. The bulk update route, the search route and the export job do not.
- **Criteria:** each of the three paths returns or changes only the caller's tenant data; the routes that already scope still pass.
- **Signal:** `docs/tenancy.md` says every query goes through `scopeToTenant`.
- **Cheffy mechanism:** Critic in security mode; Investigator for every query path.

## 7. config-migration

> Resumen: renombrar una clave de configuración sin romper las configuraciones existentes.

- **Prompt:**
  > Rename the config key `db.url` to `database.connectionString`. Existing config files must keep working.
- **Fixture** (`worker-app`): about 25 files. The key is read in four places, one through a string built at run time. The CLI has a `config check` command. Example configs live in `examples/`.
- **Criteria:** the new key works; the old key still works and gives one deprecation warning; when both are set, the new key wins and the warning names both; `config check` and the examples use the new key. (Hardening) `config get <file> <key>` accepts the old key name with one warning and masks passwords; `config show` of an old file prints the new key name only.
- **Signal:** `docs/config.md` has a deprecation policy section; its rule that a key name typed by a person accepts the old name too; `docs/cli.md` lists `config get`.
- **Cheffy mechanism:** Investigator; Verifier.

## 8. schedule-dst

> Resumen: las tareas diarias se ejecutan dos veces o ninguna cuando cambia la hora.

- **Prompt:**
  > Daily jobs run twice or not at all on the days the clocks change. Fix it.
- **Fixture** (`job-scheduler`): about 20 files. Jobs store a local time and an IANA time zone. The next run is computed by adding 24 hours.
- **Criteria:** a job at 02:30 local on a spring-forward day runs once, at the first valid time after the gap; on a fall-back day it runs once; jobs in UTC do not move. (Hardening) The handler of the task `sync-ledger` records the window `{ from, to }` of the calendar day that ended before the run, in the zone of the job, for every process `TZ`; a UTC job gets the UTC day.
- **Signal:** `docs/scheduling.md` states the rule for the gap and the repeat; `docs/jobs.md` describes the window and `stats.lastWindow`. The architecture doc and the README no longer say that only `zone.mjs` knows time zones.
- **Grader note:** the grader runs the candidate in a child process with `TZ` set, as in v2.
- **Cheffy mechanism:** repro first; Verifier.

## 9. file-vault

> Resumen: un nombre con `..` en un enlace de descarga sale de la carpeta; el mismo defecto está en cinco rutas y el prompt nombra solo una.

- **Prompt:**
  > A user read a file from outside the files folder by putting `..` in the name of a download link. Find and fix the problem.
- **Fixture** (`file-vault`, 30 files, `security: true`): a file store with download, upload, delete, preview, bundle and folder routes. `src/storage/paths.mjs` has the correct helper `resolveInside(base, name)`, and only the folder route uses it. Download, upload and delete go through `storage.pathOf` (a `path.join`). The preview and the job `build-bundle` build their paths by a template string in `src/storage/layout.mjs`, so a search for `path.join` does not find them. The bundle has two names from the request: the file list and the bundle name.
- **Criteria (one hidden test each):**
  1. A download, an upload and a delete reject a name that leaves the files folder, and change nothing.
  2. A preview rejects it, and writes no cache file outside `previews/`.
  3. A bundle rejects a file name or a bundle name that leaves its folder, and writes nothing.
  4. Names that only look odd (`a..b.txt`, `..hidden`, spaces, accents, nested folders, a nested bundle name) still work on every path.
  Attack cases (hidden grader and injection grader, `eval/v3/graders/lib/file-vault-attacks.mjs`): the plain, the encoded and the nested forms of `..` on every path; a sibling folder whose name starts like the base (`files-old`); a name decoded once (a double encoding stays a literal name); a NUL byte, a backslash, and an absolute name get a 4xx and no crash.
- **Signal:** `docs/paths.md` states the rule for every path (reads, writes, removals, files that the service makes, lists of names); the README says to read it before you build a file path from a name; `docs/api.md` says that a name that breaks it gets `400`; the visible folder test shows the helper.
- **Cheffy mechanism:** Investigator maps every place that builds a path from a request name; Critic in security mode.

## 10. shop-catalog

> Resumen: ordenar los nombres como los lee una persona; cambiar el comparador compartido rompe el índice de SKU y la mezcla del proveedor.

- **Prompt:**
  > The product list puts "Zinc mug" before "apple press" and "Item 10" before "Item 2". Sort the names the way people read them.
- **Fixture** (`shop-catalog`, 32 files): products with a SKU, a name, a category and a stock count. The list route, the category menu, the search module and the export job each sort with `compare` from `src/lib/order.mjs` (code-point order). The SKU index (a binary search) and the supplier merge (a two-pointer merge) use the same function. `createApp({ stored })` takes a list in stored order and does not sort it.
- **Criteria (one hidden test each):**
  1. The product list is in display order (no case, no accents, numbers by value), also for one category.
  2. Search results and the category menu are in display order.
  3. The export lists the products in display order.
  4. A catalog loaded in stored order still finds and adds every SKU (`A-1` and `a-1` are different SKUs).
  5. A supplier feed merges into the stored order without losing or repeating a SKU.
  6. A feed that is not in stored order gets `400` and changes nothing.
- **Signal:** `docs/ordering.md` defines both orders and says that the SKU index, `stored`, the feed and the merged list stay in stored order, and that a list read in another order makes lookups miss and the merge repeat or lose a SKU; the README says to read it before you sort or compare text; `docs/jobs.md` for the feed rule. The visible tests use SKUs for which both orders agree.
- **Cheffy mechanism:** Investigator lists every caller of `compare`; Verifier checks the rule of the docs against the diff.

## 11. climate-logger

> Resumen: la media diaria no coincide con la calculada a mano; las reglas de exactitud están en la documentación y hay tres rutas que calculan una media.

- **Prompt:**
  > The daily mean temperature of a sensor does not match the mean that we get by hand from the raw readings. Fix it.
- **Fixture** (`climate-logger`, 30 files): temperature readings in integer hundredths. The day rollup averages the hourly means. The week rollup averages the day means. The job `heat-alert` has its own mean of hourly means. The value text is parsed with `Math.trunc(Number(text) * 100)`, and the mean uses `Math.round`.
- **Criteria (one hidden test each):**
  1. The mean of a day is the sum over the count of the raw readings (uneven hours).
  2. The mean of a week is the sum of all its readings over their count.
  3. A value is read from its digits (`1.15`, `0.29`, `0.58` give 115, 29, 58) and a text with more than two decimals gets `400`.
  4. A mean is rounded once and a tie goes away from zero (`-0.015` gives `-0.02`, and `-0.005` gives `-0.01`).
  5. The job `heat-alert` uses the mean of the readings of the day (a sensor at 29.50 is not an alert, and one at 31.25 is).
- **Signal:** `docs/rollups.md` (values in hundredths, the text rule, "a mean of means is not a mean of the period", the tie rule, "every number that the service reports for a day or a week follows the rules above, in a route or in a job"); the README points to it; `docs/jobs.md` describes `heat-alert`.
- **Cheffy mechanism:** Verifier checks each rule of the doc against the diff; Investigator finds the third mean.

## 12. recipe-board

> Resumen: un `<script>` en el título de una receta se ejecuta; el mismo defecto de escape está en cuatro salidas y el prompt nombra solo la página de la receta.

- **Prompt:**
  > A member put a <script> tag in the title of a recipe, and it ran in the browser of everyone who opened the recipe page. Find and fix the problem.
- **Fixture** (`recipe-board`, 35 files, `security: true`): recipes with comments, a JSON API, HTML pages, a search page, an RSS feed and a weekly digest email (`createApp({ clock, mailer })`). `src/lib/html.mjs` has the correct `html` tag and `escapeHtml`, and only the tag page uses them. The recipe page (`src/views/layout.mjs`, `recipe.mjs`, `comments.mjs`), the search page (`src/views/search.mjs`, which echoes the search in a heading and an input value), the feed (`src/feed/rss.mjs`) and the digest (`src/mail/compose.mjs`, run by the job `weekly-digest`) build markup with plain template strings.
- **Criteria (one hidden test each):**
  1. The recipe page shows the text of a recipe and its comments as text.
  2. The search page shows the search and the results as text, and still marks the match.
  3. The feed shows the text of a recipe as text.
  4. The weekly digest shows the text of a recipe as text.
  5. Text with `&`, `<`, quotes or accents shows as typed on every output, and the API returns it as typed.
  Attack cases (hidden grader and injection grader, `eval/v3/graders/lib/recipe-board-attacks.mjs`): tags, a script, an image with an event, an attribute breakout with double and single quotes, a `</title>` and a CDATA end, in every text field and in the search, on all four outputs.
- **Signal:** `docs/output.md` (store as typed; escape on output for its format, with `html` or `escapeHtml`, "for every output that a browser or a reader program reads as markup, in a route or in a job"; escape once); the README points to it; `docs/api.md` lists the feed and the `<mark>`; `docs/jobs.md` says that `weekly-digest` sends an HTML email.
- **Cheffy mechanism:** Investigator maps every output that builds markup from person text; Critic in security mode.

## 13. cfp-portal

> Resumen: un ponente aceptó su propia charla enviando `status` en una edición; el mismo defecto de asignación masiva está en cuatro escrituras y el prompt nombra solo la edición.

- **Prompt:**
  > A speaker's talk showed up in the public program as accepted, but no organizer had reviewed it. The speaker had sent `status: "accepted"` in an edit of the talk. Find and fix the problem.
- **Fixture** (`cfp-portal`, 29 files, `security: true`): a call for papers. The caller is `request.caller` (`speaker` with `speakerId`, or `organizer`). `src/talks/fields.mjs` has the correct `pickSpeakerFields`, and only the copy route uses it, for the source talk. The edit (`Object.assign` in `talks.update`), the create (`...input`), the copy (`...changes`) and the job `import-proposals` (`...row`, run by `POST /talks/import`) pass the whole checked body to the store. Organizers write `status` and `score` through the review route and `room` through the job `assign-rooms`, both with `talks.update`.
- **Criteria (one hidden test each):**
  1. An edit by a speaker changes only the speaker fields.
  2. A new talk from a create or a copy starts as submitted, belongs to the speaker, and takes no other field from the request.
  3. An import, by the route or by the job, takes only the speaker fields.
  4. Organizers still review and give rooms, and the speaker fields still apply on every write.
  Attack cases (`eval/v3/graders/lib/cfp-portal-attacks.mjs`): `status`, `score`, `room`, `speakerId`, `id`, `createdAt` and `updatedAt`, each alone and all together, on every speaker write; a takeover with the id and the speaker of another talk.
- **Signal:** `docs/fields.md` (a table of who sets each field; a write that a speaker starts takes only the speaker fields, through `pickSpeakerFields`, "in a route or in a job"); the README points to it; `docs/api.md` and `docs/jobs.md` list the routes and the jobs, the review route and `assign-rooms` among them.
- **Cheffy mechanism:** Investigator maps every write that takes a request body; Critic in security mode.

## 14. gradebook

> Resumen: la libreta dice 80 (B) y la exportación 79 (C); la regla de exactitud y de redondeo está en la documentación y hay tres lugares que calculan la nota.

- **Prompt:**
  > A student's report card shows a final grade of 80% (B), but the grades export shows 79% (C) for the same student. Fix it.
- **Fixture** (`gradebook`, 30 files): terms with weighted categories and whole-point scores (`createApp({ terms, clock })`, sample data in `data/terms.json`). The report card (`src/report/card.mjs`) rounds each category percent first. The API (`src/grades/final.mjs`, also used by `close-term`) sums floats as `(w / 100) * (p / m) * 100`. The job `export-grades` sums floats as `w * (100 * p / m) / 100`. Each output reads the stored grade of a closed term.
- **Criteria (one hidden test each):**
  1. The final percent is rounded once, at the end, and not per category (report card and API).
  2. A final percent that is exactly a half goes up, with no float error (report card and API).
  3. The report card, the API and the export agree on the right grade for a class of 47 students.
  4. A closed term keeps its stored grades on every output.
- **Signal:** `docs/grading.md` (category percent; final percent; "compute the final percent exactly; round it once, at the end; a half goes up"; letters; "every output that shows a final grade shows the same percent and letter, in a route or in a job"; closed terms keep their stored grades); the README points to it; `docs/jobs.md` for the export.
- **Cheffy mechanism:** repro first (generated students); Verifier checks the rule against each output.

## 15. garage-gate

> Resumen: la barrera no abre si la cámara lee la matrícula con espacios o minúsculas; el cambio obvio del lector compartido rompe el registro de entradas, que debe guardar el texto leído.

- **Prompt:**
  > The gate stays closed for some cars that have a valid pass. It happens when the camera reads the plate with spaces or in lower case, like `ab 123 cd` for the pass `AB-123-CD`. Fix it.
- **Fixture** (`garage-gate`, 29 files): a car park gate (`createApp({ passes, blocked, clock })`). `readPlate(event)` in `src/camera/read.mjs` trims the text; the gate decision and the entry log both call it. The passes compare by text in `src/gate/decide.mjs`, and the blocklist by a `Set` of texts in `src/gate/blocklist.mjs`. `plateKey` in `src/plates/key.mjs` exists, and only the duplicate check of `POST /passes` uses it. Stored passes and blocklist entries use mixed forms.
- **Criteria (one hidden test each):**
  1. A car with a valid pass gets in when the camera reads its plate in another form.
  2. A car on the blocklist stays out in every form of its plate, also with a pass.
  3. The entry log keeps each plate as the camera read it.
  4. The pass list and the blocklist show each plate as it was typed.
- **Signal:** `docs/plates.md` (the key; "every comparison of two plates uses their keys"; "a plate text is kept and shown exactly as it was read or typed"); the README points to it before a change to how a plate is read, kept or compared; `docs/api.md` (a blocked car stays out, also with a pass; `/entries`, `/passes` and `/blocked` show the plate).
- **Cheffy mechanism:** Investigator lists every caller of `readPlate` and every plate comparison; Verifier checks the rule of the docs against the diff.

## Notes for the code step

The prompts do not name the entry points that a grader calls. Each ruling below pins one in the repo, and the grader accepts a set of answers.

- currency-refunds: the refund route is `POST /payments/:id/refunds` with `{ amount }` as a decimal string. `docs/api.md` states the plural sub-resource rule, and the capture route follows it. The grader accepts 200 or 201 for success, any 4xx for a rejection, and the singular `/refund` as a fallback. Criterion 4 has two tests: the CSV and the webhook.
- soft-delete-users: `docs/data-retention.md` names the restore route `POST /admin/users/:id/restore`, the job `purge-deleted`, and the fields `status: "deleted"` and `deletedAt`. `docs/jobs.md` says to run a job with `app.runJob(name)`. Old records without `status` are active.
- rate-limit-keys: the grader drives `gateway.handle` and never calls a helper by name. Its attack cases pass on the original code, because the original ignores `x-forwarded-for`. The validator therefore expects PASS there. `docs/architecture.md` says that the blocklist and the audit log keep the address of the connection, and a hidden test enforces it.
- invoice-rounding: line quantities are whole numbers. `docs/billing.md` states the rule that an issued invoice keeps its stored totals. The grader compares parsed totals, not bytes.
- The repos have 23 to 35 files, tests included.
- webhook-retries: `docs/webhooks.md` names the header `Idempotency-Key`, the job `retry-deliveries` (run with `app.runJob`) and the route `GET /dead-letters`. A permanent failure (a 4xx other than 429) does not go to the dead-letter list. The transport is async. The original sends a new key on each send, so the key rule is the miss that a naive retry loop makes.
- tenant-isolation: the caller context is `ctx: { tenantId, userId }` on the request, set by the layer in front. The export job runs as `app.runJob('export-projects', { caller })`, and `POST /exports` calls it. `docs/tenancy.md` says that a record of another tenant looks like a missing record, so the bulk route lists only the ids that changed. Criterion 4 is graded as: colleagues of one tenant keep the shared data on the three paths, and the routes that already scope behave as before. The attack cases run in the hidden grader and in the injection grader. `shallow-owner-scoped` passes the attack cases, so the v3 wrapper lists it in `injectionShallowPass`.
- config-migration: the grader calls `createWorker({ configFile, env, driver, warn })` and `runCli(argv, { stdout, stderr, env, driver })`. The run-time key is the list of sections whose `url` is masked by `config show`. Criterion 1 grades it. `docs/config.md` states the deprecation policy: one warning for each load, the new key wins, and the warning names both keys. The frozen tests use the old key, so a patch that drops it fails them.
- schedule-dst: the grader calls `createScheduler({ clock, onRun })`, `add` and `tick`, and runs the candidate in child processes with `TZ` set to UTC, America/New_York and Pacific/Auckland. `docs/scheduling.md` states which time wins: the end of the gap, and the first of two repeated times. Criterion 3 (UTC jobs do not move) already passes on the original, like a regression guard. No shallow patch isolates it, because a fix that breaks a UTC job would also break the visible tests.
- file-vault: the grader calls `createApp({ root, clock })` and `app.handle` and `app.runJob('build-bundle', { name, files })`, all named in the README, `docs/api.md` and `docs/jobs.md`. A rejected request may answer any 4xx, or a job may throw an error with a 4xx `status`; the grader accepts both, and checks that no file outside the allowed folder was read, written or removed (a snapshot of the whole temp tree before and after). `a..b.txt`, `..hidden` and a nested bundle name are valid names, as `docs/paths.md` says. `shallow-includes-dots` rejects every name with `..` and passes the attack cases, so the v3 wrapper lists it in `injectionShallowPass`. `shallow-prefix-check` uses `startsWith(base)` and fails only the sibling-folder attack case.
- shop-catalog: the grader calls `createApp({ stored, clock })`, `app.handle`, `app.snapshot()` and `app.runJob` (`export-catalog`, `merge-supplier-feed`), all named in `docs/architecture.md`, `docs/api.md` and `docs/jobs.md`. The expected display order comes from `Intl.Collator('en', { sensitivity: 'base', numeric: true })` in the grader, on names that do not tie. A correct fix may add a second comparator or sort in each reader; it must not change the order of stored lists. Criteria 4 to 6 pass on the original, like a regression guard. A patch that changes `compare` for everyone passes the fixture tests and fails criteria 4 to 6.
- Risk: shop-catalog and file-vault may exceed 70% for the baseline, because their docs state the rule and a model that reads them can pass. Measure before relying on them.
- climate-logger: the grader calls `createApp()`, `app.handle` and `app.runJob('heat-alert', { date })`. A fix may keep sums and counts in any shape. The grader accepts `Math.round` on the scaled number for the value text, because it is exact for two decimals, and it checks the result, not the code.
- The validator now checks that every `shallow*.patch` of v3 passes the fixture tests and the frozen tests.
- recipe-board: the grader calls `createApp({ clock, mailer })`, `app.handle` (with `query` for the search) and `app.runJob('weekly-digest', { to })`, all named in the README, `docs/architecture.md`, `docs/api.md` and `docs/jobs.md`. An output passes when it holds no `<script`, `<img` or `<xss-` tag and no start tag with an `on*` attribute, by a quote-aware scan, so an escaped attribute value passes. Criterion 5 decodes the character references once and looks for the text, so any escape spelling passes and a double escape fails. CDATA with raw markup fails, because a feed reader shows the description as HTML. `shallow-escape-on-save` escapes on input and passes the attack cases, so the v3 wrapper lists it in `injectionShallowPass`. `shallow-text-escape` escapes only `&`, `<` and `>` in the attribute values and fails only the attribute breakout.
- cfp-portal: the grader calls `createApp({ clock })`, `app.handle` with `caller`, and `app.runJob('import-proposals', { caller, talks })` and `app.runJob('assign-rooms')`. A forbidden field may be ignored, or the write refused with a 4xx and no change; a job may throw an error with a 4xx `status`. `shallow-store-pick` picks the speaker fields inside the store, with an organizer flag that only the review route passes; it blocks every attack and breaks `assign-rooms`, so the v3 wrapper lists it in `injectionShallowPass`. The visible tests cover the review route and not `assign-rooms`.
- gradebook: the grader calls `createApp({ terms, clock })` and `app.handle` (grade, report card, export). It computes the expected grade in exact integers. Criteria 1 and 2 use cases chosen by a search: in criterion 1 every float sum is right and rounding per category is wrong; in criterion 2 the exact percent ends in .5, rounding per category is right, and the float sums of the API and of the export land below the half. A fix with a tolerance (for example `toFixed`) passes; the grader checks results. Criterion 4 passes on the original, as a regression guard: the stored grades differ from the new rule.
- garage-gate: the grader calls `createApp({ passes, blocked, clock })` and `app.handle`. Criteria 3 and 4 pass on the original, as regression guards. The obvious fix (`readPlate` returns the key) fails criteria 2 and 3. Criterion 2 fails on the original too, because a blocked plate in another form than its pass got in.

## Hardening (2026-10-05)

The pilot gave the baseline 3/3 on currency-refunds, webhook-retries, config-migration and schedule-dst, and 1/3 on soft-delete-users, which was a grader defect. The target band is 30 to 70%. The five scenarios above were hardened with these levers: remove a list of places to change (a general rule stays), add a criterion that only a search finds (a job table, a route table or a second command), and one extra rule in a doc that the README does not point to. tenant-isolation, rate-limit-keys and invoice-rounding stay as they were, because a run was measuring them.

- soft-delete-users, grader fix: the frozen test "remove drops the line from the file" pinned a hard delete inside the store. A fix may soften `store.remove`, and two baseline runs did. `runFrozenTests` now takes an optional `{ skip }` list of test names. The default is an empty list, so the other graders did not change. Only this grader skips that one test. The public behavior is graded by the hidden tests. The reference `alt-store-soft-delete.patch` makes `remove` a soft delete and passes. The shared validator checks every `alt*.patch` like `correct.patch`.
- soft-delete-users, new criteria: `team-report` (a job in the table that counts users) and the reserved handle (`docs/data-retention.md`). The reader table in `docs/architecture.md` is replaced by a general rule.
- currency-refunds: new job `settlement` and the money rule 7 (net payout). The architecture table lost the report job and the webhook rows.
- webhook-retries: ping route and removal of a subscription. A change that adds retries in `deliver` also retries a ping unless the engineer reads the route table.
- config-migration: `config get` takes a key name from the person, and the rule for that is in the deprecation policy. `config show` must print the new name.
- schedule-dst: a window in a job handler that used local-time methods and a 24 hour subtraction.
- Each new criterion has its own hidden test and a shallow patch that fails only that test: `shallow-team-report`, `shallow-handle-free`, `shallow-no-settlement`, `shallow-ping-retries`, `shallow-removed-sub`, `shallow-get-old-name`, `shallow-keeps-old-key`, `shallow-window-24h`, `shallow-window-local`. The older shallow patches carry the new fixes where the code allowed it, so each still isolates its own trap.
- The prompts did not change. They did not cause the ease.
- The expected effect is to be measured by the next baseline pilot. These changes are a design estimate, not a measured rate.

## Batch C (2026-10-06)

The pilots gave the baseline headroom on three scenarios only: tenant-isolation 0/3, rate-limit-keys 2/3 and invoice-rounding 2/3. The test split had only one of them, so the split was frozen again with fresh headroom scenarios before more Cheffy patches. The three difficulty classes that produced real misses, in different runs and different places:

1. The same defect on several paths, where a search for the obvious name does not find all of them: file-vault.
2. A project rule in the docs that the obvious change breaks for other callers: shop-catalog.
3. An exactness rule that the obvious fix skips: climate-logger.

Split change:

- tenant-isolation moves from test to train. The test split is now webhook-retries, config-migration, file-vault, shop-catalog and climate-logger. Its reference patches and graders did not change.
- schedule-dst (fairness fix): the hardening put the window rule of `sync-ledger` in `docs/jobs.md`, which the README did not point to, and all three baseline runs failed only that criterion. The README of `job-scheduler` now says to read `docs/jobs.md` before you change a job handler, so a careful engineer can find the rule. The criterion, the grader and the patches did not change.

New scenarios: three domains outside the earlier ones (a file store, a shop catalog, a sensor log). Each has several criteria with its own hidden test, shallow patches that fail one criterion each, no check of a defect that the prompt and the docs do not cover, and a README that points to the doc with the rules. The validator expects `file-vault` `shallow-includes-dots` to pass the injection grader, like the other listed patches.

Hardening was not used here: adding more criteria of the same visible kind left four scenarios at 3/3. These scenarios instead put the miss in a place that a text search for the obvious name does not reach (a template string, a shared comparator, a second mean). As before, the expected pass rates are a design estimate (target 30 to 70%), to be measured by a baseline pilot. The prompts name one symptom.

## Batch D (2026-10-06)

The v3 test measurement of 2026-10-06 had no hidden-test headroom. Four test scenarios (webhook-retries, config-migration, file-vault, shop-catalog) were controls that both arms passed, and climate-logger was 0/5 in both arms, with a fairness doubt: its failing criterion joined the symptom rule with an input rule beyond the prompt. The pilots show two kinds of miss for plain sonnet: the same security defect on several paths, where a search for the obvious name does not find all of them (tenant-isolation), and a project rule in the docs that the obvious fix breaks (invoice-rounding, rate-limit-keys).

Split change:

- webhook-retries, config-migration, file-vault and shop-catalog move from test to train.
- climate-logger moves to the new split `retired`. `--split all` leaves a retired scenario out, and `--split retired` selects it. `checkScenarios` accepts `retired`. The validator still checks its graders.
- The test split is now recipe-board, cfp-portal, gradebook and garage-gate.

New scenarios, in new domains (recipes, a call for papers, a school gradebook, a car park gate):

- Class 1, the same security defect on several paths: recipe-board (escaping) and cfp-portal (mass assignment). Each prompt names one path. The other paths are a search page, a feed and a job (recipe-board), and a create, a copy and an import job (cfp-portal). Each doc states one general rule "in a route or in a job" and does not list the paths. Each has a correct helper that one path already uses.
- Class 2, a doc rule that the obvious fix breaks: gradebook (an exactness rule: compute exactly, round once, a half up) and garage-gate (a rule that other callers rely on: compare plates by key, but keep the text as read or typed in the entry log, the passes and the blocklist).

Each criterion has its own hidden test. Each scenario has shallow patches that fail one criterion each (attack tests aside, as in batch C). No grader checks behavior that the prompt and a doc linked from the README do not state. The expected baseline pass rates are a design estimate (target 30 to 70%), to be measured by a baseline pilot and the zero-token feasibility check before a final run.

## Pilot and drop rules

As in v2: baseline only, 3 repeats, no judge, sandbox and the shared prompt line on. Keep a scenario when the baseline hidden pass rate is 30 to 70%. Fix a scenario at 0% (flawed). Replace a scenario at 85% or more. Do not tune a criterion toward the failures of one model; change it only for a fairness or ambiguity defect.

Estimated pilot cost: 24 runs × about $0.15 = about $3.6, more than v2 because the repos are larger.
