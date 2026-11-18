
import { randomInt, randomUUID } from 'node:crypto';

// ==========================================
// CONFIGURATION
// ==========================================

export const COLORS = [
  'red',
  'blue',
  'green',
  'yellow',
] as const;

export const MAX_PLAYERS = 20;
export const TURN_DURATION_MS = 20000;
export const UNO_WINDOW_MS = 5000;
export const ENGINE_VERSION = 5;

export type Color = typeof COLORS[number];

export type Card = {
  id: string;
  color: Color | 'wild';
  value: string;
};

export type Pending = {
  kind: 'draw2' | 'wild4' | 'skip' | 'reverse';
  amount: number;
};

export type UnoWindow = {
  id: string;
  deadline: number;
};

export type GameEvent = {
  id: string;
  kind: 'start' | 'play' | 'draw' | 'pass' | 'uno' | 'penalty' | 'win';
  uid: string;
  card?: Card;
  count?: number;
};

export type Room = {
  hostId: string;
  status: 'lobby' | 'playing' | 'finished';

  players: Record<string, string>;
  playerOrder: string[];

  currentPlayerId: string | null;
  direction: number;

  topCard: Card;
  activeColor: Color;

  cardCounts: Record<string, number>;
  handRevisions: Record<string, number>;

  revision: number;
  engineVersion: number;
  matchNumber: number;

  winnerId: string | null;

  pending: Pending | null;
  phase: 'normal' | 'drawn' | 'response';

  unoWindows: Record<string, UnoWindow>;
  unoCalled: Record<string, boolean>;

  turnDeadline: number;

  lastAction: string;
  lastPlayedBy: string | null;

  lastEvent: GameEvent;
};

export type State = {
  deck: Card[];
  discardPile: Card[];
  drawnCardId: string | null;
};

export type Hands = Record<string, Card[]>;

export type Action =
  | {
      kind: 'play';
      cardId: string;
      color?: unknown;
    }
  | {
      kind: 'draw' | 'pass' | 'auto';
    };

export class RuleError extends Error {}

function requireRule(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new RuleError(message);
  }
}

// ==========================================
// SHUFFLE
// ==========================================

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);

    [result[i], result[j]] = [
      result[j],
      result[i],
    ];
  }

  return result;
}

// ==========================================
// DECK GENERATION
// ==========================================

function createDeck(copies: number): Card[] {
  const cards: Card[] = [];

  const add = (
    color: Card['color'],
    value: string,
  ) => {
    cards.push({
      id: randomUUID(),
      color,
      value,
    });
  };

  for (let d = 0; d < copies; d++) {
    for (const color of COLORS) {
      add(color, '0');

      for (let copy = 0; copy < 2; copy++) {
        for (let n = 1; n <= 9; n++) {
          add(color, String(n));
        }

        add(color, 'skip');
        add(color, 'reverse');
        add(color, 'draw2');
      }
    }

    for (let i = 0; i < 4; i++) {
      add('wild', 'wild');
      add('wild', 'wild4');
    }
  }

  return shuffle(cards);
}

// ==========================================
// HUMAN-READABLE CARD LABELS
// ==========================================

function describeCard(card: Card): string {
  const labels: Record<string, string> = {
    skip: 'Skip',
    reverse: 'Reverse',
    draw2: '+2',
    wild: 'Wild',
    wild4: 'Wild +4',
  };

  const value = labels[card.value] ?? card.value;

  return card.color === 'wild'
    ? value
    : `${card.color.toUpperCase()} ${value}`;
}

// ==========================================
// RECORD GAME EVENT
// ==========================================

function event(
  room: Room,
  kind: GameEvent['kind'],
  uid: string,
  card?: Card,
  count?: number,
) {
  room.lastEvent = {
    id: randomUUID(),
    kind,
    uid,
    ...(card ? { card } : {}),
    ...(count !== undefined ? { count } : {}),
  };
}

// ==========================================
// START / REMATCH
// ==========================================

