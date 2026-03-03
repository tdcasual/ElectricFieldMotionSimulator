import type { InteractionStateRefs, SetStatusText, SimulatorApplication } from './types';
import { mapToolbarCreateIntent } from '../../v3/ui-adapter/intentMappers';

type CreateInteractionModuleContext = InteractionStateRefs & {
  application: SimulatorApplication;
  setStatusText: SetStatusText;
  syncFromReadModel: () => void;
  stopRunning: () => void;
};

function normalizeCreateType(type: string) {
  const value = String(type ?? '').trim();
  if (
    value === 'electric-field' ||
    value === 'electric-field-rect' ||
    value === 'electric-field-circle' ||
    value === 'semicircle-electric-field'
  ) {
    return 'electric-field';
  }
  if (
    value === 'magnetic-field' ||
    value === 'magnetic-field-circle' ||
    value === 'magnetic-field-long' ||
    value === 'magnetic-field-triangle'
  ) {
    return 'magnetic-field';
  }
  return 'particle';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function createInteractionModule(ctx: CreateInteractionModuleContext) {
  function createObjectAtCenter(type: string) {
    if (ctx.viewMode.value) {
      ctx.setStatusText('View mode does not allow edits');
      return false;
    }

    const normalizedType = normalizeCreateType(type);
    const x = ctx.viewport.value.width / 2;
    const y = ctx.viewport.value.height / 2;

    try {
      const intent = mapToolbarCreateIntent({ type: normalizedType, x, y });
      const result = ctx.application.createObjectAt(intent);
      if (!result.ok) {
        ctx.setStatusText(result.error.message);
        return false;
      }
      ctx.syncFromReadModel();
      ctx.resetBaseline.value = ctx.application.exportScene();
      ctx.setStatusText(`已创建 ${normalizedType}`);
      return true;
    } catch (error) {
      ctx.setStatusText(error instanceof Error ? error.message : 'create failed');
      return false;
    }
  }

  function selectObjectById(id: string | null) {
    const result = ctx.application.selectObject(id);
    if (!result.ok) {
      ctx.setStatusText(result.error.message);
      return false;
    }
    ctx.syncFromReadModel();
    return true;
  }

  function hitTestObjectId(x: number, y: number) {
    for (let i = ctx.objects.value.length - 1; i >= 0; i -= 1) {
      const item = ctx.objects.value[i];
      if (item.type === 'particle' || item.type === 'magnetic-field') {
        const dx = x - item.x;
        const dy = y - item.y;
        const radius = item.type === 'particle'
          ? item.radius
          : Math.max(item.radius, Math.min(item.width, item.height) / 2);
        if ((dx * dx + dy * dy) <= (radius * radius)) {
          return item.id;
        }
        continue;
      }
      const halfWidth = item.width / 2;
      const halfHeight = item.height / 2;
      if (
        x >= (item.x - halfWidth) &&
        x <= (item.x + halfWidth) &&
        y >= (item.y - halfHeight) &&
        y <= (item.y + halfHeight)
      ) {
        return item.id;
      }
    }
    return null;
  }

  function selectObjectAt(x: number, y: number) {
    return selectObjectById(hitTestObjectId(x, y));
  }

  function beginObjectDrag(pointerX: number, pointerY: number, objectId: string | null) {
    if (!objectId) return false;
    const target = ctx.objects.value.find((item) => item.id === objectId);
    if (!target) return false;
    selectObjectById(objectId);
    ctx.dragState.value = {
      id: target.id,
      offsetX: pointerX - target.x,
      offsetY: pointerY - target.y
    };
    return true;
  }

  function updateObjectDrag(pointerX: number, pointerY: number) {
    const activeDrag = ctx.dragState.value;
    if (!activeDrag) return false;

    const nextX = clamp(pointerX - activeDrag.offsetX, 0, ctx.viewport.value.width);
    const nextY = clamp(pointerY - activeDrag.offsetY, 0, ctx.viewport.value.height);
    const result = ctx.application.moveObject({
      id: activeDrag.id,
      x: nextX,
      y: nextY
    });

    if (!result.ok) {
      ctx.setStatusText(result.error.message);
      return false;
    }

    ctx.syncFromReadModel();
    return true;
  }

  function commitObjectDrag() {
    if (!ctx.dragState.value) return false;
    ctx.dragState.value = null;
    ctx.resetBaseline.value = ctx.application.exportScene();
    return true;
  }

  function cancelObjectDrag() {
    ctx.dragState.value = null;
  }

  function setSelectedObjectProps(props: Record<string, unknown>) {
    if (!ctx.selectedObjectId.value) return false;
    const result = ctx.application.setObjectProps({
      id: ctx.selectedObjectId.value,
      props
    });
    if (!result.ok) {
      ctx.setStatusText(result.error.message);
      return false;
    }
    ctx.syncFromReadModel();
    ctx.resetBaseline.value = ctx.application.exportScene();
    return true;
  }

  function deleteSelected() {
    if (!ctx.selectedObjectId.value) return false;
    const result = ctx.application.deleteObject(ctx.selectedObjectId.value);
    if (!result.ok) {
      ctx.setStatusText(result.error.message);
      return false;
    }
    ctx.syncFromReadModel();
    ctx.resetBaseline.value = ctx.application.exportScene();
    return true;
  }

  function clearScene() {
    const result = ctx.application.clearScene();
    if (!result.ok) {
      ctx.setStatusText(result.error.message);
      return false;
    }
    ctx.syncFromReadModel();
    ctx.resetBaseline.value = ctx.application.exportScene();
    ctx.setStatusText('场景已清空');
    return true;
  }

  function resetScene() {
    const result = ctx.application.loadScene(ctx.resetBaseline.value);
    if (!result.ok) {
      ctx.setStatusText(result.error.message);
      return false;
    }
    ctx.stopRunning();
    ctx.syncFromReadModel();
    ctx.setStatusText('场景已重置');
    return true;
  }

  return {
    createObjectAtCenter,
    selectObjectById,
    hitTestObjectId,
    selectObjectAt,
    beginObjectDrag,
    updateObjectDrag,
    commitObjectDrag,
    cancelObjectDrag,
    setSelectedObjectProps,
    deleteSelected,
    clearScene,
    resetScene
  };
}
