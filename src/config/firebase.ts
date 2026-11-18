
import { getApp, getApps, initializeApp } from 'firebase/app';

import {
  connectAuthEmulator,
  getAuth,
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

const useEmulators =
  __DEV__ &&
  typeof window !== 'undefined' &&
  window.location.hostname === 'localhost';

// Initialize Authentication first.
export const auth = getAuth(app);

// Connect immediately after obtaining Auth.
// Avoid reconfiguring the same Auth instance on Fast Refresh.
if (useEmulators && !auth.emulatorConfig) {
  connectAuthEmulator(
    auth,
    'http://127.0.0.1:9099',
    { disableWarnings: true }
  );
}

// Initialize Firestore.
export const db = getFirestore(app);

if (useEmulators) {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

// Initialize Cloud Functions.
export const functions = getFunctions(app, 'us-central1');

if (useEmulators) {
  connectFunctionsEmulator(
    functions,
    '127.0.0.1',
    5001
  );
}
