function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const HIGH_EMISSION_BUDGETS = {
  'trajectories-off': {
    maxAvgStepMs: 3,
    maxP95StepMs: 4,
    maxPeakTrajectoryPoints: 0,
    maxHeapPeakMB: 96
  },
  'trajectories-seconds-2': {
    maxAvgStepMs: 3,
    maxP95StepMs: 4,
    maxPeakTrajectoryPoints: 6000,
    maxHeapPeakMB: 110
  },
  'trajectories-infinite': {
    maxAvgStepMs: 3,
    maxP95StepMs: 4,
    maxPeakTrajectoryPoints: 6000,
    maxHeapPeakMB: 140
  }
};

export const BROWSER_RENDER_BUDGETS = {
  'high-emission-trajectories-off': {
    minAvgFps: 30,
    maxP95FrameMs: 55,
    maxLongTaskCount: 1,
    minFinalFps: 30
  },
  'high-emission-trajectories-on': {
    minAvgFps: 24,
    maxP95FrameMs: 55,
    maxLongTaskCount: 2,
    minFinalFps: 24
  }
};

function buildCheck(label, actual, limit, comparator) {
  const normalizedActual = toFiniteNumber(actual);
  const normalizedLimit = toFiniteNumber(limit);
  const ok = comparator === 'max'
    ? normalizedActual <= normalizedLimit
    : normalizedActual >= normalizedLimit;
  return {
    label,
    comparator,
    actual: normalizedActual,
    limit: normalizedLimit,
    ok
  };
}

function normalizeScenarioName(entry) {
  if (!entry || typeof entry !== 'object') return '';
  return String(entry.scenario ?? entry.name ?? '').trim();
}

function getEntry(entries, scenario) {
  return entries.find((entry) => normalizeScenarioName(entry) === scenario) ?? null;
}

export function evaluateHighEmissionBudgets(entries = []) {
  const results = Object.entries(HIGH_EMISSION_BUDGETS).map(([scenario, budget]) => {
    const entry = getEntry(entries, scenario);
    if (!entry) {
      return {
        scenario,
        ok: false,
        missing: true,
        checks: []
      };
    }

    const checks = [
      buildCheck('avgStepMs', entry.avgStepMs, budget.maxAvgStepMs, 'max'),
      buildCheck('p95StepMs', entry.p95StepMs, budget.maxP95StepMs, 'max'),
      buildCheck('peakTrajectoryPoints', entry.peakTrajectoryPoints, budget.maxPeakTrajectoryPoints, 'max'),
      buildCheck('heapPeakMB', entry.heapUsedPeakMB ?? entry.heapPeakMB, budget.maxHeapPeakMB, 'max')
    ];

    return {
      scenario,
      ok: checks.every((check) => check.ok),
      checks
    };
  });

  return {
    suite: 'high-emission',
    ok: results.every((result) => result.ok),
    results
  };
}

export function evaluateBrowserRenderBudgets(entries = []) {
  const results = Object.entries(BROWSER_RENDER_BUDGETS).map(([scenario, budget]) => {
    const entry = getEntry(entries, scenario);
    if (!entry) {
      return {
        scenario,
        ok: false,
        missing: true,
        checks: []
      };
    }

    const checks = [
      buildCheck('avgFps', entry.avgFps, budget.minAvgFps, 'min'),
      buildCheck('p95FrameMs', entry.p95FrameMs, budget.maxP95FrameMs, 'max'),
      buildCheck('longTaskCount', entry.longTasks ?? entry.longTaskCount, budget.maxLongTaskCount, 'max'),
      buildCheck('finalFps', entry.finalFps, budget.minFinalFps, 'min')
    ];

    return {
      scenario,
      ok: checks.every((check) => check.ok),
      checks
    };
  });

  return {
    suite: 'browser-render',
    ok: results.every((result) => result.ok),
    results
  };
}

export function formatBudgetEvaluation(evaluation) {
  const lines = [];
  lines.push(`${evaluation?.suite ?? 'budget'}: ${evaluation?.ok ? 'PASS' : 'FAIL'}`);
  for (const result of evaluation?.results ?? []) {
    lines.push(`- ${result.scenario}: ${result.ok ? 'PASS' : 'FAIL'}`);
    if (result.missing) {
      lines.push('  - missing scenario data');
      continue;
    }
    for (const check of result.checks ?? []) {
      const operator = check.comparator === 'max' ? '<=' : '>=';
      lines.push(`  - ${check.label}: ${check.actual} ${operator} ${check.limit} (${check.ok ? 'ok' : 'fail'})`);
    }
  }
  return lines.join('\n');
}
