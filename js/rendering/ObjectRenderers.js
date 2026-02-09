export const ObjectRenderers = {
  electric(renderer, object, scene) {
    renderer.drawElectricField(object, scene);
  },
  magnetic(renderer, object, scene) {
    renderer.drawMagneticField(object, scene);
  },
  device(renderer, object, scene) {
    if (!object) return;
    if (object.type === 'disappear-zone') {
      renderer.drawDisappearZone(object, scene);
      return;
    }
    if (object.type === 'fluorescent-screen') {
      renderer.drawFluorescentScreen(object, scene);
      return;
    }
    if (object.type === 'electron-gun') {
      renderer.drawElectronGun(object, scene);
      return;
    }
    if (object.type === 'programmable-emitter') {
      renderer.drawProgrammableEmitter(object, scene);
    }
  }
};

export function getObjectRenderer(key) {
  return ObjectRenderers[key] || null;
}
