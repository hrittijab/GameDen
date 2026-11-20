import { useEffect, useState } from 'react';

import {
  collection,
  onSnapshot,
} from 'firebase/firestore';

import { AppState } from 'react-native';

import { db } from '../config/firebase';

import { callServer } from './api';

import type {
  PresenceConfig,
  PlayerPresence,
  PresenceMap,
  ConnectionStatus,
} from './types';

export type {
  PlayerPresence,
  PresenceMap,
  ConnectionStatus,
} from './types';

export const HEARTBEAT_INTERVAL = 10000;
export const OFFLINE_THRESHOLD = 35000;

export async function sendHeartbeat(
  config: PresenceConfig,
  code: string,
): Promise<void> {
  await callServer(
    config.heartbeatFunction,
    { code },
    {
      timeout: 10000,
      lifecycle: true,
    },
  );
}

export async function leaveRoom(
  config: PresenceConfig,
  code: string,
): Promise<void> {
  await callServer(
    config.leaveFunction,
    { code },
    {
      timeout: 10000,
      lifecycle: true,
    },
  );
}

export async function kickPlayer(
  config: PresenceConfig,
  code: string,
  targetUid: string,
): Promise<void> {
  await callServer(
    config.kickFunction,
    { code, targetUid },
    {
      timeout: 10000,
      lifecycle: true,
    },
  );
}

export function startHeartbeat(
  config: PresenceConfig,
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
      await sendHeartbeat(config, code);
    } catch {
      // Retry on the next heartbeat.
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

  const reconnect = () => {
    void send();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener?.(
      'online',
      reconnect,
    );
  }

  return () => {
    stopped = true;
    clearInterval(interval);
    subscription.remove();

    if (typeof window !== 'undefined') {
      window.removeEventListener?.(
        'online',
        reconnect,
      );
    }
  };
}

export function subscribeToPresence(
  config: PresenceConfig,
  code: string,
  onUpdate: (presence: PresenceMap) => void,
  onError?: (message: string) => void,
): () => void {
  return onSnapshot(
    collection(
      db,
      config.collection,
      code,
      'presence',
    ),

    snapshot => {
      const presence: PresenceMap = {};

      snapshot.forEach(document => {
        const data = document.data();

        if (typeof data.lastSeen === 'number') {
          presence[document.id] = {
            uid: document.id,
            lastSeen: data.lastSeen,
          };
        }
      });

      onUpdate(presence);
    },

    error => onError?.(error.message),
  );
}

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

export function useMultiplayerPresence(
  config: PresenceConfig,
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
    setNow(Date.now());

    if (!code || !enabled) {
      return;
    }

    const stopHeartbeat =
      startHeartbeat(config, code);

    const unsubscribe =
      subscribeToPresence(
        config,
        code,
        setPresence,
        setError,
      );

    const interval = setInterval(
      () => setNow(Date.now()),
      5000,
    );

    return () => {
      stopHeartbeat();
      unsubscribe();
      clearInterval(interval);
    };
  }, [config, code, enabled]);

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

