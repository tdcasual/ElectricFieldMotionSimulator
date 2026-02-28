import type { LayoutMode } from '../stores/simulatorStore';

export const PHONE_LAYOUT_MAX_WIDTH = 767;
export const TABLET_LAYOUT_MAX_WIDTH = 1199;

export function resolveLayoutMode(width: number): LayoutMode {
  if (width <= PHONE_LAYOUT_MAX_WIDTH) return 'phone';
  if (width <= TABLET_LAYOUT_MAX_WIDTH) return 'tablet';
  return 'desktop';
}
