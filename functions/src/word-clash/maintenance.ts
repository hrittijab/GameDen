import { processMatchDeparture } from '../multiplayer/lifecycle';
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

import { handleDeparture } from './lifecycle';

import type { WordRoom } from './engine';

const DISCONNECT_GRACE_MS = 60000;

export const maintainWordClashMatch = onCall(
  options,
  async request => {
    const {
      db,
      uid,
      roomRef,
      secretRef,
    } = await roomContext(
      request,
      WORD_CLASH_CONFIG,
    );

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
        room.matchNumber !== request.data?.matchNumber
      ) {
        return { success: true };
      }

      const ids = Object.keys(room.players);

      const refs = ids.map(id =>
        roomRef.collection('presence').doc(id),
      );

      const snapshots = await tx.getAll(...refs);

      const now = Date.now();

      // Give all players time to initialize
      // their match presence after navigation.
      const startedAt = room.matchStartedAt ?? now;

      const staleId = ids.find((id, i) => {
        if (id === uid) return false;

        const stored = snapshots[i].data()?.lastSeen;

        const lastSeen = Math.max(
          startedAt,
          typeof stored === 'number'
            ? stored
            : 0,
        );

        return now - lastSeen >=
          DISCONNECT_GRACE_MS;
      });

      if (!staleId) {
        return { success: true };
      }

      const remainingPlayers = {
        ...room.players,
      };

      delete remainingPlayers[staleId];

      return processMatchDeparture({
          reason: 'timeout',
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
      }, handleDeparture);
    });
  },
);



