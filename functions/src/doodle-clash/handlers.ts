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
  emptyDrawing,
  requireArtist,
  applyDrawingAction,
  type DoodleRoom,
  type DrawingState,
} from './engine';

export const startDoodleClashMatch = onCall(
  options,
  async request => {
    const { db, uid, roomRef } =
      roomContext(request, DOODLE_CLASH_CONFIG);

    return db.runTransaction(async tx => {
      const snap = await tx.get(roomRef);

      if (!snap.exists) {
        throw new HttpsError(
          'not-found',
          'Room not found.',
        );
      }

      const room = snap.data() as DoodleRoom;

      requireMember(room, uid);
      requireHost(room, uid);

      if (
        room.status !== 'lobby' &&
        room.status !== 'finished'
      ) {
        throw new HttpsError(
          'failed-precondition',
          'A match is already active.',
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

      const playerOrder = [
        room.hostId,
        ...ids.filter(id => id !== room.hostId),
      ];

      const matchNumber =
        (room.matchNumber ?? 0) + 1;

      const drawingRef = roomRef
        .collection('drawing')
        .doc('current');

      tx.update(roomRef, {
        status: 'playing',
        artistId: playerOrder[0],
        playerOrder,
        matchNumber,
      });

      tx.set(
        drawingRef,
        emptyDrawing(matchNumber),
      );

      return { success: true };
    });
  },
);

export const updateDoodleClashDrawing = onCall(
  options,
  async request => {
    const { db, uid, roomRef } =
      roomContext(request, DOODLE_CLASH_CONFIG);

    const drawingRef = roomRef
      .collection('drawing')
      .doc('current');

    return db.runTransaction(async tx => {
      const roomSnap = await tx.get(roomRef);
      const drawingSnap = await tx.get(drawingRef);

      if (!roomSnap.exists || !drawingSnap.exists) {
        throw new HttpsError(
          'not-found',
          'Drawing session not found.',
        );
      }

      const room =
        roomSnap.data() as DoodleRoom;

      const current =
        drawingSnap.data() as DrawingState;

      requireMember(room, uid);
      requireArtist(room, uid);

      if (
        request.data?.matchNumber !== room.matchNumber ||
        current.matchNumber !== room.matchNumber
      ) {
        throw new HttpsError(
          'failed-precondition',
          'This drawing session has changed.',
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

      const updated = applyDrawingAction(
        current,
        request.data?.action,
        request.data?.stroke,
      );

      if (updated !== current) {
        tx.set(drawingRef, updated);
      }

      return {
        success: true,
        drawing: updated,
      };
    });
  },
);
