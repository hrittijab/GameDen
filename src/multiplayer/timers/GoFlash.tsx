import {
  useEffect,
  useState,
} from 'react';

import {
  Animated,
  Platform,
  StyleSheet,
  Text,
} from 'react-native';

import {
  useRef,
} from 'react';

export default function GoFlash({
  visible,
}: {
  visible: boolean;
}) {
  const progress = useRef(
    new Animated.Value(0),
  ).current;

  const [shown, setShown] =
    useState(visible);

  useEffect(() => {
    if (!visible) {
      setShown(false);
      return;
    }

    setShown(true);

    progress.setValue(0);

    const animation = Animated.sequence([
      Animated.timing(progress, {
        toValue: 1,
        duration: 150,
        useNativeDriver:
          Platform.OS !== 'web',
      }),

      Animated.delay(350),

      Animated.timing(progress, {
        toValue: 0,
        duration: 250,
        useNativeDriver:
          Platform.OS !== 'web',
      }),
    ]);

    animation.start(({ finished }) => {
      if (finished) {
        setShown(false);
      }
    });

    return () => animation.stop();
  }, [visible, progress]);

  if (!shown) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        s.flash,
        {
          opacity: progress,
          transform: [{
            scale: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0.85, 1],
            }),
          }],
        },
      ]}
    >
      <Text style={s.text}>GO!</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  flash: {
    position: 'absolute',
    alignSelf: 'center',
    top: 9,
    zIndex: 30,
    elevation: 8,
    backgroundColor: '#FFD071',
    borderColor: '#FFF3D8',
    borderWidth: 2,
    borderRadius: 20,
    paddingHorizontal: 23,
    paddingVertical: 8,
  },

  text: {
    color: '#292039',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
