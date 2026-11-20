import {
  useSyncExternalStore,
} from 'react';

import {
  subscribeClock,
  getClockTime,
} from './clock';

const subscribeDisabled = () => () => {};

const disabledTime = () => 0;

export function calculateCountdown(
  deadline: number | undefined,
  duration: number | undefined,
  now: number,
  enabled = true,
) {
  if (
    !enabled ||
    typeof deadline !== 'number' ||
    !Number.isFinite(deadline) ||
    deadline <= 0
  ) {
    return {
      valid: false,
      remainingMs: 0,
      seconds: 0,
      progress: 0,
      expired: false,
      urgent: false,
      critical: false,
    };
  }

  const remainingMs = Math.max(
    0,
    deadline - now,
  );

  const seconds = Math.ceil(
    remainingMs / 1000,
  );

  const progress =
    typeof duration === 'number' &&
    Number.isFinite(duration) &&
    duration > 0
      ? Math.max(
          0,
          Math.min(
            1,
            remainingMs / duration,
          ),
        )
      : 0;

  return {
    valid: true,
    remainingMs,
    seconds,
    progress,
    expired: remainingMs <= 0,
    urgent: seconds > 0 && seconds <= 5,
    critical: seconds > 0 && seconds <= 3,
  };
}

export function useCountdown(
  deadline?: number,
  duration?: number,
  enabled = true,
) {
  const now = useSyncExternalStore(
    enabled
      ? subscribeClock
      : subscribeDisabled,

    enabled
      ? getClockTime
      : disabledTime,

    enabled
      ? getClockTime
      : disabledTime,
  );

  return calculateCountdown(
    deadline,
    duration,
    enabled ? Math.max(now, Date.now()) : 0,
    enabled,
  );
}
