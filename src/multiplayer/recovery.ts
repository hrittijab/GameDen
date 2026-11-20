import {
  getDocFromServer,
} from 'firebase/firestore';

import { auth } from '../config/firebase';

import {
  COLOR_CLASH_CONFIG,
} from '../games/color-clash/config';

import {
  DOODLE_CLASH_CONFIG,
} from '../games/doodle-clash/config';

import {
  WORD_CLASH_CONFIG,
} from '../games/word-clash/config';

import type {
  MultiplayerLobbyConfig,
} from './Lobby';

import {
  getSession,
  clearSession,
} from './session';

import { getRoomRef } from './rooms';

import type {
  MultiplayerRoom,
  MultiplayerSession,
} from './types';

export const RECOVERY_GAMES = [
  COLOR_CLASH_CONFIG,
  DOODLE_CLASH_CONFIG,
  WORD_CLASH_CONFIG,
];

export type RecoveryEntry = {
  config: MultiplayerLobbyConfig;
  session: MultiplayerSession;
  room: MultiplayerRoom | null;
  state:
    | 'available'
    | 'unverified'
    | 'unavailable';
  message?: string;
};

export async function forgetSavedRoom(
  gameId: string,
  expected: MultiplayerSession,
): Promise<void> {
  if (auth.currentUser?.uid !== expected.uid) {
    return;
  }

  const current = await getSession(
    gameId,
    expected.uid,
  );

  if (
    current?.code === expected.code &&
    current.uid === expected.uid
  ) {
    await clearSession(gameId, expected.uid);
  }
}

export async function verifySavedRooms():
  Promise<RecoveryEntry[]> {

  await auth.authStateReady();

  const user = auth.currentUser;

  if (!user) return [];

  const saved = await Promise.all(
    RECOVERY_GAMES.map(async config => ({
      config,
      session: await getSession(
        config.gameId,
        user.uid,
      ),
    })),
  );

  if (auth.currentUser?.uid !== user.uid) {
    return [];
  }

  const entries = saved.filter(
    (
      entry,
    ): entry is {
      config: MultiplayerLobbyConfig;
      session: MultiplayerSession;
    } => entry.session !== null,
  );

  // Do not create a Firebase anonymous account
  // simply because the home screen was opened.
  if (!entries.length) return [];

  return Promise.all(
    entries.map(async ({ config, session }):
      Promise<RecoveryEntry> => {

      if (!user || user.uid !== session.uid) {
        return {
          config,
          session,
          room: null,
          state: 'unavailable',
          message:
            'Your original player session is unavailable.',
        };
      }

      try {
        const snapshot = await getDocFromServer(
          getRoomRef(config.room, session.code),
        );

        if (!snapshot.exists()) {
          return {
            config,
            session,
            room: null,
            state: 'unavailable',
            message: 'This room no longer exists.',
          };
        }

        const room =
          snapshot.data() as MultiplayerRoom;

        if (
          !Object.prototype.hasOwnProperty.call(
            room.players,
            user.uid,
          )
        ) {
          return {
            config,
            session,
            room: null,
            state: 'unavailable',
            message:
              'You are no longer in this room. You may have been removed due to inactivity.',
          };
        }

        return {
          config,
          session,
          room,
          state: 'available',
        };
      } catch {
        // Connection failures must not erase
        // the player's saved room.
        return {
          config,
          session,
          room: null,
          state: 'unverified',
          message:
            'Could not verify this room. Reconnect and try again.',
        };
      }
    }),
  );
}

