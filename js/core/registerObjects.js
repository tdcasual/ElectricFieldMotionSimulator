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
import { DisappearZone } from '../objects/DisappearZone.js';

function normalizeIconMarkup(markup) {
  const source = String(markup ?? '').trim();
  return source.replace(/<svg\b([^>]*)>/i, (_all, attrs) => {
    const attrsWithoutSize = String(attrs ?? '')
      .replace(/\swidth="[^"]*"/gi, '')
      .replace(/\sheight="[^"]*"/gi, '');
    if (/\bclass="[^"]*"/i.test(attrsWithoutSize)) {
      return `<svg${attrsWithoutSize.replace(/\bclass="([^"]*)"/i, 'class="$1 registry-icon"')}>`;
    }
    return `<svg${attrsWithoutSize} class="registry-icon">`;
  });
}

const RAW_ICONS = {
  electricRect: `
    <svg viewBox="0 0 24 24" width="24" height="24">
      <rect x="4.5" y="5" width="15" height="14" rx="1.5" stroke="currentColor" fill="none" stroke-width="1.8"/>
      <path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="1.8"/>
    </svg>
  `,
  electricCircle: `
    <svg viewBox="0 0 24 24" width="24" height="24">
      <circle cx="12" cy="12" r="7.2" stroke="currentColor" fill="none" stroke-width="1.8"/>
      <path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="1.8"/>
    </svg>
  `,
  electricSemi: `
    <svg viewBox="0 0 24 24" width="24" height="24">
      <path d="M5 13a7 7 0 0 1 14 0" stroke="currentColor" fill="none" stroke-width="1.8"/>
      <line x1="5" y1="13" x2="19" y2="13" stroke="currentColor" stroke-width="1.8"/>
    </svg>
  `,
  capacitor: `
    <svg viewBox="0 0 24 24" width="24" height="24">
      <line x1="8.5" y1="5" x2="8.5" y2="19" stroke="currentColor" stroke-width="1.8"/>
      <line x1="15.5" y1="5" x2="15.5" y2="19" stroke="currentColor" stroke-width="1.8"/>
      <path d="M4.5 14h2.8" stroke="currentColor" stroke-width="1.8"/>
      <path d="M11 9h2.8M12.4 7.6v2.8" stroke="currentColor" stroke-width="1.8"/>
    </svg>
  `,
  verticalCapacitor: `
    <svg viewBox="0 0 24 24" width="24" height="24">
      <line x1="6" y1="8.5" x2="18" y2="8.5" stroke="currentColor" stroke-width="1.8"/>
      <line x1="6" y1="15.5" x2="18" y2="15.5" stroke="currentColor" stroke-width="1.8"/>
      <path d="M12 9.8v4.4M10.7 12h2.6" stroke="currentColor" stroke-width="1.8"/>
    </svg>
  `,
  magneticRect: `
    <svg viewBox="0 0 24 24" width="24" height="24">
      <rect x="4" y="5" width="16" height="14" rx="1.5" stroke="currentColor" fill="none" stroke-width="1.8"/>
      <circle cx="8.5" cy="9.6" r="1.2" fill="currentColor"/>
      <path d="M14.2 8.4l2.6 2.6M16.8 8.4l-2.6 2.6" stroke="currentColor" stroke-width="1.8"/>
      <path d="M7.2 13.9l2.6 2.6M9.8 13.9l-2.6 2.6" stroke="currentColor" stroke-width="1.8"/>
      <circle cx="15.5" cy="15.3" r="1.2" fill="currentColor"/>
    </svg>
  `,
  magneticLong: `
    <svg viewBox="0 0 24 24" width="24" height="24">
      <rect x="3.2" y="8.2" width="17.6" height="7.6" rx="1.2" stroke="currentColor" fill="none" stroke-width="1.8"/>
      <circle cx="7" cy="12" r="1.1" fill="currentColor"/>
      <path d="M10.6 10.8l2.4 2.4M13 10.8l-2.4 2.4" stroke="currentColor" stroke-width="1.8"/>
      <circle cx="17" cy="12" r="1.1" fill="currentColor"/>
    </svg>
  `,
  magneticCircle: `
    <svg viewBox="0 0 24 24" width="24" height="24">
      <circle cx="12" cy="12" r="7.2" stroke="currentColor" fill="none" stroke-width="1.8"/>
      <circle cx="12" cy="12" r="1.3" fill="currentColor"/>
      <path d="M8 8l1.8 1.8M9.8 8L8 9.8M14.2 14.2l1.8 1.8M16 14.2l-1.8 1.8" stroke="currentColor" stroke-width="1.8"/>
    </svg>
  `,
  magneticTriangle: `
    <svg viewBox="0 0 24 24" width="24" height="24">
      <path d="M12 5L4.8 18.5h14.4Z" stroke="currentColor" fill="none" stroke-width="1.8"/>
      <circle cx="12" cy="11.8" r="1.2" fill="currentColor"/>
      <path d="M8.2 15l1.8 1.8M10 15l-1.8 1.8" stroke="currentColor" stroke-width="1.8"/>
    </svg>
  `,
  electronGun: `
    <svg viewBox="0 0 24 24" width="24" height="24">
      <path d="M5 8h7l4 4-4 4H5z" stroke="currentColor" fill="none" stroke-width="1.8"/>
      <line x1="7" y1="12" x2="18.5" y2="12" stroke="currentColor" stroke-width="1.8"/>
      <path d="M16.2 10.4l2.3 1.6-2.3 1.6" stroke="currentColor" fill="none" stroke-width="1.8"/>
      <circle cx="7" cy="12" r="1.1" fill="currentColor"/>
    </svg>
  `,
  programmableEmitter: `
    <svg viewBox="0 0 24 24" width="24" height="24">
      <rect x="4.5" y="8" width="5.5" height="8" rx="1" stroke="currentColor" fill="none" stroke-width="1.8"/>
      <path d="M11.2 12h8.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M15.2 9.8l3 2.2-3 2.2" stroke="currentColor" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="7.2" cy="12" r="1.1" fill="none" stroke="currentColor" stroke-width="1.8"/>
    </svg>
  `,
  particle: `
    <svg viewBox="0 0 24 24" width="24" height="24">
      <circle cx="12" cy="12" r="5.2" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
    </svg>
  `,
  disappearZone: `
    <svg viewBox="0 0 24 24" width="24" height="24">
      <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="1.8" stroke-dasharray="3 2"/>
      <path d="M8.8 9.5l-2 2.5 2 2.5" stroke="currentColor" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M15.2 9.5l2 2.5-2 2.5" stroke="currentColor" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `
};

