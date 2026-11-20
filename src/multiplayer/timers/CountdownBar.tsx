import {
  memo,
} from 'react';

import {
  View,
  Text,
  Animated,
  StyleSheet,
} from 'react-native';

import {
  useCountdown,
} from './useCountdown';

import {
  useUrgencyPulse,
} from './useUrgencyPulse';

type Props = {
  deadline: number;
  duration: number;
  accent?: string;
  danger?: string;
  warningSeconds?: number;
  label?: string;
};

export default memo(function CountdownBar({
  deadline,
  duration,
  accent = '#A5E1EB',
  danger = '#FF8398',
  warningSeconds = 5,
  label,
}: Props) {
  const timer = useCountdown(
    deadline,
    duration,
  );

  const urgent =
    timer.seconds > 0 &&
    timer.seconds <= warningSeconds;

  const pulse = useUrgencyPulse(
    timer.critical,
  );

  const color =
    urgent || timer.expired
      ? danger
      : accent;

  if (!timer.valid) return null;

  return (
    <View style={s.container}>
      {!!label && (
        <Text style={s.label}>
          {label}
        </Text>
      )}

      <Animated.Text
        accessibilityLabel={
          `${timer.seconds} seconds remaining`
        }
        style={[
          s.seconds,
          {
            color,
            transform: [
              { scale: pulse },
            ],
          },
        ]}
      >
        {timer.seconds}s
      </Animated.Text>

      <View
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: 100,
          now: Math.round(
            timer.progress * 100,
          ),
        }}
        style={s.track}
      >
        <View
          style={[
            s.fill,
            {
              width: `${
                timer.progress * 100
              }%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
    </View>
  );
});

const s = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    gap: 6,
  },

  label: {
    color: '#C0C6DE',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  seconds: {
    fontSize: 23,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },

  track: {
    width: '100%',
    height: 7,
    backgroundColor: '#49516F',
    borderRadius: 8,
    overflow: 'hidden',
  },

  fill: {
    height: '100%',
    borderRadius: 8,
  },
});
