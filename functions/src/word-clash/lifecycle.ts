import {
  createLifecycleHandlers,
  nextHost,
  type DepartureContext,
} from '../multiplayer/lifecycle';

import {
  createHeartbeatHandler,
} from '../multiplayer/presence';

import {
  WORD_CLASH_CONFIG,
} from './config';

import {
  finishWordMatch,
  finishWordRound,
  type WordRoom,
  type WordSecret,
} from './engine';

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

  const room = context.room as WordRoom;

  if (!remainingIds.length) {
    tx.delete(secretRef);
    tx.delete(presenceRef);
    tx.delete(roomRef);

    return { success: true };
  }

  const secretSnap = await tx.get(secretRef);

  const hostId = nextHost(
    room.hostId,
    targetUid,
    remainingIds,
  );

  const previousOrder =
    room.playerOrder ?? Object.keys(room.players);

  const playerOrder = previousOrder.filter(
    id => id !== targetUid,
  );

  const scores = {
    ...room.scores,
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

  const streaks = {
    ...room.streaks,
  };

  const reactions = {
    ...room.reactions,
  };

  delete streaks[targetUid];
  delete reactions[targetUid];

  let chooserId = room.chooserId;

  if (chooserId === targetUid) {
    const previousIndex =
      previousOrder.indexOf(targetUid);

    chooserId = previousOrder
      .slice(previousIndex + 1)
      .concat(previousOrder.slice(0, previousIndex))
      .find(id => remainingIds.includes(id))
      ?? playerOrder[0];
  }

  const updatedRoom: WordRoom = {
    ...room,
    players: remainingPlayers,
    hostId,
    playerOrder,
    scores,
    streaks,
    reactions,
    chooserId,
    submittedIds: (room.submittedIds ?? [])
      .filter(id => id !== targetUid),
    winnerIds: (room.winnerIds ?? [])
      .filter(id => id !== targetUid),
  };

  tx.update(roomRef, {
    players: updatedRoom.players,
    hostId,
    playerOrder,
    scores,
    streaks,
    reactions,
    chooserId,
    submittedIds: updatedRoom.submittedIds,
    winnerIds: updatedRoom.winnerIds,
  });

  tx.delete(presenceRef);

  if (remainingIds.length === 1 &&
      room.status === 'playing') {
    finishWordMatch(
      tx,
      roomRef,
      secretRef,
      remainingIds,
    );

    return { success: true };
  }

  if (
    room.status === 'finished' ||
    !secretSnap.exists
  ) {
    return { success: true };
  }

  const secret = secretSnap.data() as WordSecret;

  const submissions = {
    ...secret.submissions,
  };

  delete submissions[targetUid];

  const updatedSecret: WordSecret = {
    ...secret,
    submissions,
  };

  if (
    room.phase === 'typing' &&
    remainingIds.every(
      id => !!submissions[id],
    )
  ) {
    finishWordRound(
      tx,
      roomRef,
      secretRef,
      updatedRoom,
      updatedSecret,
    );
  } else {
    tx.set(
      secretRef,
      updatedSecret,
    );
  }

  return { success: true };
}

export const heartbeatWordClash =
  createHeartbeatHandler(
    WORD_CLASH_CONFIG,
  );

const lifecycle = createLifecycleHandlers(
  WORD_CLASH_CONFIG,
  handleDeparture,
);

export const leaveWordClashRoom =
  lifecycle.leave;

export const kickWordClashPlayer =
  lifecycle.kick;



