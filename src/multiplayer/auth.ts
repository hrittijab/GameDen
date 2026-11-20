import type { User } from 'firebase/auth';

import { auth } from '../config/firebase';

export async function getMatchUser(): Promise<User> {
  await auth.authStateReady();

  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      'Sign in to GameDen before playing.',
    );
  }

  await user.getIdToken();

  return user;
}

// Retain the existing function name to avoid
// breaking current multiplayer imports.
// It no longer creates anonymous accounts.

export async function ensureGuest(): Promise<User> {
  return getMatchUser();
}
