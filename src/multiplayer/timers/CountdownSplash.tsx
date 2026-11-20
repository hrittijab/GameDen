import {
  useEffect,
  useRef,
} from 'react';

import {
  View,
  Text,
  Animated,
  Easing,
  Platform,
  AccessibilityInfo,
  StyleSheet,
} from 'react-native';

export default function CountdownSplash({
  seconds,
  accent = '#FFD071',
  started = false,
}: {
  seconds: number;
  accent?: string;
  started?: boolean;
}) {
  const progress = useRef(
    new Animated.Value(1),
  ).current;

  const value = started
    ? 'GO!'
    : seconds > 0
      ? String(seconds)
      : '...';

  useEffect(() => {
    let alive = true;

    let animation:
      Animated.CompositeAnimation | undefined;

    progress.setValue(1);

    void AccessibilityInfo
      .isReduceMotionEnabled()
      .then(reduced => {
        if (!alive || reduced) return;

        progress.setValue(0);

        animation = Animated.timing(
          progress,
          {
            toValue: 1,
            duration: 380,
            easing: Easing.out(
              Easing.back(1.4),
            ),
            useNativeDriver:
              Platform.OS !== 'web',
          },
        );

        animation.start();
      })
      .catch(() => {});

    return () => {
      alive = false;
      animation?.stop();
    };
  }, [value, progress]);

  return (
    <View
      pointerEvents="none"
      style={s.container}
    >
      <Animated.View
        style={[
          s.circle,
          {
            borderColor: accent,

            opacity: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0.4, 1],
              extrapolate: 'clamp',
            }),

            transform: [{
              scale: progress.interpolate({
                inputRange: [0, 0.6, 1],
                outputRange: [0.6, 1.12, 1],
                extrapolate: 'clamp',
              }),
            }],
          },
        ]}
      >
        <Text style={[
          s.number,
          {
            color: accent,
            fontSize:
              started ? 34 : 64,
          },
        ]}>
          {value}
        </Text>
      </Animated.View>

      <Text style={s.caption}>
        {started
          ? 'START!'
          : seconds > 0
            ? 'ROUND STARTING'
            : 'SYNCHRONIZING'}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 12,
  },

  circle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    backgroundColor: '#17182F',
    alignItems: 'center',
    justifyContent: 'center',
  },

  number: {
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },

  caption: {
    color: '#C5BAFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
