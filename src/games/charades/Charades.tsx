
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    CHARADES_OPTIONS,
    getCharadesWords,
    type CharadesSelection,
} from './charadesWords';

type Phase =
  | 'setup'
  | 'ready'
  | 'playing'
  | 'expired'
  | 'summary'
  | 'finished';


const TOTAL_ROUNDS_PER_TEAM = 3;
const TOTAL_TURNS = TOTAL_ROUNDS_PER_TEAM * 2;



function shuffle<T>(items: T[]): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function Button({
  title,
  onPress,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        secondary && styles.secondaryButton,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text
        style={[
          styles.buttonText,
          secondary && styles.secondaryButtonText,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

export default function CharadesScreen() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('setup');
  const [teamNames, setTeamNames] = useState(['Team A', 'Team B']);
  const [category, setCategory] = useState<CharadesSelection>('bollywood');
    const [duration, setDuration] = useState(60);

  const [turn, setTurn] = useState(0);
  const [remaining, setRemaining] = useState(60);
  const [movie, setMovie] = useState('');
  const [scores, setScores] = useState([0, 0]);
  const [guessed, setGuessed] = useState(false);
  const [error, setError] = useState('');

  const movieDeck = useRef<string[]>([]);
  const deadline = useRef<number | null>(null);

  const currentTeam = turn % 2;
  const roundNumber = Math.floor(turn / 2) + 1;



  const startGame = () => {
    const names = teamNames.map((name) => name.trim());

    if (!names[0] || !names[1]) {
      setError('Please enter names for both teams.');
      return;
    }

    if (names[0].toLowerCase() === names[1].toLowerCase()) {
      setError('Team names must be different.');
      return;
    }

    const pool = getCharadesWords(category);

    if (pool.length < TOTAL_TURNS) {
      setError('Please add more movie titles to this category.');
      return;
    }

    movieDeck.current = shuffle(pool);
    deadline.current = null;

    setTeamNames(names);
    setScores([0, 0]);
    setTurn(0);
    setRemaining(duration);
    setMovie(movieDeck.current[0]);
    setGuessed(false);
    setError('');
    setPhase('ready');
  };

  const startTurn = () => {
    deadline.current = Date.now() + duration * 1000;
    setRemaining(duration);
    setPhase('playing');
  };

  // Use the real clock to prevent timer drift.
  useEffect(() => {
    if (phase !== 'playing') return;

    const updateTimer = () => {
      if (deadline.current === null) return;

      const seconds = Math.max(
        0,
        Math.ceil((deadline.current - Date.now()) / 1000)
      );

      setRemaining(seconds);

      if (seconds === 0) {
        deadline.current = null;
        setPhase('expired');
      }
    };

    updateTimer();

    const interval = setInterval(updateTimer, 200);

    return () => clearInterval(interval);
  }, [phase]);

  const markCorrect = () => {
    if (phase !== 'playing') return;

    if (
      deadline.current === null ||
      Date.now() >= deadline.current
    ) {
      deadline.current = null;
      setRemaining(0);
      setPhase('expired');
      return;
    }

    deadline.current = null;
    setGuessed(true);

    setScores((previous) =>
      previous.map((score, index) =>
        index === currentTeam ? score + 1 : score
      )
    );

    setPhase('summary');
  };

  const markFailed = () => {
    deadline.current = null;
    setGuessed(false);
    setPhase('summary');
  };

  const nextTurn = () => {
    deadline.current = null;

    if (turn + 1 >= TOTAL_TURNS) {
      setPhase('finished');
      return;
    }

    const next = turn + 1;

    setTurn(next);
    setMovie(movieDeck.current[next]);
    setRemaining(duration);
    setGuessed(false);
    setPhase('ready');
  };

  const playAgain = () => {
    deadline.current = null;
    setPhase('setup');
    setTurn(0);
    setScores([0, 0]);
    setMovie('');
    setGuessed(false);
    setRemaining(duration);
    setError('');
  };

  const winner =
    scores[0] === scores[1]
      ? null
      : scores[0] > scores[1]
        ? teamNames[0]
        : teamNames[1];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity
        style={styles.back}
        onPress={() => router.replace('/')}
      >
        <Text style={styles.backText}>← Back to GameDen</Text>
      </TouchableOpacity>

      <Text style={styles.logo}>🎭 Movie Charades</Text>
      <Text style={styles.subtitle}>
        One movie. One chance. No talking!
      </Text>

      {phase !== 'setup' && (
        <View style={styles.scoreboard}>
          {teamNames.map((name, index) => (
            <View
              key={index}
              style={[
                styles.teamScore,
                index === currentTeam &&
                  phase !== 'finished' &&
                  styles.activeTeam,
              ]}
            >
              <Text style={styles.teamName}>{name}</Text>
              <Text style={styles.scoreNumber}>
                {scores[index]}
              </Text>
              <Text style={styles.scoreLabel}>POINTS</Text>
            </View>
          ))}
        </View>
      )}

      {/* SETUP */}
      {phase === 'setup' && (
        <View style={styles.card}>
          <Text style={styles.heading}>Game Setup</Text>

          <Text style={styles.description}>
            Two teams compete to guess movie titles through acting.
            Each team gets {TOTAL_ROUNDS_PER_TEAM} movies.
          </Text>

          <Text style={styles.sectionTitle}>Team Names</Text>

          {teamNames.map((name, index) => (
            <TextInput
              key={index}
              style={styles.input}
              value={name}
              placeholder={`Team ${index + 1}`}
              placeholderTextColor="#9DA7B8"
              maxLength={24}
              onChangeText={(value) => {
                setTeamNames((previous) =>
                  previous.map((item, i) =>
                    i === index ? value : item
                  )
                );
                setError('');
              }}
            />
          ))}

          <Text style={styles.sectionTitle}>
            Movie Category
          </Text>

          <View style={styles.categoryGrid}>
            {CHARADES_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.categoryCard,
                  category === option.id &&
                    styles.selectedCategory,
                ]}
                onPress={() => setCategory(option.id)}
              >
                <Text style={styles.categoryEmoji}>
                  {option.emoji}
                </Text>

                <Text style={styles.categoryName}>
                  {option.name}
                </Text>

                {category === option.id && (
                  <Text style={styles.selectedText}>
                    ✓ Selected
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>
            Time Per Movie
          </Text>

          <View style={styles.durationRow}>
            {[30, 60, 90, 120].map((seconds) => (
              <TouchableOpacity
                key={seconds}
                style={[
                  styles.durationOption,
                  duration === seconds &&
                    styles.selectedDuration,
                ]}
                onPress={() => setDuration(seconds)}
              >
                <Text style={styles.durationText}>
                  {seconds}s
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.tip}>
            Each turn has exactly one movie.
            Correct guess = 1 point.
            Failed guess = 0 points.
            No skipping to another movie during the turn.
          </Text>

          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : null}

          <Button title="Start Game →" onPress={startGame} />
        </View>
      )}

      {/* PASS DEVICE TO THE ACTOR */}
      {phase === 'ready' && (
        <View style={styles.card}>
          <Text style={styles.step}>
            ROUND {roundNumber} OF {TOTAL_ROUNDS_PER_TEAM}
          </Text>

          <Text style={styles.largeEmoji}>🎬</Text>

          <Text style={styles.heading}>
            {teamNames[currentTeam]}'s Turn
          </Text>

          <Text style={styles.description}>
            Choose one actor from {teamNames[currentTeam]}.
            Give them the device without showing the other players.
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              🎥 One secret movie
            </Text>
            <Text style={styles.infoText}>
              ⏱️ {duration} seconds to guess
            </Text>
            <Text style={styles.infoText}>
              🤫 No talking or spelling the title
            </Text>
          </View>

          <Button
            title="I'm the Actor — Reveal Movie & Start"
            onPress={startTurn}
          />
        </View>
      )}

      {/* ONE MOVIE AT A TIME */}
      {phase === 'playing' && (
        <View style={styles.card}>
          <Text style={styles.step}>
            {teamNames[currentTeam]} IS PLAYING
          </Text>

          <Text
            style={[
              styles.timer,
              remaining <= 10 && styles.timerWarning,
            ]}
          >
            {remaining}s
          </Text>

          <Text style={styles.timerCaption}>
            TIME REMAINING
          </Text>

          <View style={styles.movieBox}>
            <Text style={styles.movieLabel}>
              🎬 YOUR SECRET MOVIE
            </Text>

            <Text style={styles.movieTitle}>
              {movie}
            </Text>

            <Text style={styles.movieInstruction}>
              Only the actor should see this screen.
            </Text>
          </View>

          <Text style={styles.tip}>
            Act out this movie. Your team must guess
            the exact title before time runs out.
          </Text>

          <Button
            title="✓ Guessed Correctly! (+1)"
            onPress={markCorrect}
          />

          <Button
            title="Couldn't Guess (0 Points)"
            onPress={markFailed}
            secondary
          />
        </View>
      )}

      {/* TIMER ENDED */}
      {phase === 'expired' && (
        <View style={styles.card}>
          <Text style={styles.step}>TIME'S UP!</Text>

          <Text style={styles.largeEmoji}>⏰</Text>

          <Text style={styles.heading}>
            Time Ran Out!
          </Text>

          <Text style={styles.description}>
            {teamNames[currentTeam]} didn't guess the movie
            within the time limit.
          </Text>

          <Text style={styles.sectionTitle}>
            The movie was:
          </Text>

          <Text style={styles.revealedMovie}>
            {movie}
          </Text>

          <Text style={styles.description}>
            0 points awarded.
          </Text>

          <Button
            title="Continue →"
            onPress={markFailed}
          />
        </View>
      )}

      {/* TURN RESULTS */}
      {phase === 'summary' && (
        <View style={styles.card}>
          <Text style={styles.step}>
            TURN COMPLETE
          </Text>

          <Text style={styles.largeEmoji}>
            {guessed ? '🎉' : '😅'}
          </Text>

          <Text style={styles.heading}>
            {guessed ? 'Correct Guess!' : 'Better Luck Next Time!'}
          </Text>

          <Text style={styles.description}>
            {teamNames[currentTeam]}
          </Text>

          <Text style={styles.pointsEarned}>
            {guessed ? '+1 Point' : '+0 Points'}
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Movie: {movie}
            </Text>
            <Text style={styles.infoText}>
              Team Total: {scores[currentTeam]} points
            </Text>
          </View>

          <Button
            title={
              turn + 1 >= TOTAL_TURNS
                ? 'See Final Results →'
                : 'Next Team →'
            }
            onPress={nextTurn}
          />
        </View>
      )}

      {/* FINAL RESULTS */}
      {phase === 'finished' && (
        <View style={styles.card}>
          <Text style={styles.step}>GAME OVER</Text>

          <Text style={styles.largeEmoji}>🏆</Text>

          <Text style={styles.heading}>
            {winner ? `${winner} Wins!` : "It's a Tie!"}
          </Text>

          <Text style={styles.description}>
            Both teams played {TOTAL_ROUNDS_PER_TEAM} movies each.
          </Text>

          {teamNames.map((name, index) => (
            <View key={index} style={styles.resultRow}>
              <Text style={styles.resultName}>{name}</Text>
              <Text style={styles.resultValue}>
                {scores[index]} pts
              </Text>
            </View>
          ))}

          <Button title="Play Again" onPress={playAgain} />

          <Button
            title="Back to GameDen"
            secondary
            onPress={() => router.replace('/')}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#15182D',
  },
  content: {
    width: '100%',
    maxWidth: 650,
    alignSelf: 'center',
    padding: 20,
    paddingTop: 45,
    paddingBottom: 60,
  },
  back: {
    marginBottom: 24,
  },
  backText: {
    color: '#A5E1EB',
    fontSize: 14,
    fontWeight: '600',
  },
  logo: {
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '800',
  },
  subtitle: {
    color: '#A6A9C4',
    fontSize: 14,
    marginTop: 7,
    marginBottom: 25,
  },
  card: {
    backgroundColor: '#242841',
    padding: 20,
    borderRadius: 22,
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 15,
  },
  description: {
    color: '#CBCDE0',
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    marginBottom: 18,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 14,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#15182D',
    borderWidth: 1,
    borderColor: '#4C5268',
    color: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 16,
    marginBottom: 10,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
    backgroundColor: '#303550',
    width: '48%',
    minHeight: 110,
    padding: 12,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCategory: {
    backgroundColor: '#245968',
    borderColor: '#A5E1EB',
  },
  categoryEmoji: {
    fontSize: 30,
    marginBottom: 7,
  },
  categoryName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  selectedText: {
    color: '#B8EDF4',
    fontSize: 11,
    marginTop: 5,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  durationOption: {
    flex: 1,
    backgroundColor: '#303550',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedDuration: {
    borderColor: '#A5E1EB',
    backgroundColor: '#245968',
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  tip: {
    color: '#A6A9C4',
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
    marginVertical: 20,
  },
  error: {
    color: '#FF8B9A',
    textAlign: 'center',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#A5E1EB',
    borderRadius: 13,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButton: {
    backgroundColor: '#464B6E',
  },
  buttonText: {
    color: '#15313C',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
  },
  scoreboard: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  teamScore: {
    flex: 1,
    backgroundColor: '#292D46',
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 14,
    padding: 13,
    alignItems: 'center',
  },
  activeTeam: {
    borderColor: '#A5E1EB',
  },
  teamName: {
    color: '#C4D1DA',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  scoreNumber: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '800',
    marginTop: 6,
  },
  scoreLabel: {
    color: '#A6A9C4',
    fontSize: 10,
    fontWeight: '700',
  },
  step: {
    color: '#A5E1EB',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 15,
  },
  largeEmoji: {
    textAlign: 'center',
    fontSize: 53,
    marginVertical: 18,
  },
  infoBox: {
    backgroundColor: '#15182D',
    borderRadius: 14,
    padding: 18,
    marginVertical: 10,
    gap: 13,
  },
  infoText: {
    color: '#D5DEEA',
    fontSize: 15,
    lineHeight: 23,
  },
  timer: {
    color: '#A5E1EB',
    fontSize: 75,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 15,
  },
  timerWarning: {
    color: '#FF8B9A',
  },
  timerCaption: {
    color: '#A6A9C4',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 25,
  },
  movieBox: {
    backgroundColor: '#183943',
    minHeight: 200,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  movieLabel: {
    color: '#B3E4ED',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 18,
    textAlign: 'center',
  },
  movieTitle: {
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '800',
    textAlign: 'center',
  },
  movieInstruction: {
    color: '#A6C7D0',
    fontSize: 12,
    marginTop: 18,
    textAlign: 'center',
  },
  pointsEarned: {
    color: '#A5E1EB',
    fontSize: 40,
    fontWeight: '900',
    textAlign: 'center',
    marginVertical: 12,
  },
  revealedMovie: {
    color: '#A5E1EB',
    fontSize: 27,
    fontWeight: '800',
    textAlign: 'center',
    marginVertical: 15,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#303550',
    borderRadius: 12,
    padding: 17,
    marginBottom: 10,
  },
  resultName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  resultValue: {
    color: '#A5E1EB',
    fontSize: 18,
    fontWeight: '800',
  },
});

