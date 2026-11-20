import {
  HttpsError,
  onCall,
  type CallableRequest,
} from 'firebase-functions/v2/https';

import {
  announceUno,
  apply,
  ENGINE_VERSION,
  resolveUno,
  RuleError,
  start,
  type Action,
  type Card,
  type Hands,
  type Room,
  type State,
} from './engine';

import {
  db,
  options,
} from '../multiplayer/firebase';

import {
  roomContext,
} from '../multiplayer/rooms';

import {
  COLOR_CLASH_CONFIG,
} from './config';

function context(request: CallableRequest) {
  return roomContext(
    request,
    COLOR_CLASH_CONFIG,
  );
}

function translate(error: unknown): never {
  if (error instanceof RuleError) {
    throw new HttpsError(
      'failed-precondition',
      error.message,
    );
  }

  throw error;
}

function validateMember(
  room: Room,
  uid: string,
) {
  if (room.engineVersion !== ENGINE_VERSION) {
    throw new HttpsError(
      'failed-precondition',
      'Create a new room for this game version.',
    );
  }

  if (
    !Object.prototype.hasOwnProperty.call(
      room.players,
      uid,
    ) ||
    !room.playerOrder.includes(uid)
  ) {
    throw new HttpsError(
      'permission-denied',
      'You are not in this match.',
    );
  }
}

// ==========================================
// START MATCH AND REMATCH
// ==========================================

async function initializeMatch(
  request: CallableRequest,
  rematch: boolean,
) {
  const {
    uid,
    roomRef,
    secretRef,
  } = await context(request);

  try {
    return await db.runTransaction(async tx => {
      const [snap, secret] = await Promise.all([
        tx.get(roomRef),
        tx.get(secretRef),
      ]);

      if (!snap.exists) {
        throw new HttpsError(
          'not-found',
          'Room not found.',
        );
      }

      const old = snap.data()!;

      if (old.hostId !== uid) {
        throw new HttpsError(
          'permission-denied',
          'Only the host can start the match.',
        );
      }

      if (rematch) {
        if (
          old.status !== 'finished' ||
          old.engineVersion !== ENGINE_VERSION ||
          request.data?.revision !== old.revision
        ) {
          throw new HttpsError(
            'failed-precondition',
            'Rematch is not available.',
          );
        }
      } else if (
        old.status !== 'lobby' ||
        secret.exists
      ) {
        throw new HttpsError(
          'failed-precondition',
          'Match already started.',
        );
      }

      const previousRevision =
        typeof old.revision === 'number'
          ? old.revision
          : -1;

      const previousMatch =
        typeof old.matchNumber === 'number'
          ? old.matchNumber
          : 0;

      const {
        room,
        state,
        hands,
      } = start(
        uid,
        old.players,
        previousRevision + 1,
        previousMatch + 1,
        Date.now(),
      );

      // Preserve the selected player avatars
      // when replacing the lobby document.

      // Preserve matchmaking settings
      // when starting a match or rematch.

      room.visibility =
        old.visibility === 'public'
          ? 'public'
          : 'private';

      room.roomName =
        typeof old.roomName === 'string'
          ? old.roomName
          : '';

      room.maxPlayers =
        typeof old.maxPlayers === 'number' &&
        Number.isInteger(old.maxPlayers) &&
        old.maxPlayers >= 2 &&
        old.maxPlayers <= 20

          ? old.maxPlayers
          : 20;

      room.playerAvatars = {};

      for (const playerId of room.playerOrder) {
        const avatar =
          old.playerAvatars?.[playerId];

        if (typeof avatar === 'string') {
          room.playerAvatars[playerId] = avatar;
        }
      }

      tx.set(roomRef, room);
      tx.set(secretRef, state);

      for (const playerId of room.playerOrder) {
        tx.set(
          roomRef
            .collection('hands')
            .doc(playerId),

          {
            cards: hands[playerId],
            revision: room.handRevisions[playerId],
            drawnCardId: null,
            matchNumber: room.matchNumber,
          },
        );
      }

      return {
        success: true,
      };
    });
  } catch (error) {
    translate(error);
  }
}

export const startColorClashMatch = onCall(
  options,
  request => initializeMatch(request, false),
);

export const rematchColorClashMatch = onCall(
  options,
  request => initializeMatch(request, true),
);

// ==========================================
// NORMAL AND AUTOMATIC GAME ACTIONS
// ==========================================

