import {
  onCall,
  HttpsError,
} from 'firebase-functions/v2/https';

import {
  options,
} from '../multiplayer/firebase';

import {
  roomContext,
  requireMember,
} from '../multiplayer/rooms';

import {
  DOODLE_CLASH_CONFIG,
} from './config';

import {
  requireArtist,
  validateStroke,
  type DrawingState,
} from './engine';

import type {
  RoundRoom,
} from './rounds';

import { validateModeAction } from './settings';

const MIN_UPDATE_INTERVAL = 200;

export const previewDoodleClashStroke = onCall(
  options,
  async request => {
    const { db, uid, roomRef } =
      roomContext(request, DOODLE_CLASH_CONFIG);

    const stroke = validateStroke(
      request.data?.stroke,
    );

    const drawingRef = roomRef
      .collection('drawing')
      .doc('current');

    const previewRef = roomRef
      .collection('preview')
      .doc('current');

    return db.runTransaction(async tx => {
      const roomSnap = await tx.get(roomRef);
      const drawingSnap = await tx.get(drawingRef);
      const previewSnap = await tx.get(previewRef);

      if (!roomSnap.exists || !drawingSnap.exists) {
        throw new HttpsError(
          'not-found',
          'Drawing session not found.',
        );
      }

      const room = roomSnap.data() as RoundRoom;
      const drawing =
        drawingSnap.data() as DrawingState;

      requireMember(room, uid);
      requireArtist(room, uid);

      const now = Date.now();

      if (
        room.phase !== 'drawing' ||
        now >= room.deadline ||
        request.data?.matchNumber !== room.matchNumber ||
        drawing.matchNumber !== room.matchNumber ||
        request.data?.revision !== drawing.revision
      ) {
        return {
          success: true,
          accepted: false,
        };
      }

      if (
        drawing.strokes.some(
          existing => existing.id === stroke.id,
        ) ||
        drawing.redoStack.some(
          existing => existing.id === stroke.id,
        )
      ) {
        return {
          success: true,
          accepted: false,
        };
      }

      validateModeAction(
        room.roundMode ?? 'classic',
        drawing,
        'add',
        stroke,
      );

      const previous = previewSnap.data();

      if (
        room.roundMode === 'stroke' &&
        previous?.matchNumber === room.matchNumber &&
        previous?.revision === drawing.revision &&
        previous.stroke?.id !== stroke.id
      ) {
        throw new HttpsError(
          'failed-precondition',
          'Your one stroke has already started.',
        );
      }

      if (
        previous?.matchNumber === room.matchNumber &&
        previous?.revision === drawing.revision &&
        now - previous.updatedAt < MIN_UPDATE_INTERVAL
      ) {
        return {
          success: true,
          accepted: false,
        };
      }

      tx.set(previewRef, {
        matchNumber: room.matchNumber,
        revision: drawing.revision,
        updatedAt: now,
        stroke,
      });

      return {
        success: true,
        accepted: true,
      };
    });
  },
);


