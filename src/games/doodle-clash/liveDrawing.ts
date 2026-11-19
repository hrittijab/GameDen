import {
  doc,
  onSnapshot,
} from 'firebase/firestore';

import {
  db,
} from '../../config/firebase';

import {
  callServer,
} from '../../multiplayer/api';

import type {
  Stroke,
} from './types';

export type StrokePreview = {
  matchNumber: number;
  revision: number;
  updatedAt: number;
  stroke: Stroke;
};

export function subscribeToPreview(
  code: string,
  onUpdate: (preview: StrokePreview | null) => void,
  onError: (message: string) => void,
) {
  const reference = doc(
    db,
    'doodleClashRooms',
    code,
    'preview',
    'current',
  );

  return onSnapshot(
    reference,
    snapshot => onUpdate(
      snapshot.exists()
        ? snapshot.data() as StrokePreview
        : null,
    ),
    error => onError(error.message),
  );
}

export function sendPreview(
  code: string,
  matchNumber: number,
  revision: number,
  stroke: Stroke,
) {
  return callServer(
    'previewDoodleClashStroke',
    {
      code,
      matchNumber,
      revision,
      stroke,
    },
  );
}

export function maintainMatch(
  code: string,
  matchNumber: number,
) {
  return callServer(
    'maintainDoodleClashMatch',
    {
      code,
      matchNumber,
    },
  );
}
