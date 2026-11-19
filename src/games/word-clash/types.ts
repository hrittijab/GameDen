import type {
  MultiplayerRoom,
} from '../../multiplayer/types';

import type {
  WordSettings,
  GameMode,
} from './settings';

export type RoundResult = {
  speedBonus?: number;
  lengthBonus?: number;
  streakBonus?: number;
  streak?: number;
  uid: string;
  name: string;
  word: string;
  elapsedMs: number;
  points: number;
  outcome:
    | 'valid'
    | 'duplicate'
    | 'invalid'
    | 'repeated'
    | 'missed';
};

export type WordRoom = MultiplayerRoom & {
  phase: 'choosing' | 'countdown' | 'typing' | 'results' | 'finished';
  matchSettings?: WordSettings;
  roundMode?: GameMode;
  roundMs?: number;
  category?: string | null;
  endingLetter?: string | null;
  letterOptions?: string[];
  streaks?: Record<string, number>;
  matchStartedAt?: number;
  reactions?: Record<string, {
    emoji: string;
    timestamp: number;
  }>;
  matchNumber: number;
  roundNumber: number;
  playerOrder: string[];
  chooserId: string | null;
  letter: string | null;
  deadline: number;
  scores: Record<string, number>;
  submittedIds: string[];
  results: RoundResult[];
  winnerIds: string[];
};

export const WINNING_SCORE = 200;

export const LETTERS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export const OUTCOMES = {
  valid: 'Unique word',
  duplicate: 'Duplicate word',
  invalid: 'Invalid word',
  repeated: 'Already used',
  missed: 'No submission',
};

