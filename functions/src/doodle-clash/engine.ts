import { HttpsError } from 'firebase-functions/v2/https';

import type {
  MultiplayerRoom,
} from '../multiplayer/rooms';

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BRUSH_COLORS,
  BRUSH_WIDTHS,
  MAX_STROKES,
  MAX_POINTS_PER_STROKE,
  MAX_TOTAL_POINTS,
} from './config';

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

export type DoodleRoom = MultiplayerRoom & {
  artistId: string | null;
  playerOrder: string[];
  matchNumber: number;
};

export type DrawingState = {
  matchNumber: number;
  revision: number;
  strokes: Stroke[];
  redoStack: Stroke[];
};

export function emptyDrawing(
  matchNumber: number,
): DrawingState {
  return {
    matchNumber,
    revision: 0,
    strokes: [],
    redoStack: [],
  };
}

function invalid(message: string): never {
  throw new HttpsError(
    'invalid-argument',
    message,
  );
}

export function validateStroke(
  input: unknown,
): Stroke {
  if (!input || typeof input !== 'object') {
    return invalid('Invalid stroke.');
  }

  const value = input as Record<string, unknown>;

  const { id, color, width, points } = value;

  if (
    typeof id !== 'string' ||
    !/^[a-zA-Z0-9_-]{1,100}$/.test(id)
  ) {
    return invalid('Invalid stroke ID.');
  }

  if (
    typeof color !== 'string' ||
    !BRUSH_COLORS.includes(color)
  ) {
    return invalid('Invalid brush color.');
  }

  if (
    typeof width !== 'number' ||
    !BRUSH_WIDTHS.includes(width)
  ) {
    return invalid('Invalid brush width.');
  }

  if (
    !Array.isArray(points) ||
    points.length === 0 ||
    points.length > MAX_POINTS_PER_STROKE
  ) {
    return invalid('Invalid stroke length.');
  }

  const cleanPoints = points.map(point => {
    if (!point || typeof point !== 'object') {
      return invalid('Invalid drawing point.');
    }

    const { x, y } = point;

    if (
      typeof x !== 'number' ||
      typeof y !== 'number' ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      x < 0 ||
      x > CANVAS_WIDTH ||
      y < 0 ||
      y > CANVAS_HEIGHT
    ) {
      return invalid('Point outside canvas.');
    }

    return {
      x: Math.round(x),
      y: Math.round(y),
    };
  });

  return {
    id,
    color,
    width,
    points: cleanPoints,
  };
}

export function requireArtist(
  room: DoodleRoom,
  uid: string,
) {
  if (room.status !== 'playing') {
    throw new HttpsError(
      'failed-precondition',
      'The match is not active.',
    );
  }

  if (room.artistId !== uid) {
    throw new HttpsError(
      'permission-denied',
      'Only the artist can draw.',
    );
  }
}

export function applyDrawingAction(
  state: DrawingState,
  action: unknown,
  input?: unknown,
): DrawingState {
  const next: DrawingState = {
    ...state,
    strokes: [...state.strokes],
    redoStack: [...state.redoStack],
  };

  switch (action) {
    case 'add': {
      const stroke = validateStroke(input);

      if (
        next.strokes.some(
          existing => existing.id === stroke.id,
        )
      ) {
        return state;
      }

      const totalPoints = next.strokes.reduce(
        (sum, item) => sum + item.points.length,
        0,
      );

      if (
        next.strokes.length >= MAX_STROKES ||
        totalPoints + stroke.points.length >
          MAX_TOTAL_POINTS
      ) {
        throw new HttpsError(
          'resource-exhausted',
          'Canvas is full. Undo or clear the drawing.',
        );
      }

      next.strokes.push(stroke);
      next.redoStack = [];
      break;
    }

    case 'undo': {
      const last = next.strokes.pop();

      if (!last) return state;

      next.redoStack.push(last);

      break;
    }

    case 'redo': {
      const last = next.redoStack.pop();

      if (!last) return state;

      next.strokes.push(last);

      break;
    }

    case 'clear': {
      if (
        !next.strokes.length &&
        !next.redoStack.length
      ) {
        return state;
      }

      next.strokes = [];
      next.redoStack = [];

      break;
    }

    default:
      return invalid('Unknown drawing action.');
  }

  next.revision += 1;

  return next;
}
