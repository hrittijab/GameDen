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

import { WORD_CLASH_CONFIG } from './config';

import {
  validateSettings,
  type WordSettings,
} from './settings';

import type { WordRoom } from './engine';

export const configureWordClashRoom = onCall(
  options,
  async request => {
    const {
      db,
      uid,
      roomRef,
    } = await roomContext(
      request,
      WORD_CLASH_CONFIG,
    );

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

    return db.runTransaction(async tx => {
      const snapshot = await tx.get(roomRef);

      if (!snapshot.exists) {
        throw new HttpsError(
          'not-found',
          'Room not found.',
        );
      }

      const room = snapshot.data() as WordRoom & {
        matchSettings?: WordSettings;
      };

      requireMember(room, uid);
      requireHost(room, uid);

      if (room.status !== 'lobby') {
        throw new HttpsError(
          'failed-precondition',
          'Settings can only change before the match.',
        );
      }

      const settings = validateSettings({
        ...room.matchSettings,
        ...patch,
      });

      tx.update(roomRef, {
        matchSettings: settings,
      });

      return { success: true };
    });
  },
);

