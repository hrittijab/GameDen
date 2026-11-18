import {
  doc,
  onSnapshot,
} from 'firebase/firestore';

import { db } from '../../config/firebase';

import {
  createRoom,
  joinRoom,
  subscribeToRoom,
  validateCode,
} from '../../multiplayer/rooms';

import {
  callServer,
} from '../../multiplayer/api';

import type {
  MultiplayerRoom,
  RoomConfig,
} from '../../multiplayer/types';

export {
  ensureGuest,
  getMatchUser,
} from '../../multiplayer/auth';

// ==========================================
// CONFIGURATION
// ==========================================

export const MAX_COLOR_CLASH_PLAYERS = 20;
export const ENGINE_VERSION = 5;
export const TURN_DURATION_MS = 20000;

const CONFIG: RoomConfig = {
  collection: 'colorClashRooms',
  maxPlayers: MAX_COLOR_CLASH_PLAYERS,
};

// ==========================================
// GAME-SPECIFIC TYPES
// ==========================================

export type ColorClashColor =
  | 'red'
  | 'blue'
  | 'green'
  | 'yellow';

export type ColorClashCard = {
  id: string;
  color: string;
  value: string;
};

export type UnoWindow = {
  id: string;
  deadline: number;
};

export type DepartedPlayer = {
  name: string;
  quit: boolean;
  cardsRemaining: number;
};

export type GameEvent = {
  id: string;

  kind:
    | 'start'
    | 'play'
    | 'draw'
    | 'pass'
    | 'uno'
    | 'penalty'
    | 'win';

  uid: string;
  card?: ColorClashCard;
  count?: number;
};

export type ColorClashRoom =
  MultiplayerRoom & {
    playerOrder?: string[];
    seatOrder?: string[];

    departedPlayers?: Record<
      string,
      DepartedPlayer
    >;

    currentPlayerId?: string | null;

    direction?: number;
    topCard?: ColorClashCard;

    activeColor?: string;

    cardCounts?: Record<string, number>;
    handRevisions?: Record<string, number>;

    revision?: number;
    engineVersion?: number;
    matchNumber?: number;

    winnerId?: string | null;

    phase?: 'normal' | 'drawn' | 'response';

    pending?: {
      kind: 'draw2' | 'wild4';
      amount: number;
    } | null;

    unoWindows?: Record<string, UnoWindow>;
    unoCalled?: Record<string, boolean>;

    turnDeadline?: number;

    lastAction?: string;
    lastPlayedBy?: string | null;

    lastEvent?: GameEvent;
  };

export type PrivateHand = {
  cards: ColorClashCard[];
  revision: number;
  drawnCardId: string | null;
  matchNumber: number;
};

// ==========================================
// SHARED ROOM OPERATIONS
// ==========================================

export const createColorClashRoom = (
  playerName: string,
) =>
  createRoom(CONFIG, playerName);

export const joinColorClashRoom = (
  codeInput: string,
  playerName: string,
) =>
  joinRoom(
    CONFIG,
    codeInput,
    playerName,
  );

export function subscribeToColorClashRoom(
  code: string,

  onUpdate: (
    room: ColorClashRoom | null,
  ) => void,

  onError: (message: string) => void,
) {
  return subscribeToRoom<ColorClashRoom>(
    CONFIG,
    code,
    onUpdate,
    onError,
  );
}

// ==========================================
// PRIVATE CARD HAND SUBSCRIPTION
// ==========================================

export function subscribeToMyColorClashHand(
  code: string,
  uid: string,

  onUpdate: (
    cards: ColorClashCard[],
    revision: number,
    drawnCardId: string | null,
    matchNumber: number,
  ) => void,

  onError: (message: string) => void,
) {
  return onSnapshot(
    doc(
      db,
      CONFIG.collection,
      validateCode(code),
      'hands',
      uid,
    ),

    snap => {
      if (!snap.exists()) {
        onUpdate([], -1, null, -1);
        return;
      }

      const data = snap.data();

      onUpdate(
        Array.isArray(data.cards)
          ? data.cards
          : [],

        data.revision ?? -1,

        data.drawnCardId ?? null,

        data.matchNumber ?? -1,
      );
    },

    error => onError(error.message),
  );
}

// ==========================================
// GAME ACTION RESPONSE
// ==========================================

type CallResult = {
  success: boolean;
  revision?: number;
  winner?: boolean;
  unoWindow?: UnoWindow | null;
};

function call(
  name: string,
  data: Record<string, unknown>,
): Promise<CallResult> {
  return callServer<CallResult>(
    name,
    data,
  );
}

// ==========================================
// START MATCH
// ==========================================

export const startColorClashGame = (
  code: string,
) =>
  call('startColorClashMatch', {
    code: validateCode(code),
  });

// ==========================================
// PLAY CARD
// ==========================================

export const playColorClashGameCard = (
  code: string,
  cardId: string,
  revision: number,
  selectedColor?: ColorClashColor,
) =>
  call('playColorClashCard', {
    code: validateCode(code),

    cardId,
    revision,

    ...(selectedColor
      ? { selectedColor }
      : {}),
  });

// ==========================================
// DRAW CARD
// ==========================================

export const drawColorClashGameCard = (
  code: string,
  revision: number,
) =>
  call('drawColorClashCard', {
    code: validateCode(code),
    revision,
  });

// ==========================================
// PASS AFTER DRAWING
// ==========================================

export const passColorClashGameTurn = (
  code: string,
  revision: number,
) =>
  call('passColorClashTurn', {
    code: validateCode(code),
    revision,
  });

// ==========================================
// AUTOMATIC ACTION
// ==========================================

export const autoColorClashGameTurn = (
  code: string,
  revision: number,
) =>
  call('autoColorClashTurn', {
    code: validateCode(code),
    revision,
  });

// ==========================================
// ANNOUNCE UNO
// ==========================================

export const callColorClashGameUno = (
  code: string,
  windowId: string,
) =>
  call('callColorClashUno', {
    code: validateCode(code),
    windowId,
  });

// ==========================================
// RESOLVE UNO PENALTY
// ==========================================

export const resolveColorClashGameUno = (
  code: string,
  targetUid: string,
  windowId: string,
) =>
  call('resolveColorClashUno', {
    code: validateCode(code),
    targetUid,
    windowId,
  });

// ==========================================
// REMATCH
// ==========================================

export const rematchColorClashGame = (
  code: string,
  revision: number,
) =>
  call('rematchColorClashMatch', {
    code: validateCode(code),
    revision,
  });
