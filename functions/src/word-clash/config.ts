import type {
  BackendRoomConfig,
} from '../multiplayer/rooms';

export const WORD_CLASH_CONFIG: BackendRoomConfig = {
  roomCollection: 'wordClashRooms',
  secretCollection: 'wordClashSecrets',
};

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 12;

export const WINNING_SCORE = 200;

export const LETTER_SELECTION_MS = 10000;
export const ROUND_MS = 20000;
export const RESULTS_MS = 6000;

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  .split('');

export const MAX_WORD_LENGTH = 30;
