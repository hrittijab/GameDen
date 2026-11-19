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
} from './config';

import {
  validateSettings,
} from './settings';

import type {
  RoundRoom,
} from './rounds';

export const configureDoodleClashRoom = onCall(
  options,
  async request => {
    const {
      db,
      uid,
      roomRef,
    } = roomContext(
      request,
      DOODLE_CLASH_CONFIG,
    );

    return db.runTransaction(async tx => {
      const snapshot = await tx.get(roomRef);

      if (!snapshot.exists) {
        throw new HttpsError(
          'not-found',
          'Room not found.',
        );
      }

      const room =
        snapshot.data() as RoundRoom;

      requireMember(room, uid);
      requireHost(room, uid);

      if (room.status !== 'lobby') {
        throw new HttpsError(
          'failed-precondition',
          'Settings can only change in the lobby.',
        );
      }

      const patch = request.data?.settings;

      if (
        !patch ||
        typeof patch !== 'object' ||
        Array.isArray(patch)
      ) {
        throw new HttpsError(
          'invalid-argument',
          'Invalid settings update.',
        );
      }

      const settings = validateSettings({
        ...room.matchSettings,
        ...patch,
      });

      tx.update(roomRef, {
        matchSettings: settings,
      });

      return {
        success: true,
      };
    });
  },
);

