import { callServer } from '../../multiplayer/api';

import type {
  DoodleRoom,
} from './doodleClashRooms';

export type WordOption = {
  word: string;
  difficulty: 'easy' | 'medium' | 'hard';
};

export function getPrivateWord(
  code: string,
  matchNumber: number,
) {
  return callServer<{
    success: boolean;
    choices: WordOption[];
    answer: string | null;
  }>(
    'getDoodleClashWord',
    {
      code,
      matchNumber,
    },
  );
}

export function selectWord(
  code: string,
  matchNumber: number,
  index: number,
) {
  return callServer(
    'selectDoodleClashWord',
    {
      code,
      matchNumber,
      index,
    },
  );
}

export function submitGuess(
  code: string,
  matchNumber: number,
  guess: string,
) {
  return callServer<{
    success: boolean;
    correct: boolean;
    close: boolean;
    points: number;
  }>(
    'guessDoodleClashWord',
    {
      code,
      matchNumber,
      guess,
    },
  );
}

export function advancePhase(
  code: string,
  room: DoodleRoom,
) {
  return callServer(
    'advanceDoodleClashRound',
    {
      code,
      matchNumber: room.matchNumber,
      phase: room.phase,
    },
  );
}