export function start(
  hostId: string,
  players: Record<string, string>,
  revision = 0,
  matchNumber = 1,
  now = Date.now(),
) {
  requireRule(
    Object.prototype.hasOwnProperty.call(
      players,
      hostId,
    ),
    'Host is missing.',
  );

  const ids = [
    hostId,
    ...Object.keys(players).filter(
      id => id !== hostId,
    ),
  ];

  requireRule(
    ids.length >= 2 &&
      ids.length <= MAX_PLAYERS,
    'A match needs 2–20 players.',
  );

  const deck = createDeck(
    Math.ceil(ids.length / 10),
  );

  const starterIndex = deck.findIndex(
    card => /^[0-9]$/.test(card.value),
  );

  requireRule(
    starterIndex >= 0,
    'Starting card was not found.',
  );

  const [topCard] = deck.splice(
    starterIndex,
    1,
  );

  const hands: Hands = {};

  for (const id of ids) {
    hands[id] = deck.splice(0, 7);
  }

  const room: Room = {
    hostId,
    players,

    status: 'playing',

    playerOrder: ids,

    currentPlayerId:
      ids[(matchNumber - 1) % ids.length],

    direction: 1,

    topCard,
    activeColor: topCard.color as Color,

    cardCounts: Object.fromEntries(
      ids.map(id => [id, 7]),
    ),

    handRevisions: Object.fromEntries(
      ids.map(id => [id, revision]),
    ),

    revision,
    engineVersion: ENGINE_VERSION,
    matchNumber,

    winnerId: null,

    pending: null,
    phase: 'normal',

    unoWindows: {},
    unoCalled: {},

    turnDeadline: now + TURN_DURATION_MS,

    lastAction: `Match ${matchNumber} started!`,
    lastPlayedBy: null,

    lastEvent: {
      id: randomUUID(),
      kind: 'start',
      uid: hostId,
    },
  };

  const state: State = {
    deck,
    discardPile: [topCard],
    drawnCardId: null,
  };

  return {
    room,
    state,
    hands,
  };
}

// ==========================================
// TURN ORDER
// ==========================================

function next(
  room: Room,
  uid: string,
): string {
  const index = room.playerOrder.indexOf(uid);
  const total = room.playerOrder.length;

  requireRule(
    index >= 0 && total >= 2,
    'Invalid player order.',
  );

  return room.playerOrder[
    (index + room.direction + total) % total
  ];
}

function advance(
  room: Room,
  state: State,
  uid: string,
  now: number,
) {
  room.currentPlayerId = next(room, uid);

  room.phase = 'normal';
  room.pending = null;

  state.drawnCardId = null;

  room.turnDeadline = now + TURN_DURATION_MS;
}

// ==========================================
// DRAW AND RECYCLE
// ==========================================

function take(
  state: State,
  amount: number,
): Card[] {
  const result: Card[] = [];

  while (result.length < amount) {
    if (state.deck.length === 0) {
      if (state.discardPile.length <= 1) {
        break;
      }

      const top = state.discardPile.pop()!;

      state.deck = shuffle(
        state.discardPile,
      );

      state.discardPile = [top];
    }

    result.push(state.deck.pop()!);
  }

  return result;
}

// ==========================================
// UNO MANAGEMENT
// ==========================================

function clearUno(
  room: Room,
  uid: string,
) {
  delete room.unoWindows[uid];
  delete room.unoCalled[uid];
}

function openUno(
  room: Room,
  uid: string,
  now: number,
) {
  room.unoCalled[uid] = false;

  room.unoWindows[uid] = {
    id: randomUUID(),
    deadline: now + UNO_WINDOW_MS,
  };
}

// Announcements deliberately do not increment
// the gameplay revision. Another player's move
// must not invalidate the UNO button.

export function announceUno(
  room: Room,
  uid: string,
  windowId: string,
  now: number,
) {
  requireRule(
    room.status === 'playing',
    'Match is not active.',
  );

  requireRule(
    room.playerOrder.includes(uid),
    'You are not a player.',
  );

  const window = room.unoWindows[uid];

  // Retried successful requests are harmless.

  if (
    !window &&
    room.unoCalled[uid] &&
    room.cardCounts[uid] === 1
  ) {
    return;
  }

  requireRule(
    window && window.id === windowId,
    'UNO window is no longer active.',
  );

  requireRule(
    now < window.deadline,
    'UNO announcement expired.',
  );

  requireRule(
    room.cardCounts[uid] === 1,
    'You must have one card.',
  );

  delete room.unoWindows[uid];

  room.unoCalled[uid] = true;

  room.lastAction =
    `${room.players[uid]} called UNO!`;

  event(room, 'uno', uid);
}

