import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { SceneAggregateState } from '../v3/domain/types';
import { createV3SimulatorApplication } from '../v3/application/useCases/simulatorApplication';
import { createInMemoryRenderAdapter } from '../v3/infrastructure/inMemoryRenderAdapter';
import { createLocalSceneStorageAdapter } from '../v3/infrastructure/localSceneStorageAdapter';
import { createInteractionModule } from './modules/interactionStore';
import { createRuntimeModule } from './modules/runtimeStore';
import { createSceneIoModule } from './modules/sceneIoStore';
import { createUiShellModule } from './modules/uiShellStore';
import type {
  DragState,
  SceneObjectView
} from './modules/types';

export const useSimulatorStore = defineStore('simulator', () => {
  const renderAdapter = createInMemoryRenderAdapter();
  const storageAdapter = createLocalSceneStorageAdapter();
  const application = createV3SimulatorApplication({ renderAdapter });

  const dragState = ref<DragState>(null);
  const runtimeMounted = ref(false);
  const frameHandle = ref<number | null>(null);
  const lastFrameAt = ref<number | null>(null);

  const uiShell = createUiShellModule({
    onEnterViewMode: () => {
      dragState.value = null;
    }
  });

  const hostMode = uiShell.hostMode;
  const toolbarGroups = uiShell.toolbarGroups;
  const statusText = uiShell.statusText;
  const setStatusText = uiShell.setStatusText;
  const setHostMode = uiShell.setHostMode;

  const fps = ref(0);
  const timeStep = ref(0.016);
  const running = ref(false);
  const objectCount = ref(0);
  const selectedObjectId = ref<string | null>(null);
  const viewport = ref({ width: 1280, height: 720 });
  const objects = ref<SceneObjectView[]>([]);
  const resetBaseline = ref<SceneAggregateState>(application.exportScene());

  const viewMode = computed(() => hostMode.value === 'view');
  const timeStepLabel = computed(() => `${Math.round(timeStep.value * 1000)}ms`);
  const selectedObject = computed(() => objects.value.find((item) => item.id === selectedObjectId.value) ?? null);

  const runtime = createRuntimeModule({
    application,
    running,
    fps,
    timeStep,
    objectCount,
    selectedObjectId,
    viewport,
    objects,
    frameHandle,
    lastFrameAt,
    runtimeMounted,
    setStatusText
  });

  const interaction = createInteractionModule({
    application,
    selectedObjectId,
    objects,
    viewport,
    dragState,
    viewMode,
    resetBaseline,
    setStatusText,
    syncFromReadModel: runtime.syncFromReadModel,
    stopRunning: runtime.stopRunning
  });

  const sceneIo = createSceneIoModule({
    application,
    storageAdapter,
    setStatusText,
    getStatusText: () => statusText.value,
    syncFromReadModel: runtime.syncFromReadModel,
    stopRunning: runtime.stopRunning,
    startRunning: runtime.startRunning,
    setHostMode,
    resetBaseline
  });

  runtime.syncFromReadModel();

  return {
    hostMode,
    toolbarGroups,
    running,
    timeStep,
    timeStepLabel,
    fps,
    objectCount,
    selectedObjectId,
    selectedObject,
    viewport,
    objects,
    statusText,
    viewMode,
    setStatusText,
    mountRuntime: runtime.mountRuntime,
    unmountRuntime: runtime.unmountRuntime,
    setHostMode,
    setViewportSize: runtime.setViewportSize,
    startRunning: runtime.startRunning,
    stopRunning: runtime.stopRunning,
    toggleRunning: runtime.toggleRunning,
    setTimeStep: runtime.setTimeStep,
    createObjectAtCenter: interaction.createObjectAtCenter,
    selectObjectById: interaction.selectObjectById,
    selectObjectAt: interaction.selectObjectAt,
    hitTestObjectId: interaction.hitTestObjectId,
    beginObjectDrag: interaction.beginObjectDrag,
    updateObjectDrag: interaction.updateObjectDrag,
    commitObjectDrag: interaction.commitObjectDrag,
    cancelObjectDrag: interaction.cancelObjectDrag,
    setSelectedObjectProps: interaction.setSelectedObjectProps,
    deleteSelected: interaction.deleteSelected,
    clearScene: interaction.clearScene,
    resetScene: interaction.resetScene,
    loadSceneData: sceneIo.loadSceneData,
    exportScene: sceneIo.exportScene,
    importScene: sceneIo.importScene,
    saveScene: sceneIo.saveScene,
    loadScene: sceneIo.loadScene,
    bootstrapFromEmbed: sceneIo.bootstrapFromEmbed
  };
});
