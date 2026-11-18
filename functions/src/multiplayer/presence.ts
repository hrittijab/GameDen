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
      } = roomContext(request, config);

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

        tx.set(
          roomRef
            .collection('presence')
            .doc(uid),

          {
            uid,
            lastSeen: Date.now(),
          },
        );

        return {
          success: true,
        };
      });
    },
  );
}
