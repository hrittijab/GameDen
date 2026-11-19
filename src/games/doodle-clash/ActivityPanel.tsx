import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';

import {
  doc,
  onSnapshot,
} from 'firebase/firestore';

import {
  db,
} from '../../config/firebase';

import {
  callServer,
} from '../../multiplayer/api';

import type {
  DoodleRoom,
} from './doodleClashRooms';

const REACTIONS = [
  '😂', '🔥', '👏',
  '😍', '🤔', '😱',
];

type Event = {
  id: string;
  uid: string;
  playerName: string;
  kind: 'guess' | 'correct' | 'reaction';
  text: string;
  timestamp: number;
};

export default function ActivityPanel({
  code,
  room,
}: {
  code: string;
  room: DoodleRoom;
}) {
  const [events, setEvents] =
    useState<Event[]>([]);

  const [error, setError] =
    useState('');

  const lock = useRef(false);

  const [coolingDown, setCoolingDown] =
    useState(false);

  const cooldownTimer =
    useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

  const feedEnabled =
    room.matchSettings?.guessFeed !== false;

  const reactionsEnabled =
    room.matchSettings?.reactions !== false;

  useEffect(() => {
    if (!feedEnabled && !reactionsEnabled) {
      return;
    }

    return onSnapshot(
      doc(
        db,
        'doodleClashRooms',
        code,
        'activity',
        'current',
      ),
      snapshot => {
        const value = snapshot.data();

        if (
          value?.matchNumber !==
            room.matchNumber
        ) {
          setEvents([]);
          return;
        }

        setEvents(value.events ?? []);
      },
      reason => setError(reason.message),
    );
  }, [
    code,
    room.matchNumber,
    feedEnabled,
    reactionsEnabled,
  ]);

  useEffect(() => {
    return () => {
      if (cooldownTimer.current) {
        clearTimeout(cooldownTimer.current);
      }
    };
  }, []);

  async function react(reaction: string) {
    if (
      lock.current ||
      coolingDown ||
      !reactionsEnabled ||
      room.status !== 'playing'
    ) {
      return;
    }

    lock.current = true;

    setCoolingDown(true);
    setError('');

    try {
      await callServer(
        'reactDoodleClash',
        {
          code,
          matchNumber: room.matchNumber,
          reaction,
        },
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Could not send reaction.',
      );
    } finally {
      lock.current = false;

      cooldownTimer.current = setTimeout(
        () => setCoolingDown(false),
        1600,
      );
    }
  }

  if (!feedEnabled && !reactionsEnabled) {
    return null;
  }

  const visibleEvents = events
    .filter(event =>
      event.kind === 'reaction'
        ? reactionsEnabled
        : feedEnabled,
    )
    .slice(-8);

  return (
    <View style={s.panel}>
      <Text style={s.title}>
        Live Activity
      </Text>

      {visibleEvents.length === 0 && (
        <Text style={s.caption}>
          Nothing yet. Join the fun!
        </Text>
      )}

      {visibleEvents.map(event => (
        <View
          key={event.id}
          style={[
            s.event,
            event.kind === 'correct' &&
              s.correctEvent,
          ]}
        >
          <Text style={[
            s.message,
            event.kind === 'correct' &&
              s.correctText,
          ]}>
            <Text style={s.name}>
              {event.playerName}
            </Text>

            {': '}
            {event.text}
          </Text>
        </View>
      ))}

      {reactionsEnabled &&
        room.status === 'playing' && (
          <View style={s.reactions}>
            {REACTIONS.map(reaction => (
              <Pressable
                key={reaction}
                disabled={coolingDown}
                onPress={() =>
                  void react(reaction)
                }
                accessibilityRole="button"
                accessibilityLabel={`Send ${reaction}`}
                style={[
                  s.reaction,
                  coolingDown && s.disabled,
                ]}
              >
                <Text style={s.emoji}>
                  {reaction}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

      {!!error && (
        <Text style={s.error}>
          {error}
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  panel: {
    backgroundColor: '#242841',
    borderRadius: 16,
    padding: 14,
    gap: 9,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  caption: {
    color: '#A6A9C4',
    fontSize: 12,
  },
  event: {
    backgroundColor: '#303550',
    padding: 9,
    borderRadius: 9,
  },
  correctEvent: {
    backgroundColor: '#23483D',
  },
  message: {
    color: '#D5D8E9',
    fontSize: 13,
    lineHeight: 19,
  },
  name: {
    fontWeight: '900',
  },
  correctText: {
    color: '#55D99A',
  },
  reactions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  reaction: {
    backgroundColor: '#343956',
    borderRadius: 10,
    padding: 9,
    flexGrow: 1,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 22,
  },
  disabled: {
    opacity: 0.45,
  },
  error: {
    color: '#FF9AAE',
    fontSize: 12,
  },
});
