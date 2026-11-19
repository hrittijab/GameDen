import type {
  MultiplayerLobbyConfig,
} from '../../multiplayer/Lobby';

import { callServer } from '../../multiplayer/api';

import RoomSettings from './RoomSettings';

export const DOODLE_CLASH_CONFIG: MultiplayerLobbyConfig = {
  gameId: 'doodle-clash',

  SettingsPanel: RoomSettings,

  title: 'Doodle Clash',

  icon: '🎨',

  description:
    'Draw, guess and compete with your friends.',

  minPlayers: 2,

  room: {
    collection: 'doodleClashRooms',
    maxPlayers: 12,
  },

  presence: {
    collection: 'doodleClashRooms',

    heartbeatFunction:
      'heartbeatDoodleClash',

    leaveFunction:
      'leaveDoodleClashRoom',

    kickFunction:
      'kickDoodleClashPlayer',
  },

  startMatch: code =>
    callServer('startDoodleClashMatch', {
      code,
    }),
};

