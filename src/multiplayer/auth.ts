import {
  signInAnonymously,
  signOut,
  type User,
} from 'firebase/auth';

import { auth } from '../config/firebase';

let guestPromise: Promise<User> | null = null;

export async function ensureGuest(): Promise<User> {
  if (guestPromise) {
    return guestPromise;
  }

  guestPromise = (async () => {
    await auth.authStateReady();

    const user = auth.currentUser;

    if (user) {
      try {
        await user.getIdToken(true);
        return user;
      } catch (error) {
        const code =
          (error as { code?: string }).code;

        const invalid = [
          'auth/invalid-refresh-token',
          'auth/user-token-expired',
          'auth/user-not-found',
          'auth/invalid-user-token',
          'auth/user-disabled',
        ].includes(code ?? '');

        if (!invalid) {
          throw error;
        }

        await signOut(auth);
      }
    }

    const result = await signInAnonymously(auth);

    await result.user.getIdToken();

    return result.user;
  })();

  try {
    return await guestPromise;
  } finally {
    guestPromise = null;
  }
}

export async function getMatchUser(): Promise<User> {
  await auth.authStateReady();

  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      'Guest session lost. Return to the room menu.',
    );
  }

  await user.getIdToken();

  return user;
}
