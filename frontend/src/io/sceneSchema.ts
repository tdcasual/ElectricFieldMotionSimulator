import { z } from 'zod';

export const SceneSchema = z.object({
  version: z.string().min(1),
  settings: z.record(z.string(), z.unknown()).default({}),
  objects: z.array(z.record(z.string(), z.unknown()))
}).passthrough();

export type SceneData = z.infer<typeof SceneSchema>;
