import test from 'node:test';
import assert from 'node:assert/strict';

import { runReplay } from './helpers/replayRunner.js';

test('replay result is deterministic for 500 steps', () => {
  const first = runReplay('test/fixtures/replay/basic-electric.json', 500, 0.016);
  const second = runReplay('test/fixtures/replay/basic-electric.json', 500, 0.016);

  assert.deepEqual(first.signature, second.signature);
});
