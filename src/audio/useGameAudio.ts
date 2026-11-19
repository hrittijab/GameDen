import { useCallback } from 'react';

import {
  useAudio,
} from './AudioProvider';

import type {
  SoundName,
} from './soundLibrary';

export function useGameAudio() {
  const {
    play,
    vibrate,
  } = useAudio();

  const feedback = useCallback(
    (
      name: SoundName,
      kind: 'light' | 'success' | 'warning'
        = 'light',
    ) => {
      play(name);
      vibrate(kind);
    },
    [play, vibrate],
  );

  return {
    play,
    feedback,
    vibrate,
  };
}
