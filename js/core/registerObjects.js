import { ObjectRegistry } from './ObjectRegistry.js';
import { RectElectricField } from '../objects/RectElectricField.js';
import { CircleElectricField } from '../objects/CircleElectricField.js';
import { SemiCircleElectricField } from '../objects/SemiCircleElectricField.js';
import { ParallelPlateCapacitor } from '../objects/ParallelPlateCapacitor.js';
import { VerticalParallelPlateCapacitor } from '../objects/VerticalParallelPlateCapacitor.js';
import { MagneticField } from '../objects/MagneticField.js';
import { Particle } from '../objects/Particle.js';
import { ElectronGun } from '../objects/ElectronGun.js';
import { ProgrammableEmitter } from '../objects/ProgrammableEmitter.js';
import { FluorescentScreen } from '../objects/FluorescentScreen.js';
import { DisappearZone } from '../objects/DisappearZone.js';

const ICONS = {
  electricRect: `
    <svg viewBox="0 0 24 24" width="24" height="24">
      <rect x="4" y="4" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"/>
      <path d="M8 12h8M12 8v8" stroke="currentColor" stroke-width="1.5"/>
    </svg>
  `,
  electricCircle: `
    <svg viewBox="0 0 24 24" width="24" height="24">
      <circle cx="12" cy="12" r="8" stroke="currentColor" fill="none" stroke-width="2"/>
      <path d="M12 6v12M6 12h12" stroke="currentColor" stroke-width="1.5"/>
    </svg>
  `,
  electricSemi: `
    <svg viewBox="0 0 24 24" width="24" height="24">
      <path d="M4 12 A8 8 0 0 1 20 12" stroke="currentColor" fill="none" stroke-width="2"/>
      <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="2"/>
    </svg>
  `,
  capacitor: `
    <svg viewBox="0 0 24 24" width="24" height="24">
      <line x1="8" y1="4" x2="8" y2="20" stroke="currentColor" stroke-width="3"/>
      <line x1="16" y1="4" x2="16" y2="20" stroke="currentColor" stroke-width="3"/>
      <text x="10" y="14" font-size="10" fill="currentColor">+</text>
      <text x="4" y="14" font-size="10" fill="currentColor">-</text>
    </svg>
  `,
  verticalCapacitor: `
    <svg viewBox="0 0 24 24" width="24" height="24">
      <rect x="6" y="4" width="4" height="16" stroke="currentColor" fill="none" stroke-width="2"/>
      <rect x="14" y="4" width="4" height="16" stroke="currentColor" fill="none" stroke-width="2"/>
      <path d="M6 12h12" stroke="currentColor" stroke-width="1.5"/>
    </svg>
  `,
  magneticRect: `
    <svg viewBox="0 0 24 24" width="24" height="24">
      <rect x="4" y="5" width="16" height="14" stroke="currentColor" fill="none" stroke-width="2"/>
      <circle cx="9" cy="10" r="1.7" fill="currentColor"/>
      <circle cx="15" cy="10" r="1.7" fill="currentColor"/>
      <circle cx="9" cy="15" r="1.7" fill="currentColor"/>
      <circle cx="15" cy="15" r="1.7" fill="currentColor"/>
    </svg>
  `,
  magneticLong: `
    <svg viewBox="0 0 24 24" width="24" height="24">
      <rect x="3" y="8" width="18" height="8" stroke="currentColor" fill="none" stroke-width="2"/>
      <circle cx="7" cy="12" r="1.6" fill="currentColor"/>
      <circle cx="12" cy="12" r="1.6" fill="currentColor"/>
      <circle cx="17" cy="12" r="1.6" fill="currentColor"/>
    </svg>
  `,
  magneticCircle: `
    <svg viewBox="0 0 24 24" width="24" height="24">
      <circle cx="12" cy="12" r="8" stroke="currentColor" fill="none" stroke-width="2"/>
      <circle cx="12" cy="12" r="2" fill="currentColor"/>
    </svg>
  `,
  magneticTriangle: `
    <svg viewBox="0 0 24 24" width="24" height="24">
      <path d="M12 5 L4 19 H20 Z" stroke="currentColor" fill="none" stroke-width="2"/>
      <circle cx="12" cy="12" r="1.7" fill="currentColor"/>
    </svg>
  `,
  electronGun: `
    <svg viewBox="0 0 24 24" width="24" height="24">
      <path d="M4 7h10l4 5-4 5H4z" stroke="currentColor" fill="none" stroke-width="2"/>
      <line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" stroke-width="2"/>
      <circle cx="6" cy="12" r="1.5" fill="currentColor"/>
    </svg>
  `,
  programmableEmitter: `
    <svg viewBox="0 0 24 24" width="24" height="24">
      <rect x="4" y="8" width="6" height="8" stroke="currentColor" fill="none" stroke-width="2"/>
      <path d="M11 12h9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M16 9l4 3-4 3" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="7" cy="12" r="1.3" fill="currentColor"/>
    </svg>
  `,
  particle: `
    <svg viewBox="0 0 24 24" width="24" height="24">
      <circle cx="12" cy="12" r="6" fill="currentColor"/>
    </svg>
  `,
  fluorescentScreen: `
    <svg viewBox="0 0 24 24" width="24" height="24">
      <rect x="4" y="4" width="8" height="16" stroke="currentColor" fill="none" stroke-width="2"/>
      <rect x="12" y="6" width="8" height="12" stroke="currentColor" fill="none" stroke-width="2"/>
      <circle cx="16" cy="12" r="2" fill="currentColor"/>
    </svg>
  `,
  disappearZone: `
    <svg viewBox="0 0 24 24" width="24" height="24">
      <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="2" stroke-dasharray="4 3"/>
      <path d="M9 8l-2 2 2 2" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M15 8l2 2-2 2" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `
};

