import { callServer } from './api';

import type {
  MultiplayerRoom,
} from './types';

export const EMOJIS = [
  '😂', '🔥', '👏', '😱',
  '🤔', '😍', '😎', '😡',
  '💀', '🏆', '👍', '😭',
] as const;

export const DISPLAY_MS = 3000;
export const COOLDOWN_MS = 2000;

export type Reaction = {
  id: string;
  emoji: string;
  timestamp: number;
  matchNumber: number;
};

export type ReactionRoom = MultiplayerRoom & {
  matchNumber?: number;
  matchSettings?: {
    reactions?: boolean;
  };

  sharedReactions?: Record<string, Reaction>;
};

const FUNCTIONS = {
  'color-clash': 'sendColorClashReaction',
  'doodle-clash': 'sendDoodleClashReaction',
  'word-clash': 'sendWordClashReaction',
} as const;

export type ReactionGame = keyof typeof FUNCTIONS;

export function sendReaction(
  game: ReactionGame,
  code: string,
  room: ReactionRoom,
  emoji: string,
) {
  return callServer(
    FUNCTIONS[game],
    {
      code,
      matchNumber: room.matchNumber,
      emoji,
    },
  );
}

export function reactionsEnabled(
  room: ReactionRoom,
): boolean {
  return (
    room.status === 'playing' &&
    typeof room.matchNumber === 'number' &&
    room.matchSettings?.reactions !== false
  );
}

export function getReaction(
  room: ReactionRoom | null,
  uid: string,
): Reaction | undefined {
  if (
    !room ||
    !reactionsEnabled(room) ||
    !Object.prototype.hasOwnProperty.call(
      room.players,
      uid,
    )
  ) {
    return undefined;
  }

  const reaction = room.sharedReactions?.[uid];

  if (
    !reaction ||
    reaction.matchNumber !== room.matchNumber
  ) {
    return undefined;
  }

  return reaction;
}
