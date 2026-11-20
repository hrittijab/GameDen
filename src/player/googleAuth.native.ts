import { Platform } from 'react-native';

import {
  GoogleSignin,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import {
  GoogleAuthProvider,
  signInWithCredential,
  linkWithCredential,
  reauthenticateWithCredential,
  type User,
} from 'firebase/auth';

import { auth } from '../config/firebase';

import {
  GOOGLE_WEB_CLIENT_ID,
} from '../config/google';

let configured = false;

function configureGoogle() {
  if (Platform.OS !== 'android') {
    throw new Error(
      'Native Google Sign-In is not configured for this platform yet.',
    );
  }

  if (configured) return;

  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    offlineAccess: false,
  });

  configured = true;
}

async function getGoogleCredential() {
  configureGoogle();

  await GoogleSignin.hasPlayServices({
    showPlayServicesUpdateDialog: true,
  });

  // Allow the player to select a Google
  // account instead of reusing a previous one.

  if (GoogleSignin.hasPreviousSignIn()) {
    await GoogleSignin.signOut();
  }

  const response = await GoogleSignin.signIn();

  if (!isSuccessResponse(response)) {
    throw new Error(
      'Google sign-in was cancelled.',
    );
  }

  const idToken = response.data.idToken;

  if (!idToken) {
    throw new Error(
      'Google did not return an identity token.',
    );
  }

  return GoogleAuthProvider.credential(
    idToken,
  );
}

// ==========================================
// GOOGLE SIGN-IN
// ==========================================

export async function signInWithGoogle():
  Promise<User> {

  await auth.authStateReady();

  if (auth.currentUser) {
    throw new Error(
      'You already have a GameDen account.',
    );
  }

  const credential =
    await getGoogleCredential();

  if (auth.currentUser) {
    throw new Error(
      'Another account has already signed in.',
    );
  }

  const result = await signInWithCredential(
    auth,
    credential,
  );

  return result.user;
}

// ==========================================
// GUEST ACCOUNT UPGRADE
// ==========================================

export async function upgradeGuestWithGoogle():
  Promise<User> {

  await auth.authStateReady();

  const current = auth.currentUser;

  if (!current || !current.isAnonymous) {
    throw new Error(
      'An active guest account is required.',
    );
  }

  const uid = current.uid;

  const credential =
    await getGoogleCredential();

  if (auth.currentUser?.uid !== uid) {
    throw new Error(
      'Your player identity has changed.',
    );
  }

  const result = await linkWithCredential(
    current,
    credential,
  );

  if (result.user.uid !== uid) {
    throw new Error(
      'Unexpected player identity change.',
    );
  }

  await result.user.getIdToken(true);

  return result.user;
}

// ==========================================
// REAUTHENTICATION
// ==========================================

export async function reauthenticateGoogleAccount(
  current: User,
): Promise<void> {

  const uid = current.uid;

  if (auth.currentUser?.uid !== uid) {
    throw new Error(
      'Your account identity has changed.',
    );
  }

  const credential =
    await getGoogleCredential();

  if (auth.currentUser?.uid !== uid) {
    throw new Error(
      'Your account identity has changed.',
    );
  }

  const result =
    await reauthenticateWithCredential(
      current,
      credential,
    );

  if (
    result.user.uid !== uid ||
    auth.currentUser?.uid !== uid
  ) {
    throw new Error(
      'Authenticate using your current Google account.',
    );
  }

  await result.user.getIdToken(true);
}

// ==========================================
// ERROR HANDLING
// ==========================================

export function googleAuthError(
  error: unknown,
): string {

  const code =
    (error as { code?: string })?.code;

  switch (code) {
    case statusCodes.SIGN_IN_CANCELLED:
      return 'Google sign-in was cancelled.';

    case statusCodes.IN_PROGRESS:
      return 'Google sign-in is already in progress.';

    case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
      return 'Google Play Services must be installed or updated.';

    case '10':
    case 'DEVELOPER_ERROR':
      return 'Google authentication configuration is incorrect. Check the Android package name, SHA-1 and OAuth client ID.';

    case 'auth/credential-already-in-use':
      return 'This Google account belongs to another GameDen player. Your guest account has not been changed.';

    case 'auth/user-mismatch':
      return 'Select the Google account connected to your current GameDen profile.';

    case 'auth/account-exists-with-different-credential':
      return 'This email is already associated with another account.';

    case 'auth/network-request-failed':
      return 'Connection failed. Please try again.';

    default:
      return error instanceof Error
        ? error.message
        : 'Google authentication failed.';
  }
}
