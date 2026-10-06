import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCsv } from '../src/csv.mjs';
import { exportContacts } from '../src/export.mjs';

test('writes a header and one line per row', () => {
  assert.equal(toCsv([{ a: 1, b: 'x' }, { a: 2 }], ['a', 'b']), 'a,b\n1,x\n2,\n');
});

test('exports contacts with plain values', () => {
  const csv = exportContacts([
    { name: 'Ana Ruiz', company: 'Globex', email: 'ana@globex.test' },
    { name: 'Li Wei', company: 'Initech', email: 'li@initech.test' },
  ]);
  assert.equal(csv, 'name,company,email\nAna Ruiz,Globex,ana@globex.test\nLi Wei,Initech,li@initech.test\n');
});
