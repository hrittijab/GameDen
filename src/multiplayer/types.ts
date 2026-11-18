export type RoomStatus =
  | 'lobby'
  | 'playing'
  | 'finished';

export type MultiplayerRoom = {
  hostId: string;
  status: RoomStatus;
  players: Record<string, string>;
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