// ==========================================
// MISSED UNO PENALTY
// ==========================================

export function resolveUno(
  room: Room,
  state: State,
  hands: Hands,
  targetUid: string,
  windowId: string,
  now: number,
) {
  if (room.status !== 'playing') {
    return;
  }

  const window = room.unoWindows[targetUid];

  // Duplicate penalty requests are harmless.

  if (!window || window.id !== windowId) {
    return;
  }

  requireRule(
    now >= window.deadline,
    'UNO deadline has not expired.',
  );

  const hand = hands[targetUid];

  requireRule(
    Array.isArray(hand),
    'Player hand missing.',
  );

  delete room.unoWindows[targetUid];

  room.unoCalled[targetUid] = false;

  const cards = take(state, 2);

  hand.push(...cards);

  room.cardCounts[targetUid] = hand.length;

  room.lastAction =
    `${room.players[targetUid]} missed UNO ` +
    `and drew ${cards.length} cards.`;

  event(
    room,
    'penalty',
    targetUid,
    undefined,
    cards.length,
  );

  if (cards.length > 0) {
    room.revision++;
  } else if (hand.length === 1) {
    // Avoid permanently blocking a player
    // if no penalty cards remain available.
    room.unoCalled[targetUid] = true;
  }
}

// ==========================================
// VALID CARD CHECK
// ==========================================

export function legal(
  card: Card,
  hand: Card[],
  room: Room,
  state: State,
): boolean {
  if (
    room.phase === 'drawn' &&
    card.id !== state.drawnCardId
  ) {
    return false;
  }

  if (room.pending) {
    return card.value === room.pending.kind;
  }

  if (card.value === 'wild4') {
    return !hand.some(
      item => item.color === room.activeColor,
    );
  }

  if (card.value === 'wild') {
    return true;
  }

  return (
    card.color === room.activeColor ||
    card.value === room.topCard.value
  );
}

// ==========================================
// UPDATE COUNTS
// ==========================================

function sync(
  room: Room,
  hands: Hands,
) {
  for (const [uid, hand] of Object.entries(hands)) {
    room.cardCounts[uid] = hand.length;
  }

  room.revision++;
}

// ==========================================
// MAIN GAME ACTION
// ==========================================

