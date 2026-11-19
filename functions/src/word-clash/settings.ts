import { HttpsError } from 'firebase-functions/v2/https';

export type GameMode =
  | 'classic'
  | 'longest'
  | 'category'
  | 'double'
  | 'quick'
  | 'mystery'
  | 'chain'
  | 'chaos';

export type WordSettings = {
  mode: GameMode;
  winningScore: 100 | 200 | 300 | 500;
  roundSeconds: 10 | 20 | 30 | 45;
  minimumLength: 3 | 4 | 5;
  streakBonus: boolean;
  allowRepeatedWords: boolean;
  randomLetters: boolean;
  reactions: boolean;
};

export const MODES: GameMode[] = [
  'classic',
  'longest',
  'category',
  'double',
  'quick',
  'mystery',
  'chain',
  'chaos',
];

export const DEFAULT_SETTINGS: WordSettings = {
  mode: 'classic',
  winningScore: 200,
  roundSeconds: 20,
  minimumLength: 3,
  streakBonus: false,
  allowRepeatedWords: false,
  randomLetters: false,
  reactions: true,
};

export function validateSettings(
  input: unknown,
): WordSettings {
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

  const settings = {
    ...DEFAULT_SETTINGS,
    ...input,
  } as WordSettings;

  if (
    !MODES.includes(settings.mode) ||
    ![100, 200, 300, 500]
      .includes(settings.winningScore) ||
    ![10, 20, 30, 45]
      .includes(settings.roundSeconds) ||
    ![3, 4, 5]
      .includes(settings.minimumLength) ||
    typeof settings.streakBonus !== 'boolean' ||
    typeof settings.allowRepeatedWords !== 'boolean' ||
    typeof settings.randomLetters !== 'boolean' ||
    typeof settings.reactions !== 'boolean'
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Unsupported match settings.',
    );
  }

  return {
    mode: settings.mode,
    winningScore: settings.winningScore,
    roundSeconds: settings.roundSeconds,
    minimumLength: settings.minimumLength,
    streakBonus: settings.streakBonus,
    allowRepeatedWords: settings.allowRepeatedWords,
    randomLetters: settings.randomLetters,
    reactions: settings.reactions,
  };
}

export function lengthBonus(
  mode: GameMode,
  length: number,
  minimumLength = 3,
): number {
  return mode === 'longest'
    ? Math.min(
        20,
        Math.max(0, length - minimumLength) * 2,
      )
    : 0;
}

export function streakPoints(
  enabled: boolean,
  consecutive: number,
): number {
  return enabled
    ? Math.min(
        15,
        Math.max(0, consecutive - 1) * 5,
      )
    : 0;
}

export function roundDuration(
  settings: WordSettings,
  mode: GameMode,
): number {
  return mode === 'quick'
    ? 10000
    : settings.roundSeconds * 1000;
}
