
import { randomUUID } from 'node:crypto';

import { getFirestore } from 'firebase-admin/firestore';

import {
    HttpsError,
    onCall,
    type CallableRequest,
} from 'firebase-functions/v2/https';

import {
    ENGINE_VERSION,
    shuffle,
    TURN_DURATION_MS,
    type Card,
    type Room,
    type State,
} from './colorClashEngine';

const options = {
  region: 'us-central1',
};

type LobbyRoom = {
  hostId: string;
  status: 'lobby';
  players: Record<string, string>;
};

// ==========================================
// VALIDATE REQUEST
// ==========================================

function context(request: CallableRequest) {
  const uid = request.auth?.uid;
  const code = request.data?.code;

  if (!uid) {
    throw new HttpsError(
      'unauthenticated',
      'Please sign in.',
    );
  }

  if (
    typeof code !== 'string' ||
    !/^[A-HJ-NP-Z2-9]{8}$/.test(code)
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Invalid room code.',
    );
  }

  const db = getFirestore();

  const roomRef = db
    .collection('colorClashRooms')
    .doc(code);

  const secretRef = db
    .collection('colorClashSecrets')
    .doc(code);

  return {
    db,
    uid,
    roomRef,
    secretRef,
  };
}

// ==========================================
// HEARTBEAT
// ==========================================

export const heartbeatColorClash = onCall(
  options,

  async request => {
    const {
      db,
      uid,
      roomRef,
    } = context(request);

    return db.runTransaction(async tx => {
      const snap = await tx.get(roomRef);

      if (!snap.exists) {
        throw new HttpsError(
          'not-found',
          'Room not found.',
        );
      }

      const room = snap.data()!;

      if (
        !Object.prototype.hasOwnProperty.call(
          room.players,
          uid,
        )
      ) {
        throw new HttpsError(
          'permission-denied',
          'You are no longer in this room.',
        );
      }

      tx.set(
        roomRef
          .collection('presence')
          .doc(uid),

        {
          uid,
          lastSeen: Date.now(),
        },
      );

      return {
        success: true,
      };
    });
  },
);

// ==========================================
// REMOVE PLAYER
// ==========================================

async function removePlayer(
  request: CallableRequest,
  kick: boolean,
) {
  const {
    db,
    uid,
    roomRef,
    secretRef,
  } = context(request);

  const targetUid = kick
    ? request.data?.targetUid
    : uid;

  if (
    typeof targetUid !== 'string' ||
    !targetUid ||
    targetUid.includes('/')
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Invalid player.',
    );
  }

  return db.runTransaction(async tx => {
    const snap = await tx.get(roomRef);

    if (!snap.exists) {
      if (!kick) {
        return { success: true };
      }

      throw new HttpsError(
        'not-found',
        'Room not found.',
      );
    }

    const room =
      snap.data() as Room | LobbyRoom;

    // ======================================
    // KICK PERMISSIONS
    // ======================================

    if (kick) {
      if (room.hostId !== uid) {
        throw new HttpsError(
          'permission-denied',
          'Only the host can kick players.',
        );
      }

      if (room.status !== 'lobby') {
        throw new HttpsError(
          'failed-precondition',
          'Kicking is only allowed in the lobby.',
        );
      }

      if (targetUid === uid) {
        throw new HttpsError(
          'invalid-argument',
          'Use Leave Room instead.',
        );
      }
    }

    // Retried leave requests are harmless.

    if (
      !Object.prototype.hasOwnProperty.call(
        room.players,
        targetUid,
      )
    ) {
      return { success: true };
    }

    const name =
      room.players[targetUid];

    const remainingPlayers = {
      ...room.players,
    };

    delete remainingPlayers[targetUid];

    const remainingIds =
      Object.keys(remainingPlayers);

    const presenceRef = roomRef
      .collection('presence')
      .doc(targetUid);

    const handRef = roomRef
      .collection('hands')
      .doc(targetUid);

    // ======================================
    // LEAVING THE LOBBY
    // ======================================

    if (room.status === 'lobby') {
      if (!remainingIds.length) {
        tx.delete(roomRef);
      } else {
        tx.update(roomRef, {
          players: remainingPlayers,

          hostId:
            room.hostId === targetUid
              ? remainingIds[0]
              : room.hostId,
        });
      }

      tx.delete(presenceRef);

      return {
        success: true,
      };
    }

    // ======================================
    // ACTIVE OR FINISHED MATCH
    // ======================================

    if (room.engineVersion !== ENGINE_VERSION) {
      throw new HttpsError(
        'failed-precondition',
        'Unsupported match version.',
      );
    }

    const [secretSnap, handSnap] =
      await Promise.all([
        tx.get(secretRef),
        tx.get(handRef),
      ]);

    // ======================================
    // EMPTY ROOM
    // ======================================

    if (!remainingIds.length) {
      tx.delete(handRef);
      tx.delete(presenceRef);
      tx.delete(secretRef);
      tx.delete(roomRef);

      return {
        success: true,
      };
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

    // ======================================
    // PRESERVE DEPARTED PLAYER SEAT
    // ======================================

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

    // ======================================
    // RETURN ABANDONED CARDS
    // ======================================

    const abandonedCards =
      (handSnap.data()?.cards ?? []) as Card[];

    state.deck = shuffle([
      ...state.deck,
      ...abandonedCards,
    ]);

    // ======================================
    // REMOVE FROM ACTIVE GAME
    // ======================================

    room.players = remainingPlayers;

    room.playerOrder =
      oldOrder.filter(
        id => id !== targetUid,
      );

    delete room.cardCounts[targetUid];
    delete room.handRevisions[targetUid];

    delete room.unoWindows[targetUid];
    delete room.unoCalled[targetUid];

    // ======================================
    // HOST MIGRATION
    // ======================================

    if (room.hostId === targetUid) {
      room.hostId =
        room.playerOrder[0];
    }

    // ======================================
    // ACTIVE MATCH
    // ======================================

    if (room.status === 'playing') {
      room.lastAction =
        `${name} quit the match.`;

      // Automatically declare the
      // remaining player the winner.

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

      // If the departed player was playing,
      // transfer their turn to the next
      // active player in the correct direction.

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
        // They move to the next active player.

        room.phase = room.pending
          ? 'response'
          : 'normal';

        room.turnDeadline =
          Date.now() + TURN_DURATION_MS;
      }
    }

    // ======================================
    // FINISHED MATCH
    // ======================================

    else {
      room.lastAction =
        `${name} left the room.`;

      // Preserve winnerId and lastPlayedBy.
      // Their names remain in departedPlayers.
    }

    room.revision++;

    // ======================================
    // SAVE CHANGES
    // ======================================

    tx.set(roomRef, room);
    tx.set(secretRef, state);

    tx.delete(handRef);
    tx.delete(presenceRef);

    return {
      success: true,
    };
  });
}

// ==========================================
// LEAVE ROOM OR QUIT MATCH
// ==========================================

export const leaveColorClashRoom = onCall(
  options,

  request =>
    removePlayer(request, false),
);

// ==========================================
// KICK PLAYER
// ==========================================

export const kickColorClashPlayer = onCall(
  options,

  request =>
    removePlayer(request, true),
);
