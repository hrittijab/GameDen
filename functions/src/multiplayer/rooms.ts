import { requirePlayerProfile } from './identity';
import {
  HttpsError,
  type CallableRequest,
} from 'firebase-functions/v2/https';

import { db } from './firebase';

export type BackendRoomConfig = {
  roomCollection: string;
  secretCollection: string;
};

export type MultiplayerRoom = {
  hostId: string;
  status: 'lobby' | 'playing' | 'finished';
  players: Record<string, string>;
};

export function validateRequest(
  request: CallableRequest,
) {
  const uid = request.auth?.uid;
  const code = request.data?.code;

  if (!uid) {
    throw new HttpsError(
      'unauthenticated',
      'Please sign in.',
    );
  }

  if (
    typeof code !== 'string' ||
    !/^[A-HJ-NP-Z2-9]{8}$/.test(code)
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Invalid room code.',
    );
  }

  return { uid, code };
}

export async function roomContext(
  request: CallableRequest,
  config: BackendRoomConfig,
  allowMissingProfile = false,
) {
  const { uid, code } =
    validateRequest(request);

  if (!allowMissingProfile) {
    await requirePlayerProfile(uid);
  }

  return {
    db,
    uid,
    code,

    roomRef: db
      .collection(config.roomCollection)
      .doc(code),

    secretRef: db
      .collection(config.secretCollection)
      .doc(code),
  };
}

export function hasMember(
  room: MultiplayerRoom,
  uid: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(
    room.players,
    uid,
  );
}

export function requireMember(
  room: MultiplayerRoom,
  uid: string,
): void {
  if (!hasMember(room, uid)) {
    throw new HttpsError(
      'permission-denied',
      'You are no longer in this room.',
    );
  }
}

export function requireHost(
  room: MultiplayerRoom,
  uid: string,
  message = 'Only the host can perform this action.',
): void {
  if (
    !hasMember(room, uid) ||
    room.hostId !== uid
  ) {
    throw new HttpsError(
      'permission-denied',
      message,
    );
  }
}


