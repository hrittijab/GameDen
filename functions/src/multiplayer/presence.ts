import {
  HttpsError,
  onCall,
} from 'firebase-functions/v2/https';

import { options } from './firebase';

import {
  roomContext,
  requireMember,
  type BackendRoomConfig,
  type MultiplayerRoom,
} from './rooms';

export function createHeartbeatHandler(
  config: BackendRoomConfig,
) {
  return onCall(
    options,

    async request => {
      const {
        db,
        uid,
        roomRef,
      } = await roomContext(request, config);

      return db.runTransaction(async tx => {
        const snap = await tx.get(roomRef);

        if (!snap.exists) {
          throw new HttpsError(
            'not-found',
            'Room not found.',
          );
        }

        const room =
          snap.data() as MultiplayerRoom;

        requireMember(room, uid);

        const presenceRef = roomRef
          .collection('presence')
          .doc(uid);

        const previous =
          await tx.get(presenceRef);

        const now = Date.now();

        const lastSeen =
          previous.data()?.lastSeen;

        if (
          typeof lastSeen === 'number' &&
          now - lastSeen < 5000
        ) {
          return {
            success: true,
            throttled: true,
          };
        }

        tx.set(presenceRef, {
          uid,
          lastSeen: now,
        });

        return {
          success: true,
        };
      });
    },
  );
}


