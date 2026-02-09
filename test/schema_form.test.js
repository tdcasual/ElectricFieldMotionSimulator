import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSchema, parseExpressionInput } from '../js/ui/SchemaForm.js';

test('SchemaForm validates required number fields', () => {
  const schema = [{ title: 'A', fields: [{ key: 'x', type: 'number', min: 0 }] }];
  const errors = validateSchema(schema, { x: -1 });
  assert.equal(errors.length, 1);
});

test('SchemaForm parses expression inputs', () => {
  const result = parseExpressionInput('a + 2', { variables: { a: 3 }, time: 0 });
  assert.equal(result.ok, true);
  assert.equal(result.value, 5);

  const bad = parseExpressionInput('unknownVar + 1', { variables: {} });
  assert.equal(bad.ok, false);
});
