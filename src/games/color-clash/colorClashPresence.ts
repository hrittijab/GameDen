
import { useEffect, useState } from 'react';

import {
    collection,
    onSnapshot,
} from 'firebase/firestore';

import { httpsCallable } from 'firebase/functions';

import { AppState } from 'react-native';

import {
    auth,
    db,
    functions,
} from '../../config/firebase';

// ==========================================
// CONFIGURATION
// ==========================================

export const HEARTBEAT_INTERVAL = 10000;
export const OFFLINE_THRESHOLD = 35000;

export type PlayerPresence = {
  uid: string;
  lastSeen: number;
};

export type PresenceMap = Record<
  string,
  PlayerPresence
>;

export type ConnectionStatus =
  | 'online'
  | 'offline'
  | 'connecting';

// ==========================================
// SERVER CALL
// ==========================================

async function callLifecycle(
  name: string,
  data: Record<string, unknown>,
): Promise<void> {
  await auth.authStateReady();

  if (!auth.currentUser) {
    throw new Error(
      'Your guest session has expired.',
    );
  }

  const callable = httpsCallable<
    Record<string, unknown>,
    { success: boolean }
  >(functions, name, {
    timeout: 10000,
  });

  const result = await callable(data);

  if (!result.data.success) {
    throw new Error(
      'Room action failed.',
    );
  }
}

// ==========================================
// HEARTBEAT
// ==========================================

export async function sendColorClashHeartbeat(
  code: string,
) {
  await callLifecycle(
    'heartbeatColorClash',
    { code },
  );
}

// ==========================================
// LEAVE ROOM
// ==========================================

export async function leaveColorClashRoom(
  code: string,
) {
  await callLifecycle(
    'leaveColorClashRoom',
    { code },
  );
}

// ==========================================
// KICK PLAYER
// ==========================================

export async function kickColorClashPlayer(
  code: string,
  targetUid: string,
) {
  await callLifecycle(
    'kickColorClashPlayer',
    {
      code,
      targetUid,
    },
  );
}

// ==========================================
// CONNECTION TRACKING
// ==========================================

export function startColorClashHeartbeat(
  code: string,
): () => void {
  let stopped = false;
  let running = false;

  const send = async () => {
    if (stopped || running) return;

    if (
      AppState.currentState === 'background'
    ) {
      return;
    }

    running = true;

    try {
      await sendColorClashHeartbeat(code);
    } catch {
      // Temporary connection failures
      // are retried on the next heartbeat.
    } finally {
      running = false;
    }
  };

  void send();

  const interval = setInterval(
    () => void send(),
    HEARTBEAT_INTERVAL,
  );

  const subscription =
    AppState.addEventListener(
      'change',

      state => {
        if (state === 'active') {
          void send();
        }
      },
    );

  return () => {
    stopped = true;

    clearInterval(interval);

    subscription.remove();
  };
}

// ==========================================
// SUBSCRIBE TO PLAYER PRESENCE
// ==========================================

export function subscribeToColorClashPresence(
  code: string,

  onUpdate: (
    presence: PresenceMap,
  ) => void,

  onError?: (
    message: string,
  ) => void,
): () => void {
  return onSnapshot(
    collection(
      db,
      'colorClashRooms',
      code,
      'presence',
    ),

    snapshot => {
      const presence: PresenceMap = {};

      snapshot.forEach(document => {
        const data = document.data();

        if (
          typeof data.lastSeen === 'number'
        ) {
          presence[document.id] = {
            uid: document.id,
            lastSeen: data.lastSeen,
          };
        }
      });

      onUpdate(presence);
    },

    error => {
      onError?.(error.message);
    },
  );
}

// ==========================================
// DETERMINE CONNECTION STATUS
// ==========================================

export function getConnectionStatus(
  presence: PlayerPresence | undefined,
  now = Date.now(),
): ConnectionStatus {
  if (!presence) {
    return 'connecting';
  }

  if (
    now - presence.lastSeen >
    OFFLINE_THRESHOLD
  ) {
    return 'offline';
  }

  return 'online';
}

// ==========================================
// REUSABLE REACT HOOK
// ==========================================

export function useColorClashPresence(
  code: string,
  enabled: boolean,
) {
  const [presence, setPresence] =
    useState<PresenceMap>({});

  const [now, setNow] =
    useState(Date.now());

  const [error, setError] =
    useState('');

  useEffect(() => {
    setPresence({});
    setError('');

    if (!code || !enabled) {
      return;
    }

    const stopHeartbeat =
      startColorClashHeartbeat(code);

    const unsubscribe =
      subscribeToColorClashPresence(
        code,
        setPresence,
        setError,
      );

    const interval = setInterval(
      () => {
        setNow(Date.now());
      },
      5000,
    );

    return () => {
      stopHeartbeat();
      unsubscribe();
      clearInterval(interval);
    };
  }, [code, enabled]);

  const statusOf = (
    uid: string,
  ): ConnectionStatus =>
    getConnectionStatus(
      presence[uid],
      now,
    );

  return {
    presence,
    statusOf,
    error,
  };
}

