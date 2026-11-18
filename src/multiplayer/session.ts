import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  MultiplayerSession,
} from './types';

export type { MultiplayerSession } from './types';

function sessionKey(gameId: string): string {
  return `@gameden/${gameId}/session`;
}

export async function saveSession(
  gameId: string,
  code: string,
  uid: string,
  playerName: string,
): Promise<void> {
  const session: MultiplayerSession = {
    code: code.trim().toUpperCase(),
    uid,
    playerName,
    savedAt: Date.now(),
  };

  await AsyncStorage.setItem(
    sessionKey(gameId),
    JSON.stringify(session),
  );
}

export async function getSession(
  gameId: string,
): Promise<MultiplayerSession | null> {
  try {
    const stored =
      await AsyncStorage.getItem(
        sessionKey(gameId),
      );

    if (!stored) return null;

    const session = JSON.parse(stored);

    if (
      !session ||
      typeof session.code !== 'string' ||
      !/^[A-HJ-NP-Z2-9]{8}$/.test(session.code) ||
      typeof session.uid !== 'string' ||
      typeof session.playerName !== 'string' ||
      typeof session.savedAt !== 'number'
    ) {
      await clearSession(gameId);
      return null;
    }

    return session as MultiplayerSession;
  } catch {
    return null;
  }
}

export async function clearSession(
  gameId: string,
): Promise<void> {
  await AsyncStorage.removeItem(
    sessionKey(gameId),
  );
}
