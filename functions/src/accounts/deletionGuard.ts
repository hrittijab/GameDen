import {
  HttpsError,
} from 'firebase-functions/v2/https';

import { db } from '../multiplayer/firebase';

export function accountDeletionRef(uid: string) {
  return db
    .collection('accountDeletions')
    .doc(uid);
}

export async function requireActiveAccount(
  uid: string,
): Promise<void> {
  const snapshot = await accountDeletionRef(uid).get();

  if (snapshot.exists) {
    throw new HttpsError(
      'failed-precondition',
      'This account is pending deletion.',
    );
  }
}
