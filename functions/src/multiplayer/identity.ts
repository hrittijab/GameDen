import { requireActiveAccount } from '../accounts/deletionGuard';
import {
  HttpsError,
} from 'firebase-functions/v2/https';

import { db } from './firebase';

const AVATARS = [
  '🐼', '🦊', '🐱', '🐸',
  '🐯', '🐨', '🐶', '🐰',
  '🦁', '🐵', '🐧', '🦉',
];

export type PlayerIdentity = {
  nickname: string;
  avatar: string;
};

export async function requirePlayerProfile(
  uid: string,
): Promise<PlayerIdentity> {
  await requireActiveAccount(uid);

  const snapshot = await db
    .collection('users')
    .doc(uid)
    .get();

  if (!snapshot.exists) {
    throw new HttpsError(
      'failed-precondition',
      'Complete your GameDen player profile first.',
    );
  }

  const data = snapshot.data()!;

  if (
    typeof data.nickname !== 'string' ||
    !data.nickname.trim() ||
    data.nickname.length > 24 ||
    data.nickname !== data.nickname.trim() ||
    typeof data.avatar !== 'string' ||
    !AVATARS.includes(data.avatar)
  ) {
    throw new HttpsError(
      'failed-precondition',
      'Your GameDen player profile is invalid.',
    );
  }

  return {
    nickname: data.nickname,
    avatar: data.avatar,
  };
}

