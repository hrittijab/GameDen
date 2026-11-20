import {
  useEffect,
  useRef,
} from 'react';

import {
  Animated,
  Platform,
  AccessibilityInfo,
} from 'react-native';

export function useUrgencyPulse(
  active: boolean,
) {
  const scale = useRef(
    new Animated.Value(1),
  ).current;

  useEffect(() => {
    let alive = true;

    let animation:
      Animated.CompositeAnimation | undefined;

    scale.setValue(1);

    if (!active) return;

    void AccessibilityInfo
      .isReduceMotionEnabled()
      .then(reduced => {
        if (!alive || reduced) return;

        animation = Animated.loop(
          Animated.sequence([
            Animated.timing(scale, {
              toValue: 1.08,
              duration: 220,
              useNativeDriver:
                Platform.OS !== 'web',
            }),

            Animated.timing(scale, {
              toValue: 1,
              duration: 280,
              useNativeDriver:
                Platform.OS !== 'web',
            }),
          ]),
        );

        animation.start();
      })
      .catch(() => {});

    return () => {
      alive = false;

      animation?.stop();

      scale.setValue(1);
    };
  }, [active, scale]);

  return scale;
}
