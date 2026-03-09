import test from 'node:test';
import assert from 'node:assert/strict';
import { drawTextBadge, formatMetricNumber } from '../js/rendering/LabelFormatting.js';

test('formatMetricNumber keeps readable precision across ranges', () => {
  assert.equal(formatMetricNumber(0), '0');
  assert.equal(formatMetricNumber(0.1234), '0.123');
  assert.equal(formatMetricNumber(1.234), '1.23');
  assert.equal(formatMetricNumber(12.34), '12.3');
});

test('drawTextBadge writes background and text using measured width', () => {
  const calls = [];
  const ctx = {
    save() { calls.push('save'); },
    restore() { calls.push('restore'); },
    measureText(text) { return { width: text.length * 6 }; },
    fillRect(x, y, width, height) { calls.push(['fillRect', x, y, width, height]); },
    fillText(text, x, y) { calls.push(['fillText', text, x, y]); },
    set font(value) { calls.push(['font', value]); },
    set fillStyle(value) { calls.push(['fillStyle', value]); }
  };

  drawTextBadge(ctx, 10, 20, 'Fx');
  assert.deepEqual(calls[0], 'save');
  assert.deepEqual(calls.at(-1), 'restore');
  assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === 'fillRect'), true);
  assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === 'fillText' && entry[1] === 'Fx'), true);
});
