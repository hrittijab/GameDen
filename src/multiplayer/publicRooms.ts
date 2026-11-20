import {
  collection,
  limit,
  onSnapshot,
  query,
} from 'firebase/firestore';

import { db } from '../config/firebase';

import {
  parseInvite,
  type InviteGame,
} from './invitations';

export type PublicRoom = {
  id: string;
  game: InviteGame;
  title: string;
  code: string;
  roomName: string;
  hostName: string;
  hostAvatar: string;
  playerCount: number;
  maxPlayers: number;
  lastActiveAt: number;
  expiresAt: number;
};

export function subscribeToPublicRooms(
  onUpdate: (rooms: PublicRoom[]) => void,
  onError: (message: string) => void,
): () => void {
  const roomsQuery = query(
    collection(db, 'publicRooms'),
    limit(50),
  );

  let rooms: PublicRoom[] = [];
  let received = false;
  let stopped = false;

  function publish() {
    if (!received || stopped) return;

    const now = Date.now();

    const activeRooms = rooms
      .filter(room => room.expiresAt > now)
      .sort((a, b) =>
        b.playerCount - a.playerCount ||
        a.roomName.localeCompare(b.roomName),
      );

    onUpdate(activeRooms);
  }

  const unsubscribe = onSnapshot(
    roomsQuery,

    { includeMetadataChanges: true },

    snapshot => {
      if (stopped) return;

      if (
        snapshot.metadata.fromCache ||
        snapshot.metadata.hasPendingWrites
      ) {
        return;
      }

      const next: PublicRoom[] = [];

      snapshot.forEach(document => {
        const data = document.data();

        const invite = parseInvite(
          data.game,
          data.code,
        );

        if (
          !invite ||
          typeof data.roomName !== 'string' ||
          typeof data.hostName !== 'string' ||
          typeof data.hostAvatar !== 'string' ||
          typeof data.title !== 'string' ||
          !Number.isInteger(data.playerCount) ||
          !Number.isInteger(data.maxPlayers) ||
          data.playerCount < 1 ||
          data.maxPlayers < 2 ||
          data.maxPlayers >
            (invite.game === 'color-clash' ? 20 : 12) ||
          data.playerCount >= data.maxPlayers ||
          typeof data.lastActiveAt !== 'number' ||
          typeof data.expiresAt !== 'number' ||
          !Number.isFinite(data.expiresAt)
        ) {
          return;
        }

        next.push({
          id: document.id,
          game: invite.game,
          title: data.title,
          code: invite.code,
          roomName: data.roomName,
          hostName: data.hostName,
          hostAvatar: data.hostAvatar,
          playerCount: data.playerCount,
          maxPlayers: data.maxPlayers,
          lastActiveAt: data.lastActiveAt,
          expiresAt: data.expiresAt,
        });
      });

      rooms = next;
      received = true;

      publish();
    },

    error => {
      received = false;
      rooms = [];
      onError(error.message);
    },
  );

  // Expire abandoned rooms even when
  // Firestore sends no new updates.

  const timer = setInterval(
    publish,
    5000,
  );

  return () => {
    stopped = true;
    clearInterval(timer);
    unsubscribe();
  };
}
