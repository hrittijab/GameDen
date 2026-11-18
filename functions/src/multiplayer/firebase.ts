import {
  getApps,
  initializeApp,
} from 'firebase-admin/app';

import {
  getFirestore,
} from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp();
}

export const db = getFirestore();

export const options = {
  region: 'us-central1',
};
