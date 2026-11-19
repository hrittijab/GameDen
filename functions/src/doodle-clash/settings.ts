import { randomInt } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';

import type {
  DrawingState,
  Stroke,
} from './engine';

export type GameMode =
  | 'classic'
  | 'speed'
  | 'ink'
  | 'stroke'
  | 'blind'
  | 'chaos'
  | 'nohint';

export type MatchSettings = {
  mode: GameMode;
  matchLength: 'quick' | 'standard' | 'extended';
  drawingSeconds: 30 | 60 | 90 | 120;
  turnsPerPlayer: number;
  difficulty: 'mixed' | 'easy' | 'medium' | 'hard';
  hints: boolean;
  guessFeed: boolean;
  reactions: boolean;
};

export const DEFAULT_SETTINGS: MatchSettings = {
  mode: 'classic',
  matchLength: 'standard',
  drawingSeconds: 60,
  turnsPerPlayer: 0,
  difficulty: 'mixed',
  hints: true,
  guessFeed: true,
  reactions: true,
};

export const INK_LIMIT = 3500;

const MODES: GameMode[] = [
  'classic',
  'speed',
  'ink',
  'stroke',
  'blind',
  'chaos',
  'nohint',
];

export function validateSettings(
  input: unknown,
): MatchSettings {
  if (input === undefined) {
    return { ...DEFAULT_SETTINGS };
  }

  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input)
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Invalid match settings.',
    );
  }

  const value = {
    ...DEFAULT_SETTINGS,
    ...input,
  } as MatchSettings;

  if (
    !MODES.includes(value.mode) ||
    !['quick', 'standard', 'extended']
      .includes(value.matchLength) ||
    ![30, 60, 90, 120]
      .includes(value.drawingSeconds) ||
    !Number.isInteger(value.turnsPerPlayer) ||
    value.turnsPerPlayer < 0 ||
    value.turnsPerPlayer > 10 ||
    !['mixed', 'easy', 'medium', 'hard']
      .includes(value.difficulty) ||
    typeof value.hints !== 'boolean' ||
    typeof value.guessFeed !== 'boolean' ||
    typeof value.reactions !== 'boolean'
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Unsupported match settings.',
    );
  }

  return {
    mode: value.mode,
    matchLength: value.matchLength,
    drawingSeconds: value.drawingSeconds,
    turnsPerPlayer: value.turnsPerPlayer,
    difficulty: value.difficulty,
    hints: value.hints,
    guessFeed: value.guessFeed,
    reactions: value.reactions,
  };
}

export function calculateTurns(
  playerCount: number,
  settings: MatchSettings,
): number {
  if (settings.turnsPerPlayer > 0) {
    return settings.turnsPerPlayer;
  }

  const standard =
    playerCount === 2 ? 5 :
    playerCount === 3 ? 4 :
    playerCount === 4 ? 3 :
    playerCount <= 8 ? 2 :
    1;

  if (settings.matchLength === 'quick') {
    return Math.max(
      1,
      Math.ceil(standard / 2),
    );
  }

  if (settings.matchLength === 'extended') {
    return standard * 2;
  }

  return standard;
}

export function chooseRoundMode(
  mode: GameMode,
): GameMode {
  if (mode !== 'chaos') return mode;

  const choices: GameMode[] = [
    'speed',
    'ink',
    'stroke',
    'blind',
    'nohint',
  ];

  return choices[randomInt(choices.length)];
}

export function drawingDuration(
  settings: MatchSettings,
  roundMode: GameMode,
): number {
  return roundMode === 'speed'
    ? 30000
    : settings.drawingSeconds * 1000;
}

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

export function inkUsed(
  strokes: Stroke[],
): number {
  return strokes.reduce(
    (sum, stroke) =>
      sum + strokeDistance(stroke),
    0,
  );
}

export function validateModeAction(
  mode: GameMode,
  drawing: DrawingState,
  action: unknown,
  stroke?: Stroke,
) {
  const restricted =
    mode === 'ink' || mode === 'stroke';

  if (
    restricted &&
    action !== 'add'
  ) {
    throw new HttpsError(
      'failed-precondition',
      'Undo, redo and clear are disabled in this mode.',
    );
  }

  if (action !== 'add' || !stroke) {
    return;
  }

  if (
    drawing.strokes.some(
      existing => existing.id === stroke.id,
    )
  ) {
    return;
  }

  if (
    restricted &&
    stroke.color === '#FFFFFF'
  ) {
    throw new HttpsError(
      'failed-precondition',
      'Erasing is disabled in this mode.',
    );
  }

  if (
    mode === 'stroke' &&
    drawing.strokes.length > 0 &&
    !drawing.strokes.some(
      existing => existing.id === stroke.id,
    )
  ) {
    throw new HttpsError(
      'failed-precondition',
      'Only one stroke is allowed.',
    );
  }

  if (
    mode === 'ink' &&
    inkUsed(drawing.strokes) +
      strokeDistance(stroke) >
      INK_LIMIT
  ) {
    throw new HttpsError(
      'resource-exhausted',
      'Not enough ink remaining.',
    );
  }
}

