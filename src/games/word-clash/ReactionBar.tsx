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

import { sendReaction } from './wordClashRooms';

import type { WordRoom } from './types';

const EMOJIS = [
  '😂', '🔥', '👏',
  '😱', '🤔', '🏆',
];

export default function ReactionBar({
  code,
  room,
}: {
  code: string;
  room: WordRoom;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [now, setNow] =
    useState(Date.now());

  const lock = useRef(false);

  const alive = useRef(true);

  const timer = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  useEffect(() => {
    alive.current = true;

    const interval = setInterval(
      () => setNow(Date.now()),
      1000,
    );

    return () => {
      alive.current = false;
      clearInterval(interval);

      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, []);

  async function react(emoji: string) {
    if (lock.current) return;

    lock.current = true;
    setBusy(true);
    setError('');

    try {
      await sendReaction(
        code,
        room,
        emoji,
      );
    } catch (reason) {
      if (alive.current) {
        setError(
          reason instanceof Error
            ? reason.message
            : 'Could not send reaction.',
        );
      }
    } finally {
      if (alive.current) {
        timer.current = setTimeout(() => {
          lock.current = false;
          setBusy(false);
        }, 1600);
      }
    }
  }

  if (
    room.status !== 'playing' ||
    room.matchSettings?.reactions === false
  ) {
    return null;
  }

  const recent = Object.entries(
    room.reactions ?? {},
  )
    .filter(([id, reaction]) =>
      !!room.players[id] &&
      now - reaction.timestamp < 6000,
    )
    .sort(
      ([, a], [, b]) =>
        b.timestamp - a.timestamp,
    )
    .slice(0, 4);

  return (
    <View style={s.panel}>
      <View style={s.row}>
        {EMOJIS.map(emoji => (
          <Pressable
            key={emoji}
            disabled={busy}
            onPress={() => void react(emoji)}
            style={[
              s.button,
              busy && s.disabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`React ${emoji}`}
          >
            <Text style={s.emoji}>
              {emoji}
            </Text>
          </Pressable>
        ))}
      </View>

      {recent.map(([id, reaction]) => (
        <Text key={id} style={s.message}>
          {room.players[id]} {reaction.emoji}
        </Text>
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
    backgroundColor: '#2B2843',
    padding: 12,
    borderRadius: 16,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  button: {
    backgroundColor: '#464064',
    padding: 8,
    borderRadius: 10,
    flexGrow: 1,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 23,
  },
  disabled: {
    opacity: 0.4,
  },
  message: {
    color: '#E2D8FF',
    fontSize: 13,
    fontWeight: '700',
  },
  error: {
    color: '#FF9AAE',
    fontSize: 12,
  },
});
