import { runExpressionBindingProfiles } from '../test/helpers/perfRunner.js';
import { buildExpressionBindingReport, emitProfileReport } from './lib/profileReport.mjs';

const particleCount = Number.isFinite(Number(process.env.PROFILE_PARTICLES)) ? Number(process.env.PROFILE_PARTICLES) : 2400;
const steps = Number.isFinite(Number(process.env.PROFILE_STEPS)) ? Number(process.env.PROFILE_STEPS) : 60;
const dt = Number.isFinite(Number(process.env.PROFILE_DT)) ? Number(process.env.PROFILE_DT) : 0.016;
const sampleEverySteps = Number.isFinite(Number(process.env.PROFILE_SAMPLE_EVERY))
  ? Number(process.env.PROFILE_SAMPLE_EVERY)
  : 20;

const profiles = runExpressionBindingProfiles({ particleCount, steps, dt, sampleEverySteps });

const table = profiles.map((profile) => ({
  scenario: profile.name,
  particleCount: profile.particleCount,
  peakParseCalls: profile.peakParseCalls,
  peakActiveParticles: profile.peakActiveParticles,
  avgRefreshMs: Number(profile.avgRefreshMs.toFixed(3)),
  p95RefreshMs: Number(profile.p95RefreshMs.toFixed(3)),
  avgTotalStepMs: Number(profile.avgTotalStepMs.toFixed(3)),
  p95TotalStepMs: Number(profile.p95TotalStepMs.toFixed(3)),
  heapStartMB: Number(profile.heapUsedStartMB.toFixed(2)),
  heapPeakMB: Number(profile.heapUsedPeakMB.toFixed(2)),
  heapEndMB: Number(profile.heapUsedEndMB.toFixed(2))
}));

const report = buildExpressionBindingReport({
  generatedAt: new Date().toISOString(),
  config: { particleCount, steps, dt, sampleEverySteps },
  profiles,
  summaryRows: table
});

emitProfileReport(report);
