import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import {
  useLocalSearchParams,
  useRouter,
  type Href,
} from 'expo-router';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  getMatchUser,
} from '../../multiplayer/auth';

import {
  startHeartbeat,
  leaveRoom,
  useMultiplayerPresence,
} from '../../multiplayer/presence';

import {
  clearSession,
} from '../../multiplayer/session';

import {
  DOODLE_CLASH_CONFIG,
} from './config';

import {
  subscribeToDoodleRoom,
  type DoodleRoom,
} from './doodleClashRooms';

import {
  maintainMatch,
} from './liveDrawing';

import {
  useDrawingSync,
} from './useDrawingSync';

import Canvas from './Canvas';

import { INK_LIMIT } from './settings';
import { remainingInk } from './drawingLimits';
import DrawingTools from './DrawingTools';
import RoundPanel from './RoundPanel';
import SoundFeedback from './SoundFeedback';
import SoundButton from '../../audio/SoundButton';

import ReactionBar from '../../multiplayer/ReactionBar';
import ReactionStrip from '../../multiplayer/ReactionStrip';

import {
  reactionsEnabled,
} from '../../multiplayer/reactions';

import type {
  DrawingTool,
} from './types';

const LOBBY =
  '/multiplayer/doodle-clash' as Href;

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Something went wrong.';
}

export default function DoodleClashGame() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    code?: string;
  }>();

  const code =
    typeof params.code === 'string'
      ? params.code
      : '';

  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code)) {
    return (
      <View style={s.center}>
        <Text style={s.title}>
          Invalid room code
        </Text>

        <Pressable
          style={s.button}
          onPress={() => router.replace(LOBBY)}
        >
          <Text style={s.buttonText}>
            Return to lobby
          </Text>
        </Pressable>
      </View>
    );
  }

  return <Match key={code} code={code} />;
}

