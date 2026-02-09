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

export const registry = new ObjectRegistry();

registry.register('electric-field-rect', {
  class: RectElectricField,
  label: '均匀电场',
  category: 'electric',
  defaults: RectElectricField.defaults,
  schema: RectElectricField.schema,
  rendererKey: 'electric'
});

registry.register('electric-field-circle', {
  class: CircleElectricField,
  label: '圆形电场',
  category: 'electric',
  defaults: CircleElectricField.defaults,
  schema: CircleElectricField.schema,
  rendererKey: 'electric'
});

registry.register('semicircle-electric-field', {
  class: SemiCircleElectricField,
  label: '半圆电场',
  category: 'electric',
  defaults: SemiCircleElectricField.defaults,
  schema: SemiCircleElectricField.schema,
  rendererKey: 'electric'
});

registry.register('parallel-plate-capacitor', {
  class: ParallelPlateCapacitor,
  label: '平行板电容器',
  category: 'electric',
  defaults: ParallelPlateCapacitor.defaults,
  schema: ParallelPlateCapacitor.schema,
  rendererKey: 'electric'
});

registry.register('vertical-parallel-plate-capacitor', {
  class: VerticalParallelPlateCapacitor,
  label: '垂直平行板电容器',
  category: 'electric',
  defaults: VerticalParallelPlateCapacitor.defaults,
  schema: VerticalParallelPlateCapacitor.schema,
  rendererKey: 'electric'
});

registry.register('magnetic-field', {
  class: MagneticField,
  label: '匀强磁场',
  category: 'magnetic',
  defaults: MagneticField.defaults,
  schema: MagneticField.schema,
  rendererKey: 'magnetic'
});

registry.register('particle', {
  class: Particle,
  label: '带电粒子',
  category: 'particle',
  defaults: Particle.defaults,
  schema: Particle.schema,
  rendererKey: 'particle'
});

registry.register('electron-gun', {
  class: ElectronGun,
  label: '电子枪',
  category: 'particle',
  defaults: ElectronGun.defaults,
  schema: ElectronGun.schema,
  rendererKey: 'device'
});

registry.register('programmable-emitter', {
  class: ProgrammableEmitter,
  label: '粒子发射器',
  category: 'particle',
  defaults: ProgrammableEmitter.defaults,
  schema: ProgrammableEmitter.schema,
  rendererKey: 'device'
});

registry.register('fluorescent-screen', {
  class: FluorescentScreen,
  label: '荧光屏',
  category: 'display',
  defaults: FluorescentScreen.defaults,
  schema: FluorescentScreen.schema,
  rendererKey: 'device'
});

registry.register('disappear-zone', {
  class: DisappearZone,
  label: '消失区域',
  category: 'display',
  defaults: DisappearZone.defaults,
  schema: DisappearZone.schema,
  rendererKey: 'device'
});
