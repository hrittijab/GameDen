import {
  onCall,
  HttpsError,
} from 'firebase-functions/v2/https';

import { options } from '../multiplayer/firebase';

import { validateSettings } from './settings';

import {
  selectFallbackLetter,
} from './challenges';

import {
  roomContext,
  requireMember,
  requireHost,
} from '../multiplayer/rooms';

import {
  WORD_CLASH_CONFIG,
  MIN_PLAYERS,
  MAX_PLAYERS,
  LETTERS,
  MAX_WORD_LENGTH,
} from './config';

import {
  normalizeWord,
} from './dictionary';

import {
  beginWordRound,
  openWordRound,
  finishWordRound,
  advanceWordRound,
  startWordSubmission,
  type WordRoom,
  type WordSecret,
} from './engine';

function context(
  request: Parameters<typeof roomContext>[0],
) {
  return roomContext(
    request,
    WORD_CLASH_CONFIG,
  );
}

function requireActiveRound(
  room: WordRoom,
  secret: WordSecret,
  data: {
    matchNumber?: unknown;
    roundNumber?: unknown;
  },
) {
  if (
    room.status !== 'playing' ||
    room.matchNumber !== data.matchNumber ||
    room.roundNumber !== data.roundNumber ||
    secret.matchNumber !== room.matchNumber ||
    secret.roundNumber !== room.roundNumber
  ) {
    throw new HttpsError(
      'failed-precondition',
      'This round has changed.',
    );
  }
}

export const startWordClashMatch = onCall(
  options,
  async request => {
    const { db, uid, roomRef, secretRef } =
      await context(request);

    return db.runTransaction(async tx => {
      const snapshot = await tx.get(roomRef);

      if (!snapshot.exists) {
        throw new HttpsError(
          'not-found',
          'Room not found.',
        );
      }

      const room = snapshot.data() as WordRoom;

      requireMember(room, uid);
      requireHost(room, uid);

      if (
        room.status !== 'lobby' &&
        room.status !== 'finished'
      ) {
        throw new HttpsError(
          'failed-precondition',
          'Match already started.',
        );
      }

      const players = Object.keys(room.players);

      if (
        players.length < MIN_PLAYERS ||
        players.length > MAX_PLAYERS
      ) {
        throw new HttpsError(
          'failed-precondition',
          'Word Clash requires 2-12 players.',
        );
      }

      const playerOrder = [
        room.hostId,
        ...players.filter(
          id => id !== room.hostId,
        ),
      ];

      const scores = Object.fromEntries(
        playerOrder.map(id => [id, 0]),
      );

      beginWordRound(
        tx,
        roomRef,
        secretRef,
        {
          ...room,
          playerOrder,
          scores,
          streaks: {},
          matchSettings: validateSettings(
            room.matchSettings,
          ),
          matchStartedAt: Date.now(),
          results: [],
          matchNumber: (room.matchNumber ?? 0) + 1,
        },
        playerOrder[0],
        1,
        [],
      );

      tx.update(roomRef, {
        departedPlayers: {},
        departureEvent: null,
        forfeitResult: null,
        sharedReactions: {},
      });

      return { success: true };
    });
  },
);

export const selectWordClashLetter = onCall(
  options,
  async request => {
    const { db, uid, roomRef, secretRef } =
      await context(request);

    const letter = request.data?.letter;

    if (
      typeof letter !== 'string' ||
      !LETTERS.includes(letter)
    ) {
      throw new HttpsError(
        'invalid-argument',
        'Choose a letter from A to Z.',
      );
    }

    return db.runTransaction(async tx => {
      const roomSnap = await tx.get(roomRef);
      const secretSnap = await tx.get(secretRef);

      if (!roomSnap.exists || !secretSnap.exists) {
        throw new HttpsError(
          'not-found',
          'Round not found.',
        );
      }

      const room = roomSnap.data() as WordRoom;
      const secret = secretSnap.data() as WordSecret;

      requireMember(room, uid);

      requireActiveRound(
        room,
        secret,
        request.data ?? {},
      );

      if (room.chooserId !== uid) {
        throw new HttpsError(
          'permission-denied',
          'It is not your turn to choose.',
        );
      }

      if (
        room.phase !== 'choosing' ||
        Date.now() >= room.deadline
      ) {
        throw new HttpsError(
          'failed-precondition',
          'Letter selection has ended.',
        );
      }

      if (
        room.letterOptions &&
        !room.letterOptions.includes(letter)
      ) {
        throw new HttpsError(
          'invalid-argument',
          'Choose one of the available letters.',
        );
      }

      openWordRound(tx, roomRef, letter);

      return { success: true };
    });
  },
);

