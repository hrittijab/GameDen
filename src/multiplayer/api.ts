import { httpsCallable } from 'firebase/functions';

import { auth, functions } from '../config/firebase';

import { getMatchUser } from './auth';

import type { MultiplayerCallResult } from './types';

type CallOptions = {
  timeout?: number;
  lifecycle?: boolean;
};

export async function callServer<
  TResult extends MultiplayerCallResult = MultiplayerCallResult
>(
  name: string,
  data: Record<string, unknown>,
  options: CallOptions = {},
): Promise<TResult> {
  if (options.lifecycle) {
    await auth.authStateReady();

    if (!auth.currentUser) {
      throw new Error(
        'Your guest session has expired.',
      );
    }
  } else {
    await getMatchUser();
  }

  const callable = httpsCallable<
    Record<string, unknown>,
    TResult
  >(functions, name, {
    timeout: options.timeout ?? 15000,
  });

  const result = await callable(data);

  if (!result.data.success) {
    throw new Error(
      options.lifecycle
        ? 'Room action failed.'
        : 'Action failed.',
    );
  }

  return result.data;
}
