import {
  useEffect,
  type ReactNode,
  useRef,
  useState,
} from 'react';

import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';

import type {
  DoodleRoom,
} from './doodleClashRooms';

import {
  getPrivateWord,
  selectWord,
  submitGuess,
  advancePhase,
  type WordOption,
} from './roundService';

type Props = {
  code: string;
  room: DoodleRoom;
  uid: string;
  children?: ReactNode;
};

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Something went wrong.';
}

export default function RoundPanel({
  code,
  room,
  uid,
  children,
}: Props) {
  const [now, setNow] = useState(Date.now());

  const [choices, setChoices] =
    useState<WordOption[]>([]);

  const [answer, setAnswer] =
    useState<string | null>(null);

  const [guess, setGuess] =
    useState('');

  const [feedback, setFeedback] =
    useState('');

  const [error, setError] =
    useState('');

  const [busy, setBusy] =
    useState(false);

  const [loadingWord, setLoadingWord] =
    useState(false);

  const [loadAttempt, setLoadAttempt] =
    useState(0);

  const lock = useRef(false);

  const fade = useRef(
    new Animated.Value(0.6),
  ).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 220,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [fade]);

  const isArtist =
    room.artistId === uid;

  const hasGuessed =
    room.guessedIds?.includes(uid) ?? false;

  const seconds = Math.max(
    0,
    Math.ceil(
      ((room.deadline ?? 0) - now) / 1000,
    ),
  );

  const finished =
    room.status === 'finished';

  const names = Object.keys(room.players);

  const ranking = [...names].sort(
    (a, b) =>
      (room.scores?.[b] ?? 0) -
      (room.scores?.[a] ?? 0),
  );

  const highestScore = ranking.length
    ? room.scores?.[ranking[0]] ?? 0
    : 0;

  const winners = ranking.filter(
    id => (room.scores?.[id] ?? 0) === highestScore,
  );

  const everyoneGuessed = names
    .filter(id => id !== room.artistId)
    .filter(id => room.guessedIds?.includes(id))
    .length;

  useEffect(() => {
    if (finished) return;

    const timer = setInterval(
      () => setNow(Date.now()),
      250,
    );

    return () => clearInterval(timer);
  }, [finished]);

  useEffect(() => {
    if (
      finished ||
      !room.phase ||
      seconds > 0
    ) {
      return;
    }

    let active = true;
    let pending = false;

    async function attempt() {
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

    void attempt();

    const timer = setInterval(
      () => void attempt(),
      2000,
    );

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [
    code,
    room.matchNumber,
    room.phase,
    seconds,
    finished,
  ]);

  useEffect(() => {
    if (
      !isArtist ||
      (
        room.phase !== 'choosing' &&
        room.phase !== 'drawing'
      )
    ) {
      return;
    }

    let active = true;

    setLoadingWord(true);
    setError('');

    getPrivateWord(code, room.matchNumber)
      .then(result => {
        if (!active) return;

        setChoices(result.choices);
        setAnswer(result.answer);
      })
      .catch(reason => {
        if (!active) return;

        setError(errorMessage(reason));
      })
      .finally(() => {
        if (active) {
          setLoadingWord(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    code,
    room.matchNumber,
    room.phase,
    isArtist,
    loadAttempt,
  ]);

  async function choose(index: number) {
    if (
      lock.current ||
      !isArtist ||
      room.phase !== 'choosing' ||
      seconds <= 0
    ) {
      return;
    }

    lock.current = true;
    setBusy(true);
    setError('');

    try {
      await selectWord(
        code,
        room.matchNumber,
        index,
      );
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function sendGuess() {
    const value = guess.trim();

    if (
      lock.current ||
      !value ||
      isArtist ||
      hasGuessed ||
      room.phase !== 'drawing' ||
      seconds <= 0
    ) {
      return;
    }

    lock.current = true;
    setBusy(true);
    setError('');
    setFeedback('');

    try {
      const result = await submitGuess(
        code,
        room.matchNumber,
        value,
      );

      if (result.correct) {
        setFeedback(
          `Correct! +${result.points} points`,
        );
      } else {
        setFeedback(
          result.close
            ? 'Very close! Check your spelling.'
            : `Not quite! "${value}" was incorrect.`,
        );
      }

      setGuess('');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  if (!room.phase && !finished) {
    return (
      <View style={s.panel}>
        <Text style={s.error}>
          This room uses an older game version.
          Leave and create a new room.
        </Text>
      </View>
    );
  }

  return (
    <Animated.View style={[s.container, { opacity: fade }]}>

      {!finished && (
        <View style={s.top}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>
              ROUND {room.roundNumber} / {room.totalRounds}
            </Text>

            <Text style={s.small}>
              {room.artistId
                ? room.players[room.artistId]
                : 'No artist'}
              {isArtist ? ' (You)' : ''}
            </Text>
          </View>

          <View style={s.timerBox}>
            <Text style={[
              s.timer,
              seconds <= 10 && s.timerUrgent,
            ]}>
              {seconds}s
            </Text>
          </View>
        </View>
      )}

      {room.phase === 'choosing' && (
        <View style={s.panel}>
          {isArtist ? (
            <>
              <Text style={s.label}>
                PRIVATE WORD SELECTION
              </Text>

              <Text style={s.title}>
                Choose your word
              </Text>

              <Text style={s.small}>
                Other players cannot see these options.
              </Text>

              {loadingWord && (
                <ActivityIndicator color="#A5E1EB" />
              )}

              {choices.map((item, index) => (
                <Pressable
                  key={index}
                  disabled={busy || seconds <= 0}
                  onPress={() => void choose(index)}
                  style={[
                    s.wordCard,
                    (busy || seconds <= 0) &&
                      s.disabled,
                  ]}
                >
                  <Text style={s.word}>
                    {item.word}
                  </Text>

                  <Text style={[
                    s.difficulty,
                    {
                      color:
                        item.difficulty === 'easy'
                          ? '#55D99A'
                          : item.difficulty === 'medium'
                            ? '#FFD071'
                            : '#FF9AAE',
                    },
                  ]}>
                    {item.difficulty.toUpperCase()}
                  </Text>
                </Pressable>
              ))}

              {!loadingWord &&
                choices.length === 0 &&
                seconds > 0 && (
                <Pressable
                  style={s.button}
                  onPress={() =>
                    setLoadAttempt(value => value + 1)
                  }
                >
                  <Text style={s.buttonText}>
                    Reload words
                  </Text>
                </Pressable>
              )}
            </>
          ) : (
            <>
              <Text style={s.title}>
                Waiting for the artist
              </Text>

              <Text style={s.small}>
                The artist is choosing a secret word.
              </Text>

              <ActivityIndicator color="#A5E1EB" />
            </>
          )}
        </View>
      )}

      {room.phase === 'drawing' && (
        <View style={s.panel}>
          <Text style={s.label}>
            {isArtist
              ? 'YOUR SECRET WORD'
              : 'GUESS THE WORD'}
          </Text>

          <Text style={s.secret}>
            {isArtist
              ? answer ?? 'Loading word...'
              : (room.hint ?? '')
                  .replace(/_/g, '_ ')}
          </Text>

          {isArtist && !loadingWord && !answer && (
            <Pressable
              style={s.button}
              onPress={() =>
                setLoadAttempt(value => value + 1)
              }
            >
              <Text style={s.buttonText}>
                Reload secret word
              </Text>
            </Pressable>
          )}

          <Text style={s.small}>
            {everyoneGuessed} / {Math.max(0, names.length - 1)}
            {' players guessed correctly'}
          </Text>

          {children}

          {!isArtist && !hasGuessed && (
            <View style={s.guessRow}>
              <TextInput
                value={guess}
                onChangeText={setGuess}
                maxLength={80}
                editable={!busy && seconds > 0}
                placeholder="Enter your guess..."
                placeholderTextColor="#8E93AE"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="send"
                onSubmitEditing={() => void sendGuess()}
                style={s.input}
              />

              <Pressable
                disabled={
                  busy ||
                  !guess.trim() ||
                  seconds <= 0
                }
                onPress={() => void sendGuess()}
                style={[
                  s.button,
                  (
                    busy ||
                    !guess.trim() ||
                    seconds <= 0
                  ) && s.disabled,
                ]}
              >
                <Text style={s.buttonText}>
                  Guess
                </Text>
              </Pressable>
            </View>
          )}

          {hasGuessed ? (
            <Text style={s.success}>
              Correct! +{room.roundPoints?.[uid] ?? 0}
              {' points. Wait for the next round.'}
            </Text>
          ) : !!feedback && (
            <Text style={s.small}>
              {feedback}
            </Text>
          )}
        </View>
      )}

      {room.phase === 'results' && (
        <View style={s.resultPanel}>
          <Text style={s.label}>
            ROUND COMPLETE
          </Text>

          <Text style={s.small}>
            The secret word was
          </Text>

          <Text style={s.secret}>
            {room.revealedWord ?? 'No word selected'}
          </Text>

          <Text style={s.success}>
            You earned {room.roundPoints?.[uid] ?? 0}
            {' points'}
          </Text>

          <Text style={s.small}>
            {room.pendingArtists?.length
              ? `Next round in ${seconds}s`
              : `Final results in ${seconds}s`}
          </Text>
        </View>
      )}

      {finished && (
        <View style={s.resultPanel}>
          <Text style={s.label}>
            FINAL RESULTS
          </Text>

          <Text style={s.title}>
            {names.length >= 2
              ? winners.length > 1
                ? 'It is a tie!'
                : `${room.players[winners[0]]} wins!`
              : 'Match ended'}
          </Text>

          <Text style={s.secret}>
            {highestScore} points
          </Text>
        </View>
      )}

      <View style={s.panel}>
        <Text style={s.label}>
          SCOREBOARD
        </Text>

        {ranking.map((id, index) => (
          <View key={id} style={s.scoreRow}>
            <Text style={s.rank}>
              {index + 1}
            </Text>

            <Text
              style={s.playerName}
              numberOfLines={1}
            >
              {room.players[id]}
              {id === uid ? ' (You)' : ''}
            </Text>

            {room.phase === 'drawing' &&
              room.guessedIds?.includes(id) && (
                <Text style={s.correctMark}>
                  CORRECT
                </Text>
              )}

            <Text style={s.points}>
              {room.scores?.[id] ?? 0} pts
            </Text>
          </View>
        ))}
      </View>

      {!!error && (
        <Text style={s.error}>
          {error}
        </Text>
      )}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 12,
  },

  top: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#242841',
    borderRadius: 16,
    padding: 15,
    gap: 12,
  },

  timerBox: {
    backgroundColor: '#343956',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },

  timer: {
    color: '#FFD071',
    fontSize: 26,
    fontWeight: '900',
  },

  timerUrgent: {
    color: '#FF8398',
  },

  panel: {
    backgroundColor: '#242841',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },

  resultPanel: {
    backgroundColor: '#23483D',
    borderRadius: 20,
    padding: 24,
    gap: 12,
    alignItems: 'center',
  },

  label: {
    color: '#C5BAFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },

  small: {
    color: '#B9BDD5',
    fontSize: 13,
    lineHeight: 20,
  },

  secret: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: 1,
  },

  success: {
    color: '#55D99A',
    fontSize: 14,
    fontWeight: '800',
  },

  wordCard: {
    backgroundColor: '#383D59',
    borderRadius: 14,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  word: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },

  difficulty: {
    fontSize: 10,
    fontWeight: '900',
  },

  guessRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },

  input: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#15182D',
    color: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF20',
    fontSize: 15,
  },

  button: {
    backgroundColor: '#A5E1EB',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },

  buttonText: {
    color: '#121629',
    fontWeight: '900',
  },

  disabled: {
    opacity: 0.4,
  },

  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#303550',
    padding: 11,
    borderRadius: 10,
  },

  rank: {
    color: '#C5BAFF',
    fontSize: 15,
    fontWeight: '900',
  },

  playerName: {
    flex: 1,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  correctMark: {
    color: '#55D99A',
    fontSize: 9,
    fontWeight: '900',
  },

  points: {
    color: '#FFD071',
    fontSize: 14,
    fontWeight: '900',
  },

  error: {
    color: '#FF9AAE',
    fontSize: 13,
    lineHeight: 20,
  },
});

