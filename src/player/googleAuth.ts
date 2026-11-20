import { Platform } from 'react-native';

import {
  GoogleAuthProvider,
  signInWithPopup,
  linkWithPopup,
  reauthenticateWithPopup,
  type User,
} from 'firebase/auth';

import { auth } from '../config/firebase';

function googleProvider() {
  const provider = new GoogleAuthProvider();

  provider.setCustomParameters({
    prompt: 'select_account',
  });

  return provider;
}

function requireWeb() {
  if (Platform.OS !== 'web') {
    throw new Error(
      'Google Sign-In is not configured for this device yet.',
    );
  }
}

export async function signInWithGoogle():
  Promise<User> {

  requireWeb();

  await auth.authStateReady();

  if (auth.currentUser) {
    throw new Error(
      'You already have an account. Use Link Google Account from your profile.',
    );
  }

  const result = await signInWithPopup(
    auth,
    googleProvider(),
  );

  return result.user;
}

export async function upgradeGuestWithGoogle():
  Promise<User> {

  requireWeb();

  await auth.authStateReady();

  const current = auth.currentUser;

  if (!current) {
    throw new Error(
      'Sign in as a guest first.',
    );
  }

  if (!current.isAnonymous) {
    throw new Error(
      'Your account is already registered.',
    );
  }

  const originalUid = current.uid;

  const result = await linkWithPopup(
    current,
    googleProvider(),
  );

  if (result.user.uid !== originalUid) {
    throw new Error(
      'Unexpected player identity change.',
    );
  }

  await result.user.getIdToken(true);

  return result.user;
}

export function googleAuthError(
  error: unknown,
): string {

  const code =
    (error as { code?: string })?.code;

  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was cancelled.';

    case 'auth/cancelled-popup-request':
      return 'Google sign-in was cancelled.';

    case 'auth/popup-blocked':
      return 'Allow popups in your browser and try again.';

    case 'auth/credential-already-in-use':
      return 'This Google account belongs to another GameDen player. Your guest account has not been changed.';

    case 'auth/account-exists-with-different-credential':
      return 'This email is already associated with another account.';

    case 'auth/unauthorized-domain':
      return 'This website is not authorized for Google Sign-In.';

    case 'auth/network-request-failed':
      return 'Connection failed. Please try again.';

    case 'auth/operation-not-allowed':
      return 'Google authentication is not enabled.';

    default:
      return error instanceof Error
        ? error.message
        : 'Google authentication failed.';
  }
}


export async function reauthenticateGoogleAccount(
  current: User,
): Promise<void> {
  requireWeb();

  const originalUid = current.uid;

  if (auth.currentUser?.uid !== originalUid) {
    throw new Error(
      'Your account identity has changed.',
    );
  }

  const result = await reauthenticateWithPopup(
    current,
    googleProvider(),
  );

  if (
    result.user.uid !== originalUid ||
    auth.currentUser?.uid !== originalUid
  ) {
    throw new Error(
      'Authenticate using your current Google account.',
    );
  }

  await result.user.getIdToken(true);
}