const ICONS = Object.fromEntries(
  Object.entries(RAW_ICONS).map(([key, markup]) => [key, normalizeIconMarkup(markup)])
);

export const registry = new ObjectRegistry();

registry.register('electric-field-rect', {
  class: RectElectricField,
  label: '均匀电场',
  icon: ICONS.electricRect,
  category: 'electric',
  defaults: RectElectricField.defaults,
  schema: RectElectricField.schema,
  rendererKey: 'electric',
  interaction: { kind: 'electric-field', resizeMode: 'rect' }
});

registry.register('electric-field-circle', {
  class: CircleElectricField,
  label: '圆形电场',
  icon: ICONS.electricCircle,
  category: 'electric',
  defaults: CircleElectricField.defaults,
  schema: CircleElectricField.schema,
  rendererKey: 'electric',
  interaction: { kind: 'electric-field', resizeMode: 'radius' }
});

registry.register('semicircle-electric-field', {
  class: SemiCircleElectricField,
  label: '半圆电场',
  icon: ICONS.electricSemi,
  category: 'electric',
  defaults: SemiCircleElectricField.defaults,
  schema: SemiCircleElectricField.schema,
  rendererKey: 'electric',
  interaction: { kind: 'electric-field', resizeMode: 'radius' }
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
  rendererKey: 'magnetic',
  interaction: { kind: 'magnetic-field' }
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
  rendererKey: 'magnetic',
  interaction: { kind: 'magnetic-field' }
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
  rendererKey: 'magnetic',
  interaction: { kind: 'magnetic-field' }
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
  rendererKey: 'magnetic',
  interaction: { kind: 'magnetic-field' }
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
