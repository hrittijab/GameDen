import type {
  MultiplayerLobbyConfig,
} from '../../multiplayer/Lobby';

import {
  callServer,
} from '../../multiplayer/api';

import RoomSettings from './RoomSettings';

export const WORD_CLASH_CONFIG: MultiplayerLobbyConfig = {
  SettingsPanel: RoomSettings,
  gameId: 'word-clash',

  title: 'Word Clash',

  icon: '🔤',

  description:
    'Think fast, submit unique words and beat your friends.',

  minPlayers: 2,

  room: {
    collection: 'wordClashRooms',
    maxPlayers: 12,
  },

  presence: {
    collection: 'wordClashRooms',

    heartbeatFunction:
      'heartbeatWordClash',

    leaveFunction:
      'leaveWordClashRoom',

    kickFunction:
      'kickWordClashPlayer',
  },

  startMatch: code =>
    callServer(
      'startWordClashMatch',
      { code },
    ),
};

