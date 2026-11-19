import {
  HttpsError,
  onCall,
} from 'firebase-functions/v2/https';

import { options } from '../multiplayer/firebase';

import {
  roomContext,
  requireMember,
} from '../multiplayer/rooms';

import { WORD_CLASH_CONFIG } from './config';

import type { WordRoom } from './engine';

const EMOJIS = [
  '😂', '🔥', '👏',
  '😱', '🤔', '🏆',
];

const COOLDOWN_MS = 1500;

export const reactWordClash = onCall(
  options,
  async request => {
    const {
      db,
      uid,
      roomRef,
    } = roomContext(
      request,
      WORD_CLASH_CONFIG,
    );

    const emoji = request.data?.emoji;

    if (
      typeof emoji !== 'string' ||
      !EMOJIS.includes(emoji)
    ) {
      throw new HttpsError(
        'invalid-argument',
        'Unsupported reaction.',
      );
    }

    return db.runTransaction(async tx => {
      const snap = await tx.get(roomRef);

      if (!snap.exists) {
        throw new HttpsError(
          'not-found',
          'Room not found.',
        );
      }

      const room = snap.data() as WordRoom;

      requireMember(room, uid);

      if (
        room.status !== 'playing' ||
        room.matchSettings?.reactions === false ||
        room.matchNumber !== request.data?.matchNumber ||
        room.roundNumber !== request.data?.roundNumber
      ) {
        throw new HttpsError(
          'failed-precondition',
          'Reactions are unavailable.',
        );
      }

      const now = Date.now();

      const previous =
        room.reactions?.[uid]?.timestamp ?? 0;

      if (now - previous < COOLDOWN_MS) {
        throw new HttpsError(
          'resource-exhausted',
          'Please wait before reacting again.',
        );
      }

      tx.update(roomRef, {
        reactions: {
          ...room.reactions,
          [uid]: {
            emoji,
            timestamp: now,
          },
        },
      });

      return { success: true };
    });
  },
);
