import {
  randomUUID,
} from 'node:crypto';











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

