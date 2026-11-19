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

export const MODES: {
  value: GameMode;
  label: string;
  description: string;
}[] = [
  {
    value: 'classic',
    label: 'Classic',
    description: 'Traditional drawing and guessing.',
  },
  {
    value: 'speed',
    label: 'Speed Clash',
    description: 'Only 30 seconds to draw.',
  },
  {
    value: 'ink',
    label: 'Limited Ink',
    description: 'Draw with a limited amount of ink.',
  },
  {
    value: 'stroke',
    label: 'One Stroke',
    description: 'One continuous stroke per turn.',
  },
  {
    value: 'blind',
    label: 'Blind Clash',
    description: 'The artist cannot see their drawing.',
  },
  {
    value: 'chaos',
    label: 'Chaos Clash',
    description: 'A random restriction each round.',
  },
  {
    value: 'nohint',
    label: 'No Hints',
    description: 'No letters or word length revealed.',
  },
];

export function adaptiveTurns(
  playerCount: number,
  settings: MatchSettings,
): number {
  if (settings.turnsPerPlayer > 0) {
    return settings.turnsPerPlayer;
  }

  const count = Math.max(2, playerCount);

  const standard =
    count === 2 ? 5 :
    count === 3 ? 4 :
    count === 4 ? 3 :
    count <= 8 ? 2 :
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
