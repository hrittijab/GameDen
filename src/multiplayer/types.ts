export type RoomStatus =
  | 'lobby'
  | 'playing'
  | 'finished';

export type RoomVisibility =
  | 'private'
  | 'public';

export type RoomCreationOptions = {
  visibility: RoomVisibility;
  roomName: string;
  maxPlayers: number;
};

export type MultiplayerRoom = {
  visibility?: RoomVisibility;
  roomName?: string;
  maxPlayers?: number;
  hostId: string;
  status: RoomStatus;
  players: Record<string, string>;
  playerAvatars?: Record<string, string>;
};

export type RoomConfig = {
  collection: string;
  maxPlayers: number;
};

export type PresenceConfig = {
  collection: string;
  heartbeatFunction: string;
  leaveFunction: string;
  kickFunction: string;
};

export type PlayerPresence = {
  uid: string;
  lastSeen: number;
};

export type PresenceMap =
  Record<string, PlayerPresence>;

export type ConnectionStatus =
  | 'online'
  | 'offline'
  | 'connecting';

export type MultiplayerSession = {
  code: string;
  uid: string;
  playerName: string;
  savedAt: number;
};

export type MultiplayerCallResult = {
  success: boolean;
};


export function getRoomCapacity(
  room: MultiplayerRoom | null | undefined,
  config: RoomConfig,
): number {
  const capacity = room?.maxPlayers;

  if (
    typeof capacity === 'number' &&
    Number.isInteger(capacity) &&
    capacity >= 2 &&
    capacity <= config.maxPlayers
  ) {
    return capacity;
  }

  return config.maxPlayers;
}

