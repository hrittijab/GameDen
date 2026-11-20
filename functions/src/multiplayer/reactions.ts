import { randomUUID } from 'node:crypto';

import {
  HttpsError,
  onCall,
} from 'firebase-functions/v2/https';

import { options } from './firebase';

import {
  roomContext,
  requireMember,
  type MultiplayerRoom,
  type BackendRoomConfig,
} from './rooms';

export const EMOJIS = [
  '😂', '🔥', '👏', '😱',
  '🤔', '😍', '😎', '😡',
  '💀', '🏆', '👍', '😭',
] as const;

export const COOLDOWN_MS = 2000;

type Reaction = {
  id: string;
  emoji: string;
  timestamp: number;
  matchNumber: number;
};

type ReactionRoom = MultiplayerRoom & {
  matchNumber?: number;
  matchSettings?: {
    reactions?: boolean;
  };
  sharedReactions?: Record<string, Reaction>;
};

export function createReactionHandler(
  config: BackendRoomConfig,
) {
  return onCall(options, async request => {
    const {
      db,
      uid,
      roomRef,
    } = await roomContext(request, config);

    const emoji = request.data?.emoji;

    if (
      typeof emoji !== 'string' ||
      !EMOJIS.some(value => value === emoji)
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

      const room = snap.data() as ReactionRoom;

      requireMember(room, uid);

      if (
        room.status !== 'playing' ||
        typeof room.matchNumber !== 'number' ||
        room.matchNumber !== request.data?.matchNumber ||
        room.matchSettings?.reactions === false
      ) {
        throw new HttpsError(
          'failed-precondition',
          'Reactions are unavailable.',
        );
      }

      const now = Date.now();

      const previous =
        room.sharedReactions?.[uid];

      if (
        previous &&
        now - previous.timestamp < COOLDOWN_MS
      ) {
        throw new HttpsError(
          'resource-exhausted',
          'Please wait before reacting again.',
        );
      }

      // Retain at most one reaction per active player.
      // Prune departed players and outdated reactions.
      const reactions = Object.fromEntries(
        Object.entries(
          room.sharedReactions ?? {},
        ).filter(([id, reaction]) =>
          Object.prototype.hasOwnProperty.call(
            room.players,
            id,
          ) &&
          now - reaction.timestamp < 10000,
        ),
      );

      reactions[uid] = {
        id: randomUUID(),
        emoji,
        timestamp: now,
        matchNumber: room.matchNumber,
      };

      tx.update(roomRef, {
        sharedReactions: reactions,
      });

      return { success: true };
    });
  });
}

