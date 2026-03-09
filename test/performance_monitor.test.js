import test from 'node:test';
import assert from 'node:assert/strict';
import { PerformanceMonitor } from '../js/utils/PerformanceMonitor.js';

test('PerformanceMonitor exposes averaged frame timing statistics', () => {
  const monitor = new PerformanceMonitor();
  monitor.frameTimes = [16, 17, 18, 20, 33];

  const stats = monitor.getFrameStats();

  assert.deepEqual(stats, {
    avgMs: 20.8,
    p95Ms: 33,
    maxMs: 33,
    sampleCount: 5
  });
  assert.equal(monitor.getFPS(), 48);
});


test('PerformanceMonitor reset clears sampled frame timing state', () => {
  const monitor = new PerformanceMonitor();
  monitor.frameTimes = [16, 17, 18];

  monitor.reset();

  assert.deepEqual(monitor.getFrameStats(), {
    avgMs: 0,
    p95Ms: 0,
    maxMs: 0,
    sampleCount: 0
  });
  assert.equal(monitor.getFPS(), 0);
});
