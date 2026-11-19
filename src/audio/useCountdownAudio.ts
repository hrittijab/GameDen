import {
  useEffect,
} from 'react';

import {
  useGameAudio,
} from './useGameAudio';

export function useCountdownAudio(
  deadline?: number,
  enabled = true,
  finalSeconds = 3,
) {
  const { play } = useGameAudio();

  useEffect(() => {
    if (!enabled || !deadline) return;

    let previous = Math.max(
      0,
      Math.ceil(
        (deadline - Date.now()) / 1000,
      ),
    );

    const timer = setInterval(() => {
      const seconds = Math.max(
        0,
        Math.ceil(
          (deadline - Date.now()) / 1000,
        ),
      );

      if (
        seconds !== previous &&
        seconds > 0 &&
        seconds <= finalSeconds
      ) {
        play('countdown');
      }

      previous = seconds;

      if (seconds === 0) {
        clearInterval(timer);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [
    deadline,
    enabled,
    finalSeconds,
    play,
  ]);
}
