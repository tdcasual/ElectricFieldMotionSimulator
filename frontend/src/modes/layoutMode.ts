import type { LayoutMode } from '../stores/simulatorStore';

export const PHONE_LAYOUT_MAX_WIDTH = 767;
export const TABLET_LAYOUT_MAX_WIDTH = 1199;
export const LANDSCAPE_PHONE_MAX_SHORT_SIDE = 430;

type ResolveLayoutModeOptions = {
  viewportHeight?: number;
  isCoarsePointer?: boolean;
};

export function resolveLayoutMode(width: number, options: ResolveLayoutModeOptions = {}): LayoutMode {
  if (width <= PHONE_LAYOUT_MAX_WIDTH) return 'phone';
  const viewportHeight = Number(options.viewportHeight);
  const shortSide = Number.isFinite(viewportHeight) ? Math.min(width, viewportHeight) : width;
  if (options.isCoarsePointer && shortSide <= LANDSCAPE_PHONE_MAX_SHORT_SIDE) return 'phone';
  if (width <= TABLET_LAYOUT_MAX_WIDTH) return 'tablet';
  return 'desktop';
}
