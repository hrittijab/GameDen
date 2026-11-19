import {
  subscribeToRoom,
} from '../../multiplayer/rooms';

import {
  callServer,
} from '../../multiplayer/api';

import {
  WORD_CLASH_CONFIG,
} from './config';

import type {
  WordRoom,
} from './types';

function roundData(
  code: string,
  room: WordRoom,
) {
  return {
    code,
    matchNumber: room.matchNumber,
    roundNumber: room.roundNumber,
  };
}

export function subscribeToWordRoom(
  code: string,
  onUpdate: (room: WordRoom | null) => void,
  onError: (error: string) => void,
) {
  return subscribeToRoom<WordRoom>(
    WORD_CLASH_CONFIG.room,
    code,
    onUpdate,
    onError,
  );
}

export function selectLetter(
  code: string,
  room: WordRoom,
  letter: string,
) {
  return callServer(
    'selectWordClashLetter',
    {
      ...roundData(code, room),
      letter,
    },
  );
}

export function submitWord(
  code: string,
  room: WordRoom,
  word: string,
) {
  return callServer(
    'submitWordClashWord',
    {
      ...roundData(code, room),
      word,
    },
  );
}

export function recoverSubmission(
  code: string,
  room: WordRoom,
) {
  return callServer<{
    success: boolean;
    word: string | null;
  }>(
    'getMyWordClashSubmission',
    roundData(code, room),
  );
}

export function advancePhase(
  code: string,
  room: WordRoom,
) {
  return callServer(
    'advanceWordClashPhase',
    {
      ...roundData(code, room),
      phase: room.phase,
    },
  );
}

export function maintainMatch(
  code: string,
  room: WordRoom,
) {
  return callServer(
    'maintainWordClashMatch',
    roundData(code, room),
  );
}

export function sendReaction(
  code: string,
  room: WordRoom,
  emoji: string,
) {
  return callServer(
    'reactWordClash',
    {
      ...roundData(code, room),
      emoji,
    },
  );
}
