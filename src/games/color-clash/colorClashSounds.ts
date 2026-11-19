import {
  useCallback,
} from 'react';

import {
  useGameAudio,
} from '../../audio/useGameAudio';

import type {
  SoundName,
} from '../../audio/soundLibrary';

export type ClashSound =
  | 'play'
  | 'draw'
  | 'uno'
  | 'win'
  | 'deal'
  | 'defeat';

const SOUND_MAP: Record<
  ClashSound,
  SoundName
> = {
  play: 'cardPlay',
  draw: 'cardDraw',
  uno: 'uno',
  win: 'cardWin',
  deal: 'cardDeal',
  defeat: 'defeat',
};

export function useColorClashSounds() {
  const {
    play,
    vibrate,
  } = useGameAudio();

  const sound = useCallback(
    (kind: ClashSound) => {
      play(SOUND_MAP[kind]);
    },
    [play],
  );

  const feedback = useCallback(
    (kind: ClashSound) => {
      sound(kind);

      vibrate(
        kind === 'win'
          ? 'success'
          : kind === 'uno'
            ? 'warning'
            : 'light',
      );
    },
    [sound, vibrate],
  );

  return {
    sound,
    feedback,
  };
}
