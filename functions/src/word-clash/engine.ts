import { randomInt } from 'node:crypto';

import {
  DEFAULT_SETTINGS,
  lengthBonus,
  streakPoints,
  roundDuration,
  type WordSettings,
  type GameMode,
} from './settings';

import {
  createChallenge,
} from './challenges';

import {
  isCategoryWord,
  type Category,
} from './categories';

import type {
  MultiplayerRoom,
} from '../multiplayer/rooms';

import type {
  Transaction,
  DocumentReference,
} from 'firebase-admin/firestore';

import {
  LETTER_SELECTION_MS,
  ROUND_MS,
  RESULTS_MS,
  WINNING_SCORE,
} from './config';

import {
  isEnglishWord,
} from './dictionary';

export type Submission = {
  word: string;
  submittedAt: number;
};

export type RoundResult = {
  uid: string;
  name: string;
  word: string;
  elapsedMs: number;
  speedBonus?: number;
  lengthBonus?: number;
  streakBonus?: number;
  streak?: number;
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
  category?: Category | null;
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

export type WordSecret = {
  matchNumber: number;
  roundNumber: number;
  submissions: Record<string, Submission>;
  usedWords: string[];
};

export function randomLetter(): string {
  const letters = 'ABCDEFGHIJKLMNOPRSTW';

  return letters[randomInt(letters.length)];
}

export function scoreWord(
  remainingMs: number,
  durationMs = ROUND_MS,
): number {
  const ratio = Math.max(
    0,
    Math.min(1, remainingMs / Math.max(1, durationMs)),
  );

  return 20 + Math.round(30 * ratio);
}

export function calculateResults(
  room: WordRoom,
  secret: WordSecret,
) {
  const settings = {
    ...DEFAULT_SETTINGS,
    ...room.matchSettings,
  };

  const duration = room.roundMs ?? ROUND_MS;

  const streaks = {
    ...room.streaks,
  };

  const counts = new Map<string, number>();

  const used = new Set(secret.usedWords);

  const scores = {
    ...room.scores,
  };

  for (const uid of Object.keys(room.players)) {
    const submission = secret.submissions[uid];

    if (submission) {
      counts.set(
        submission.word,
        (counts.get(submission.word) ?? 0) + 1,
      );
    }
  }

  const results: RoundResult[] = Object.entries(
    room.players,
  ).map(([uid, name]) => {
    const submitted = secret.submissions[uid];

    const word = submitted?.word ?? '';

    let outcome: RoundResult['outcome'] = 'missed';

    let points = 0;
    let speed = 0;
    let extraLength = 0;
    let extraStreak = 0;

    const elapsedMs = submitted
      ? Math.max(
          0,
          submitted.submittedAt -
            (room.deadline - duration),
        )
      : duration;

    const dictionaryValid =
      !!room.letter &&
      word.startsWith(room.letter.toLowerCase()) &&
      word.length >= settings.minimumLength &&
      (
        !room.endingLetter ||
        word.endsWith(room.endingLetter.toLowerCase())
      ) &&
      (
        room.category
          ? isCategoryWord(word, room.category)
          : isEnglishWord(word)
      );

    if (!submitted) {
      outcome = 'missed';
    } else if (!dictionaryValid) {
      outcome = 'invalid';
    } else if (!settings.allowRepeatedWords && used.has(word)) {
      outcome = 'repeated';
    } else if ((counts.get(word) ?? 0) > 1) {
      outcome = 'duplicate';
    } else {
      outcome = 'valid';

      const base = scoreWord(
        room.deadline - submitted.submittedAt,
        duration,
      );

      streaks[uid] =
        (streaks[uid] ?? 0) + 1;

      speed = base - 20;

      extraLength = lengthBonus(
        room.roundMode ?? 'classic',
        word.length,
        settings.minimumLength,
      );

      extraStreak = streakPoints(
        settings.streakBonus,
        streaks[uid],
      );

      points = base +
        extraLength +
        extraStreak;
    }

    if (outcome !== 'valid') {
      streaks[uid] = 0;
    }

    scores[uid] =
      (scores[uid] ?? 0) + points;

    return {
      uid,
      name,
      word,
      elapsedMs,
      points,
      outcome,
      speedBonus: speed,
      lengthBonus: extraLength,
      streakBonus: extraStreak,
      streak: streaks[uid] ?? 0,
    };
  });

  // Every dictionary-valid word submitted in this
  // round becomes unavailable in future rounds.

  for (const result of results) {
    if (
      result.word &&
      result.outcome !== 'invalid' &&
      result.outcome !== 'missed'
    ) {
      used.add(result.word);
    }
  }

  return {
    scores,
    results,
    streaks,
    usedWords: [...used],
  };
}

export function findWinners(
  room: WordRoom,
): string[] {
  const players = Object.keys(room.players);

  if (!players.length) return [];

  const highest = Math.max(
    ...players.map(
      uid => room.scores[uid] ?? 0,
    ),
  );

  if (highest < (room.matchSettings?.winningScore ?? WINNING_SCORE)) {
    return [];
  }

  return players.filter(
    uid => room.scores[uid] === highest,
  );
}

export function beginWordRound(
  tx: Transaction,
  roomRef: DocumentReference,
  secretRef: DocumentReference,
  room: WordRoom,
  chooserId: string,
  roundNumber: number,
  usedWords: string[],
) {
  const settings = {
    ...DEFAULT_SETTINGS,
    ...room.matchSettings,
  };

  const previousWinner = [...(room.results ?? [])]
    .filter(result => result.outcome === 'valid')
    .sort((a, b) =>
      b.points - a.points ||
      a.elapsedMs - b.elapsedMs ||
      a.uid.localeCompare(b.uid),
    )[0];

  const challenge = createChallenge(
    settings,
    Object.keys(room.players).length,
    usedWords,
    roundNumber === 1
      ? ''
      : previousWinner?.word ?? '',
  );

  const automatic =
    challenge.automaticLetter !== null;

  tx.update(roomRef, {
    status: 'playing',
    phase: automatic ? 'countdown' : 'choosing',
    matchNumber: room.matchNumber,
    roundNumber,
    playerOrder: room.playerOrder,
    chooserId,
    letter: challenge.automaticLetter,
    letterOptions: challenge.letterOptions,
    category: challenge.category,
    endingLetter: challenge.endingLetter,
    roundMode: challenge.mode,
    roundMs: roundDuration(
      settings,
      challenge.mode,
    ),
    matchSettings: settings,
    deadline: Date.now() +
      (automatic ? 3000 : LETTER_SELECTION_MS),
    scores: room.scores,
    streaks: room.streaks ?? {},
    matchStartedAt: room.matchStartedAt ?? Date.now(),
    submittedIds: [],
    results: [],
    winnerIds: [],
    reactions: {},
  });

  const secret: WordSecret = {
    matchNumber: room.matchNumber,
    roundNumber,
    submissions: {},
    usedWords,
  };

  tx.set(secretRef, secret);
}

export function openWordRound(
  tx: Transaction,
  roomRef: DocumentReference,
  letter: string,
) {
  tx.update(roomRef, {
    phase: 'countdown',
    letter,
    deadline: Date.now() + 3000,
    submittedIds: [],
  });
}

export function startWordSubmission(
  tx: Transaction,
  roomRef: DocumentReference,
  room: WordRoom,
) {
  tx.update(roomRef, {
    phase: 'typing',
    deadline: Date.now() +
      (room.roundMs ?? ROUND_MS),
  });
}

export function finishWordRound(
  tx: Transaction,
  roomRef: DocumentReference,
  secretRef: DocumentReference,
  room: WordRoom,
  secret: WordSecret,
) {
  const calculated = calculateResults(
    room,
    secret,
  );

  tx.update(roomRef, {
    phase: 'results',
    deadline: Date.now() + RESULTS_MS,
    scores: calculated.scores,
    results: calculated.results,
    streaks: calculated.streaks,
    submittedIds: Object.keys(
      secret.submissions,
    ),
  });

  tx.set(secretRef, {
    ...secret,
    submissions: {},
    usedWords: calculated.usedWords,
  });
}

export function finishWordMatch(
  tx: Transaction,
  roomRef: DocumentReference,
  secretRef: DocumentReference,
  winnerIds: string[],
) {
  tx.update(roomRef, {
    status: 'finished',
    phase: 'finished',
    chooserId: null,
    deadline: 0,
    winnerIds,
  });

  tx.delete(secretRef);
}

export function advanceWordRound(
  tx: Transaction,
  roomRef: DocumentReference,
  secretRef: DocumentReference,
  room: WordRoom,
  secret: WordSecret,
) {
  const winners = findWinners(room);

  if (
    Object.keys(room.players).length < 2 ||
    winners.length === 1
  ) {
    finishWordMatch(
      tx,
      roomRef,
      secretRef,
      winners,
    );

    return;
  }

  // Safety limit for unusually long matches.
  if (room.roundNumber >= 100) {
    const highest = Math.max(
      ...Object.keys(room.players).map(
        uid => room.scores[uid] ?? 0,
      ),
    );

    finishWordMatch(
      tx,
      roomRef,
      secretRef,
      Object.keys(room.players).filter(
        uid => room.scores[uid] === highest,
      ),
    );

    return;
  }

  const order = room.playerOrder.filter(
    uid => Object.prototype.hasOwnProperty.call(
      room.players,
      uid,
    ),
  );

  const currentIndex = order.indexOf(
    room.chooserId ?? '',
  );

  const nextChooser =
    order[(currentIndex + 1) % order.length];

  beginWordRound(
    tx,
    roomRef,
    secretRef,
    room,
    nextChooser,
    room.roundNumber + 1,
    secret.usedWords,
  );
}


