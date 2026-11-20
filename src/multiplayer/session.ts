import AsyncStorage from '@react-native-async-storage/async-storage';

import { auth } from '../config/firebase';

import type {
  MultiplayerSession,
} from './types';

export type { MultiplayerSession } from './types';

function legacyKey(gameId: string): string {
  return `@gameden/${gameId}/session`;
}

function sessionKey(
  gameId: string,
  uid: string,
): string {
  return `@gameden/players/${uid}/${gameId}/session`;
}

function parseSession(
  stored: string | null,
): MultiplayerSession | null {
  if (!stored) return null;

  try {
    const session = JSON.parse(stored);

    if (
      !session ||
      typeof session.code !== 'string' ||
      !/^[A-HJ-NP-Z2-9]{8}$/.test(session.code) ||
      typeof session.uid !== 'string' ||
      typeof session.playerName !== 'string' ||
      typeof session.savedAt !== 'number'
    ) {
      return null;
    }

    return session as MultiplayerSession;
  } catch {
    return null;
  }
}

export async function saveSession(
  gameId: string,
  code: string,
  uid: string,
  playerName: string,
): Promise<void> {
  if (auth.currentUser?.uid !== uid) {
    throw new Error(
      'Player identity has changed.',
    );
  }

  const session: MultiplayerSession = {
    code: code.trim().toUpperCase(),
    uid,
    playerName,
    savedAt: Date.now(),
  };

  await AsyncStorage.setItem(
    sessionKey(gameId, uid),
    JSON.stringify(session),
  );
}

export async function getSession(
  gameId: string,
  uid = auth.currentUser?.uid,
  strict = false,
): Promise<MultiplayerSession | null> {
  if (!uid) return null;

  try {
    const key = sessionKey(gameId, uid);

    const stored =
      await AsyncStorage.getItem(key);

    const current =
      parseSession(stored);

    if (current?.uid === uid) {
      return current;
    }

    // Migrate old storage only when it
    // belongs to this authenticated player.

    const oldKey = legacyKey(gameId);

    const previous = parseSession(
      await AsyncStorage.getItem(oldKey),
    );

    if (previous?.uid !== uid) {
      return null;
    }

    await AsyncStorage.setItem(
      key,
      JSON.stringify(previous),
    );

    await AsyncStorage.removeItem(oldKey);

    return previous;
  } catch (error) {
    if (strict) throw error;

    return null;
  }
}

export async function clearSession(
  gameId: string,
  uid = auth.currentUser?.uid,
): Promise<void> {
  if (!uid) return;

  const key = sessionKey(gameId, uid);

  await AsyncStorage.removeItem(key);

  const oldKey = legacyKey(gameId);

  const previous = parseSession(
    await AsyncStorage.getItem(oldKey),
  );

  if (previous?.uid === uid) {
    await AsyncStorage.removeItem(oldKey);
  }
}