async function move(
  request: CallableRequest,
  action: Action,
) {
  const {
    uid,
    roomRef,
    secretRef,
  } = await context(request);

  try {
    return await db.runTransaction(async tx => {
      const [snap, secret] = await Promise.all([
        tx.get(roomRef),
        tx.get(secretRef),
      ]);

      if (!snap.exists || !secret.exists) {
        throw new HttpsError(
          'not-found',
          'Match not found.',
        );
      }

      const room = snap.data() as Room;
      const state = secret.data() as State;

      validateMember(room, uid);

      if (
        request.data?.revision !== room.revision
      ) {
        throw new HttpsError(
          'failed-precondition',
          'Game changed. Try again.',
        );
      }

      // Any connected member can request an
      // expired player's automatic action.
      // The server validates the deadline.

      const actor =
        action.kind === 'auto'
          ? room.currentPlayerId
          : uid;

      if (!actor) {
        throw new HttpsError(
          'failed-precondition',
          'No active player.',
        );
      }

      const handRef = roomRef
        .collection('hands')
        .doc(actor);

      const handSnap = await tx.get(handRef);

      if (!handSnap.exists) {
        throw new HttpsError(
          'internal',
          'Player hand missing.',
        );
      }

      const hands: Hands = {
        [actor]:
          handSnap.data()!.cards as Card[],
      };

      const beforeHand =
        JSON.stringify(hands[actor]);

      const beforeState =
        JSON.stringify(state);

      const beforeDrawnCard =
        handSnap.data()!.drawnCardId ?? null;

      apply(
        room,
        state,
        hands,
        actor,
        action,
        Date.now(),
      );

      const privateDrawnCard =
        room.phase === 'drawn' &&
        room.currentPlayerId === actor
          ? state.drawnCardId
          : null;

      const changed =
        JSON.stringify(hands[actor]) !== beforeHand ||
        beforeDrawnCard !== privateDrawnCard;

      if (changed) {
        room.handRevisions[actor] =
          (room.handRevisions[actor] ?? 0) + 1;

        tx.set(handRef, {
          cards: hands[actor],
          revision: room.handRevisions[actor],
          drawnCardId: privateDrawnCard,
          matchNumber: room.matchNumber,
        });
      }

      tx.set(roomRef, room);

      if (
        JSON.stringify(state) !== beforeState
      ) {
        tx.set(secretRef, state);
      }

      return {
        success: true,

        revision: room.revision,

        winner: room.winnerId === uid,

        unoWindow:
          room.unoWindows[uid] ?? null,
      };
    });
  } catch (error) {
    translate(error);
  }
}

// ==========================================
// PLAY CARD
// ==========================================

export const playColorClashCard = onCall(
  options,

  request => {
    if (
      typeof request.data?.cardId !== 'string' ||
      request.data.cardId.length === 0 ||
      request.data.cardId.length > 100
    ) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid card ID.',
      );
    }

    return move(request, {
      kind: 'play',
      cardId: request.data.cardId,
      color: request.data?.selectedColor,
    });
  },
);

// ==========================================
// DRAW CARD
// ==========================================

export const drawColorClashCard = onCall(
  options,

  request =>
    move(request, {
      kind: 'draw',
    }),
);

// ==========================================
// PASS
// ==========================================

export const passColorClashTurn = onCall(
  options,

  request =>
    move(request, {
      kind: 'pass',
    }),
);

// ==========================================
// AUTOMATIC TURN / FORCED PENALTY
// ==========================================

export const autoColorClashTurn = onCall(
  options,

  request =>
    move(request, {
      kind: 'auto',
    }),
);

// ==========================================
// INDEPENDENT UNO ANNOUNCEMENT
// ==========================================

export const callColorClashUno = onCall(
  options,

  async request => {
    const receivedAt = Date.now();
    const {
      uid,
      roomRef,
    } = await context(request);

    const windowId = request.data?.windowId;

    if (
      typeof windowId !== 'string' ||
      !windowId ||
      windowId.length > 100
    ) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid UNO window.',
      );
    }

    // Capture server receipt time before
    // starting the Firestore transaction.



    try {
      return await db.runTransaction(async tx => {
        const snap = await tx.get(roomRef);

        if (!snap.exists) {
          throw new HttpsError(
            'not-found',
            'Room not found.',
          );
        }

        const room = snap.data() as Room;

        validateMember(room, uid);

        announceUno(
          room,
          uid,
          windowId,
          receivedAt,
        );

        tx.set(roomRef, room);

        return {
          success: true,
        };
      });
    } catch (error) {
      translate(error);
    }
  },
);

// ==========================================
// RESOLVE MISSED UNO
// ==========================================

export const resolveColorClashUno = onCall(
  options,

  async request => {
    const {
      uid,
      roomRef,
      secretRef,
    } = await context(request);

    const targetUid = request.data?.targetUid;
    const windowId = request.data?.windowId;

    if (
      typeof targetUid !== 'string' ||
      !targetUid ||
      targetUid.length > 128 ||
      targetUid.includes('/') ||
      typeof windowId !== 'string' ||
      !windowId ||
      windowId.length > 100
    ) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid UNO penalty request.',
      );
    }

    try {
      return await db.runTransaction(async tx => {
        const [snap, secret] = await Promise.all([
          tx.get(roomRef),
          tx.get(secretRef),
        ]);

        if (!snap.exists || !secret.exists) {
          throw new HttpsError(
            'not-found',
            'Match not found.',
          );
        }

        const room = snap.data() as Room;
        const state = secret.data() as State;

        validateMember(room, uid);

        const window = room.unoWindows[targetUid];

        if (
          !window ||
          window.id !== windowId ||
          room.status !== 'playing'
        ) {
          return {
            success: true,
          };
        }

        const handRef = roomRef
          .collection('hands')
          .doc(targetUid);

        const handSnap = await tx.get(handRef);

        if (!handSnap.exists) {
          throw new HttpsError(
            'internal',
            'Player hand missing.',
          );
        }

        const hands: Hands = {
          [targetUid]:
            handSnap.data()!.cards as Card[],
        };

        const before =
          JSON.stringify(hands[targetUid]);

        resolveUno(
          room,
          state,
          hands,
          targetUid,
          windowId,
          Date.now(),
        );

        if (
          JSON.stringify(hands[targetUid]) !== before
        ) {
          room.handRevisions[targetUid] =
            (room.handRevisions[targetUid] ?? 0) + 1;

          tx.set(handRef, {
            cards: hands[targetUid],
            revision: room.handRevisions[targetUid],

            drawnCardId:
              handSnap.data()!.drawnCardId ?? null,

            matchNumber: room.matchNumber,
          });

          tx.set(secretRef, state);
        }

        tx.set(roomRef, room);

        return {
          success: true,
        };
      });
    } catch (error) {
      translate(error);
    }
  },
);






