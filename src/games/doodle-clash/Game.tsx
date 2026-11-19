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

import Canvas from './Canvas';
import RoundPanel from './RoundPanel';
import DrawingTools from './DrawingTools';

import {
  DOODLE_CLASH_CONFIG,
} from './config';

import {
  subscribeToDoodleRoom,
  subscribeToDrawing,
  updateDrawing,
  type DoodleRoom,
  type DrawingState,
  type DrawingAction,
} from './doodleClashRooms';

import type {
  Stroke,
  DrawingTool,
} from './types';

function message(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Something went wrong.';
}

export default function DoodleClashGame() {
  const params = useLocalSearchParams<{
    code?: string;
  }>();

  const code =
    typeof params.code === 'string'
      ? params.code
      : '';

  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code)) {
    return <InvalidRoom />;
  }

  return <Match key={code} code={code} />;
}

function InvalidRoom() {
  const router = useRouter();

  return (
    <View style={s.center}>
      <Text style={s.title}>
        Invalid room code
      </Text>

      <Pressable
        style={s.button}
        onPress={() => router.replace(
          '/multiplayer/doodle-clash' as Href
        )}
      >
        <Text style={s.buttonText}>
          Return to lobby
        </Text>
      </Pressable>
    </View>
  );
}

function Match({ code }: { code: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [uid, setUid] = useState('');

  const [room, setRoom] =
    useState<DoodleRoom | null>(null);

  const [drawing, setDrawing] =
    useState<DrawingState | null>(null);

  const [color, setColor] =
    useState('#171717');

  const [brushSize, setBrushSize] =
    useState(8);

  const [tool, setTool] =
    useState<DrawingTool>('brush');

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState(false);

  const [touching, setTouching] =
    useState(false);

  const [error, setError] =
    useState('');

  const lock = useRef(false);
  const exiting = useRef(false);

  const member = !!(
    room &&
    uid &&
    Object.prototype.hasOwnProperty.call(
      room.players,
      uid
    )
  );

  const synchronized = !!(
    room &&
    drawing &&
    room.matchNumber === drawing.matchNumber
  );

  const isArtist =
    member &&
    synchronized &&
    room?.status === 'playing' &&
    room.phase === 'drawing' &&
    room.artistId === uid;

  const isHost =
    member && room?.hostId === uid;

  const canDraw =
    isArtist && !busy;

  const { statusOf } =
    useMultiplayerPresence(
      DOODLE_CLASH_CONFIG.presence,
      code,
      member,
    );

  function acceptDrawing(
    incoming: DrawingState | null,
  ) {
    if (!incoming) return;

    setDrawing(previous => {
      if (!previous) return incoming;

      if (
        incoming.matchNumber <
        previous.matchNumber
      ) {
        return previous;
      }

      if (
        incoming.matchNumber === previous.matchNumber &&
        incoming.revision < previous.revision
      ) {
        return previous;
      }

      return incoming;
    });
  }

  useEffect(() => {
    let alive = true;

    let unsubscribeRoom =
      () => {};

    async function connect() {
      try {
        const user = await getMatchUser();

        if (!alive) return;

        setUid(user.uid);

        unsubscribeRoom = subscribeToDoodleRoom(
          code,

          value => {
            if (!alive || exiting.current) return;

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
                'You are no longer in this room.'
              );
            }
          },

          reason => {
            if (!alive) return;
            setError(reason);
            setLoading(false);
          },
        );
      } catch (reason) {
        if (!alive) return;

        setError(message(reason));
        setLoading(false);
      }
    }

    void connect();

    return () => {
      alive = false;
      unsubscribeRoom();
    };
  }, [code]);

  useEffect(() => {
    if (!member) return;

    return subscribeToDrawing(
      code,
      acceptDrawing,
      setError,
    );
  }, [code, member]);

  useEffect(() => {
    if (!member) return;

    return startHeartbeat(
      DOODLE_CLASH_CONFIG.presence,
      code,
    );
  }, [code, member]);

  useEffect(() => {
    if (!isArtist) {
      setTouching(false);
    }
  }, [isArtist]);

  async function sendAction(
    action: DrawingAction,
    stroke?: Stroke,
  ) {
    if (
      lock.current ||
      !isArtist ||
      !drawing
    ) {
      return;
    }

    lock.current = true;

    setBusy(true);
    setError('');

    try {
      const updated = await updateDrawing(
        code,
        drawing,
        action,
        stroke,
      );

      acceptDrawing(updated);
    } catch (reason) {
      setError(message(reason));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  function addStroke(stroke: Stroke) {
    let points = stroke.points;

    if (points.length > 500) {
      const original = points;

      points = Array.from(
        { length: 500 },
        (_, index) =>
          original[
            Math.round(
              index * (original.length - 1) / 499
            )
          ],
      );
    }

    void sendAction('add', {
      ...stroke,
      points,
    });
  }

  async function leave() {
    if (lock.current) return;

    lock.current = true;
    exiting.current = true;

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

      router.replace(
        '/multiplayer/doodle-clash' as Href
      );
    } catch (reason) {
      exiting.current = false;
      setError(message(reason));
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
      setError(message(reason));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator
          color="#A5E1EB"
          size="large"
        />

        <Text style={s.caption}>
          Connecting to room...
        </Text>
      </View>
    );
  }

  if (!member || !room) {
    return (
      <View style={s.center}>
        <Text style={s.title}>
          Room unavailable
        </Text>

        <Text style={s.error}>
          {error || 'Room not found.'}
        </Text>

        <Pressable
          style={s.button}
          onPress={() => void leave()}
          disabled={busy}
        >
          <Text style={s.buttonText}>
            Return to lobby
          </Text>
        </Pressable>
      </View>
    );
  }

  const artistName =
    room.artistId
      ? room.players[room.artistId]
      : '';

  const players =
    room.playerOrder ??
    Object.keys(room.players);

  return (
    <ScrollView
      style={s.root}
      scrollEnabled={!touching}
      contentContainerStyle={[
        s.content,
        {
          paddingTop: Math.max(insets.top + 15, 30),
          paddingBottom: insets.bottom + 30,
        },
      ]}
    >
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>
            MULTIPLAYER ROOM
          </Text>

          <Text style={s.title}>
            Doodle Clash
          </Text>

          <Text style={s.caption}>
            Room: {code}
          </Text>
        </View>

        <Pressable
          disabled={busy}
          onPress={() => void leave()}
          style={[
            s.leaveButton,
            busy && s.disabled,
          ]}
        >
          <Text style={s.leaveText}>
            Leave
          </Text>
        </Pressable>
      </View>

      <RoundPanel
        key={`${room.matchNumber}-${room.phase}`}
        code={code}
        room={room}
        uid={uid}
      />

      {room.status === 'finished' ? (
        <View style={s.panel}>
          <Text style={s.title}>
            Session ended
          </Text>

          <Text style={s.caption}>
            Check the final scores above.
          </Text>

          {isHost && players.length >= 2 && (
            <Pressable
              disabled={busy}
              onPress={() => void rematch()}
              style={s.button}
            >
              <Text style={s.buttonText}>
                Play again
              </Text>
            </Pressable>
          )}
        </View>
      ) : (
        <>
          <View style={s.panel}>
            <Text style={s.eyebrow}>
              {room.phase === 'choosing' ? 'WORD SELECTION' : room.phase === 'results' ? 'ROUND RESULTS' : isArtist ? 'ARTIST MODE' : 'VIEWER MODE'}
            </Text>

            <Text style={s.artistTitle}>
              {isArtist
                ? 'Your turn to draw'
                : `${artistName || 'The artist'} is drawing`}
            </Text>

            <Text style={s.caption}>
              {busy
                ? 'Synchronizing drawing...'
                : isArtist
                  ? 'Create something for your friends.'
                  : 'Watch the shared canvas.'}
            </Text>
          </View>

          {!room.phase || room.phase === 'choosing' ? null : synchronized && drawing ? (
            <View
              onTouchStart={() => {
                if (canDraw) setTouching(true);
              }}
              onTouchEnd={() => setTouching(false)}
              onTouchCancel={() => setTouching(false)}
            >
              <Canvas
                key={room.matchNumber}
                strokes={drawing.strokes}
                color={color}
                brushSize={brushSize}
                tool={tool}
                canDraw={canDraw}
                onStrokeComplete={addStroke}
              />
            </View>
          ) : (
            <View style={s.panel}>
              <ActivityIndicator color="#A5E1EB" />

              <Text style={s.caption}>
                Loading shared drawing...
              </Text>
            </View>
          )}

          {isArtist && drawing && (
            <View
              pointerEvents={busy ? 'none' : 'auto'}
              style={busy && s.disabled}
            >
              <DrawingTools
                color={color}
                brushSize={brushSize}
                tool={tool}
                canUndo={drawing.strokes.length > 0}
                canRedo={drawing.redoStack.length > 0}
                onColorChange={setColor}
                onSizeChange={setBrushSize}
                onToolChange={setTool}
                onUndo={() => void sendAction('undo')}
                onRedo={() => void sendAction('redo')}
                onClear={() => void sendAction('clear')}
              />
            </View>
          )}

          <Text style={s.caption}>
            Strokes: {drawing?.strokes.length ?? 0}
            {' / 250'}
          </Text>
        </>
      )}

      {!!error && (
        <Text style={s.error}>
          {error}
        </Text>
      )}

      <View style={s.panel}>
        <Text style={s.sectionTitle}>
          Players ({players.length})
        </Text>

        {players.map(id => (
          <View key={id} style={s.player}>
            <View
              style={[
                s.dot,
                {
                  backgroundColor:
                    statusOf(id) === 'online'
                      ? '#42D99A'
                      : statusOf(id) === 'connecting'
                        ? '#FFD071'
                        : '#E57383',
                },
              ]}
            />

            <Text style={s.playerName}>
              {room.players[id]}
              {id === uid ? ' (You)' : ''}
              {id === room.hostId ? ' - Host' : ''}
            </Text>

            {id === room.artistId && (
              <Text style={s.artistLabel}>
                ARTIST
              </Text>
            )}
          </View>
        ))}
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
    backgroundColor: '#121629',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
    gap: 18,
  },

  content: {
    width: '100%',
    maxWidth: 850,
    alignSelf: 'center',
    paddingHorizontal: 18,
    gap: 16,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
  },

  eyebrow: {
    color: '#C5BAFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  caption: {
    color: '#A6A9C4',
    fontSize: 13,
    lineHeight: 20,
  },

  panel: {
    backgroundColor: '#242841',
    padding: 18,
    borderRadius: 16,
    gap: 10,
  },

  artistTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
  },

  button: {
    backgroundColor: '#A5E1EB',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },

  buttonText: {
    color: '#121629',
    fontWeight: '900',
  },

  leaveButton: {
    backgroundColor: '#593044',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  leaveText: {
    color: '#FFB5C4',
    fontWeight: '800',
  },

  disabled: {
    opacity: 0.6,
  },

  player: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#303550',
    borderRadius: 10,
    padding: 12,
  },

  playerName: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  artistLabel: {
    color: '#A5E1EB',
    fontSize: 10,
    fontWeight: '900',
  },

  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },

  error: {
    fontSize: 13,
    lineHeight: 20,
    color: '#FF9AAE',
  },
});

