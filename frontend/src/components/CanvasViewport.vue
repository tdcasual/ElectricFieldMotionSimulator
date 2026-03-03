<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useSimulatorStore } from '../stores/simulatorStore';
import { createPointerFsm } from '../v3/interaction/pointerFsm';
import type { PointerIntent } from '../v3/interaction/types';

const simulatorStore = useSimulatorStore();
const canvasRef = ref<HTMLCanvasElement | null>(null);
const pointerFsm = createPointerFsm({ dragThresholdPx: 6 });

function resolveCanvasPoint(event: PointerEvent) {
  const canvas = canvasRef.value;
  if (!canvas) return { x: 0, y: 0 };
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  return { x, y };
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const step = 32;
  ctx.save();
  ctx.strokeStyle = 'rgba(120, 140, 170, 0.2)';
  ctx.lineWidth = 1;
  for (let x = step; x < width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = step; y < height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawScene() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const width = simulatorStore.viewport.width;
  const height = simulatorStore.viewport.height;

  ctx.clearRect(0, 0, width, height);
  drawGrid(ctx, width, height);

  for (const object of simulatorStore.objects) {
    const selected = simulatorStore.selectedObjectId === object.id;
    if (object.type === 'particle') {
      ctx.beginPath();
      ctx.fillStyle = object.color || '#58a6ff';
      ctx.arc(object.x, object.y, object.radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (object.type === 'electric-field') {
      ctx.fillStyle = 'rgba(241, 184, 98, 0.3)';
      ctx.strokeStyle = object.color || '#f1b862';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(object.x - object.width / 2, object.y - object.height / 2, object.width, object.height);
      ctx.fill();
      ctx.stroke();
    } else if (object.type === 'magnetic-field') {
      const radius = Math.max(object.radius, Math.min(object.width, object.height) / 2);
      ctx.beginPath();
      ctx.fillStyle = 'rgba(142, 121, 214, 0.24)';
      ctx.strokeStyle = object.color || '#8e79d6';
      ctx.lineWidth = 2;
      ctx.arc(object.x, object.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    if (selected) {
      ctx.save();
      ctx.strokeStyle = '#00d2ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      if (object.type === 'particle') {
        ctx.beginPath();
        ctx.arc(object.x, object.y, object.radius + 8, 0, Math.PI * 2);
        ctx.stroke();
      } else if (object.type === 'electric-field') {
        ctx.strokeRect(
          object.x - object.width / 2 - 6,
          object.y - object.height / 2 - 6,
          object.width + 12,
          object.height + 12
        );
      } else {
        const radius = Math.max(object.radius, Math.min(object.width, object.height) / 2) + 8;
        ctx.beginPath();
        ctx.arc(object.x, object.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

function resizeCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const container = canvas.parentElement;
  if (!container) return;
  const width = Math.max(1, Math.floor(container.clientWidth));
  const height = Math.max(1, Math.floor(container.clientHeight));
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  simulatorStore.setViewportSize(width, height);
  drawScene();
}

function applyIntents(intents: PointerIntent[]) {
  for (const intent of intents) {
    if (intent.type === 'select') {
      simulatorStore.selectObjectById(intent.targetObjectId);
      continue;
    }
    if (intent.type === 'begin_drag') {
      simulatorStore.beginObjectDrag(
        intent.current.x,
        intent.current.y,
        intent.targetObjectId
      );
      continue;
    }
    if (intent.type === 'update_drag') {
      simulatorStore.updateObjectDrag(intent.current.x, intent.current.y);
      continue;
    }
    if (intent.type === 'commit_drag') {
      simulatorStore.commitObjectDrag();
      continue;
    }
    if (intent.type === 'cancel_drag') {
      simulatorStore.cancelObjectDrag();
    }
  }
}

function onPointerDown(event: PointerEvent) {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const point = resolveCanvasPoint(event);
  const targetObjectId = simulatorStore.hitTestObjectId(point.x, point.y);
  canvas.setPointerCapture?.(event.pointerId);
  const intents = pointerFsm.handle({
    type: 'pointer_down',
    pointerId: event.pointerId,
    x: point.x,
    y: point.y,
    targetObjectId
  });
  applyIntents(intents);
}

function onPointerMove(event: PointerEvent) {
  const point = resolveCanvasPoint(event);
  const intents = pointerFsm.handle({
    type: 'pointer_move',
    pointerId: event.pointerId,
    x: point.x,
    y: point.y
  });
  applyIntents(intents);
}

function onPointerUp(event: PointerEvent) {
  const canvas = canvasRef.value;
  const point = resolveCanvasPoint(event);
  const targetObjectId = simulatorStore.hitTestObjectId(point.x, point.y);
  const intents = pointerFsm.handle({
    type: 'pointer_up',
    pointerId: event.pointerId,
    x: point.x,
    y: point.y,
    targetObjectId
  });
  applyIntents(intents);
  canvas?.releasePointerCapture?.(event.pointerId);
}

function onPointerCancel(event: PointerEvent) {
  const intents = pointerFsm.handle({
    type: 'pointer_cancel',
    pointerId: event.pointerId
  });
  applyIntents(intents);
}

onMounted(() => {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
});

onBeforeUnmount(() => {
  simulatorStore.cancelObjectDrag();
  window.removeEventListener('resize', resizeCanvas);
});

watch(
  () => [simulatorStore.objects, simulatorStore.selectedObjectId],
  () => {
    drawScene();
  },
  { deep: true }
);
</script>

<template>
  <main id="canvas-area" data-testid="canvas-viewport">
    <div id="canvas-container">
      <canvas
        ref="canvasRef"
        data-layer="v3-scene"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerCancel"
      />
    </div>
    <div id="fps-counter">FPS: {{ simulatorStore.fps }}</div>
  </main>
</template>
