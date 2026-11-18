import { randomUUID } from 'node:crypto';

import {
  HttpsError,
} from 'firebase-functions/v2/https';

import {
  ENGINE_VERSION,
  shuffle,
  TURN_DURATION_MS,
  type Card,
  type Room,
  type State,
} from './engine';

import {
  COLOR_CLASH_CONFIG,
} from './config';

import {
  createHeartbeatHandler,
} from '../multiplayer/presence';

import {
  createLifecycleHandlers,
  nextHost,
  type DepartureContext,
} from '../multiplayer/lifecycle';

// ==========================================
// COLOR CLASH MATCH DEPARTURE
// ==========================================

async function handleMatchDeparture(
  context: DepartureContext,
): Promise<{ success: boolean }> {
  const {
    tx,
    roomRef,
    secretRef,
    presenceRef,
    targetUid,
    name,
    remainingPlayers,
    remainingIds,
  } = context;

  const room =
    context.room as Room;

  if (room.engineVersion !== ENGINE_VERSION) {
    throw new HttpsError(
      'failed-precondition',
      'Unsupported match version.',
    );
  }

  const handRef = roomRef
    .collection('hands')
    .doc(targetUid);

  const [secretSnap, handSnap] =
    await Promise.all([
      tx.get(secretRef),
      tx.get(handRef),
    ]);

  // ========================================
  // EMPTY ROOM
  // ========================================

  if (!remainingIds.length) {
    tx.delete(handRef);
    tx.delete(presenceRef);
    tx.delete(secretRef);
    tx.delete(roomRef);

    return { success: true };
  }

  if (!secretSnap.exists) {
    throw new HttpsError(
      'internal',
      'Private game state missing.',
    );
  }

  const state =
    secretSnap.data() as State;

  const oldOrder = [
    ...room.playerOrder,
  ];

  const leavingIndex =
    oldOrder.indexOf(targetUid);

  if (leavingIndex < 0) {
    throw new HttpsError(
      'internal',
      'Player order is inconsistent.',
    );
  }

  const wasCurrentPlayer =
    room.currentPlayerId === targetUid;

  // ========================================
  // PRESERVE DEPARTED PLAYER
  // ========================================

  room.seatOrder =
    room.seatOrder ?? [...oldOrder];

  room.departedPlayers =
    room.departedPlayers ?? {};

  room.departedPlayers[targetUid] = {
    name,

    quit:
      room.status === 'playing',

    cardsRemaining:
      room.cardCounts[targetUid] ?? 0,
  };

  // ========================================
  // RECYCLE ABANDONED CARDS
  // ========================================

  const abandonedCards =
    (handSnap.data()?.cards ?? []) as Card[];

  state.deck = shuffle([
    ...state.deck,
    ...abandonedCards,
  ]);

  // ========================================
  // REMOVE PLAYER FROM ACTIVE MATCH
  // ========================================

  room.players = remainingPlayers;

  room.playerOrder =
    oldOrder.filter(
      id => id !== targetUid,
    );

  delete room.cardCounts[targetUid];

  delete room.handRevisions[targetUid];

  delete room.unoWindows[targetUid];

  delete room.unoCalled[targetUid];

  // ========================================
  // HOST MIGRATION
  // ========================================

  room.hostId = nextHost(
    room.hostId,
    targetUid,
    room.playerOrder,
  );

  // ========================================
  // ACTIVE MATCH
  // ========================================

  if (room.status === 'playing') {
    room.lastAction =
      `${name} quit the match.`;

    // Only one player remains.

    if (room.playerOrder.length === 1) {
      const winnerId =
        room.playerOrder[0];

      room.status = 'finished';

      room.winnerId = winnerId;
      room.currentPlayerId = null;

      room.turnDeadline = 0;

      room.pending = null;
      room.phase = 'normal';

      room.unoWindows = {};

      state.drawnCardId = null;

      room.lastAction =
        `${room.players[winnerId]} wins ` +
        'because the other players quit!';

      room.lastEvent = {
        id: randomUUID(),
        kind: 'win',
        uid: winnerId,
      };
    }

    // Transfer the departed player's turn.

    else if (wasCurrentPlayer) {
      const total =
        oldOrder.length;

      const nextIndex =
        (
          leavingIndex +
          room.direction +
          total
        ) % total;

      room.currentPlayerId =
        oldOrder[nextIndex];

      state.drawnCardId = null;

      // Keep accumulated +2/+4 penalties.

      room.phase = room.pending
        ? 'response'
        : 'normal';

      room.turnDeadline =
        Date.now() + TURN_DURATION_MS;
    }
  }

  // ========================================
  // FINISHED MATCH
  // ========================================

  else {
    room.lastAction =
      `${name} left the room.`;

    // Preserve winnerId and lastPlayedBy.
  }

  room.revision++;

  // ========================================
  // SAVE CHANGES
  // ========================================

  tx.set(roomRef, room);
  tx.set(secretRef, state);

  tx.delete(handRef);
  tx.delete(presenceRef);

  return { success: true };
}

// ==========================================
// REUSABLE MULTIPLAYER HANDLERS
// ==========================================

export const heartbeatColorClash =
  createHeartbeatHandler(
    COLOR_CLASH_CONFIG,
  );

const lifecycle =
  createLifecycleHandlers(
    COLOR_CLASH_CONFIG,
    handleMatchDeparture,
  );

export const leaveColorClashRoom =
  lifecycle.leave;

export const kickColorClashPlayer =
  lifecycle.kick;
