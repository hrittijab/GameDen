import type {
  BackendRoomConfig,
} from '../multiplayer/rooms';

export const DOODLE_CLASH_CONFIG: BackendRoomConfig = {
  roomCollection: 'doodleClashRooms',
  secretCollection: 'doodleClashSecrets',
};

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 12;

export const MAX_STROKES = 250;
export const MAX_POINTS_PER_STROKE = 500;
export const MAX_TOTAL_POINTS = 10000;

export const CANVAS_WIDTH = 1000;
export const CANVAS_HEIGHT = 750;

export const BRUSH_COLORS = [
  '#171717',
  '#FFFFFF',
  '#EF4444',
  '#F97316',
  '#FACC15',
  '#22C55E',
  '#14B8A6',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#92400E',
  '#9CA3AF',
];

export const BRUSH_WIDTHS = [
  4, 8, 14, 22, 36,
  16, 28, 44, 72,
];
