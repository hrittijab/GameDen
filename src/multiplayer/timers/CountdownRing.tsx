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
  useUrgencyPulse,
} from './useUrgencyPulse';

const SEGMENTS = 40;

type Props = {
  seconds: number;
  progress?: number;
  size?: number;
  accent?: string;
  warningSeconds?: number;
};

export default memo(function CountdownRing({
  seconds,
  progress,
  size = 82,
  accent = '#A5E1EB',
  warningSeconds = 5,
}: Props) {
  const pulse = useUrgencyPulse(
    seconds > 0 && seconds <= 3,
  );

  const color =
    seconds <= 3
      ? '#FF8398'
      : seconds <= warningSeconds
        ? '#FFD071'
        : accent;

  const value =
    progress === undefined
      ? undefined
      : Math.max(0, Math.min(1, progress));

  const filled =
    value === undefined
      ? SEGMENTS
      : Math.ceil(value * SEGMENTS);

  const radius = size / 2;

  const segmentWidth = Math.max(
    2,
    size * 0.028,
  );

  const segmentHeight = size * 0.09;

  return (
    <View
      accessibilityLabel={
        `${seconds} seconds remaining`
      }
      style={[
        s.ring,
        {
          width: size,
          height: size,
          borderRadius: radius,
        },
      ]}
    >
      {Array.from(
        { length: SEGMENTS },
        (_, index) => {
          const angle =
            index * Math.PI * 2 / SEGMENTS -
            Math.PI / 2;

          const distance =
            radius - segmentHeight / 2 - 2;

          const x =
            radius +
            Math.cos(angle) * distance;

          const y =
            radius +
            Math.sin(angle) * distance;

          return (
            <View
              key={index}
              pointerEvents="none"
              style={{
                position: 'absolute',

                width: segmentWidth,
                height: segmentHeight,

                left: x - segmentWidth / 2,
                top: y - segmentHeight / 2,

                borderRadius: 2,

                backgroundColor:
                  index < filled
                    ? color
                    : '#49516F',

                transform: [{
                  rotate: `${
                    index * 360 / SEGMENTS
                  }deg`,
                }],
              }}
            />
          );
        },
      )}

      <Animated.Text
        style={[
          s.seconds,
          {
            fontSize: size * 0.32,
            color,
            transform: [
              { scale: pulse },
            ],
          },
        ]}
      >
        {String(seconds).padStart(2, '0')}
      </Animated.Text>

      <Text style={s.unit}>
        SEC
      </Text>
    </View>
  );
});

const s = StyleSheet.create({
  ring: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#171A30',
  },

  seconds: {
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },

  unit: {
    color: '#A6A9C4',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
});
