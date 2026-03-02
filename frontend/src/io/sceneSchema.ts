import { z } from 'zod';

export const SceneSchema = z.object({
  version: z.literal('2.0'),
  settings: z.record(z.string(), z.unknown()).default({}),
  objects: z.array(z.record(z.string(), z.unknown()))
}).passthrough();

export type SceneData = z.infer<typeof SceneSchema>;
