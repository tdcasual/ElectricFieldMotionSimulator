import { mapTimeStepIntent, mapViewportIntent } from '../../v3/ui-adapter/intentMappers';
import type { RuntimeStateRefs, SetStatusText, SimulatorApplication } from './types';

type CreateRuntimeModuleContext = RuntimeStateRefs & {
  application: SimulatorApplication;
  setStatusText: SetStatusText;
  onMount?: () => void;
};

export function createRuntimeModule(ctx: CreateRuntimeModuleContext) {
  function syncFromReadModel() {
    const model = ctx.application.getReadModel();
    ctx.running.value = model.running;
    ctx.timeStep.value = model.timeStep;
    ctx.objectCount.value = model.objectCount;
    ctx.selectedObjectId.value = model.selectedObjectId;
    ctx.viewport.value = {
      width: model.viewport.width,
      height: model.viewport.height
    };
    ctx.objects.value = model.objects;
  }

  function stopLoop() {
    if (ctx.frameHandle.value != null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(ctx.frameHandle.value);
    }
    ctx.frameHandle.value = null;
    ctx.lastFrameAt.value = null;
  }

  function startLoop() {
    if (typeof window === 'undefined') return;
    if (ctx.frameHandle.value != null) return;
    ctx.frameHandle.value = window.requestAnimationFrame(stepLoop);
  }

  function stepLoop(timestamp: number) {
    if (!ctx.running.value) {
      stopLoop();
      return;
    }

    const previous = ctx.lastFrameAt.value;
    if (previous != null) {
      const elapsedMs = Math.max(1, timestamp - previous);
      ctx.fps.value = Math.round(1000 / elapsedMs);
    }
    ctx.lastFrameAt.value = timestamp;

    const stepped = ctx.application.stepSimulation();
    if (!stepped.ok) {
      ctx.setStatusText(stepped.error.message);
      stopRunning();
      return;
    }

    syncFromReadModel();
    ctx.frameHandle.value = window.requestAnimationFrame(stepLoop);
  }

  function startRunning() {
    const result = ctx.application.startRunning();
    if (!result.ok) {
      ctx.setStatusText(result.error.message);
      return;
    }
    syncFromReadModel();
    startLoop();
  }

  function stopRunning() {
    const result = ctx.application.stopRunning();
    if (!result.ok) {
      ctx.setStatusText(result.error.message);
      return;
    }
    syncFromReadModel();
    stopLoop();
  }

  function toggleRunning() {
    if (ctx.running.value) {
      stopRunning();
      return;
    }
    startRunning();
  }

  function setTimeStep(next: number) {
    try {
      const value = mapTimeStepIntent(next);
      const result = ctx.application.setTimeStep(value);
      if (!result.ok) {
        ctx.setStatusText(result.error.message);
        return false;
      }
      syncFromReadModel();
      ctx.setStatusText(`时间步长已更新为 ${Math.round(value * 1000)}ms`);
      return true;
    } catch (error) {
      ctx.setStatusText(error instanceof Error ? error.message : 'timeStep invalid');
      return false;
    }
  }

  function setViewportSize(width: number, height: number) {
    try {
      const payload = mapViewportIntent({ width, height });
      const result = ctx.application.setViewport(payload);
      if (!result.ok) {
        ctx.setStatusText(result.error.message);
        return false;
      }
      syncFromReadModel();
      return true;
    } catch (error) {
      ctx.setStatusText(error instanceof Error ? error.message : 'viewport invalid');
      return false;
    }
  }

  function mountRuntime() {
    if (ctx.runtimeMounted.value) return;
    ctx.runtimeMounted.value = true;
    syncFromReadModel();
    ctx.onMount?.();
  }

  function unmountRuntime() {
    if (!ctx.runtimeMounted.value) return;
    ctx.runtimeMounted.value = false;
    stopLoop();
  }

  return {
    syncFromReadModel,
    stopLoop,
    startRunning,
    stopRunning,
    toggleRunning,
    setTimeStep,
    setViewportSize,
    mountRuntime,
    unmountRuntime
  };
}
