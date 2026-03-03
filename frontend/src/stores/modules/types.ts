import type { ComputedRef, Ref } from 'vue';
import type { EmbedMode } from '../../embed/embedConfig';
import type { createV3SimulatorApplication } from '../../v3/application/useCases/simulatorApplication';
import type { SceneAggregateState } from '../../v3/domain/types';

export type SceneObjectView = {
  id: string;
  type: string;
  x: number;
  y: number;
  radius: number;
  width: number;
  height: number;
  velocityX: number;
  velocityY: number;
  color: string;
  props: Record<string, unknown>;
};

export type SimulatorApplication = ReturnType<typeof createV3SimulatorApplication>;

export type SceneStorageAdapter = {
  save: (key: string, state: SceneAggregateState) => Promise<void>;
  load: (key: string) => Promise<SceneAggregateState | null>;
};

export type ToolbarEntry = {
  type: string;
  label: string;
};

export type ToolbarGroup = {
  key: string;
  label: string;
  entries: ToolbarEntry[];
};

export type DragState = {
  id: string;
  offsetX: number;
  offsetY: number;
} | null;

export type SetStatusText = (text: string) => void;

export type RuntimeStateRefs = {
  running: Ref<boolean>;
  fps: Ref<number>;
  timeStep: Ref<number>;
  objectCount: Ref<number>;
  selectedObjectId: Ref<string | null>;
  viewport: Ref<{ width: number; height: number }>;
  objects: Ref<SceneObjectView[]>;
  frameHandle: Ref<number | null>;
  lastFrameAt: Ref<number | null>;
  runtimeMounted: Ref<boolean>;
};

export type InteractionStateRefs = {
  selectedObjectId: Ref<string | null>;
  objects: Ref<SceneObjectView[]>;
  viewport: Ref<{ width: number; height: number }>;
  dragState: Ref<DragState>;
  viewMode: ComputedRef<boolean>;
  resetBaseline: Ref<SceneAggregateState>;
};

export type SceneIoStateRefs = {
  resetBaseline: Ref<SceneAggregateState>;
};

export type UiShellStateRefs = {
  hostMode: Ref<EmbedMode>;
  toolbarGroups: Ref<ToolbarGroup[]>;
  statusText: Ref<string>;
};
