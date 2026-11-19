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
  emptyDrawing,
  type DoodleRoom,
} from './engine';

async function handleDeparture(
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

  const room = context.room as DoodleRoom;

  const drawingRef = roomRef
    .collection('drawing')
    .doc('current');

  if (!remainingIds.length) {
    tx.delete(drawingRef);
    tx.delete(secretRef);
    tx.delete(presenceRef);
    tx.delete(roomRef);

    return { success: true };
  }

  const playerOrder = room.playerOrder.filter(
    id => id !== targetUid,
  );

  const hostId = nextHost(
    room.hostId,
    targetUid,
    remainingIds,
  );

  const update: Partial<DoodleRoom> = {
    players: remainingPlayers,
    playerOrder,
    hostId,
  };

  if (remainingIds.length < 2) {
    update.status = 'finished';
    update.artistId = null;
  } else if (
    room.status === 'playing' &&
    room.artistId === targetUid
  ) {
    const matchNumber = room.matchNumber + 1;

    update.artistId = playerOrder[0];
    update.matchNumber = matchNumber;

    tx.set(
      drawingRef,
      emptyDrawing(matchNumber),
    );
  }

  tx.update(roomRef, update);
  tx.delete(presenceRef);

  return { success: true };
}

export const heartbeatDoodleClash =
  createHeartbeatHandler(DOODLE_CLASH_CONFIG);

const lifecycle = createLifecycleHandlers(
  DOODLE_CLASH_CONFIG,
  handleDeparture,
);

export const leaveDoodleClashRoom =
  lifecycle.leave;

export const kickDoodleClashPlayer =
  lifecycle.kick;
