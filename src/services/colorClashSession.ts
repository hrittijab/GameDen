
import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = '@gameden/color-clash/session';

export type ColorClashSession = {
  code: string;
  uid: string;
  playerName: string;
  savedAt: number;
};

// Save an active room.

export async function saveColorClashSession(
  code: string,
  uid: string,
  playerName: string,
): Promise<void> {
  const session: ColorClashSession = {
    code: code.trim().toUpperCase(),
    uid,
    playerName,
    savedAt: Date.now(),
  };

  await AsyncStorage.setItem(
    SESSION_KEY,
    JSON.stringify(session),
  );
}

// Retrieve a previously saved room.

export async function getColorClashSession():
  Promise<ColorClashSession | null> {
  try {
    const stored = await AsyncStorage.getItem(
      SESSION_KEY,
    );

    if (!stored) return null;

    const session = JSON.parse(stored);

    if (
      typeof session.code !== 'string' ||
      !/^[A-HJ-NP-Z2-9]{8}$/.test(
        session.code,
      ) ||
      typeof session.uid !== 'string' ||
      typeof session.playerName !== 'string' ||
      typeof session.savedAt !== 'number'
    ) {
      await clearColorClashSession();

      return null;
    }

    return session as ColorClashSession;
  } catch {
    return null;
  }
}

// Remove session after deliberately leaving.

export async function clearColorClashSession():
  Promise<void> {
  await AsyncStorage.removeItem(
    SESSION_KEY,
  );
}