export function apply(
  room: Room,
  state: State,
  hands: Hands,
  uid: string,
  action: Action,
  now: number,
) {
  requireRule(
    room.status === 'playing',
    'Match is not active.',
  );

  requireRule(
    room.playerOrder.includes(uid),
    'You are not a player.',
  );

  requireRule(
    room.currentPlayerId === uid,
    'It is not your turn.',
  );

  const hand = hands[uid];

  requireRule(
    Array.isArray(hand),
    'Player hand missing.',
  );

  const name = room.players[uid];

  // A player cannot discard or draw
  // their way out of an unresolved UNO window.
  // Other players remain free to play.

  requireRule(
    !room.unoWindows[uid],
    'Call UNO or wait for your UNO penalty.',
  );

  // ========================================
  // AUTOMATIC TIMEOUT / FORCED RESPONSE
  // ========================================

  if (action.kind === 'auto') {
    const timedOut =
      now >= room.turnDeadline;

    const forced =
      !!room.pending &&
      !hand.some(card =>
        legal(card, hand, room, state),
      );

    requireRule(
      timedOut || forced,
      'Automatic action is not available.',
    );

    if (
      room.phase === 'drawn' ||
      room.pending?.kind === 'skip' ||
      room.pending?.kind === 'reverse'
    ) {
      action = { kind: 'pass' };
    } else {
      action = { kind: 'draw' };
    }
  } else {
    requireRule(
      now < room.turnDeadline,
      'Your turn has expired.',
    );
  }

  // ========================================
  // PLAY A CARD
  // ========================================

  if (action.kind === 'play') {
    const card = hand.find(
      item => item.id === action.cardId,
    );

    requireRule(
      card && legal(card, hand, room, state),
      'This card cannot be played.',
    );

    let activeColor: Color;

    if (card.color === 'wild') {
      requireRule(
        typeof action.color === 'string' &&
          COLORS.includes(action.color as Color),
        'Choose a valid color.',
      );

      activeColor = action.color as Color;
    } else {
      activeColor = card.color;
    }

    const oldPending = room.pending;

    const newHand = hand.filter(
      item => item.id !== card.id,
    );

    hands[uid] = newHand;

    state.discardPile.push(card);
    state.drawnCardId = null;

    room.topCard = card;
    room.activeColor = activeColor;

    room.lastPlayedBy = uid;

    room.pending = null;
    room.phase = 'normal';

    room.lastAction =
      `${name} played ${describeCard(card)}.`;

    event(room, 'play', uid, card);

    clearUno(room, uid);

    // ======================================
    // WIN
    // ======================================

    if (newHand.length === 0) {
      room.status = 'finished';
      room.winnerId = uid;
      room.currentPlayerId = null;
      room.turnDeadline = 0;
      room.unoWindows = {};

      room.lastAction = `${name} won the match!`;

      event(room, 'win', uid, card);

      sync(room, hands);
      return;
    }

    // ======================================
    // DRAW STACKING
    // ======================================

    if (
      card.value === 'draw2' ||
      card.value === 'wild4'
    ) {
      room.pending = {
        kind: card.value,

        amount:
          (oldPending?.amount ?? 0) +
          (card.value === 'draw2' ? 2 : 4),
      };
    }

    // ======================================
    // SKIP COUNTER
    // ======================================

    else if (card.value === 'skip') {
      room.pending = {
        kind: 'skip',
        amount: 0,
      };
    }

    // ======================================
    // REVERSE
    // ======================================

    else if (card.value === 'reverse') {
      room.direction *= -1;

      if (room.playerOrder.length === 2) {
        room.pending = {
          kind: 'reverse',
          amount: 0,
        };
      }
    }

    room.currentPlayerId = next(room, uid);

    room.phase = room.pending
      ? 'response'
      : 'normal';

    room.turnDeadline =
      now + TURN_DURATION_MS;

    // UNO is available only after playing
    // the second-last card.

    if (newHand.length === 1) {
      openUno(room, uid, now);
    }
  }

  // ========================================
  // DRAW CARD
  // ========================================

  else if (action.kind === 'draw') {
    requireRule(
      room.phase !== 'drawn',
      'You already drew a card.',
    );

    if (room.pending) {
      requireRule(
        room.pending.kind === 'draw2' ||
          room.pending.kind === 'wild4',
        'Accept the skip instead.',
      );

      const cards = take(
        state,
        room.pending.amount,
      );

      hand.push(...cards);

      if (hand.length > 1) {
        clearUno(room, uid);
      }

      room.lastAction =
        `${name} drew ${cards.length} penalty cards.`;

      event(
        room,
        'draw',
        uid,
        undefined,
        cards.length,
      );

      advance(room, state, uid, now);
    } else {
      const cards = take(state, 1);

      hand.push(...cards);

      if (hand.length > 1) {
        clearUno(room, uid);
      }

      event(
        room,
        'draw',
        uid,
        undefined,
        cards.length,
      );

      if (
        cards.length > 0 &&
        now < room.turnDeadline &&
        legal(cards[0], hand, room, state)
      ) {
        state.drawnCardId = cards[0].id;

        room.phase = 'drawn';

        // Give a short opportunity to decide
        // whether to play the newly drawn card.

        room.turnDeadline = Math.max(
          room.turnDeadline,
          now + 5000,
        );

        room.lastAction =
          `${name} drew a playable card.`;
      } else {
        room.lastAction = cards.length
          ? `${name} drew a card and passed.`
          : `${name} passed.`;

        advance(room, state, uid, now);
      }
    }
  }

  // ========================================
  // PASS TURN
  // ========================================

  else if (action.kind === 'pass') {
    requireRule(
      room.phase === 'drawn' ||
        room.pending?.kind === 'skip' ||
        room.pending?.kind === 'reverse',
      'You cannot pass now.',
    );

    room.lastAction =
      room.phase === 'drawn'
        ? `${name} kept the drawn card.`
        : `${name} was skipped.`;

    event(room, 'pass', uid);

    advance(room, state, uid, now);
  }

  sync(room, hands);
}
