import type {
  Transaction,
  DocumentReference,
} from 'firebase-admin/firestore';

import type {
  DoodleRoom,
} from './engine';

import { emptyDrawing } from './engine';

import {
  chooseWords,
  maskWord,
  type WordOption,
} from './words';

export const SELECTION_MS = 15000;
export const DRAWING_MS = 60000;
export const RESULTS_MS = 5000;
export const GUESS_COOLDOWN_MS = 750;

export type Phase =
  | 'choosing'
  | 'drawing'
  | 'results'
  | 'finished';

export type RoundRoom = DoodleRoom & {
  phase: Phase;
  deadline: number;
  roundNumber: number;
  totalRounds: number;
  pendingArtists: string[];
  scores: Record<string, number>;
  roundPoints: Record<string, number>;
  guessedIds: string[];
  hint: string;
  revealedWord: string | null;
};

export type RoundSecret = {
  matchNumber: number;
  choices: WordOption[];
  answer: string | null;
  usedWords: string[];
  lastGuessAt: Record<string, number>;
};

export function newSecret(
  matchNumber: number,
  usedWords: string[] = [],
): RoundSecret {
  return {
    matchNumber,
    choices: chooseWords(usedWords),
    answer: null,
    usedWords,
    lastGuessAt: {},
  };
}

export function beginRound(
  tx: Transaction,
  roomRef: DocumentReference,
  secretRef: DocumentReference,
  room: DoodleRoom,
  settings: {
    artistId: string;
    playerOrder: string[];
    pendingArtists: string[];
    roundNumber: number;
    totalRounds: number;
    scores: Record<string, number>;
    usedWords: string[];
  },
) {
  const matchNumber =
    (room.matchNumber ?? 0) + 1;

  const next: Partial<RoundRoom> = {
    status: 'playing',
    phase: 'choosing',
    artistId: settings.artistId,
    playerOrder: settings.playerOrder,
    pendingArtists: settings.pendingArtists,
    roundNumber: settings.roundNumber,
    totalRounds: settings.totalRounds,
    scores: settings.scores,
    roundPoints: {},
    matchNumber,
    deadline: Date.now() + SELECTION_MS,
    guessedIds: [],
    hint: '',
    revealedWord: null,
  };

  tx.update(roomRef, next);

  tx.set(
    secretRef,
    newSecret(matchNumber, settings.usedWords),
  );

  tx.set(
    roomRef.collection('drawing').doc('current'),
    emptyDrawing(matchNumber),
  );
}

export function chooseAnswer(
  tx: Transaction,
  roomRef: DocumentReference,
  secretRef: DocumentReference,
  secret: RoundSecret,
  index: number,
) {
  const answer = secret.choices[index].word;

  tx.update(roomRef, {
    phase: 'drawing',
    hint: maskWord(answer),
    deadline: Date.now() + DRAWING_MS,
    revealedWord: null,
  });

  tx.set(secretRef, {
    ...secret,
    answer,
    usedWords: [
      ...secret.usedWords,
      answer,
    ],
  });
}

export function finishRound(
  tx: Transaction,
  roomRef: DocumentReference,
  secret: RoundSecret,
  updates: Partial<RoundRoom> = {},
) {
  tx.update(roomRef, {
    ...updates,
    phase: 'results',
    deadline: Date.now() + RESULTS_MS,
    revealedWord: secret.answer,
  });
}

export function finishMatch(
  tx: Transaction,
  roomRef: DocumentReference,
  secretRef: DocumentReference,
  updates: Partial<RoundRoom> = {},
) {
  tx.update(roomRef, {
    ...updates,
    status: 'finished',
    phase: 'finished',
    artistId: null,
    deadline: 0,
    pendingArtists: [],
  });

  tx.delete(secretRef);
}

export function advanceRound(
  tx: Transaction,
  roomRef: DocumentReference,
  secretRef: DocumentReference,
  room: RoundRoom,
  secret: RoundSecret,
) {
  const pending = room.pendingArtists.filter(
    id => Object.prototype.hasOwnProperty.call(
      room.players,
      id,
    ),
  );

  if (
    Object.keys(room.players).length < 2 ||
    pending.length === 0
  ) {
    finishMatch(tx, roomRef, secretRef);
    return;
  }

  beginRound(
    tx,
    roomRef,
    secretRef,
    room,
    {
      artistId: pending[0],
      playerOrder: room.playerOrder,
      pendingArtists: pending.slice(1),
      roundNumber: room.roundNumber + 1,
      totalRounds: room.totalRounds,
      scores: room.scores,
      usedWords: secret.usedWords,
    },
  );
}

export function pointsForGuess(
  previousCorrectGuesses: number,
  remainingMs: number,
): number {
  const timeRatio = Math.max(
    0,
    Math.min(1, remainingMs / DRAWING_MS),
  );

  const basePoints = 20;

  const speedBonus = Math.round(
    60 * timeRatio,
  );

  const positionBonus =
    previousCorrectGuesses === 0 ? 20 :
    previousCorrectGuesses === 1 ? 10 :
    previousCorrectGuesses === 2 ? 5 :
    0;

  return basePoints + speedBonus + positionBonus;
}

export function pointsForArtist(
  remainingMs: number,
): number {
  const timeRatio = Math.max(
    0,
    Math.min(1, remainingMs / DRAWING_MS),
  );

  return 10 + Math.round(10 * timeRatio);
}

