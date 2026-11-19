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
  Modal,
} from 'react-native';

import {
  EMOJIS,
  COOLDOWN_MS,
  sendReaction,
  reactionsEnabled,
  type ReactionGame,
  type ReactionRoom,
} from './reactions';

export default function ReactionBar({
  game,
  code,
  room,
  accent = '#A991FF',
  disabled = false,
}: {
  game: ReactionGame;
  code: string;
  room: ReactionRoom;
  accent?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const lock = useRef(false);
  const alive = useRef(true);

  const cooldown = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  const errorTimer = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  const enabled = reactionsEnabled(room);

  useEffect(() => {
    alive.current = true;

    return () => {
      alive.current = false;

      if (cooldown.current) {
        clearTimeout(cooldown.current);
      }

      if (errorTimer.current) {
        clearTimeout(errorTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!enabled || disabled) {
      setOpen(false);
    }
  }, [enabled, disabled]);

  async function react(emoji: string) {
    if (
      lock.current ||
      disabled ||
      !enabled
    ) return;

    lock.current = true;
    setBusy(true);
    setOpen(false);
    setError('');

    try {
      await sendReaction(
        game,
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

        if (errorTimer.current) {
          clearTimeout(errorTimer.current);
        }

        errorTimer.current = setTimeout(
          () => setError(''),
          3500,
        );
      }
    } finally {
      if (alive.current) {
        cooldown.current = setTimeout(() => {
          lock.current = false;
          setBusy(false);
        }, COOLDOWN_MS);
      }
    }
  }

  if (!enabled) return null;

  return (
    <View style={s.wrapper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Send emoji reaction"
        disabled={busy || disabled}
        onPress={() => setOpen(true)}
        style={[
          s.trigger,
          { borderColor: accent },
          (busy || disabled) && s.disabled,
        ]}
      >
        <Text style={s.triggerEmoji}>
          😊
        </Text>

        <Text style={s.triggerText}>
          {busy ? 'Wait' : 'React'}
        </Text>
      </Pressable>

      <Modal
        visible={open && enabled && !disabled}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={s.backdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Close reactions"
          />

          <View style={s.popup}>
            <View style={s.header}>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>
                  Express yourself
                </Text>

                <Text style={s.caption}>
                  Send a reaction to your friends
                </Text>
              </View>

              <Pressable
                style={s.close}
                onPress={() => setOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Close reaction picker"
              >
                <Text style={s.closeText}>×</Text>
              </Pressable>
            </View>

            <View style={s.grid}>
              {EMOJIS.map(emoji => (
                <Pressable
                  key={emoji}
                  disabled={busy}
                  onPress={() => void react(emoji)}
                  accessibilityRole="button"
                  accessibilityLabel={`Send ${emoji}`}
                  style={({ pressed }) => [
                    s.emojiButton,
                    pressed && {
                      backgroundColor: accent,
                      transform: [{ scale: 0.92 }],
                    },
                  ]}
                >
                  <Text style={s.emoji}>
                    {emoji}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {!!error && (
        <Text style={s.error}>
          {error}
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    alignItems: 'flex-start',
    gap: 4,
  },

  trigger: {
    backgroundColor: '#343956',
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  triggerEmoji: {
    fontSize: 21,
  },

  triggerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },

  disabled: {
    opacity: 0.5,
  },

  backdrop: {
    flex: 1,
    backgroundColor: '#00000055',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 40,
  },

  popup: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#252440',
    borderColor: '#625A88',
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    gap: 15,
    elevation: 12,

    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 5,
    },
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
  },

  caption: {
    color: '#B7B4CE',
    fontSize: 12,
    marginTop: 4,
  },

  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#464064',
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeText: {
    color: '#FFFFFF',
    fontSize: 25,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },

  emojiButton: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: '#393650',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emoji: {
    fontSize: 30,
  },

  error: {
    color: '#FF9AAE',
    fontSize: 12,
  },
});

