import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runFrozenTests } from './lib/frozen.mjs';

const { exportContacts } = await import(`${process.env.CANDIDATE_DIR}/src/export.mjs`);
const T = { timeout: 20_000 };

// A strict RFC 4180 parser. It accepts LF or CRLF line ends and throws on a malformed quoted field.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let i = 0;
  const endField = () => { row.push(field); field = ''; };
  const endRow = () => { endField(); rows.push(row); row = []; };
  while (i < text.length) {
    if (text[i] === '"' && field === '') {
      i += 1;
      for (;;) {
        if (i >= text.length) throw new Error('unterminated quoted field');
        if (text[i] === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue; }
        if (text[i] === '"') { i += 1; break; }
        field += text[i]; i += 1;
      }
      if (i < text.length && !',\r\n'.includes(text[i])) throw new Error(`text after a closing quote at ${i}`);
      continue;
    }
    if (text[i] === '"') throw new Error(`quote inside an unquoted field at ${i}`);
    if (text[i] === ',') { endField(); i += 1; continue; }
    if (text[i] === '\r' && text[i + 1] === '\n') { endRow(); i += 2; continue; }
    if (text[i] === '\n') { endRow(); i += 1; continue; }
    field += text[i]; i += 1;
  }
  if (field !== '' || row.length) endRow();
  return rows;
}

const contacts = [
  { name: 'Ana Ruiz', company: 'Globex', email: 'ana@globex.test' },
  { name: 'Bo Chen', company: 'Acme, Inc.', email: 'bo@acme.test' },
  { name: 'Cy Diaz', company: 'Acme "Best", Inc.', email: 'cy@acme.test' },
];
const expected = [['name', 'company', 'email'], ...contacts.map((c) => [c.name, c.company, c.email])];

test('a company name with a comma stays in one column', T, () => {
  assert.deepEqual(parseCsv(exportContacts(contacts.slice(0, 2))), expected.slice(0, 3));
});

test('a company name with a comma and quotes keeps its value', T, () => {
  assert.deepEqual(parseCsv(exportContacts(contacts)), expected);
});

test('the original tests still pass', T, () => {
  const res = runFrozenTests('contacts-export');
  assert.ok(res.ok, res.output);
});