function Match({
  code,
}: {
  code: string;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [uid, setUid] = useState('');

  const [room, setRoom] =
    useState<DoodleRoom | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState('');

  const [color, setColor] =
    useState('#171717');

  const [brushSize, setBrushSize] =
    useState(8);

  const [tool, setTool] =
    useState<DrawingTool>('brush');

  const [touching, setTouching] =
    useState(false);



  const leaving = useRef(false);
  const lock = useRef(false);

  const member = !!(
    room &&
    uid &&
    Object.prototype.hasOwnProperty.call(
      room.players,
      uid,
    )
  );

  const isArtist =
    member &&
    room?.status === 'playing' &&
    room.phase === 'drawing' &&
    room.artistId === uid;

  const isHost =
    member &&
    room?.hostId === uid;

  const sync = useDrawingSync(
    code,
    room,
    member,
    isArtist,
  );

  const {
    statusOf,
  } = useMultiplayerPresence(
    DOODLE_CLASH_CONFIG.presence,
    code,
    member,
  );

  const players = room
    ? room.playerOrder ??
      Object.keys(room.players)
    : [];

  const coordinator = room
    ? [
        room.hostId,
        ...players.filter(
          id => id !== room.hostId,
        ),
      ].find(
        id => statusOf(id) === 'online',
      ) ?? room.hostId
    : '';

  const roundMode =
    room?.roundMode ?? 'classic';

  const restricted =
    roundMode === 'ink' ||
    roundMode === 'stroke';

  const inkRemaining = remainingInk(
    sync.strokes,
  );

  const strokeAvailable =
    roundMode !== 'stroke' ||
    sync.strokes.length === 0;

  const inkAvailable =
    roundMode !== 'ink' ||
    inkRemaining >= 1;

  const effectiveColor =
    restricted && color === '#FFFFFF'
      ? '#171717'
      : color;

  const effectiveTool =
    restricted ? 'brush' : tool;

  const canDraw =
    isArtist &&
    sync.synchronized &&
    !busy &&
    sync.queued < 30 &&
    strokeAvailable &&
    inkAvailable;

  useEffect(() => {
    let alive = true;
    let unsubscribe = () => {};

    void getMatchUser()
      .then(user => {
        if (!alive) return;

        setUid(user.uid);

        unsubscribe = subscribeToDoodleRoom(
          code,

          value => {
            if (
              !alive ||
              leaving.current
            ) {
              return;
            }

            setRoom(value);
            setLoading(false);

            if (
              !value ||
              !Object.prototype.hasOwnProperty.call(
                value.players,
                user.uid,
              )
            ) {
              setError(
                'You are no longer in this room.',
              );
            }
          },

          reason => {
            if (!alive) return;

            setError(reason);
            setLoading(false);
          },
        );
      })
      .catch(reason => {
        if (!alive) return;

        setError(errorMessage(reason));
        setLoading(false);
      });

    return () => {
      alive = false;
      unsubscribe();
    };
  }, [code]);

  useEffect(() => {
    if (!member) return;

    return startHeartbeat(
      DOODLE_CLASH_CONFIG.presence,
      code,
    );
  }, [code, member]);

  useEffect(() => {
    if (
      !member ||
      !room ||
      room.status !== 'playing' ||
      coordinator !== uid
    ) {
      return;
    }

    let alive = true;
    let pending = false;

    async function check() {
      if (!alive || pending || !room) return;

      pending = true;

      try {
        await maintainMatch(
          code,
          room.matchNumber,
        );
      } catch {
        // Maintenance retries automatically.
      } finally {
        pending = false;
      }
    }

    void check();

    const timer = setInterval(
      () => void check(),
      5000,
    );

    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [
    code,
    uid,
    member,
    coordinator,
    room?.matchNumber,
    room?.status,
  ]);

  useEffect(() => {
    if (!canDraw) {
      setTouching(false);
    }
  }, [canDraw]);

  async function leave() {
    if (lock.current) return;

    lock.current = true;
    leaving.current = true;

    setBusy(true);
    setError('');

    try {
      if (member) {
        await leaveRoom(
          DOODLE_CLASH_CONFIG.presence,
          code,
        );
      }

      await clearSession('doodle-clash');

      router.replace(LOBBY);
    } catch (reason) {
      leaving.current = false;
      setError(errorMessage(reason));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function rematch() {
    if (
      lock.current ||
      !isHost ||
      room?.status !== 'finished'
    ) {
      return;
    }

    lock.current = true;

    setBusy(true);
    setError('');

    try {
      await DOODLE_CLASH_CONFIG.startMatch(code);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator
          size="large"
          color="#A5E1EB"
        />

        <Text style={s.caption}>
          Connecting to your match...
        </Text>
      </View>
    );
  }

  if (!room || !member) {
    return (
      <View style={s.center}>
        <Text style={s.title}>
          Room unavailable
        </Text>

        <Text style={s.error}>
          {error || 'Room not found.'}
        </Text>

        <Pressable
          disabled={busy}
          style={s.button}
          onPress={() => void leave()}
        >
          <Text style={s.buttonText}>
            Return to lobby
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={s.root}
      scrollEnabled={!touching}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        s.content,
        {
          paddingTop: Math.max(
            insets.top + 12,
            24,
          ),
          paddingBottom: insets.bottom + 24,
        },
      ]}
    >
      <SoundFeedback
        room={room}
        uid={uid}

      />

      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>
            Doodle Clash
          </Text>

          <Text style={s.caption}>
            Room {code}
          </Text>
        </View>

        <SoundButton accent="#A5E1EB" />

        <Pressable
          disabled={busy}
          onPress={() => void leave()}
          style={s.leaveButton}
        >
          <Text style={s.leaveText}>
            Leave
          </Text>
        </Pressable>
      </View>

      {reactionsEnabled(room) && (
        <View style={s.reactionRow}>
          <ReactionBar
            game="doodle-clash"
            code={code}
            room={room}
            accent="#A5E1EB"
            disabled={touching || busy}
          />

          <View style={{ flex: 1, minWidth: 0 }}>
            <ReactionStrip
              room={room}
              uid={uid}
            />
          </View>
        </View>
      )}

      <RoundPanel
        key={`${room.matchNumber}-${room.phase}`}
        code={code}
        room={room}
        uid={uid}
      >
        {sync.synchronized ? (
          <View style={s.canvasSection}>
            <View
              onTouchStart={() => {
                if (canDraw) {
                  setTouching(true);
                }
              }}
              onTouchEnd={() => setTouching(false)}
              onTouchCancel={() => setTouching(false)}
            >
              <Canvas
                key={room.matchNumber}
                strokes={sync.strokes}
                commitOnCancel={
                  roundMode === 'stroke'
                }
                hideDrawing={
                  isArtist &&
                  roundMode === 'blind'
                }
                maxDistance={
                  roundMode === 'ink'
                    ? inkRemaining
                    : undefined
                }
                color={effectiveColor}
                brushSize={brushSize}
                tool={effectiveTool}
                canDraw={canDraw}
                onStrokeProgress={sync.progress}
                onStrokeComplete={stroke =>
                  sync.enqueue('add', stroke)
                }
              />
            </View>

            {isArtist && (
              <>
                {roundMode === 'ink' && (
                  <View style={s.inkPanel}>
                    <Text style={s.caption}>
                      Ink remaining: {
                        Math.round(
                          inkRemaining / INK_LIMIT * 100,
                        )
                      }%
                    </Text>

                    <View style={s.inkTrack}>
                      <View
                        style={[
                          s.inkFill,
                          {
                            width: `${Math.max(
                              0,
                              Math.min(
                                100,
                                inkRemaining / INK_LIMIT * 100,
                              ),
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                )}

                {roundMode === 'stroke' && (
                  <Text style={s.caption}>
                    {strokeAvailable
                      ? 'You have one stroke. Make it count!'
                      : 'Stroke used. Wait for the guesses.'}
                  </Text>
                )}

                {roundMode === 'blind' && (
                  <Text style={s.caption}>
                    Your drawing is hidden from you.
                    Your friends can still see it.
                  </Text>
                )}

                <DrawingTools
                  restricted={restricted}
                  canClear={sync.queued === 0}
                  color={effectiveColor}
                  brushSize={brushSize}
                  tool={effectiveTool}
                  canUndo={
                    sync.queued === 0 &&
                    !!sync.drawing?.strokes.length
                  }
                  canRedo={
                    sync.queued === 0 &&
                    !!sync.drawing?.redoStack.length
                  }
                  onColorChange={setColor}
                  onSizeChange={setBrushSize}
                  onToolChange={setTool}
                  onUndo={() => sync.enqueue('undo')}
                  onRedo={() => sync.enqueue('redo')}
                  onClear={() => sync.enqueue('clear')}
                />

                <Text style={s.caption}>
                  {sync.queued > 0
                    ? 'Saving drawing...'
                    : 'Drawing synchronized'}
                </Text>
              </>
            )}
          </View>
        ) : (
          <ActivityIndicator
            color="#A5E1EB"
          />
        )}
      </RoundPanel>

      {room.status === 'finished' &&
        isHost &&
        players.length >= 2 && (
          <Pressable
            disabled={busy}
            style={s.button}
            onPress={() => void rematch()}
          >
            <Text style={s.buttonText}>
              Play again
            </Text>
          </Pressable>
        )}

      {(error || sync.error) !== '' && (
        <Text style={s.error}>
          {error || sync.error}
        </Text>
      )}

      <View style={s.playerPanel}>
        <Text style={s.sectionTitle}>
          Players ({players.length})
        </Text>

        {players.map(id => {
          const status = statusOf(id);

          return (
            <View
              key={id}
              style={s.player}
            >
              <View
                style={[
                  s.dot,
                  {
                    backgroundColor:
                      status === 'online'
                        ? '#55D99A'
                        : status === 'connecting'
                          ? '#FFD071'
                          : '#FF8398',
                  },
                ]}
              />

              <Text style={s.playerName}>
                {room.players[id]}
                {id === uid ? ' (You)' : ''}
                {id === room.hostId ? ' - Host' : ''}
              </Text>

              {room.artistId === id && (
                <Text style={s.artistLabel}>
                  ARTIST
                </Text>
              )}

              {status === 'offline' && (
                <Text style={s.caption}>
                  Offline
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#121629',
  },

  center: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121629',
    gap: 16,
  },

  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 12,
    gap: 12,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  title: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 24,
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },

  caption: {
    color: '#A6A9C4',
    fontSize: 12,
    lineHeight: 18,
  },

  inkPanel: {
    backgroundColor: '#303550',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },

  inkTrack: {
    height: 9,
    backgroundColor: '#15182D',
    borderRadius: 6,
    overflow: 'hidden',
  },

  inkFill: {
    height: 9,
    backgroundColor: '#55D99A',
    borderRadius: 6,
  },

  reactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#242841',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  canvasSection: {
    gap: 10,
  },

  button: {
    backgroundColor: '#A5E1EB',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },

  soundButton: {
    backgroundColor: '#A5E1EB',
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderRadius: 10,
  },

  buttonText: {
    color: '#121629',
    fontSize: 12,
    fontWeight: '900',
  },

  leaveButton: {
    backgroundColor: '#593044',
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderRadius: 10,
  },

  leaveText: {
    color: '#FFB5C4',
    fontSize: 12,
    fontWeight: '900',
  },

  playerPanel: {
    padding: 14,
    backgroundColor: '#242841',
    borderRadius: 16,
    gap: 8,
  },

  player: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 8,
    borderRadius: 10,
    backgroundColor: '#303550',
  },

  playerName: {
    flex: 1,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  artistLabel: {
    color: '#A5E1EB',
    fontSize: 10,
    fontWeight: '900',
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  error: {
    color: '#FF9AAE',
    lineHeight: 20,
    fontSize: 13,
  },
});




