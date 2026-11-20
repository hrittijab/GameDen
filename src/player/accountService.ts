import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import {
  reauthenticateGoogleAccount,
  googleAuthError,
} from './googleAuth';

import { signOut } from 'firebase/auth';

import { auth } from '../config/firebase';

import {
  RECOVERY_GAMES,
} from '../multiplayer/recovery';

import {
  getSession,
  clearSession,
} from '../multiplayer/session';

import {
  leaveRoom,
} from '../multiplayer/presence';

export async function signOutPlayer():
  Promise<void> {

  await auth.authStateReady();

  const user = auth.currentUser;

  if (!user) return;

  const uid = user.uid;

  const assertIdentity = () => {
    if (auth.currentUser?.uid !== uid) {
      throw new Error(
        'Your player identity has changed.',
      );
    }
  };

  // Load sessions before performing
  // any room departure operations.

  const sessions = await Promise.all(
    RECOVERY_GAMES.map(async config => ({
      config,
      session: await getSession(
        config.gameId,
        uid,
        true,
      ),
    })),
  );

  for (const { config, session } of sessions) {
    assertIdentity();

    if (!session || session.uid !== uid) {
      continue;
    }

    try {
      // Existing backend leave handlers
      // are safe to retry when membership
      // or the room no longer exists.

      await leaveRoom(
        config.presence,
        session.code,
      );

      assertIdentity();

      await clearSession(
        config.gameId,
        uid,
      );
    } catch {
      throw new Error(
        `Could not leave your ${config.title} room. Reconnect and retry signing out.`,
      );
    }
  }

  assertIdentity();

  // Only sign out after room cleanup.
  await signOut(auth);
}


export async function deletePlayerAccount():
  Promise<void> {

  await auth.authStateReady();

  const current = auth.currentUser;

  if (!current) {
    throw new Error(
      'Sign in before deleting your account.',
    );
  }

  const uid = current.uid;

  if (!current.isAnonymous) {
    try {
      await reauthenticateGoogleAccount(current);
    } catch (error) {
      throw new Error(googleAuthError(error));
    }
  } else {
    await current.getIdToken(true);
  }

  if (auth.currentUser?.uid !== uid) {
    throw new Error(
      'Your player identity has changed.',
    );
  }

  const callable = httpsCallable<
    { confirmation: string },
    { success: boolean }
  >(
    functions,
    'deleteGameDenAccount',
    {
      timeout: 310000,
    },
  );

  const result = await callable({
    confirmation: 'DELETE',
  });

  if (!result.data.success) {
    throw new Error(
      'Account deletion could not be confirmed.',
    );
  }

  // Local cleanup is scoped to the
  // deleted player's UID.

  try {
    await Promise.all(
      RECOVERY_GAMES.map(config =>
        clearSession(config.gameId, uid),
      ),
    );
  } finally {
    if (auth.currentUser?.uid === uid) {
      await signOut(auth);
    }
  }
}
