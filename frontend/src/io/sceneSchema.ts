import { z } from 'zod';

const MAX_SCENE_OBJECTS = 5000;
const MAX_EMISSION_RATE = 20000;
const MAX_EMISSION_COUNT = 5000;
const MAX_EMISSION_INTERVAL = 60;

const FINITE_NUMBER_FIELDS = [
  'x',
  'y',
  'vx',
  'vy',
  'width',
  'height',
  'radius',
  'length',
  'plateDistance',
  'depth',
  'viewGap',
  'spotSize',
  'lineWidth',
  'particleRadius',
  'emissionSpeed',
  'startTime',
  'speedMin',
  'speedMax',
  'angleMin',
  'angleMax',
  'particleCharge',
  'particleMass'
] as const;

function readFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

const SceneObjectSchema = z.record(z.string(), z.unknown()).superRefine((object, ctx) => {
  const type = object.type;
  if (typeof type !== 'string' || type.trim().length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['type'],
      message: 'type is required'
    });
  }

  for (const key of FINITE_NUMBER_FIELDS) {
    if (!(key in object)) continue;
    const value = readFiniteNumber(object[key]);
    if (value === null) continue;
    if (!Number.isFinite(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: 'must be a finite number'
      });
    }
  }

  if ('emissionRate' in object) {
    const rate = readFiniteNumber(object.emissionRate);
    if (rate === null || !Number.isFinite(rate) || rate < 0 || rate > MAX_EMISSION_RATE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['emissionRate'],
        message: `must be between 0 and ${MAX_EMISSION_RATE}`
      });
    }
  }

  if ('emissionCount' in object) {
    const count = readFiniteNumber(object.emissionCount);
    if (count === null || !Number.isFinite(count) || count < 0 || count > MAX_EMISSION_COUNT) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['emissionCount'],
        message: `must be between 0 and ${MAX_EMISSION_COUNT}`
      });
    }
  }

  if ('emissionInterval' in object) {
    const interval = readFiniteNumber(object.emissionInterval);
    if (interval === null || !Number.isFinite(interval) || interval < 0 || interval > MAX_EMISSION_INTERVAL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['emissionInterval'],
        message: `must be between 0 and ${MAX_EMISSION_INTERVAL}`
      });
    }
  }
});

export const SceneSchema = z.object({
  version: z.string().min(1),
  settings: z.record(z.string(), z.unknown()).default({}),
  objects: z.array(SceneObjectSchema).max(MAX_SCENE_OBJECTS)
}).passthrough();

export type SceneData = z.infer<typeof SceneSchema>;
