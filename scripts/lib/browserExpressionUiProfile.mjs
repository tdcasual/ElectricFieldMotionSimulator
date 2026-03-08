import { buildBrowserRenderTable, summarizeBrowserRenderRun } from './browserRenderProfile.mjs';

function buildExpressionSceneData({ particleCount = 1200, mode = 'variable' } = {}) {
  const objects = [];
  for (let i = 0; i < particleCount; i += 1) {
    const row = Math.floor(i / 60);
    const col = i % 60;
    const object = {
      type: 'particle',
      x: 50 + col * 10,
      y: 50 + row * 10,
      vx: 1,
      vy: -1,
      showTrajectory: false,
      showEnergy: false,
      showVelocity: false
    };
    if (mode === 'variable') {
      object.vxExpr = 'a + 1';
      object.vyExpr = 'b - 1';
    } else if (mode === 'time') {
      object.vxExpr = 't + 1';
      object.vyExpr = 't * 0.5';
    }
    objects.push(object);
  }

  return {
    version: '1.0',
    settings: {
      boundaryMode: 'bounce',
      showTrajectories: false,
      showEnergy: false,
      pixelsPerMeter: 50
    },
    variables: { a: 2, b: 3 },
    objects
  };
}

export function buildExpressionUiBrowserScenarios(options = {}) {
  const particleCount = Number.isFinite(Number(options.particleCount)) ? Number(options.particleCount) : 1200;
  const variableIterations = Number.isFinite(Number(options.variableIterations)) ? Number(options.variableIterations) : 4;
  return [
    {
      name: 'expression-variable-drawer-restore',
      mode: 'variable',
      iterations: variableIterations,
      sceneData: buildExpressionSceneData({ particleCount, mode: 'variable' })
    },
    {
      name: 'expression-time-drawer-live',
      mode: 'time',
      sceneData: buildExpressionSceneData({ particleCount, mode: 'time' })
    }
  ];
}

export function summarizeBrowserExpressionUiRun(input = {}) {
  const base = summarizeBrowserRenderRun(input);
  const hintSamples = Array.isArray(input.hintSamples)
    ? input.hintSamples
        .map((entry) => ({ t: Number(entry?.t ?? 0), text: String(entry?.text ?? '').trim() }))
        .filter((entry) => entry.text.length > 0)
    : [];

  let hintChangeCount = 0;
  let previousText = null;
  for (const sample of hintSamples) {
    if (previousText === null) {
      previousText = sample.text;
      continue;
    }
    if (sample.text !== previousText) {
      hintChangeCount += 1;
      previousText = sample.text;
    }
  }

  return {
    ...base,
    iterations: Number.isFinite(Number(input.iterations)) ? Number(input.iterations) : 0,
    successfulIterations: Number.isFinite(Number(input.successfulIterations)) ? Number(input.successfulIterations) : 0,
    hintSamples,
    hintSampleCount: hintSamples.length,
    hintChangeCount,
    finalHintText: hintSamples.length > 0 ? hintSamples[hintSamples.length - 1].text : ''
  };
}

export function buildBrowserExpressionUiTable(profiles = []) {
  const baseRows = buildBrowserRenderTable(profiles);
  return baseRows.map((row, index) => ({
    ...row,
    iterations: `${profiles[index]?.successfulIterations ?? 0}/${profiles[index]?.iterations ?? 0}`,
    hintChanges: Number(profiles[index]?.hintChangeCount ?? 0),
    finalHint: String(profiles[index]?.finalHintText ?? '')
  }));
}
