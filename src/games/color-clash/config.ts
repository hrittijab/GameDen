import type {
  MultiplayerLobbyConfig,
} from '../../multiplayer/Lobby';

import {
  MAX_COLOR_CLASH_PLAYERS,
  startColorClashGame,
} from './colorClashRooms';

export const COLOR_CLASH_CONFIG: MultiplayerLobbyConfig = {
  gameId: 'color-clash',

  title: 'Color Clash',

  icon: '🎴',

  description:
    'A colorful card battle with friends.',

  minPlayers: 2,

  room: {
    collection: 'colorClashRooms',
    maxPlayers: MAX_COLOR_CLASH_PLAYERS,
  },

  presence: {
    collection: 'colorClashRooms',

    heartbeatFunction:
      'heartbeatColorClash',

    leaveFunction:
      'leaveColorClashRoom',

    kickFunction:
      'kickColorClashPlayer',
  },

  startMatch: startColorClashGame,
};
