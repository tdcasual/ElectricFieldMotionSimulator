import test from 'node:test';
import assert from 'node:assert/strict';

import { compileSafeExpression, compileSafeMathExpression } from '../js/utils/SafeExpression.js';

test('compileSafeMathExpression supports Math.sin and Math.PI', () => {
    const fn = compileSafeMathExpression('Math.sin(2 * Math.PI * 50 * t)');

    assert.equal(fn(0), 0);

    // t = 1/(4f) => sin(pi/2) = 1
    const quarterPeriod = 1 / (4 * 50);
    assert.ok(Math.abs(fn(quarterPeriod) - 1) < 1e-12);
});

test('compileSafeMathExpression supports ternary + comparisons', () => {
    const fn = compileSafeMathExpression('t > 0 ? 1 : -1');
    assert.equal(fn(1), 1);
    assert.equal(fn(-1), -1);
});

test('compileSafeMathExpression rejects unknown functions', () => {
    assert.throws(
        () => compileSafeMathExpression('alert(1)'),
        /Unknown function|Unknown identifier/
    );
});

test('compileSafeMathExpression rejects non-math property access', () => {
    assert.throws(
        () => compileSafeMathExpression('globalThis.alert(1)'),
        /Unknown function|Unknown identifier/
    );
});

test('compileSafeExpression supports custom variables', () => {
    const fn = compileSafeExpression('v0 / sqrt(2)', ['v0']);
    const v0 = 200;
    const out = fn({ v0 });
    assert.ok(Math.abs(out - v0 / Math.sqrt(2)) < 1e-12);
});

test('compileSafeExpression rejects unknown variables', () => {
    assert.throws(
        () => compileSafeExpression('v0 + 1', []),
        /Unknown identifier/
    );
});
