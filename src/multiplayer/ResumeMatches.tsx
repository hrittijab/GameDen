import {
  useCallback,
  useRef,
  useState,
} from 'react';

import {
  useFocusEffect,
  useRouter,
} from 'expo-router';

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { auth } from '../config/firebase';

import {
  verifySavedRooms,
  forgetSavedRoom,
  type RecoveryEntry,
} from './recovery';

import { leaveRoom } from './presence';

export default function ResumeMatches() {
  const router = useRouter();

  const [entries, setEntries] =
    useState<RecoveryEntry[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState('');

  const [confirmation, setConfirmation] =
    useState('');

  const generation = useRef(0);
  const lock = useRef(false);

  const refresh = useCallback(async () => {
    const request = ++generation.current;

    setLoading(true);
    setError('');

    try {
      const result = await verifySavedRooms();

      if (request !== generation.current) {
        return;
      }

      setEntries(
        result.sort(
          (a, b) =>
            b.session.savedAt - a.session.savedAt,
        ),
      );
    } catch {
      if (request === generation.current) {
        setError(
          'Could not check saved matches.',
        );
      }
    } finally {
      if (request === generation.current) {
        setLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setConfirmation('');

      void refresh();

      return () => {
        generation.current++;
      };
    }, [refresh]),
  );

  const resume = (entry: RecoveryEntry) => {
    if (
      loading ||
      lock.current ||
      entry.state !== 'available' ||
      !entry.room
    ) {
      return;
    }

    if (entry.room.status === 'lobby') {
      router.push({
        pathname: '/multiplayer/[game]',
        params: {
          game: entry.config.gameId,
        },
      });

      return;
    }

    router.push({
      pathname: '/multiplayer/[game]/match',
      params: {
        game: entry.config.gameId,
        code: entry.session.code,
      },
    });
  };

  const remove = async (entry: RecoveryEntry) => {
    if (lock.current || loading) return;

    lock.current = true;
    setBusy(true);
    setError('');

    try {
      if (entry.state === 'available') {
        const user = auth.currentUser;

        if (user?.uid !== entry.session.uid) {
          throw new Error(
            'Your player identity has changed.',
          );
        }

        await leaveRoom(
          entry.config.presence,
          entry.session.code,
        );
      } else if (entry.state === 'unverified') {
        throw new Error(
          'Reconnect before leaving this match.',
        );
      }

      await forgetSavedRoom(
        entry.config.gameId,
        entry.session,
      );

      setEntries(old =>
        old.filter(item =>
          item.config.gameId !==
            entry.config.gameId ||
          item.session.code !== entry.session.code,
        ),
      );

      setConfirmation('');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Could not leave the match.',
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  if (!entries.length && !loading && !error) {
    return null;
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>
          Continue playing
        </Text>

        <Pressable
          disabled={loading || busy}
          onPress={() => void refresh()}
          accessibilityRole="button"
        >
          <Text style={s.refresh}>
            Refresh
          </Text>
        </Pressable>
      </View>

      {loading && (
        <View style={s.loading}>
          <ActivityIndicator color="#A5E1EB" />

          <Text style={s.caption}>
            Checking saved matches...
          </Text>
        </View>
      )}

      {entries.map(entry => {
        const {
          config,
          room,
          session,
          state,
        } = entry;

        const key =
          `${config.gameId}-${session.code}`;

        const available = state === 'available';

        const finished =
          room?.status === 'finished';

        const lobby =
          room?.status === 'lobby';

        const label =
          state === 'unverified'
            ? 'CONNECTION REQUIRED'
            : state === 'unavailable'
              ? 'ROOM UNAVAILABLE'
              : finished
                ? 'MATCH COMPLETED'
                : lobby
                  ? 'ROOM WAITING'
                  : 'MATCH IN PROGRESS';

        return (
          <View
            key={key}
            style={[
              s.card,
              !available && s.inactive,
              finished && s.finished,
            ]}
          >
            <Text style={[
              s.badge,
              !available && s.warning,
              finished && s.purple,
            ]}>
              {label}
            </Text>

            <View style={s.gameRow}>
              <View style={s.iconBox}>
                <Text style={s.icon}>
                  {config.icon}
                </Text>
              </View>

              <View style={s.info}>
                <Text style={s.gameTitle}>
                  {config.title}
                </Text>

                <Text style={s.caption}>
                  Room {session.code}
                </Text>

                <Text style={s.caption}>
                  Playing as {
                    room?.players[session.uid] ??
                    session.playerName
                  }
                </Text>

                {room && (
                  <Text style={s.caption}>
                    {Object.keys(room.players).length}
                    {' players remaining'}
                  </Text>
                )}
              </View>
            </View>

            {!!entry.message && (
              <Text style={s.caption}>
                {entry.message}
              </Text>
            )}

            {available && (
              <Pressable
                disabled={busy || loading}
                style={[
                  s.primary,
                  finished && s.resultButton,
                  (busy || loading) && s.disabled,
                ]}
                onPress={() => resume(entry)}
                accessibilityRole="button"
              >
                <Text style={[
                  s.primaryText,
                  finished && s.white,
                ]}>
                  {finished
                    ? 'View Results'
                    : lobby
                      ? 'Return to Room'
                      : 'Resume Match'}
                </Text>
              </Pressable>
            )}

            {state === 'unverified' && (
              <Pressable
                disabled={busy || loading}
                onPress={() => void refresh()}
                style={s.secondary}
              >
                <Text style={s.white}>
                  Retry Connection
                </Text>
              </Pressable>
            )}

            {state !== 'unverified' && (
              confirmation === key ? (
                <View style={s.confirm}>
                  <Text style={s.caption}>
                    {available && !finished && !lobby
                      ? 'Leaving will forfeit your match.'
                      : available
                        ? 'Leave this room?'
                        : 'Remove this saved session?'}
                  </Text>

                  <View style={s.buttons}>
                    <Pressable
                      disabled={busy}
                      style={s.cancel}
                      onPress={() =>
                        setConfirmation('')
                      }
                    >
                      <Text style={s.white}>
                        Cancel
                      </Text>
                    </Pressable>

                    <Pressable
                      disabled={busy || loading}
                      style={s.danger}
                      onPress={() => void remove(entry)}
                    >
                      <Text style={s.white}>
                        {busy
                          ? 'Leaving...'
                          : available
                            ? 'Confirm Leave'
                            : 'Remove'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  disabled={busy || loading}
                  onPress={() =>
                    setConfirmation(key)
                  }
                >
                  <Text style={s.leave}>
                    {!available
                      ? 'Dismiss'
                      : finished || lobby
                        ? 'Leave Room'
                        : 'Leave Match'}
                  </Text>
                </Pressable>
              )
            )}
          </View>
        );
      })}

      {!!error && (
        <Text style={s.error}>
          {error}
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 12,
    marginBottom: 28,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },

  refresh: {
    color: '#A5E1EB',
    fontSize: 12,
    fontWeight: '800',
    padding: 7,
  },

  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  card: {
    backgroundColor: '#203D40',
    borderColor: '#65CDB1',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 13,
  },

  inactive: {
    backgroundColor: '#302B3D',
    borderColor: '#75536D',
  },

  finished: {
    backgroundColor: '#302C42',
    borderColor: '#7766AA',
  },

  badge: {
    color: '#65CDB1',
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 1.4,
  },

  warning: {
    color: '#FFD071',
  },

  purple: {
    color: '#C5BAFF',
  },

  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  iconBox: {
    width: 60,
    height: 60,
    backgroundColor: '#49466D',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  icon: {
    fontSize: 32,
  },

  info: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },

  gameTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },

  caption: {
    color: '#C8CCDF',
    fontSize: 12,
    lineHeight: 18,
  },

  primary: {
    borderRadius: 12,
    backgroundColor: '#A5E1EB',
    padding: 15,
    alignItems: 'center',
  },

  primaryText: {
    color: '#15313C',
    fontWeight: '900',
    fontSize: 15,
  },

  resultButton: {
    backgroundColor: '#554B82',
  },

  white: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    textAlign: 'center',
  },

  secondary: {
    backgroundColor: '#49466D',
    padding: 13,
    alignItems: 'center',
    borderRadius: 10,
  },

  leave: {
    color: '#FF9CAD',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
    paddingVertical: 6,
  },

  confirm: {
    backgroundColor: '#121629',
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },

  buttons: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },

  cancel: {
    flex: 1,
    backgroundColor: '#505775',
    borderRadius: 9,
    padding: 12,
  },

  danger: {
    flex: 1,
    backgroundColor: '#D73D53',
    borderRadius: 9,
    padding: 12,
  },

  disabled: {
    opacity: 0.45,
  },

  error: {
    color: '#FF9CAD',
    fontSize: 13,
  },
});
