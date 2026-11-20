import {
  useEffect,
  useRef,
} from 'react';

import {
  useGameAudio,
} from './useGameAudio';

import {
  useCountdown,
} from '../multiplayer/timers/useCountdown';

export function useCountdownAudio(
  deadline?: number,
  enabled = true,
  finalSeconds = 3,
) {
  const { play } = useGameAudio();

  const timer = useCountdown(
    deadline,
    undefined,
    enabled,
  );

  const last = useRef<{
    deadline: number | undefined;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    if (!enabled || !timer.valid) {
      last.current = null;
      return;
    }

    const previous = last.current;

    last.current = {
      deadline,
      seconds: timer.seconds,
    };

    const newDeadline =
      previous?.deadline !== deadline;

    if (
      timer.seconds > 0 &&
      timer.seconds <= finalSeconds &&
      (
        newDeadline ||
        previous?.seconds !== timer.seconds
      )
    ) {
      play('countdown');
    }
  }, [
    deadline,
    timer.valid,
    timer.seconds,
    enabled,
    finalSeconds,
    play,
  ]);
}
