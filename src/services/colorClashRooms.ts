
import {
  signInAnonymously,
  signOut,
  type User,
} from 'firebase/auth';

import {
  doc,
  onSnapshot,
  runTransaction,
} from 'firebase/firestore';

import { httpsCallable } from 'firebase/functions';

import {
  auth,
  db,
  functions,
} from '../config/firebase';

// ==========================================
// CONFIGURATION
// ==========================================

export const MAX_COLOR_CLASH_PLAYERS = 20;
export const ENGINE_VERSION = 5;
export const TURN_DURATION_MS = 20000;

// ==========================================
// TYPES
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

export type ColorClashRoom = {
  hostId: string;

  status: 'lobby' | 'playing' | 'finished';

  players: Record<string, string>;

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
// AUTHENTICATION
// ==========================================

let guestPromise: Promise<User> | null = null;

export async function ensureGuest(): Promise<User> {
  if (guestPromise) {
    return guestPromise;
  }

  guestPromise = (async () => {
    await auth.authStateReady();

    const user = auth.currentUser;

    if (user) {
      try {
        await user.getIdToken(true);

        return user;
      } catch (error) {
        const code =
          (error as { code?: string }).code;

        const invalid = [
          'auth/invalid-refresh-token',
          'auth/user-token-expired',
          'auth/user-not-found',
          'auth/invalid-user-token',
          'auth/user-disabled',
        ].includes(code ?? '');

        if (!invalid) {
          throw error;
        }

        await signOut(auth);
      }
    }

    const result =
      await signInAnonymously(auth);

    await result.user.getIdToken();

    return result.user;
  })();

  try {
    return await guestPromise;
  } finally {
    guestPromise = null;
  }
}

export async function getMatchUser(): Promise<User> {
  await auth.authStateReady();

  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      'Guest session lost. Return to the room menu.',
    );
  }

  await user.getIdToken();

  return user;
}

// ==========================================
// VALIDATION
// ==========================================

function validateCode(value: string) {
  const code = value.trim().toUpperCase();

  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code)) {
    throw new Error(
      'Enter a valid 8-character room code.',
    );
  }

  return code;
}

function validateName(value: string) {
  const name = value.trim();

  if (!name || name.length > 24) {
    throw new Error(
      'Enter a name of 1–24 characters.',
    );
  }

  return name;
}

function roomRef(code: string) {
  return doc(
    db,
    'colorClashRooms',
    validateCode(code),
  );
}

// ==========================================
// ROOM CODE
// ==========================================

function generateCode() {
  const alphabet =
    'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  return Array.from(
    { length: 8 },

    () =>
      alphabet[
        Math.floor(
          Math.random() * alphabet.length,
        )
      ],
  ).join('');
}

// ==========================================
// CREATE ROOM
// ==========================================

export async function createColorClashRoom(
  playerName: string,
): Promise<string> {
  const name =
    validateName(playerName);

  const user =
    await ensureGuest();

  for (let i = 0; i < 5; i++) {
    const code = generateCode();

    const ref = roomRef(code);

    const created = await runTransaction(
      db,

      async tx => {
        if ((await tx.get(ref)).exists()) {
          return false;
        }

        tx.set(ref, {
          hostId: user.uid,
          status: 'lobby',

          players: {
            [user.uid]: name,
          },
        });

        return true;
      },
    );

    if (created) {
      return code;
    }
  }

  throw new Error(
    'Could not generate room code.',
  );
}

// ==========================================
// JOIN OR RECONNECT
// ==========================================

export async function joinColorClashRoom(
  codeInput: string,
  playerName: string,
): Promise<string> {
  const code =
    validateCode(codeInput);

  const name =
    validateName(playerName);

  const user =
    await ensureGuest();

  await runTransaction(db, async tx => {
    const ref = roomRef(code);

    const snap = await tx.get(ref);

    if (!snap.exists()) {
      throw new Error('Room not found.');
    }

    const room =
      snap.data() as ColorClashRoom;

    // Reconnect existing room members.

    if (
      Object.prototype.hasOwnProperty.call(
        room.players,
        user.uid,
      )
    ) {
      return;
    }

    // Departed players cannot rejoin
    // a match after it has started.

    if (room.status !== 'lobby') {
      throw new Error(
        'This match has already started.',
      );
    }

    if (
      Object.keys(room.players).length >=
      MAX_COLOR_CLASH_PLAYERS
    ) {
      throw new Error('Room is full.');
    }

    tx.update(ref, {
      players: {
        ...room.players,
        [user.uid]: name,
      },
    });
  });

  return code;
}

// ==========================================
// PUBLIC ROOM SUBSCRIPTION
// ==========================================

export function subscribeToColorClashRoom(
  code: string,

  onUpdate: (
    room: ColorClashRoom | null,
  ) => void,

  onError: (message: string) => void,
) {
  return onSnapshot(
    roomRef(code),

    snap =>
      onUpdate(
        snap.exists()
          ? (snap.data() as ColorClashRoom)
          : null,
      ),

    error =>
      onError(error.message),
  );
}

// ==========================================
// PRIVATE HAND SUBSCRIPTION
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
      'colorClashRooms',
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

    error =>
      onError(error.message),
  );
}

// ==========================================
// SERVER REQUEST
// ==========================================

type CallResult = {
  success: boolean;
  revision?: number;
  winner?: boolean;
  unoWindow?: UnoWindow | null;
};

async function call(
  name: string,
  data: Record<string, unknown>,
): Promise<CallResult> {
  await getMatchUser();

  const callable = httpsCallable<
    Record<string, unknown>,
    CallResult
  >(
    functions,
    name,
    {
      timeout: 15000,
    },
  );

  const result =
    await callable(data);

  if (!result.data.success) {
    throw new Error('Action failed.');
  }

  return result.data;
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
