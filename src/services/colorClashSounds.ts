
import { useAudioPlayer } from 'expo-audio';
import { useCallback } from 'react';
import { Platform, Vibration } from 'react-native';

export type ClashSound =
  | 'play'
  | 'draw'
  | 'uno'
  | 'win'
  | 'deal';

export function useColorClashSounds(
  enabled: boolean,
) {
  const playSound = useAudioPlayer(
    require('../../assets/color-clash/play.wav'),
  );

  const drawSound = useAudioPlayer(
    require('../../assets/color-clash/draw.wav'),
  );

  const unoSound = useAudioPlayer(
    require('../../assets/color-clash/uno.wav'),
  );

  const winSound = useAudioPlayer(
    require('../../assets/color-clash/win.wav'),
  );

  const dealSound = useAudioPlayer(
    require('../../assets/color-clash/deal.wav'),
  );

  const sound = useCallback(
    (kind: ClashSound) => {
      if (!enabled) return;

      const player = {
        play: playSound,
        draw: drawSound,
        uno: unoSound,
        win: winSound,
        deal: dealSound,
      }[kind];

      try {
        player.volume = 0.55;

        // Replay from the start.

        void player
          .seekTo(0)
          .then(() => {
            player.play();
          })
          .catch(() => {
            // Audio failure should never
            // interrupt an active game.
          });
      } catch {
        // Ignore unavailable sound.
      }
    },

    [
      enabled,
      playSound,
      drawSound,
      unoSound,
      winSound,
      dealSound,
    ],
  );

  const feedback = useCallback(
    (kind: ClashSound) => {
      sound(kind);

      if (
        enabled &&
        Platform.OS !== 'web'
      ) {
        if (kind === 'win') {
          Vibration.vibrate([
            0,
            80,
            60,
            120,
          ]);
        } else if (kind === 'uno') {
          Vibration.vibrate(70);
        } else {
          Vibration.vibrate(20);
        }
      }
    },

    [enabled, sound],
  );

  return {
    sound,
    feedback,
  };
}
