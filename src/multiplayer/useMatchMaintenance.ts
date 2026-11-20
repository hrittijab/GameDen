import { useEffect } from 'react';

import { AppState } from 'react-native';

type Props = {
  enabled: boolean;
  code: string;
  matchNumber?: number;
  maintain: (
    code: string,
    matchNumber: number,
  ) => Promise<unknown>;
  intervalMs?: number;
};

export default function useMatchMaintenance({
  enabled,
  code,
  matchNumber,
  maintain,
  intervalMs = 10000,
}: Props) {
  useEffect(() => {
    if (
      !enabled ||
      !code ||
      typeof matchNumber !== 'number'
    ) {
      return;
    }

    let active = true;
    let pending = false;

    async function check() {
      if (
        !active ||
        pending ||
        typeof matchNumber !== 'number' ||
        AppState.currentState === 'background'
      ) {
        return;
      }

      pending = true;

      try {
        await maintain(code, matchNumber);
      } catch {
        // Retry on the next maintenance interval.
      } finally {
        pending = false;
      }
    }

    void check();

    const timer = setInterval(
      () => void check(),
      intervalMs,
    );

    const subscription =
      AppState.addEventListener(
        'change',
        state => {
          if (state === 'active') {
            void check();
          }
        },
      );

    return () => {
      active = false;

      clearInterval(timer);

      subscription.remove();
    };
  }, [
    enabled,
    code,
    matchNumber,
    maintain,
    intervalMs,
  ]);
}
