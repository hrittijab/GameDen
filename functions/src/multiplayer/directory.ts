import {
  onDocumentWritten,
} from 'firebase-functions/v2/firestore';

import { db, options } from './firebase';

const GAMES = {
  colorClashRooms: {
    game: 'color-clash',
    title: 'Color Clash',
    maxPlayers: 20,
  },
  doodleClashRooms: {
    game: 'doodle-clash',
    title: 'Doodle Clash',
    maxPlayers: 12,
  },
  wordClashRooms: {
    game: 'word-clash',
    title: 'Word Clash',
    maxPlayers: 12,
  },
} as const;

type RoomCollection = keyof typeof GAMES;

const ACTIVE_MS = 60000;

async function syncDirectory(
  collection: RoomCollection,
  code: string,
) {
  const config = GAMES[collection];

  const roomRef = db
    .collection(collection)
    .doc(code);

  const directoryRef = db
    .collection('publicRooms')
    .doc(`${config.game}_${code}`);

  await db.runTransaction(async tx => {
    const snapshot = await tx.get(roomRef);
    const room = snapshot.data();

    if (
      !room ||
      room.visibility !== 'public' ||
      room.status !== 'lobby'
    ) {
      tx.delete(directoryRef);
      return;
    }

    const players = room.players ?? {};
    const ids = Object.keys(players);

    const capacity = room.maxPlayers;

    if (
      !Number.isInteger(capacity) ||
      capacity < 2 ||
      capacity > config.maxPlayers ||
      ids.length < 1 ||
      ids.length >= capacity
    ) {
      tx.delete(directoryRef);
      return;
    }

    const hostName = players[room.hostId];

    if (typeof hostName !== 'string') {
      tx.delete(directoryRef);
      return;
    }

    const presence = await tx.get(
      roomRef.collection('presence'),
    );

    let lastActiveAt = 0;

    presence.forEach(document => {
      if (!ids.includes(document.id)) {
        return;
      }

      const lastSeen =
        document.data().lastSeen;

      if (
        typeof lastSeen === 'number' &&
        Number.isFinite(lastSeen)
      ) {
        lastActiveAt = Math.max(
          lastActiveAt,
          lastSeen,
        );
      }
    });

    const now = Date.now();

    if (
      !lastActiveAt ||
      now - lastActiveAt >= ACTIVE_MS
    ) {
      tx.delete(directoryRef);
      return;
    }

    tx.set(directoryRef, {
      game: config.game,
      title: config.title,
      code,

      roomName:
        typeof room.roomName === 'string' &&
        room.roomName.trim()
          ? room.roomName.trim().slice(0, 32)
          : `${config.title} Room`,

      hostName,

      hostAvatar:
        room.playerAvatars?.[room.hostId] ??
        '👤',

      playerCount: ids.length,
      maxPlayers: capacity,

      lastActiveAt,

      expiresAt:
        lastActiveAt + ACTIVE_MS,
    });
  });
}

function createDirectoryHandler(
  collection: RoomCollection,
) {
  return onDocumentWritten(
    {
      ...options,
      document: `${collection}/{code}`,
      retry: true,
    },

    event =>
      syncDirectory(
        collection,
        event.params.code,
      ),
  );
}

function createPresenceDirectoryHandler(
  collection: RoomCollection,
) {
  return onDocumentWritten(
    {
      ...options,
      document:
        `${collection}/{code}/presence/{uid}`,

      retry: true,
    },

    event =>
      syncDirectory(
        collection,
        event.params.code,
      ),
  );
}

export const syncColorClashDirectory =
  createDirectoryHandler('colorClashRooms');

export const syncDoodleClashDirectory =
  createDirectoryHandler('doodleClashRooms');

export const syncWordClashDirectory =
  createDirectoryHandler('wordClashRooms');

export const syncColorClashPresenceDirectory =
  createPresenceDirectoryHandler('colorClashRooms');

export const syncDoodleClashPresenceDirectory =
  createPresenceDirectoryHandler('doodleClashRooms');

export const syncWordClashPresenceDirectory =
  createPresenceDirectoryHandler('wordClashRooms');
