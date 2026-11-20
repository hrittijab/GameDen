import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type DepartureEvent = {
  id: string;
  playerId: string;
  playerName: string;
  reason: 'quit' | 'timeout';
  timestamp: number;
  remainingCount: number;
  newHostId?: string | null;
};

type ForfeitResult = DepartureEvent & {
  winnerId: string;
};

type DepartureRoom = {
  status: string;
  departureEvent?: DepartureEvent;
  forfeitResult?: ForfeitResult;
};

type Props = {
  room: DepartureRoom;
  uid: string;
};

const DISPLAY_MS = 5000;

function departureMessage(event: DepartureEvent) {
  return event.reason === 'timeout'
    ? `${event.playerName}'s connection timed out`
    : `${event.playerName} quit the match`;
}

export default function DepartureNotice({
  room,
  uid,
}: Props) {
  const [notice, setNotice] =
    useState<DepartureEvent | null>(null);

  const opacity =
    useRef(new Animated.Value(0)).current;

  const translateY =
    useRef(new Animated.Value(-8)).current;

  const event = room.departureEvent;

  useEffect(() => {
    setNotice(null);

    if (
      !event ||
      event.playerId === uid ||
      room.status !== 'playing'
    ) {
      return;
    }

    const age = Math.max(
      0,
      Date.now() - event.timestamp,
    );

    if (age >= DISPLAY_MS) return;

    setNotice(event);

    opacity.setValue(0);
    translateY.setValue(-8);

    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),

      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
      }),
    ]);

    animation.start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setNotice(null);
      });
    }, DISPLAY_MS - age);

    return () => {
      clearTimeout(timer);
      animation.stop();
      opacity.stopAnimation();
      translateY.stopAnimation();
    };
  }, [
    event?.id,
    uid,
    room.status,
    opacity,
    translateY,
  ]);

  const forfeit = room.forfeitResult;

  if (
    room.status === 'finished' &&
    forfeit &&
    forfeit.winnerId === uid
  ) {
    return (
      <View style={s.victory}>
        <Text style={s.victoryTitle}>
          VICTORY BY FORFEIT
        </Text>

        <Text style={s.description}>
          {departureMessage(forfeit)}.
        </Text>

        <Text style={s.description}>
          You are the last remaining player.
        </Text>
      </View>
    );
  }

  if (!notice || room.status !== 'playing') {
    return null;
  }

  return (
    <Animated.View
      style={[
        s.notice,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Text style={s.heading}>
        {notice.reason === 'timeout'
          ? '📡 '
          : '🚪 '}

        {departureMessage(notice)}
      </Text>

      <Text style={s.description}>
        {notice.remainingCount} players remaining.
        The game continues.
      </Text>

      {notice.newHostId === uid && (
        <Text style={s.host}>
          👑 You are now the host.
        </Text>
      )}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  notice: {
    backgroundColor: '#342939',
    borderColor: '#FF8299',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 5,
    marginVertical: 8,
  },

  heading: {
    color: '#FFB4C1',
    fontSize: 15,
    fontWeight: '800',
  },

  description: {
    color: '#C7CADC',
    fontSize: 13,
    lineHeight: 20,
  },

  host: {
    color: '#FFD071',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 5,
  },

  victory: {
    backgroundColor: '#213E3D',
    borderColor: '#65CDB1',
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    marginVertical: 10,
  },

  trophy: {
    fontSize: 36,
  },

  victoryTitle: {
    color: '#FFD071',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
});


