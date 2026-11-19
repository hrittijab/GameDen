import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Platform,
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
  WORD_CLASH_CONFIG,
} from './config';

import {
  subscribeToWordRoom,
  selectLetter,
  submitWord,
  recoverSubmission,
  advancePhase,
  maintainMatch,
} from './wordClashRooms';

import {
  LETTERS,
  WINNING_SCORE,
  OUTCOMES,
  type WordRoom,
} from './types';

import SoundFeedback from './SoundFeedback';
import SoundButton from '../../audio/SoundButton';
import ReactionBar from '../../multiplayer/ReactionBar';
import ReactionStrip from '../../multiplayer/ReactionStrip';
import ReactionBubble from '../../multiplayer/ReactionBubble';

import {
  getReaction,
  reactionsEnabled,
} from '../../multiplayer/reactions';

import {
  MODE_NAMES,
  DEFAULT_SETTINGS,
} from './settings';

const LOBBY = '/multiplayer/word-clash' as Href;

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Something went wrong.';
}

export default function WordClashGame() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    code?: string;
  }>();

  const code = typeof params.code === 'string'
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
    useState<WordRoom | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState('');

  const lock = useRef(false);
  const leaving = useRef(false);



  const member = !!(
    room &&
    uid &&
    Object.prototype.hasOwnProperty.call(
      room.players,
      uid,
    )
  );

  const isHost =
    member &&
    room?.hostId === uid;

  const { statusOf } =
    useMultiplayerPresence(
      WORD_CLASH_CONFIG.presence,
      code,
      member,
    );

  useEffect(() => {
    let alive = true;
    let unsubscribe = () => {};

    void getMatchUser()
      .then(user => {
        if (!alive) return;

        setUid(user.uid);

        unsubscribe = subscribeToWordRoom(
          code,
          value => {
            if (!alive || leaving.current) {
              return;
            }

            setRoom(value);
            setLoading(false);
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
      WORD_CLASH_CONFIG.presence,
      code,
    );
  }, [code, member]);

  const coordinator = room
    ? [
        room.hostId,
        ...Object.keys(room.players).filter(
          id => id !== room.hostId,
        ),
      ].find(
        id => statusOf(id) === 'online',
      ) ?? room.hostId
    : '';

  useEffect(() => {
    if (
      !member ||
      !room ||
      room.status !== 'playing' ||
      coordinator !== uid
    ) return;

    let active = true;
    let pending = false;

    async function check() {
      if (!active || pending || !room) return;

      pending = true;

      try {
        await maintainMatch(code, room);
      } catch {
        // Retry at the next maintenance interval.
      } finally {
        pending = false;
      }
    }

    void check();

    const timer = setInterval(
      () => void check(),
      10000,
    );

    return () => {
      active = false;
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

  async function leave() {
    if (lock.current) return;

    lock.current = true;
    leaving.current = true;

    setBusy(true);
    setError('');

    try {
      if (member) {
        await leaveRoom(
          WORD_CLASH_CONFIG.presence,
          code,
        );
      }

      await clearSession('word-clash');

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
    ) return;

    lock.current = true;
    setBusy(true);
    setError('');

    try {
      await WORD_CLASH_CONFIG.startMatch(code);
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
          color="#FFD071"
        />

        <Text style={s.caption}>
          Connecting to Word Clash...
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

        <Text style={s.caption}>
          {error || 'You are no longer in this room.'}
        </Text>

        <Pressable
          style={s.button}
          disabled={busy}
          onPress={() => void leave()}
        >
          <Text style={s.buttonText}>
            Return to lobby
          </Text>
        </Pressable>
      </View>
    );
  }

  const ranking = Object.keys(room.players)
    .sort(
      (a, b) =>
        (room.scores?.[b] ?? 0) -
        (room.scores?.[a] ?? 0),
    );

  const finished = room.status === 'finished';

  const winners = room.winnerIds ?? [];

  const target =
    room.matchSettings?.winningScore ??
    WINNING_SCORE;

  return (
    <ScrollView
      style={s.root}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        s.content,
        {
          paddingTop: Math.max(
            24,
            insets.top + 12,
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
            Word Clash
          </Text>

          <Text style={s.caption}>
            Room {code}
          </Text>
        </View>

        <SoundButton accent="#FFD071" />

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
            game="word-clash"
            code={code}
            room={room}
            accent="#FFD071"
            disabled={busy}
          />

          <View style={{ flex: 1, minWidth: 0 }}>
            <ReactionStrip
              room={room}
              uid={uid}
            />
          </View>
        </View>
      )}

      {finished ? (
        <View style={s.winnerPanel}>
          <Text style={s.trophy}>🏆</Text>

          <Text style={s.sectionTitle}>
            {winners.length === 0
              ? 'Match ended'
              : winners.length > 1
                ? 'Match tied!'
                : `${room.players[winners[0]]} wins!`}
          </Text>

          {winners.map(id => (
            <Text
              key={id}
              style={s.winnerScore}
            >
              {room.players[id]}:
              {' '}{room.scores?.[id] ?? 0} points
            </Text>
          ))}

          {isHost && ranking.length >= 2 && (
            <Pressable
              disabled={busy}
              style={s.button}
              onPress={() => void rematch()}
            >
              <Text style={s.buttonText}>
                Play Again
              </Text>
            </Pressable>
          )}
        </View>
      ) : (
        <Round
          key={`${room.matchNumber}-${room.roundNumber}-${room.phase}`}
          code={code}
          room={room}
          uid={uid}
          disabled={busy}
        />
      )}



      <View style={s.panel}>
        <Text style={s.sectionTitle}>
          Race to {target}
        </Text>

        {ranking.map((id, index) => {
          const score = room.scores?.[id] ?? 0;
          const status = statusOf(id);

          return (
            <View key={id} style={s.scoreCard}>
              <View style={s.row}>
                <Text style={s.place}>
                  {index === 0
                    ? '👑'
                    : `#${index + 1}`}
                </Text>

                <View style={[
                  s.dot,
                  {
                    backgroundColor:
                      status === 'online'
                        ? '#55D99A'
                        : status === 'offline'
                          ? '#FF8398'
                          : '#FFD071',
                  },
                ]} />

                <Text
                  style={s.name}
                  numberOfLines={1}
                >
                  {room.players[id]}
                  {id === uid ? ' (You)' : ''}
                  {(room.streaks?.[id] ?? 0) >= 2
                    ? ` 🔥${room.streaks?.[id]}`
                    : ''}
                </Text>

                <View
                  pointerEvents="none"
                  style={s.scoreReaction}
                >
                  <ReactionBubble
                    reaction={getReaction(room, id)}
                    compact
                  />
                </View>

                <Text style={s.points}>
                  {score}
                </Text>
              </View>

              <View style={s.track}>
                <View style={[
                  s.fill,
                  {
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        score / target * 100,
                      ),
                    )}%`,
                  },
                ]} />
              </View>
            </View>
          );
        })}
      </View>

      {!!error && (
        <Text style={s.error}>
          {error}
        </Text>
      )}
    </ScrollView>
  );
}

function Round({
  code,
  room,
  uid,
  disabled,
}: {
  code: string;
  room: WordRoom;
  uid: string;
  disabled: boolean;
}) {
  const [now, setNow] =
    useState(Date.now());

  const [word, setWord] =
    useState('');

  const [lockedWord, setLockedWord] =
    useState<string | null>(null);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState('');

  const lock = useRef(false);

  const submitted =
    room.submittedIds?.includes(uid) ||
    lockedWord !== null;

  const seconds = Math.max(
    0,
    Math.ceil((room.deadline - now) / 1000),
  );

  const count =
    Object.keys(room.players).length;

  const submittedCount = Object.keys(
    room.players,
  ).filter(id =>
    room.submittedIds?.includes(id),
  ).length;

  const chooser = room.chooserId === uid;

  const settings = {
    ...DEFAULT_SETTINGS,
    ...room.matchSettings,
  };

  const mode = room.roundMode ?? 'classic';

  const fade = useRef(
    new Animated.Value(0.65),
  ).current;

  useEffect(() => {
    const animation = Animated.timing(
      fade,
      {
        toValue: 1,
        duration: 220,
        useNativeDriver: Platform.OS !== 'web',
      },
    );

    animation.start();

    return () => animation.stop();
  }, [fade]);

  const validInput =
    /^[a-zA-Z]{3,30}$/.test(word.trim()) &&
    word.trim().length >= settings.minimumLength &&
    !!room.letter &&
    word.trim().toUpperCase()
      .startsWith(room.letter) &&
    (
      !room.endingLetter ||
      word.trim().toUpperCase()
        .endsWith(room.endingLetter)
    );

  useEffect(() => {
    const timer = setInterval(
      () => setNow(Date.now()),
      200,
    );

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (seconds > 0) return;

    let active = true;
    let pending = false;

    async function advance() {
      if (!active || pending) return;

      pending = true;

      try {
        await advancePhase(code, room);
      } catch (reason) {
        if (active) {
          setError(errorMessage(reason));
        }
      } finally {
        pending = false;
      }
    }

    void advance();

    const timer = setInterval(
      () => void advance(),
      2000,
    );

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [
    code,
    room.matchNumber,
    room.roundNumber,
    room.phase,
    seconds,
  ]);

  useEffect(() => {
    if (
      room.phase !== 'typing' ||
      !room.submittedIds?.includes(uid)
    ) return;

    let active = true;

    void recoverSubmission(code, room)
      .then(result => {
        if (active) {
          setLockedWord(result.word);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [
    code,
    room.matchNumber,
    room.roundNumber,
    room.phase,
    room.submittedIds?.includes(uid),
    uid,
  ]);

  async function run(
    action: () => Promise<unknown>,
  ) {
    if (
      lock.current ||
      disabled ||
      seconds <= 0
    ) return;

    lock.current = true;

    setBusy(true);
    setError('');

    try {
      await action();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  function chooseLetter(letter: string) {
    if (
      room.phase !== 'choosing' ||
      !chooser
    ) return;

    void run(() =>
      selectLetter(code, room, letter),
    );
  }

  function sendWord() {
    if (
      room.phase !== 'typing' ||
      submitted ||
      !validInput
    ) return;

    const value = word.trim().toLowerCase();

    void run(async () => {
      await submitWord(code, room, value);

      setLockedWord(value);
    });
  }

  return (
    <Animated.View style={{ gap: 12, opacity: fade }}>
      <View style={s.roundHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>
            ROUND {room.roundNumber}
          </Text>

          <Text style={s.caption}>
            {room.phase === 'choosing'
              ? 'Letter selection'
              : room.phase === 'countdown'
                ? 'Get ready!'
                : room.phase === 'typing'
                  ? 'Submit your word'
                  : 'Round results'}
          </Text>
        </View>

        <Text style={[
          s.timer,
          seconds <= 5 && s.urgent,
        ]}>
          {seconds}s
        </Text>
      </View>

      <View style={s.challengePanel}>
        <Text style={s.challengeTitle}>
          {MODE_NAMES[mode]}
        </Text>

        {!!room.category && (
          <Text style={s.challengeText}>
            Category: {room.category}
          </Text>
        )}

        {!!room.endingLetter && (
          <Text style={s.challengeText}>
            Ends with: {room.endingLetter}
          </Text>
        )}

        <Text style={s.caption}>
          {settings.minimumLength}+ letters
          {' · '}
          {(room.roundMs ?? 20000) / 1000}s
          {settings.streakBonus
            ? ' · Streak bonuses'
            : ''}
        </Text>
      </View>

      {room.phase === 'countdown' && (
        <View style={s.countdownPanel}>
          <Text style={s.label}>
            GET READY
          </Text>

          <Text style={s.bigLetter}>
            {room.letter}
          </Text>

          <Text style={s.sectionTitle}>
            Starting in {seconds}...
          </Text>

          <Text style={s.caption}>
            Think of a unique word.
          </Text>
        </View>
      )}

      {room.phase === 'choosing' && (
        <View style={s.panel}>
          <Text style={s.sectionTitle}>
            {chooser
              ? 'Choose a letter'
              : 'Waiting for a letter'}
          </Text>

          <Text style={s.caption}>
            {chooser
              ? 'Everyone, including you, must find a word starting with this letter.'
              : `${room.players[room.chooserId ?? ''] ?? 'A player'} is choosing the next letter.`}
          </Text>

          {chooser ? (
            <View style={s.alphabet}>
              {(room.letterOptions ?? LETTERS).map(letter => (
                <Pressable
                  key={letter}
                  disabled={
                    busy ||
                    disabled ||
                    seconds <= 0
                  }
                  onPress={() =>
                    chooseLetter(letter)
                  }
                  style={[
                    s.letterButton,
                    busy && s.disabled,
                  ]}
                >
                  <Text style={s.letterText}>
                    {letter}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <ActivityIndicator
              color="#FFD071"
            />
          )}
        </View>
      )}

      {room.phase === 'typing' && (
        <View style={s.panel}>
          <View style={s.letterPanel}>
            <Text style={s.label}>
              YOUR LETTER
            </Text>

            <Text style={s.bigLetter}>
              {room.letter}
            </Text>

            <Text style={s.caption}>
              {mode === 'longest'
                ? 'Longer words earn extra points.'
                : 'Fast. Valid. Unique.'}
            </Text>
          </View>

          {submitted ? (
            <View style={s.lockedPanel}>
              <Text style={s.success}>
                Word locked in!
              </Text>

              {!!lockedWord && (
                <Text style={s.sectionTitle}>
                  {lockedWord.toUpperCase()}
                </Text>
              )}

              <Text style={s.caption}>
                Wait for the other players.
                Results will be revealed together.
              </Text>
            </View>
          ) : (
            <>
              <TextInput
                value={word}
                onChangeText={setWord}
                placeholder={`Word starting with ${room.letter}`}
                placeholderTextColor="#9DA0B8"
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                maxLength={30}
                returnKeyType="send"
                editable={
                  !busy &&
                  !disabled &&
                  seconds > 0
                }
                onSubmitEditing={sendWord}
                style={s.input}
              />

              <Text style={s.caption}>
                Minimum {settings.minimumLength} letters.
                You cannot change a submitted word.
              </Text>

              <Pressable
                disabled={
                  !validInput ||
                  busy ||
                  disabled ||
                  seconds <= 0
                }
                onPress={sendWord}
                style={[
                  s.button,
                  (
                    !validInput ||
                    busy ||
                    disabled ||
                    seconds <= 0
                  ) && s.disabled,
                ]}
              >
                <Text style={s.buttonText}>
                  {busy
                    ? 'Submitting...'
                    : 'Lock In Word'}
                </Text>
              </Pressable>
            </>
          )}

          <Text style={s.caption}>
            {submittedCount}/{count} players submitted
          </Text>

          <View style={s.track}>
            <View style={[
              s.fill,
              {
                width: `${submittedCount /
                  Math.max(1, count) * 100}%`,
              },
            ]} />
          </View>

          {Object.entries(room.players).map(
            ([id, name]) => (
              <View key={id} style={s.row}>
                <Text style={s.name}>
                  {name}
                  {id === uid ? ' (You)' : ''}
                </Text>

                <Text style={
                  room.submittedIds?.includes(id)
                    ? s.success
                    : s.caption
                }>
                  {room.submittedIds?.includes(id)
                    ? 'Locked'
                    : 'Thinking...'}
                </Text>
              </View>
            ),
          )}
        </View>
      )}

      {room.phase === 'results' && (
        <View style={s.panel}>
          <Text style={s.sectionTitle}>
            Round Results
          </Text>

          <Text style={s.caption}>
            Letter: {room.letter}
          </Text>

          {[...(room.results ?? [])]
            .sort((a, b) => b.points - a.points)
            .map(result => (
              <View
                key={result.uid}
                style={[
                  s.resultCard,
                  result.outcome === 'valid'
                    ? s.validCard
                    : s.invalidCard,
                ]}
              >
                <View style={s.row}>
                  <Text style={s.name}>
                    {result.name}
                    {result.uid === uid ? ' (You)' : ''}
                  </Text>

                  <Text style={
                    result.points > 0
                      ? s.success
                      : s.error
                  }>
                    +{result.points}
                  </Text>
                </View>

                <Text style={s.resultWord}>
                  {result.word
                    ? result.word.toUpperCase()
                    : '---'}
                </Text>

                <Text style={s.caption}>
                  {OUTCOMES[result.outcome]}
                  {result.outcome !== 'missed'
                    ? ` · ${(result.elapsedMs / 1000).toFixed(1)}s`
                    : ''}
                </Text>

                {result.outcome === 'valid' && (
                  <Text style={s.bonusText}>
                    Base +20
                    {' · Speed +'}
                    {result.speedBonus ??
                      Math.max(0, result.points - 20)}
                    {!!result.lengthBonus &&
                      ` · Length +${result.lengthBonus}`}
                    {!!result.streakBonus &&
                      ` · Streak +${result.streakBonus}`}
                  </Text>
                )}
              </View>
            ))}

          <Text style={s.caption}>
            Continuing in {seconds}s
          </Text>
        </View>
      )}

      {!!error && (
        <Text style={s.error}>
          {error}
        </Text>
      )}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#17162D',
  },
  center: {
    flex: 1,
    backgroundColor: '#17162D',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  content: {
    width: '100%',
    maxWidth: 650,
    alignSelf: 'center',
    paddingHorizontal: 15,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  caption: {
    color: '#B7B4CE',
    fontSize: 13,
    lineHeight: 19,
  },
  label: {
    color: '#C9B5FF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  panel: {
    backgroundColor: '#2B2843',
    padding: 17,
    borderRadius: 18,
    gap: 13,
  },
  roundHeader: {
    backgroundColor: '#30294F',
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timer: {
    color: '#FFD071',
    fontSize: 32,
    fontWeight: '900',
  },
  urgent: {
    color: '#FF8398',
  },
  challengePanel: {
    backgroundColor: '#39334F',
    borderRadius: 14,
    padding: 13,
    gap: 5,
  },
  challengeTitle: {
    color: '#FFD071',
    fontWeight: '900',
    fontSize: 17,
  },
  challengeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  countdownPanel: {
    backgroundColor: '#463861',
    padding: 24,
    borderRadius: 18,
    alignItems: 'center',
    gap: 10,
  },
  bonusText: {
    color: '#B7F6DA',
    fontSize: 12,
    lineHeight: 18,
  },
  alphabet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  letterButton: {
    width: 43,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#514473',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  letterPanel: {
    borderRadius: 16,
    backgroundColor: '#463861',
    padding: 20,
    alignItems: 'center',
    gap: 4,
  },
  bigLetter: {
    color: '#FFD071',
    fontSize: 90,
    fontWeight: '900',
  },
  input: {
    backgroundColor: '#17162D',
    borderColor: '#7463A4',
    borderWidth: 1,
    color: '#FFFFFF',
    padding: 16,
    fontSize: 20,
    borderRadius: 12,
  },
  button: {
    backgroundColor: '#FFD071',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#231D35',
    fontSize: 16,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.4,
  },
  lockedPanel: {
    backgroundColor: '#23483D',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  place: {
    color: '#C9B5FF',
    fontWeight: '900',
    fontSize: 13,
  },
  points: {
    color: '#FFD071',
    fontWeight: '900',
    fontSize: 18,
  },
  reactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2B2843',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  scoreReaction: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scoreCard: {
    padding: 13,
    borderRadius: 12,
    backgroundColor: '#39334F',
    gap: 10,
  },
  track: {
    height: 8,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: '#17162D',
  },
  fill: {
    height: 8,
    borderRadius: 5,
    backgroundColor: '#A991FF',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  resultCard: {
    padding: 13,
    borderRadius: 12,
    gap: 7,
  },
  validCard: {
    backgroundColor: '#23483D',
  },
  invalidCard: {
    backgroundColor: '#493044',
  },
  resultWord: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 20,
  },
  success: {
    color: '#55D99A',
    fontWeight: '800',
    fontSize: 14,
  },
  error: {
    color: '#FF9AAE',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  soundButton: {
    backgroundColor: '#FFD071',
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 10,
  },
  soundText: {
    color: '#17162D',
    fontWeight: '900',
    fontSize: 12,
  },
  leaveButton: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#593044',
  },
  leaveText: {
    color: '#FFB5C4',
    fontWeight: '900',
  },
  winnerPanel: {
    backgroundColor: '#463861',
    borderRadius: 20,
    padding: 25,
    gap: 15,
    alignItems: 'center',
  },
  trophy: {
    fontSize: 64,
  },
  winnerScore: {
    color: '#FFD071',
    fontSize: 22,
    fontWeight: '900',
  },
});





