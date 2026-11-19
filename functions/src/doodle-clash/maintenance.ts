import {
  HttpsError,
  onCall,
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
  handleDeparture,
} from './lifecycle';

import {
  DRAWING_MS,
  type RoundRoom,
  type RoundSecret,
} from './rounds';

import {
  progressiveHint,
} from './intelligence';

export const DISCONNECT_GRACE_MS = 60000;

export const maintainDoodleClashMatch = onCall(
  options,
  async request => {
    const {
      db,
      uid,
      roomRef,
      secretRef,
    } = roomContext(
      request,
      DOODLE_CLASH_CONFIG,
    );

    return db.runTransaction(async tx => {
      const snap = await tx.get(roomRef);

      if (!snap.exists) {
        throw new HttpsError(
          'not-found',
          'Room not found.',
        );
      }

      const room = snap.data() as RoundRoom & {
        matchStartedAt?: number;
      };

      requireMember(room, uid);

      if (
        room.status !== 'playing' ||
        room.matchNumber !== request.data?.matchNumber
      ) {
        return { success: true };
      }

      const ids = Object.keys(room.players);

      const presenceRefs = ids.map(id =>
        roomRef.collection('presence').doc(id),
      );

      const presenceSnaps =
        await tx.getAll(...presenceRefs);

      const now = Date.now();

      const staleId = ids.find((id, index) => {
        if (id === uid) return false;

        const lastSeen =
          presenceSnaps[index].data()?.lastSeen ??
          room.matchStartedAt ??
          now;

        return now - lastSeen >= DISCONNECT_GRACE_MS;
      });

      if (staleId) {
        const remainingPlayers = {
          ...room.players,
        };

        delete remainingPlayers[staleId];

        return handleDeparture({
          tx,
          roomRef,
          secretRef,
          presenceRef: roomRef
            .collection('presence')
            .doc(staleId),
          room,
          targetUid: staleId,
          name: room.players[staleId],
          remainingPlayers,
          remainingIds: Object.keys(
            remainingPlayers,
          ),
        });
      }

      if (
        room.phase === 'drawing' &&
        now < room.deadline
      ) {
        const secretSnap = await tx.get(secretRef);

        if (!secretSnap.exists) {
          return { success: true };
        }

        const secret =
          secretSnap.data() as RoundSecret;

        if (
          secret.answer &&
          secret.matchNumber === room.matchNumber
        ) {
          const elapsed =
            DRAWING_MS -
            Math.max(0, room.deadline - now);

          const hint = progressiveHint(
            secret.answer,
            elapsed,
            room.matchNumber,
          );

          if (hint !== room.hint) {
            tx.update(roomRef, {
              hint,
            });
          }
        }
      }

      return {
        success: true,
      };
    });
  },
);
