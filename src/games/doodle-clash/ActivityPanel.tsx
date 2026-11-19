import {
  useEffect,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

import {
  doc,
  onSnapshot,
} from 'firebase/firestore';

import { db } from '../../config/firebase';

import type {
  DoodleRoom,
} from './doodleClashRooms';

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

  const enabled =
    room.matchSettings?.guessFeed !== false;

  useEffect(() => {
    setEvents([]);
    setError('');

    if (!enabled) return;

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

        const entries: Event[] =
          value.events ?? [];

        setEvents(
          entries.filter(event =>
            event.kind === 'guess' ||
            event.kind === 'correct',
          ).slice(-8),
        );
      },

      reason => setError(reason.message),
    );

  }, [
    code,
    room.matchNumber,
    enabled,
  ]);

  if (!enabled) return null;

  return (
    <View style={s.panel}>
      <Text style={s.title}>
        Live Guesses
      </Text>

      {!events.length && (
        <Text style={s.caption}>
          Waiting for guesses...
        </Text>
      )}

      {events.map(event => (
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

  error: {
    color: '#FF9AAE',
    fontSize: 12,
  },
});
