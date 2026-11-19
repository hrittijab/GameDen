import { evaluateGuess } from './intelligence';

import {
  appendActivity,
  getActivityState,
} from './activity';

import {
  validateSettings,
  calculateTurns,
  validateModeAction,
} from './settings';

import { validateStroke } from './engine';
import {
  HttpsError,
  onCall,
} from 'firebase-functions/v2/https';

import { options } from '../multiplayer/firebase';

import {
  roomContext,
  requireMember,
  requireHost,
} from '../multiplayer/rooms';

import {
  DOODLE_CLASH_CONFIG,
  MIN_PLAYERS,
  MAX_PLAYERS,
} from './config';

import {
  requireArtist,
  applyDrawingAction,
  type DrawingState,
} from './engine';

import {
  beginRound,
  chooseAnswer,
  finishRound,
  advanceRound,
  pointsForGuess,
  pointsForArtist,
  GUESS_COOLDOWN_MS,
  type RoundRoom,
  type RoundSecret,
} from './rounds';

import {
  normalizeWord,
} from './words';

function context(request: Parameters<typeof roomContext>[0]) {
  return roomContext(
    request,
    DOODLE_CLASH_CONFIG,
  );
}

function requireRound(
  room: RoundRoom,
  secret: RoundSecret,
  matchNumber: unknown,
) {
  if (
    room.status !== 'playing' ||
    room.matchNumber !== matchNumber ||
    secret.matchNumber !== room.matchNumber
  ) {
    throw new HttpsError(
      'failed-precondition',
      'This round has changed.',
    );
  }
}

export const startDoodleClashMatch = onCall(
  options,
  async request => {
    const { db, uid, roomRef, secretRef } =
      context(request);

    return db.runTransaction(async tx => {
      const snap = await tx.get(roomRef);

      if (!snap.exists) {
        throw new HttpsError(
          'not-found',
          'Room not found.',
        );
      }

      const room = snap.data() as RoundRoom;

      requireMember(room, uid);
      requireHost(room, uid);

      if (
        room.status !== 'lobby' &&
        room.status !== 'finished'
      ) {
        throw new HttpsError(
          'failed-precondition',
          'Match already active.',
        );
      }

      const ids = Object.keys(room.players);

      if (
        ids.length < MIN_PLAYERS ||
        ids.length > MAX_PLAYERS
      ) {
        throw new HttpsError(
          'failed-precondition',
          'Doodle Clash requires 2-12 players.',
        );
      }

      const order = [
        room.hostId,
        ...ids.filter(id => id !== room.hostId),
      ];

      const playerCount = order.length;

      const matchSettings = validateSettings(
        room.matchSettings,
      );

      const turnsPerPlayer = calculateTurns(
        playerCount,
        matchSettings,
      );

      const artistQueue = Array.from(
        { length: turnsPerPlayer },
        () => [...order],
      ).flat();

      const scores = Object.fromEntries(
        order.map(id => [id, 0]),
      );

      beginRound(
        tx,
        roomRef,
        secretRef,
        { ...room, matchSettings },
        {
          artistId: artistQueue[0],
          playerOrder: order,
          pendingArtists: artistQueue.slice(1),
          roundNumber: 1,
          totalRounds: artistQueue.length,
          scores,
          usedWords: [],
        },
      );

      tx.update(roomRef, {
        matchStartedAt: Date.now(),
      });

      return { success: true };
    });
  },
);

export const getDoodleClashWord = onCall(
  options,
  async request => {
    const { db, uid, roomRef, secretRef } =
      context(request);

    return db.runTransaction(async tx => {
      const roomSnap = await tx.get(roomRef);
      const secretSnap = await tx.get(secretRef);

      if (!roomSnap.exists || !secretSnap.exists) {
        throw new HttpsError(
          'not-found',
          'Round not found.',
        );
      }

      const room = roomSnap.data() as RoundRoom;
      const secret = secretSnap.data() as RoundSecret;

      requireMember(room, uid);
      requireArtist(room, uid);

      requireRound(
        room,
        secret,
        request.data?.matchNumber,
      );

      if (room.phase === 'choosing') {
        return {
          success: true,
          choices: secret.choices,
          answer: null,
        };
      }

      if (room.phase === 'drawing') {
        return {
          success: true,
          choices: [],
          answer: secret.answer,
        };
      }

      throw new HttpsError(
        'failed-precondition',
        'Word selection is unavailable.',
      );
    });
  },
);

