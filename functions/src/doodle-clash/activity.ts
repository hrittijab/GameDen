import {
  randomUUID,
} from 'node:crypto';

import {
  HttpsError,
  onCall,
} from 'firebase-functions/v2/https';

import {
  options,
} from '../multiplayer/firebase';

import {
  roomContext,
  requireMember,
} from '../multiplayer/rooms';

import {
  DOODLE_CLASH_CONFIG,
} from './config';

import type {
  RoundRoom,
} from './rounds';

export const REACTIONS = [
  '😂', '🔥', '👏',
  '😍', '🤔', '😱',
];

export const MAX_ACTIVITY_EVENTS = 30;
export const REACTION_COOLDOWN_MS = 1500;

export type ActivityEvent = {
  id: string;
  uid: string;
  playerName: string;
  kind: 'guess' | 'correct' | 'reaction';
  text: string;
  timestamp: number;
};

export type ActivityState = {
  matchNumber: number;
  events: ActivityEvent[];
  lastReactionAt: Record<string, number>;
};

export function getActivityState(
  input: unknown,
  matchNumber: number,
): ActivityState {
  const value =
    input as ActivityState | undefined;

  if (value?.matchNumber === matchNumber) {
    return value;
  }

  return {
    matchNumber,
    events: [],
    lastReactionAt: {},
  };
}

export function appendActivity(
  state: ActivityState,
  event: Omit<ActivityEvent, 'id'>,
): ActivityState {
  return {
    ...state,
    events: [
      ...state.events,
      {
        id: randomUUID(),
        ...event,
      },
    ].slice(-MAX_ACTIVITY_EVENTS),
  };
}

export const reactDoodleClash = onCall(
  options,
  async request => {
    const {
      db,
      uid,
      roomRef,
    } = roomContext(
      request,
      DOODLE_CLASH_CONFIG,
    );

    const reaction = request.data?.reaction;

    if (
      typeof reaction !== 'string' ||
      !REACTIONS.includes(reaction)
    ) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid reaction.',
      );
    }

    const activityRef = roomRef
      .collection('activity')
      .doc('current');

    return db.runTransaction(async tx => {
      const roomSnap = await tx.get(roomRef);

      const activitySnap =
        await tx.get(activityRef);

      if (!roomSnap.exists) {
        throw new HttpsError(
          'not-found',
          'Room not found.',
        );
      }

      const room =
        roomSnap.data() as RoundRoom;

      requireMember(room, uid);

      if (
        room.status !== 'playing' ||
        room.matchSettings?.reactions === false ||
        room.matchNumber !==
          request.data?.matchNumber
      ) {
        throw new HttpsError(
          'failed-precondition',
          'Reactions are unavailable.',
        );
      }

      const state = getActivityState(
        activitySnap.data(),
        room.matchNumber,
      );

      const now = Date.now();

      if (
        now - (state.lastReactionAt[uid] ?? 0) <
          REACTION_COOLDOWN_MS
      ) {
        throw new HttpsError(
          'resource-exhausted',
          'Please wait before reacting again.',
        );
      }

      const updated = appendActivity(
        state,
        {
          uid,
          playerName: room.players[uid],
          kind: 'reaction',
          text: reaction,
          timestamp: now,
        },
      );

      updated.lastReactionAt = {
        ...state.lastReactionAt,
        [uid]: now,
      };

      tx.set(activityRef, updated);

      return {
        success: true,
      };
    });
  },
);
