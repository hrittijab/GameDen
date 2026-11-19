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

export const MODE_NAMES: Record<GameMode, string> = {
  classic: 'Classic',
  longest: 'Longest Word',
  category: 'Category Clash',
  double: 'Double Letter',
  quick: 'Quick Fire',
  mystery: 'Mystery Letter',
  chain: 'Word Chain',
  chaos: 'Chaos Clash',
};

export const MODE_DESCRIPTIONS: Record<GameMode, string> = {
  classic: 'Think fast and find unique words.',
  longest: 'Longer words earn up to 20 bonus points.',
  category: 'Find words belonging to a specific category.',
  double: 'Match both the starting and ending letters.',
  quick: 'Only 10 seconds to submit your word.',
  mystery: 'The server selects the starting letter.',
  chain: 'The previous winning word determines the next letter.',
  chaos: 'Face a different word challenge each round.',
};