export const selectDoodleClashWord = onCall(
  options,
  async request => {
    const { db, uid, roomRef, secretRef } =
      context(request);

    return db.runTransaction(async tx => {
      const roomSnap = await tx.get(roomRef);
      const secretSnap = await tx.get(secretRef);

      if (!roomSnap.exists || !secretSnap.exists) {
        throw new HttpsError(
          'not-found',
          'Round not found.',
        );
      }

      const room = roomSnap.data() as RoundRoom;
      const secret = secretSnap.data() as RoundSecret;

      requireMember(room, uid);
      requireArtist(room, uid);

      requireRound(
        room,
        secret,
        request.data?.matchNumber,
      );

      if (
        room.phase !== 'choosing' ||
        Date.now() >= room.deadline
      ) {
        throw new HttpsError(
          'failed-precondition',
          'Word selection has ended.',
        );
      }

      const index = request.data?.index;

      if (
        typeof index !== 'number' ||
        !Number.isInteger(index) ||
        index < 0 ||
        index >= secret.choices.length
      ) {
        throw new HttpsError(
          'invalid-argument',
          'Invalid word choice.',
        );
      }

      chooseAnswer(
        tx,
        roomRef,
        secretRef,
        secret,
        room,
        index,
      );

      return { success: true };
    });
  },
);

export const guessDoodleClashWord = onCall(
  options,
  async request => {
    const { db, uid, roomRef, secretRef } =
      context(request);

    const guess = request.data?.guess;

    if (
      typeof guess !== 'string' ||
      !guess.trim() ||
      guess.length > 80 ||
      !normalizeWord(guess)
    ) {
      throw new HttpsError(
        'invalid-argument',
        'Enter a valid guess.',
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

      const room = roomSnap.data() as RoundRoom;
      const secret = secretSnap.data() as RoundSecret;

      requireMember(room, uid);

      requireRound(
        room,
        secret,
        request.data?.matchNumber,
      );

      if (
        room.phase !== 'drawing' ||
        !secret.answer ||
        Date.now() >= room.deadline
      ) {
        throw new HttpsError(
          'failed-precondition',
          'Guessing has ended.',
        );
      }

      if (room.artistId === uid) {
        throw new HttpsError(
          'permission-denied',
          'The artist cannot guess.',
        );
      }

      if (room.guessedIds.includes(uid)) {
        throw new HttpsError(
          'failed-precondition',
          'You already guessed correctly.',
        );
      }

      const now = Date.now();

      if (
        now - (secret.lastGuessAt[uid] ?? 0) <
        GUESS_COOLDOWN_MS
      ) {
        throw new HttpsError(
          'resource-exhausted',
          'Please wait before guessing again.',
        );
      }

      const activityRef = roomRef
        .collection('activity')
        .doc('current');

      const feedEnabled =
        room.matchSettings?.guessFeed !== false;

      const activitySnap = feedEnabled
        ? await tx.get(activityRef)
        : null;

      const activity = getActivityState(
        activitySnap?.data(),
        room.matchNumber,
      );

      tx.set(secretRef, {
        ...secret,
        lastGuessAt: {
          ...secret.lastGuessAt,
          [uid]: now,
        },
      });

      const evaluation = evaluateGuess(
        guess,
        secret.answer,
      );

      const correct = evaluation === 'correct';

      if (!correct) {
        if (feedEnabled) {
          const normalizedGuess =
            normalizeWord(guess);

          const normalizedAnswer =
            normalizeWord(secret.answer);

          const publicGuess =
            evaluation === 'close' ||
            normalizedGuess.includes(normalizedAnswer)
              ? 'Made a guess'
              : guess.trim().slice(0, 60);

          tx.set(
            activityRef,
            appendActivity(activity, {
              uid,
              playerName: room.players[uid],
              kind: 'guess',
              text: publicGuess,
              timestamp: now,
            }),
          );
        }

        return {
          success: true,
          correct: false,
          close: evaluation === 'close',
          points: 0,
        };
      }

      const remainingMs = Math.max(
        0,
        room.deadline - now,
      );

      const points = pointsForGuess(
        room.guessedIds.length,
        remainingMs,
        room.drawingMs,
      );

      const artistPoints = pointsForArtist(
        remainingMs,
        room.drawingMs,
      );

      if (feedEnabled) {
        tx.set(
          activityRef,
          appendActivity(activity, {
            uid,
            playerName: room.players[uid],
            kind: 'correct',
            text: `Guessed correctly! +${points} points`,
            timestamp: now,
          }),
        );
      }

      const artist = room.artistId!;

      const scores = {
        ...room.scores,
        [uid]: (room.scores[uid] ?? 0) + points,
        [artist]: (room.scores[artist] ?? 0) + artistPoints,
      };

      const roundPoints = {
        ...room.roundPoints,
        [uid]: (room.roundPoints[uid] ?? 0) + points,
        [artist]:
          (room.roundPoints[artist] ?? 0) + artistPoints,
      };

      const guessedIds = [
        ...room.guessedIds,
        uid,
      ];

      const updates = {
        scores,
        roundPoints,
        guessedIds,
      };

      const allGuessed = Object.keys(
        room.players,
      )
        .filter(id => id !== artist)
        .every(id => guessedIds.includes(id));

      if (allGuessed) {
        finishRound(
          tx,
          roomRef,
          secret,
          updates,
        );
      } else {
        tx.update(roomRef, updates);
      }

      return {
        success: true,
        correct: true,
        close: false,
        points,
      };
    });
  },
);

