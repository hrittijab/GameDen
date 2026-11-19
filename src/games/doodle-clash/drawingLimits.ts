import type {
  Stroke,
} from './types';

import {
  INK_LIMIT,
} from './settings';

export function strokeDistance(
  stroke: Stroke,
): number {
  let distance = 1;

  for (
    let index = 1;
    index < stroke.points.length;
    index++
  ) {
    const previous = stroke.points[index - 1];
    const current = stroke.points[index];

    distance += Math.hypot(
      current.x - previous.x,
      current.y - previous.y,
    );
  }

  return distance;
}

export function remainingInk(
  strokes: Stroke[],
): number {
  const used = strokes.reduce(
    (sum, stroke) =>
      sum + strokeDistance(stroke),
    0,
  );

  return Math.max(
    0,
    INK_LIMIT - used,
  );
}
