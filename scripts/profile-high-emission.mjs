import { runHighEmissionRetentionProfiles } from '../test/helpers/perfRunner.js';
import { buildHighEmissionReport, emitProfileReport } from './lib/profileReport.mjs';
import { evaluateHighEmissionBudgets, formatBudgetEvaluation } from './lib/perfBudget.mjs';

const steps = Number.isFinite(Number(process.env.PROFILE_STEPS)) ? Number(process.env.PROFILE_STEPS) : 180;
const dt = Number.isFinite(Number(process.env.PROFILE_DT)) ? Number(process.env.PROFILE_DT) : 0.016;
const sampleEverySteps = Number.isFinite(Number(process.env.PROFILE_SAMPLE_EVERY))
  ? Number(process.env.PROFILE_SAMPLE_EVERY)
  : 30;

const profiles = runHighEmissionRetentionProfiles({ steps, dt, sampleEverySteps });

const table = profiles.map((profile) => ({
  scenario: profile.name,
  peakParticles: profile.peakParticles,
  peakObjects: profile.peakObjects,
  peakTrajectoryPoints: profile.peakTrajectoryPoints,
  avgStepMs: Number(profile.avgStepMs.toFixed(3)),
  p95StepMs: Number(profile.p95StepMs.toFixed(3)),
  maxStepMs: Number(profile.maxStepMs.toFixed(3)),
  heapStartMB: Number(profile.heapUsedStartMB.toFixed(2)),
  heapPeakMB: Number(profile.heapUsedPeakMB.toFixed(2)),
  heapEndMB: Number(profile.heapUsedEndMB.toFixed(2))
}));

const report = buildHighEmissionReport({
  generatedAt: new Date().toISOString(),
  config: { steps, dt, sampleEverySteps },
  profiles,
  summaryRows: table
});
report.budgetEvaluation = evaluateHighEmissionBudgets(table);

emitProfileReport(report);
process.stderr.write(`
Budget Evaluation:
${formatBudgetEvaluation(report.budgetEvaluation)}
`);
if (process.env.PROFILE_ENFORCE_BUDGETS === '1' && !report.budgetEvaluation.ok) {
  process.exitCode = 1;
}
