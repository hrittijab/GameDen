import {
  doc,
  onSnapshot,
} from 'firebase/firestore';

import { db } from '../../config/firebase';

import {
  subscribeToRoom,
  validateCode,
} from '../../multiplayer/rooms';

import {
  callServer,
} from '../../multiplayer/api';

import type {
  MultiplayerRoom,
} from '../../multiplayer/types';

import {
  DOODLE_CLASH_CONFIG,
} from './config';

import type {
  Stroke,
} from './types';

export type DoodleRoom = MultiplayerRoom & {
  artistId: string | null;
  playerOrder: string[];
  matchNumber: number;
};

export type DrawingState = {
  matchNumber: number;
  revision: number;
  strokes: Stroke[];
  redoStack: Stroke[];
};

export type DrawingAction =
  | 'add'
  | 'undo'
  | 'redo'
  | 'clear';

export function subscribeToDoodleRoom(
  code: string,
  onUpdate: (room: DoodleRoom | null) => void,
  onError: (message: string) => void,
) {
  return subscribeToRoom<DoodleRoom>(
    DOODLE_CLASH_CONFIG.room,
    code,
    onUpdate,
    onError,
  );
}

export function subscribeToDrawing(
  code: string,
  onUpdate: (drawing: DrawingState | null) => void,
  onError: (message: string) => void,
) {
  const reference = doc(
    db,
    DOODLE_CLASH_CONFIG.room.collection,
    validateCode(code),
    'drawing',
    'current',
  );

  return onSnapshot(
    reference,

    snap => {
      onUpdate(
        snap.exists()
          ? (snap.data() as DrawingState)
          : null,
      );
    },

    error => onError(error.message),
  );
}

export async function updateDrawing(
  code: string,
  drawing: DrawingState,
  action: DrawingAction,
  stroke?: Stroke,
) {
  const data: Record<string, unknown> = {
    code,
    matchNumber: drawing.matchNumber,
    revision: drawing.revision,
    action,
  };

  if (stroke) {
    data.stroke = stroke;
  }

  const result = await callServer<{
    success: boolean;
    drawing: DrawingState;
  }>(
    'updateDoodleClashDrawing',
    data,
  );

  return result.drawing;
}
