import {
  createLifecycleHandlers,
  nextHost,
  type DepartureContext,
} from '../multiplayer/lifecycle';

import {
  createHeartbeatHandler,
} from '../multiplayer/presence';

import {
  DOODLE_CLASH_CONFIG,
} from './config';

import {
  advanceRound,
  finishRound,
  finishMatch,
  type RoundRoom,
  type RoundSecret,
} from './rounds';

export async function handleDeparture(
  context: DepartureContext,
) {
  const {
    tx,
    roomRef,
    secretRef,
    presenceRef,
    targetUid,
    remainingPlayers,
    remainingIds,
  } = context;

  const room = context.room as RoundRoom;

  const drawingRef = roomRef
    .collection('drawing')
    .doc('current');

  if (!remainingIds.length) {
    tx.delete(drawingRef);
    tx.delete(roomRef.collection('preview').doc('current'));
    tx.delete(roomRef.collection('activity').doc('current'));
    tx.delete(secretRef);
    tx.delete(presenceRef);
    tx.delete(roomRef);

    return { success: true };
  }

  // Firestore transaction reads must happen
  // before transaction writes.

  const secretSnap = await tx.get(secretRef);

  const playerOrder = (
    room.playerOrder ?? Object.keys(room.players)
  ).filter(id => id !== targetUid);

  const pendingArtists = (
    room.pendingArtists ?? []
  ).filter(id => id !== targetUid);

  const hostId = nextHost(
    room.hostId,
    targetUid,
    remainingIds,
  );

  const scores = {
    ...room.scores,
  };

  const roundPoints = {
    ...room.roundPoints,
  };

  const previousDepartures = (
    room as typeof room & {
      departedPlayers?: Record<string, {
        name: string;
        score: number;
        reason: 'quit' | 'timeout';
        leftAt: number;
      }>;
    }
  ).departedPlayers ?? {};

  const departedPlayers = {
    ...previousDepartures,
    [targetUid]: {
      name: context.name,
      score: scores[targetUid] ?? 0,
      reason: context.reason ?? 'quit',
      leftAt: Date.now(),
    },
  };

  if (room.status === 'playing') {
    tx.update(roomRef, {
      departedPlayers,
    });
  }

  delete scores[targetUid];
  delete roundPoints[targetUid];

  const updates: Partial<RoundRoom> = {
    hostId,
    players: remainingPlayers,
    playerOrder,
    pendingArtists,
    totalRounds: room.roundNumber + pendingArtists.length,
    scores,
    roundPoints,
  };

  if (
    remainingIds.length < 2 ||
    room.status === 'finished' ||
    !secretSnap.exists
  ) {
    finishMatch(
      tx,
      roomRef,
      secretRef,
      updates,
    );

    tx.delete(presenceRef);

    return { success: true };
  }

  const secret = secretSnap.data() as RoundSecret;

  const updatedRoom: RoundRoom = {
    ...room,
    ...updates,
  };

  tx.update(roomRef, updates);

  if (room.artistId === targetUid) {
    advanceRound(
      tx,
      roomRef,
      secretRef,
      updatedRoom,
      secret,
    );
  } else if (room.phase === 'drawing') {
    const everyoneGuessed = remainingIds
      .filter(id => id !== room.artistId)
      .every(id => room.guessedIds.includes(id));

    if (everyoneGuessed) {
      finishRound(
        tx,
        roomRef,
        secret,
      );
    }
  }

  tx.delete(presenceRef);

  return { success: true };
}

export const heartbeatDoodleClash =
  createHeartbeatHandler(
    DOODLE_CLASH_CONFIG,
  );

const lifecycle = createLifecycleHandlers(
  DOODLE_CLASH_CONFIG,
  handleDeparture,
);

export const leaveDoodleClashRoom =
  lifecycle.leave;

export const kickDoodleClashPlayer =
  lifecycle.kick;



