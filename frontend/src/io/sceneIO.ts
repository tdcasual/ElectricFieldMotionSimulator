import { SceneSchema, type SceneData } from './sceneSchema';

type SceneValidationResult =
  | { ok: true; data: SceneData }
  | { ok: false; error: string; issues: string[] };

export function validateSceneData(input: unknown): SceneValidationResult {
  const result = SceneSchema.safeParse(input);
  if (!result.success) {
    return {
      ok: false,
      error: 'Invalid scene payload',
      issues: result.error.issues.map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
    };
  }

  return {
    ok: true,
    data: result.data
  };
}