export const submitWordClashWord = onCall(
  options,
  async request => {
    const { db, uid, roomRef, secretRef } =
      await context(request);

    const input = request.data?.word;

    if (
      typeof input !== 'string' ||
      input.length > 100
    ) {
      throw new HttpsError(
        'invalid-argument',
        'Enter a valid word.',
      );
    }

    const word = normalizeWord(input);

    if (
      !/^[a-z]+$/.test(word) ||
      word.length < 3 ||
      word.length > MAX_WORD_LENGTH
    ) {
      throw new HttpsError(
        'invalid-argument',
        'Use 3-30 English letters.',
      );
    }

    return db.runTransaction(async tx => {
      const roomSnap = await tx.get(roomRef);
      const secretSnap = await tx.get(secretRef);

      if (!roomSnap.exists || !secretSnap.exists) {
        throw new HttpsError(
          'not-found',
          'Round not found.',
        );
      }

      const room = roomSnap.data() as WordRoom;
      const secret = secretSnap.data() as WordSecret;

      requireMember(room, uid);

      requireActiveRound(
        room,
        secret,
        request.data ?? {},
      );

      const now = Date.now();

      if (
        room.phase !== 'typing' ||
        !room.letter ||
        now >= room.deadline
      ) {
        throw new HttpsError(
          'failed-precondition',
          'Time is up.',
        );
      }

      if (
        word.length <
          (room.matchSettings?.minimumLength ?? 3)
      ) {
        throw new HttpsError(
          'invalid-argument',
          'Your word is too short.',
        );
      }

      if (
        room.endingLetter &&
        !word.endsWith(
          room.endingLetter.toLowerCase(),
        )
      ) {
        throw new HttpsError(
          'invalid-argument',
          `Your word must end with ${room.endingLetter}.`,
        );
      }

      if (secret.submissions[uid]) {
        throw new HttpsError(
          'failed-precondition',
          'Your word is already locked in.',
        );
      }

      if (
        !word.startsWith(
          room.letter.toLowerCase(),
        )
      ) {
        throw new HttpsError(
          'invalid-argument',
          `Your word must begin with ${room.letter}.`,
        );
      }

      const updated: WordSecret = {
        ...secret,
        submissions: {
          ...secret.submissions,
          [uid]: {
            word,
            submittedAt: now,
          },
        },
      };

      const submittedIds = Object.keys(
        updated.submissions,
      );

      const everyoneSubmitted =
        Object.keys(room.players).every(
          id => submittedIds.includes(id),
        );

      if (everyoneSubmitted) {
        finishWordRound(
          tx,
          roomRef,
          secretRef,
          room,
          updated,
        );
      } else {
        tx.set(secretRef, updated);

        tx.update(roomRef, {
          submittedIds,
        });
      }

      return { success: true };
    });
  },
);

export const getMyWordClashSubmission = onCall(
  options,
  async request => {
    const { db, uid, roomRef, secretRef } =
      await context(request);

    return db.runTransaction(async tx => {
      const roomSnap = await tx.get(roomRef);
      const secretSnap = await tx.get(secretRef);

      if (!roomSnap.exists || !secretSnap.exists) {
        throw new HttpsError(
          'not-found',
          'Round not found.',
        );
      }

      const room = roomSnap.data() as WordRoom;
      const secret = secretSnap.data() as WordSecret;

      requireMember(room, uid);

      requireActiveRound(
        room,
        secret,
        request.data ?? {},
      );

      return {
        success: true,
        word: secret.submissions[uid]?.word ?? null,
      };
    });
  },
);

export const advanceWordClashPhase = onCall(
  options,
  async request => {
    const { db, uid, roomRef, secretRef } =
      await context(request);

    return db.runTransaction(async tx => {
      const roomSnap = await tx.get(roomRef);
      const secretSnap = await tx.get(secretRef);

      if (!roomSnap.exists) {
        throw new HttpsError(
          'not-found',
          'Room not found.',
        );
      }

      const room = roomSnap.data() as WordRoom;

      requireMember(room, uid);

      if (
        room.status !== 'playing' ||
        !secretSnap.exists ||
        room.matchNumber !== request.data?.matchNumber ||
        room.roundNumber !== request.data?.roundNumber ||
        room.phase !== request.data?.phase ||
        Date.now() < room.deadline
      ) {
        return { success: true };
      }

      const secret =
        secretSnap.data() as WordSecret;

      requireActiveRound(
        room,
        secret,
        request.data ?? {},
      );

      switch (room.phase) {
        case 'choosing':
          openWordRound(
            tx,
            roomRef,
            selectFallbackLetter(
              room.letterOptions ?? [],
            ),
          );
          break;

        case 'countdown':
          startWordSubmission(
            tx,
            roomRef,
            room,
          );
          break;

        case 'typing':
          finishWordRound(
            tx,
            roomRef,
            secretRef,
            room,
            secret,
          );
          break;

        case 'results':
          advanceWordRound(
            tx,
            roomRef,
            secretRef,
            room,
            secret,
          );
          break;
      }

      return { success: true };
    });
  },
);



