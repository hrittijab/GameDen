export type Point = {
  x: number;
  y: number;
};

export type Stroke = {
  id: string;
  color: string;
  width: number;
  points: Point[];
};

export type DrawingTool = 'brush' | 'eraser';

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

export const BRUSH_SIZES = [4, 8, 14, 22, 36];
