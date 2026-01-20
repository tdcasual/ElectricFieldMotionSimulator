import assert from 'node:assert/strict';
import test from 'node:test';

import { ForceCalculator } from '../js/physics/ForceCalculator.js';

test('ForceCalculator magnetic force matches canvas y-down convention', () => {
  const calculator = new ForceCalculator();
  const scene = {
    settings: { pixelsPerMeter: 1 },
    getMagneticField: () => 1,
    getElectricField: () => ({ x: 0, y: 0 })
  };
  const particle = {
    position: { x: 0, y: 0 },
    velocity: { x: 10, y: 0 },
    charge: 1
  };

  const force = calculator.calculateMagneticForce(particle, scene);
  assert.equal(Math.abs(force.x), 0);
  // vx 向右，Bz 指向屏幕外，正电荷应向下偏转（y 为正）
  assert.equal(force.y, 10);
});

test('ForceCalculator magnetic force flips with charge and B sign', () => {
  const calculator = new ForceCalculator();
  const scene = {
    settings: { pixelsPerMeter: 1 },
    getMagneticField: () => -2,
    getElectricField: () => ({ x: 0, y: 0 })
  };
  const particle = {
    position: { x: 0, y: 0 },
    velocity: { x: 5, y: 0 },
    charge: 3
  };

  const force = calculator.calculateMagneticForce(particle, scene);
  assert.equal(Math.abs(force.x), 0);
  assert.equal(force.y, 3 * 5 * -2);
});
