import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
} from 'react-native';

import {
  DISPLAY_MS,
  type Reaction,
} from './reactions';

export default function ReactionBubble({
  reaction,
  name,
  compact = false,
}: {
  reaction?: Reaction;
  name?: string;
  compact?: boolean;
}) {
  if (!reaction) return null;

  return (
    <Bubble
      key={reaction.id}
      reaction={reaction}
      name={name}
      compact={compact}
    />
  );
}

function Bubble({
  reaction,
  name,
  compact,
}: {
  reaction: Reaction;
  name?: string;
  compact: boolean;
}) {
  const [visible, setVisible] = useState(
    Date.now() - reaction.timestamp < DISPLAY_MS,
  );

  const progress = useRef(
    new Animated.Value(0),
  ).current;

  useEffect(() => {
    const remaining = Math.min(
      DISPLAY_MS,
      DISPLAY_MS -
        (Date.now() - reaction.timestamp),
    );

    if (remaining <= 0) {
      setVisible(false);
      return;
    }

    setVisible(true);

    const animation = Animated.timing(
      progress,
      {
        toValue: 1,
        duration: remaining,
        easing: Easing.linear,
        useNativeDriver:
          Platform.OS !== 'web',
      },
    );

    animation.start(({ finished }) => {
      if (finished) {
        setVisible(false);
      }
    });

    return () => animation.stop();
  }, [progress, reaction.timestamp]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLabel={
        `${name ?? 'Player'} reacted ${reaction.emoji}`
      }
      style={[
        s.bubble,
        compact && s.compact,
        {
          opacity: progress.interpolate({
            inputRange: [0, 0.08, 0.75, 1],
            outputRange: [0, 1, 1, 0],
          }),

          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 0.15, 0.75, 1],
                outputRange: [8, -4, -4, -16],
              }),
            },
            {
              scale: progress.interpolate({
                inputRange: [0, 0.08, 0.16, 1],
                outputRange: [0.4, 1.2, 1, 1],
              }),
            },
          ],
        },
      ]}
    >
      <Text style={[
        s.emoji,
        compact && s.smallEmoji,
      ]}>
        {reaction.emoji}
      </Text>

      {!!name && (
        <Text
          style={s.name}
          numberOfLines={1}
        >
          {name}
        </Text>
      )}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  bubble: {
    backgroundColor: '#FFF3DA',
    borderColor: '#FFFFFF',
    borderWidth: 1.5,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 120,

    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 6,
  },

  compact: {
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },

  emoji: {
    fontSize: 30,
  },

  smallEmoji: {
    fontSize: 23,
  },

  name: {
    color: '#3B3051',
    fontSize: 10,
    fontWeight: '900',
    maxWidth: 90,
  },
});