export const registry = new ObjectRegistry();

registry.register('electric-field-rect', {
  class: RectElectricField,
  label: '均匀电场',
  icon: ICONS.electricRect,
  category: 'electric',
  defaults: RectElectricField.defaults,
  schema: RectElectricField.schema,
  rendererKey: 'electric'
});

registry.register('electric-field-circle', {
  class: CircleElectricField,
  label: '圆形电场',
  icon: ICONS.electricCircle,
  category: 'electric',
  defaults: CircleElectricField.defaults,
  schema: CircleElectricField.schema,
  rendererKey: 'electric'
});

registry.register('semicircle-electric-field', {
  class: SemiCircleElectricField,
  label: '半圆电场',
  icon: ICONS.electricSemi,
  category: 'electric',
  defaults: SemiCircleElectricField.defaults,
  schema: SemiCircleElectricField.schema,
  rendererKey: 'electric'
});

registry.register('parallel-plate-capacitor', {
  class: ParallelPlateCapacitor,
  label: '平行板电容器',
  icon: ICONS.capacitor,
  category: 'electric',
  defaults: ParallelPlateCapacitor.defaults,
  schema: ParallelPlateCapacitor.schema,
  rendererKey: 'electric',
  physicsHooks: {
    stage: 10,
    onParticleStep: (engine, scene, particle, object) => {
      engine.handleCapacitorCollision(particle, scene, object);
      return false;
    }
  }
});

registry.register('vertical-parallel-plate-capacitor', {
  class: VerticalParallelPlateCapacitor,
  label: '垂直平行板电容器',
  icon: ICONS.verticalCapacitor,
  category: 'electric',
  defaults: VerticalParallelPlateCapacitor.defaults,
  schema: VerticalParallelPlateCapacitor.schema,
  rendererKey: 'electric'
});

registry.register('magnetic-field', {
  class: MagneticField,
  label: '匀强磁场（矩形）',
  icon: ICONS.magneticRect,
  category: 'magnetic',
  defaults: MagneticField.defaults,
  schema: MagneticField.schema,
  rendererKey: 'magnetic'
});

registry.register('magnetic-field-long', {
  class: MagneticField,
  label: '匀强磁场（长条）',
  icon: ICONS.magneticLong,
  category: 'magnetic',
  defaults: () => ({
    ...MagneticField.defaults(),
    shape: 'rect',
    width: 320,
    height: 90
  }),
  schema: MagneticField.schema,
  rendererKey: 'magnetic'
});

registry.register('magnetic-field-circle', {
  class: MagneticField,
  label: '匀强磁场（圆形）',
  icon: ICONS.magneticCircle,
  category: 'magnetic',
  defaults: () => ({
    ...MagneticField.defaults(),
    shape: 'circle',
    radius: 90,
    width: 180,
    height: 180
  }),
  schema: MagneticField.schema,
  rendererKey: 'magnetic'
});

registry.register('magnetic-field-triangle', {
  class: MagneticField,
  label: '匀强磁场（三角形）',
  icon: ICONS.magneticTriangle,
  category: 'magnetic',
  defaults: () => ({
    ...MagneticField.defaults(),
    shape: 'triangle',
    width: 240,
    height: 180
  }),
  schema: MagneticField.schema,
  rendererKey: 'magnetic'
});

registry.register('particle', {
  class: Particle,
  label: '带电粒子',
  icon: ICONS.particle,
  category: 'particle',
  defaults: Particle.defaults,
  schema: Particle.schema,
  rendererKey: 'particle'
});

registry.register('electron-gun', {
  class: ElectronGun,
  label: '电子枪',
  icon: ICONS.electronGun,
  category: 'particle',
  defaults: ElectronGun.defaults,
  schema: ElectronGun.schema,
  rendererKey: 'device',
  physicsHooks: {
    onUpdate: (engine, scene, object, dt) => {
      object.update?.(dt, scene);
    }
  }
});

registry.register('programmable-emitter', {
  class: ProgrammableEmitter,
  label: '粒子发射器',
  icon: ICONS.programmableEmitter,
  category: 'particle',
  defaults: ProgrammableEmitter.defaults,
  schema: ProgrammableEmitter.schema,
  rendererKey: 'device',
  physicsHooks: {
    onUpdate: (engine, scene, object, dt) => {
      object.update?.(dt, scene);
    }
  }
});

registry.register('fluorescent-screen', {
  class: FluorescentScreen,
  label: '荧光屏',
  icon: ICONS.fluorescentScreen,
  category: 'display',
  defaults: FluorescentScreen.defaults,
  schema: FluorescentScreen.schema,
  rendererKey: 'device',
  physicsHooks: {
    stage: 30,
    onParticleStep: (engine, scene, particle, object) =>
      engine.handleScreenHit(particle, scene, object)
  }
});

registry.register('disappear-zone', {
  class: DisappearZone,
  label: '消失区域',
  icon: ICONS.disappearZone,
  category: 'display',
  defaults: DisappearZone.defaults,
  schema: DisappearZone.schema,
  rendererKey: 'device',
  physicsHooks: {
    stage: 20,
    onParticleStep: (engine, scene, particle, object) =>
      engine.handleDisappearZoneHit(particle, scene, object)
  }
});
