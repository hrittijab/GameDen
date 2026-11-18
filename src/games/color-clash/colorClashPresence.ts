import {
  sendHeartbeat,
  leaveRoom,
  kickPlayer,
  startHeartbeat,
  subscribeToPresence,
  useMultiplayerPresence,
} from '../../multiplayer/presence';

import type {
  PresenceConfig,
  PresenceMap,
} from '../../multiplayer/types';

export {
  HEARTBEAT_INTERVAL,
  OFFLINE_THRESHOLD,
  getConnectionStatus,
} from '../../multiplayer/presence';

export type {
  PlayerPresence,
  PresenceMap,
  ConnectionStatus,
} from '../../multiplayer/types';

const CONFIG: PresenceConfig = {
  collection: 'colorClashRooms',
  heartbeatFunction: 'heartbeatColorClash',
  leaveFunction: 'leaveColorClashRoom',
  kickFunction: 'kickColorClashPlayer',
};

export const sendColorClashHeartbeat = (
  code: string,
) =>
  sendHeartbeat(CONFIG, code);

export const leaveColorClashRoom = (
  code: string,
) =>
  leaveRoom(CONFIG, code);

export const kickColorClashPlayer = (
  code: string,
  targetUid: string,
) =>
  kickPlayer(CONFIG, code, targetUid);

export const startColorClashHeartbeat = (
  code: string,
) =>
  startHeartbeat(CONFIG, code);

export const subscribeToColorClashPresence = (
  code: string,
  onUpdate: (presence: PresenceMap) => void,
  onError?: (message: string) => void,
) =>
  subscribeToPresence(
    CONFIG,
    code,
    onUpdate,
    onError,
  );

export function useColorClashPresence(
  code: string,
  enabled: boolean,
) {
  return useMultiplayerPresence(
    CONFIG,
    code,
    enabled,
  );
}
