import { getRoomCapacity } from './types';
import type { RoomCreationOptions } from './types';
import {
  doc,
  onSnapshot,
  runTransaction,
} from 'firebase/firestore';

import { db } from '../config/firebase';

import {
  isValidAvatar,
} from '../player/avatars';

import type {
  Transaction,
} from 'firebase/firestore';

async function readPlayerIdentity(
  tx: Transaction,
  uid: string,
) {
  const snapshot = await tx.get(
    doc(db, 'users', uid),
  );

  if (!snapshot.exists()) {
    throw new Error(
      'Complete your GameDen profile first.',
    );
  }

  const profile = snapshot.data();

  if (
    typeof profile.nickname !== 'string' ||
    !isValidAvatar(profile.avatar)
  ) {
    throw new Error(
      'Your player profile is incomplete.',
    );
  }

  return {
    name: validateName(profile.nickname),
    avatar: profile.avatar,
  };
}

import { ensureGuest } from './auth';

import type {
  MultiplayerRoom,
  RoomConfig,
} from './types';

export function validateCode(value: string): string {
  const code = value.trim().toUpperCase();

  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code)) {
    throw new Error(
      'Enter a valid 8-character room code.',
    );
  }

  return code;
}

export function validateName(value: string): string {
  const name = value.trim();

  if (!name || name.length > 24) {
    throw new Error(
      'Enter a name of 1-24 characters.',
    );
  }

  return name;
}

export function generateCode(): string {
  const alphabet =
    'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  return Array.from(
    { length: 8 },
    () =>
      alphabet[
        Math.floor(
          Math.random() * alphabet.length,
        )
      ],
  ).join('');
}

export function getRoomRef(
  config: RoomConfig,
  code: string,
) {
  return doc(
    db,
    config.collection,
    validateCode(code),
  );
}

export async function createRoom(
  config: RoomConfig,
  _playerName: string,
  options?: RoomCreationOptions,
): Promise<string> {

  const visibility =
    options?.visibility ?? 'private';

  const capacity =
    options?.maxPlayers ?? config.maxPlayers;

  const roomName =
    (options?.roomName ?? '').trim();

  if (
    visibility !== 'private' &&
    visibility !== 'public'
  ) {
    throw new Error('Invalid room visibility.');
  }

  if (
    !Number.isInteger(capacity) ||
    capacity < 2 ||
    capacity > config.maxPlayers
  ) {
    throw new Error('Invalid room capacity.');
  }

  if (
    roomName.length > 32 ||
    /[\u0000-\u001F\u007F]/.test(roomName)
  ) {
    throw new Error(
      'Enter a room name of up to 32 characters.',
    );
  }

  const user = await ensureGuest();

  for (let i = 0; i < 5; i++) {
    const code = generateCode();
    const ref = getRoomRef(config, code);

    const created = await runTransaction(
      db,
      async tx => {
        if ((await tx.get(ref)).exists()) {
          return false;
        }

        const identity =
          await readPlayerIdentity(tx, user.uid);

        tx.set(ref, {
          hostId: user.uid,
          status: 'lobby',

          visibility,

          roomName:
            visibility === 'public'
              ? roomName
              : '',

          maxPlayers: capacity,
          players: {
            [user.uid]: identity.name,
          },
          playerAvatars: {
            [user.uid]: identity.avatar,
          },
        });

        return true;
      },
    );

    if (created) {
      return code;
    }
  }

  throw new Error(
    'Could not generate room code.',
  );
}

export async function joinRoom(
  config: RoomConfig,
  codeInput: string,
  _playerName: string,
): Promise<string> {
  const code = validateCode(codeInput);

  const user = await ensureGuest();

  await runTransaction(db, async tx => {
    const ref = getRoomRef(config, code);
    const snap = await tx.get(ref);

    if (!snap.exists()) {
      throw new Error('Room not found.');
    }

    const room =
      snap.data() as MultiplayerRoom;

    if (
      Object.prototype.hasOwnProperty.call(
        room.players,
        user.uid,
      )
    ) {
      return;
    }

    if (room.status !== 'lobby') {
      throw new Error(
        'This match has already started.',
      );
    }

    if (
      Object.keys(room.players).length >=
      getRoomCapacity(room, config)
    ) {
      throw new Error('Room is full.');
    }

    const identity =
      await readPlayerIdentity(tx, user.uid);

    tx.update(ref, {
      players: {
        ...room.players,
        [user.uid]: identity.name,
      },
      playerAvatars: {
        ...(room.playerAvatars ?? {}),
        [user.uid]: identity.avatar,
      },
    });
  });

  return code;
}

export function subscribeToRoom<
  TRoom extends MultiplayerRoom = MultiplayerRoom
>(
  config: RoomConfig,
  code: string,
  onUpdate: (room: TRoom | null) => void,
  onError: (message: string) => void,
): () => void {
  return onSnapshot(
    getRoomRef(config, code),

    { includeMetadataChanges: true },

    snap => {
      // Cached data cannot confirm that a room
      // was deleted or that a player was removed.
      if (snap.metadata.fromCache) return;

      if (snap.metadata.hasPendingWrites) return;

      onUpdate(
        snap.exists()
          ? (snap.data() as TRoom)
          : null,
      );
    },

    error => onError(error.message),
  );
}




