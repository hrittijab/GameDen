import {
  doc,
  onSnapshot,
  runTransaction,
} from 'firebase/firestore';

import { db } from '../config/firebase';

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
  playerName: string,
): Promise<string> {
  const name = validateName(playerName);
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

        tx.set(ref, {
          hostId: user.uid,
          status: 'lobby',
          players: {
            [user.uid]: name,
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
  playerName: string,
): Promise<string> {
  const code = validateCode(codeInput);
  const name = validateName(playerName);
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
      config.maxPlayers
    ) {
      throw new Error('Room is full.');
    }

    tx.update(ref, {
      players: {
        ...room.players,
        [user.uid]: name,
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

    snap =>
      onUpdate(
        snap.exists()
          ? (snap.data() as TRoom)
          : null,
      ),

    error => onError(error.message),
  );
}
