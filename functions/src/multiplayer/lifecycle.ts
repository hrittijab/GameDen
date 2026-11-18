import type {
  DocumentReference,
  Transaction,
} from 'firebase-admin/firestore';

import {
  HttpsError,
  onCall,
  type CallableRequest,
} from 'firebase-functions/v2/https';

import { options } from './firebase';

import {
  roomContext,
  hasMember,
  requireHost,
  type BackendRoomConfig,
  type MultiplayerRoom,
} from './rooms';

export type DepartureContext = {
  tx: Transaction;
  roomRef: DocumentReference;
  secretRef: DocumentReference;
  presenceRef: DocumentReference;
  room: MultiplayerRoom;
  targetUid: string;
  name: string;
  remainingPlayers: Record<string, string>;
  remainingIds: string[];
};

export type DepartureHandler = (
  context: DepartureContext,
) => Promise<{ success: boolean }>;

export function nextHost(
  hostId: string,
  targetUid: string,
  remainingIds: string[],
): string {
  return hostId === targetUid
    ? remainingIds[0]
    : hostId;
}

export function createLifecycleHandlers(
  config: BackendRoomConfig,
  handleMatchDeparture: DepartureHandler,
) {
  async function removePlayer(
    request: CallableRequest,
    kick: boolean,
  ) {
    const {
      db,
      uid,
      roomRef,
      secretRef,
    } = roomContext(request, config);

    const targetUid = kick
      ? request.data?.targetUid
      : uid;

    if (
      typeof targetUid !== 'string' ||
      !targetUid ||
      targetUid.includes('/')
    ) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid player.',
      );
    }

    return db.runTransaction(async tx => {
      const snap = await tx.get(roomRef);

      if (!snap.exists) {
        if (!kick) {
          return { success: true };
        }

        throw new HttpsError(
          'not-found',
          'Room not found.',
        );
      }

      const room =
        snap.data() as MultiplayerRoom;

      if (kick) {
        requireHost(
          room,
          uid,
          'Only the host can kick players.',
        );

        if (room.status !== 'lobby') {
          throw new HttpsError(
            'failed-precondition',
            'Kicking is only allowed in the lobby.',
          );
        }

        if (targetUid === uid) {
          throw new HttpsError(
            'invalid-argument',
            'Use Leave Room instead.',
          );
        }
      }

      if (!hasMember(room, targetUid)) {
        return { success: true };
      }

      const name =
        room.players[targetUid];

      const remainingPlayers = {
        ...room.players,
      };

      delete remainingPlayers[targetUid];

      const remainingIds =
        Object.keys(remainingPlayers);

      const presenceRef = roomRef
        .collection('presence')
        .doc(targetUid);

      // Common lobby departure.

      if (room.status === 'lobby') {
        if (!remainingIds.length) {
          tx.delete(roomRef);
        } else {
          tx.update(roomRef, {
            players: remainingPlayers,

            hostId: nextHost(
              room.hostId,
              targetUid,
              remainingIds,
            ),
          });
        }

        tx.delete(presenceRef);

        return { success: true };
      }

      // Delegate active or finished matches
      // to the game's own departure logic.

      return handleMatchDeparture({
        tx,
        roomRef,
        secretRef,
        presenceRef,
        room,
        targetUid,
        name,
        remainingPlayers,
        remainingIds,
      });
    });
  }

  const leave = onCall(
    options,
    request => removePlayer(request, false),
  );

  const kick = onCall(
    options,
    request => removePlayer(request, true),
  );

  return { leave, kick };
}
