# Plates

People and cameras write the same plate in different ways: `AB-123-CD`, `ab 123 cd`, `AB123CD`.

## Rules

- The key of a plate is its text in upper case, with every space and dash removed. Every other character stays as it is. `plateKey` in `src/plates/key.mjs` makes it.
- Two plate texts are the same plate when their keys are equal. Every comparison of two plates uses their keys.
- A plate text is kept and shown as it was read or typed, without the spaces at its start and its end.
- An output that needs another form of a plate says so in `docs/api.md` or `docs/jobs.md`.
