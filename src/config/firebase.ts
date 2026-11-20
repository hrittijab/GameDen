import * as FirebaseAuth from 'firebase/auth';

import { Platform } from 'react-native';

import AsyncStorage from
  '@react-native-async-storage/async-storage';

import {
  getApp,
  getApps,
  initializeApp,
} from 'firebase/app';

import {
  connectAuthEmulator,
  getAuth,
  initializeAuth,
  type Auth,
  type Persistence,
} from 'firebase/auth';

import {
  connectFirestoreEmulator,
  getFirestore,
} from 'firebase/firestore';

import {
  connectFunctionsEmulator,
  getFunctions,
} from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: 'gameden-online.firebaseapp.com',
  projectId: 'gameden-online',
  storageBucket: 'gameden-online.firebasestorage.app',
  messagingSenderId: '857656133263',
  appId: '1:857656133263:web:c4e979cb0ed0ee8e1d52fa',
  measurementId: 'G-8TZMQFS47M',
};

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

// ==========================================
// ENVIRONMENT CONFIGURATION
// ==========================================

const isWeb = Platform.OS === 'web';

const localhostWeb =
  isWeb &&
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(
    window.location.hostname,
  );

const configuredHost =
  process.env.EXPO_PUBLIC_EMULATOR_HOST?.trim();

const useEmulators =
  __DEV__ &&
  (
    localhostWeb ||
    process.env.EXPO_PUBLIC_USE_EMULATORS === 'true'
  );

const emulatorHost =
  configuredHost ||
  (Platform.OS === 'android'
    ? '10.0.2.2'
    : '127.0.0.1');

// Do not silently connect native development
// builds to production Firebase.

if (
  __DEV__ &&
  !isWeb &&
  !useEmulators
) {
  throw new Error(
    'Configure EXPO_PUBLIC_USE_EMULATORS before native development.',
  );
}

// ==========================================
// AUTHENTICATION
// ==========================================

function getNativePersistence(): Persistence {
  const nativeAuth = FirebaseAuth as typeof FirebaseAuth & {
    getReactNativePersistence?: (
      storage: typeof AsyncStorage,
    ) => Persistence;
  };

  if (
    typeof nativeAuth.getReactNativePersistence
    !== 'function'
  ) {
    throw new Error(
      'Firebase native authentication persistence is unavailable.',
    );
  }

  return nativeAuth.getReactNativePersistence(
    AsyncStorage,
  );
}

function createAuth(): Auth {
  if (isWeb) {
    return getAuth(app);
  }

  try {
    return initializeAuth(app, {
      persistence:
        getNativePersistence(),
    });
  } catch (error) {
    const code =
      (error as { code?: string })?.code;

    // Fast Refresh may reuse an existing
    // Firebase Authentication instance.

    if (code === 'auth/already-initialized') {
      return getAuth(app);
    }

    throw error;
  }
}

export const auth = createAuth();

if (useEmulators && !auth.emulatorConfig) {
  connectAuthEmulator(
    auth,
    `http://${emulatorHost}:9099`,
    {
      disableWarnings: true,
    },
  );
}

// ==========================================
// FIRESTORE
// ==========================================

export const db = getFirestore(app);

if (useEmulators) {
  connectFirestoreEmulator(
    db,
    emulatorHost,
    8080,
  );
}

// ==========================================
// CLOUD FUNCTIONS
// ==========================================

export const functions =
  getFunctions(app, 'us-central1');

if (useEmulators) {
  connectFunctionsEmulator(
    functions,
    emulatorHost,
    5001,
  );
}

// ==========================================
// DEVELOPMENT DIAGNOSTICS
// ==========================================

if (__DEV__) {
  console.log(
    '[GameDen] Platform:',
    Platform.OS,
  );

  console.log(
    '[GameDen] Firebase environment:',
    useEmulators
      ? 'EMULATOR'
      : 'PRODUCTION',
  );

  if (useEmulators) {
    console.log(
      '[GameDen] Emulator host:',
      emulatorHost,
    );
  }
}

