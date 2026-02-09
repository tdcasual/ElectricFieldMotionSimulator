import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSchema } from '../js/ui/SchemaForm.js';

test('SchemaForm validates required number fields', () => {
  const schema = [{ title: 'A', fields: [{ key: 'x', type: 'number', min: 0 }] }];
  const errors = validateSchema(schema, { x: -1 });
  assert.equal(errors.length, 1);
});