export const advanceDoodleClashRound = onCall(
  options,
  async request => {
    const { db, uid, roomRef, secretRef } =
      context(request);

    return db.runTransaction(async tx => {
      const roomSnap = await tx.get(roomRef);
      const secretSnap = await tx.get(secretRef);

      if (!roomSnap.exists) {
        throw new HttpsError(
          'not-found',
          'Room not found.',
        );
      }

      const room = roomSnap.data() as RoundRoom;

      requireMember(room, uid);

      if (
        room.status !== 'playing' ||
        room.matchNumber !== request.data?.matchNumber ||
        room.phase !== request.data?.phase ||
        !secretSnap.exists ||
        Date.now() < room.deadline
      ) {
        return { success: true };
      }

      const secret =
        secretSnap.data() as RoundSecret;

      requireRound(
        room,
        secret,
        request.data?.matchNumber,
      );

      switch (room.phase) {
        case 'choosing':
          chooseAnswer(
            tx,
            roomRef,
            secretRef,
            secret,
            room,
            0,
          );
          break;

        case 'drawing':
          finishRound(
            tx,
            roomRef,
            secret,
          );
          break;

        case 'results':
          advanceRound(
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

export const updateDoodleClashDrawing = onCall(
  options,
  async request => {
    const { db, uid, roomRef } =
      context(request);

    const drawingRef = roomRef
      .collection('drawing')
      .doc('current');

    return db.runTransaction(async tx => {
      const roomSnap = await tx.get(roomRef);
      const drawingSnap = await tx.get(drawingRef);

      const previewSnap = await tx.get(
        roomRef.collection('preview').doc('current'),
      );

      if (!roomSnap.exists || !drawingSnap.exists) {
        throw new HttpsError(
          'not-found',
          'Drawing session not found.',
        );
      }

      const room = roomSnap.data() as RoundRoom;

      const current =
        drawingSnap.data() as DrawingState;

      requireMember(room, uid);
      requireArtist(room, uid);

      if (
        room.phase !== 'drawing' ||
        Date.now() >= room.deadline
      ) {
        throw new HttpsError(
          'failed-precondition',
          'Drawing time has ended.',
        );
      }

      if (
        request.data?.matchNumber !== room.matchNumber ||
        current.matchNumber !== room.matchNumber
      ) {
        throw new HttpsError(
          'failed-precondition',
          'Drawing session has changed.',
        );
      }

      if (
        request.data?.revision !== current.revision
      ) {
        throw new HttpsError(
          'failed-precondition',
          'Drawing changed. Please try again.',
        );
      }

      const action = request.data?.action;

      const stroke = action === 'add'
        ? validateStroke(request.data?.stroke)
        : undefined;

      const preview = previewSnap.data();

      if (
        room.roundMode === 'stroke' &&
        action === 'add' &&
        preview?.matchNumber === room.matchNumber &&
        preview?.revision === current.revision &&
        preview.stroke?.id !== stroke?.id
      ) {
        throw new HttpsError(
          'failed-precondition',
          'Only the original stroke may be submitted.',
        );
      }

      validateModeAction(
        room.roundMode ?? 'classic',
        current,
        action,
        stroke,
      );

      const updated = applyDrawingAction(
        current,
        action,
        stroke,
      );

      if (updated !== current) {
        tx.set(drawingRef, updated);

        tx.delete(
          roomRef.collection('preview').doc('current'),
        );
      }

      return {
        success: true,
        drawing: updated,
      };
    });
  },
);








