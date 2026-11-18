
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import {
    NEVER_CATEGORY_OPTIONS,
    getNeverQuestions,
    type NeverSelection,
} from '../../data/neverHaveIEverQuestions';

type Phase =
  | 'setup'
  | 'pass'
  | 'answer'
  | 'results'
  | 'finished';

type Answer = 'have' | 'never' | 'skip';

type RoundResult = {
  question: string;
  have: number;
  never: number;
  skip: number;
};

const TOTAL_ROUNDS = 10;
const MAX_PLAYERS = 12;

function shuffle<T>(values: T[]): T[] {
  const result = [...values];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function GameButton({
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
      activeOpacity={0.85}
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

export default function NeverHaveIEverScreen() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('setup');
  const [playerNames, setPlayerNames] = useState([
    '',
    '',
    '',
  ]);
  const [players, setPlayers] = useState<string[]>([]);
  const [category, setCategory] =
    useState<NeverSelection>('friends');

  const [questions, setQuestions] = useState<string[]>([]);
  const [round, setRound] = useState(0);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [history, setHistory] = useState<RoundResult[]>([]);
  const [error, setError] = useState('');

  const currentQuestion = questions[round] ?? '';

  const updateName = (index: number, value: string) => {
    setPlayerNames((previous) =>
      previous.map((name, i) =>
        i === index ? value : name
      )
    );
    setError('');
  };

  const addPlayer = () => {
    if (playerNames.length < MAX_PLAYERS) {
      setPlayerNames((previous) => [...previous, '']);
    }
  };

  const removePlayer = (index: number) => {
    if (playerNames.length > 2) {
      setPlayerNames((previous) =>
        previous.filter((_, i) => i !== index)
      );
    }
  };

  const startGame = () => {
    const names = playerNames.map((name) => name.trim());

    if (
      names.length < 2 ||
      names.some((name) => !name)
    ) {
      setError('Enter names for every player.');
      return;
    }

    const uniqueNames = new Set(
      names.map((name) => name.toLowerCase())
    );

    if (uniqueNames.size !== names.length) {
      setError('Each player needs a different name.');
      return;
    }

    const pool = getNeverQuestions(category);

    if (pool.length < TOTAL_ROUNDS) {
      setError('This category needs at least 10 questions.');
      return;
    }

    setPlayers(names);
    setQuestions(shuffle(pool).slice(0, TOTAL_ROUNDS));
    setRound(0);
    setPlayerIndex(0);
    setAnswers([]);
    setHistory([]);
    setError('');
    setPhase('pass');
  };

  const submitAnswer = (answer: Answer) => {
    const updated = [...answers, answer];
    setAnswers(updated);

    if (playerIndex + 1 < players.length) {
      setPlayerIndex((current) => current + 1);
      setPhase('pass');
    } else {
      const result: RoundResult = {
        question: currentQuestion,
        have: updated.filter((a) => a === 'have').length,
        never: updated.filter((a) => a === 'never').length,
        skip: updated.filter((a) => a === 'skip').length,
      };

      setHistory((previous) => [...previous, result]);
      setPhase('results');
    }
  };

  const nextRound = () => {
    if (round + 1 >= TOTAL_ROUNDS) {
      setPhase('finished');
      return;
    }

    setRound((current) => current + 1);
    setPlayerIndex(0);
    setAnswers([]);
    setPhase('pass');
  };

  const playAgain = () => {
    setPhase('setup');
    setRound(0);
    setPlayerIndex(0);
    setAnswers([]);
    setHistory([]);
    setQuestions([]);
    setError('');
  };

  const currentResult = history[history.length - 1];

  const totalHave = history.reduce(
    (sum, item) => sum + item.have,
    0
  );

  const totalNever = history.reduce(
    (sum, item) => sum + item.never,
    0
  );

  const totalSkipped = history.reduce(
    (sum, item) => sum + item.skip,
    0
  );

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
        <Text style={styles.backText}>
          ← Back to GameDen
        </Text>
      </TouchableOpacity>

      <Text style={styles.logo}>
        🙈 Never Have I Ever
      </Text>
      <Text style={styles.subtitle}>
        What secrets will your friends reveal?
      </Text>

      {/* SETUP */}
      {phase === 'setup' && (
        <View style={styles.card}>
          <Text style={styles.heading}>
            Who's playing?
          </Text>

          <Text style={styles.description}>
            Add 2–12 players, choose a category,
            and get ready for 10 questions.
          </Text>

          <Text style={styles.sectionTitle}>
            Players
          </Text>

          {playerNames.map((name, index) => (
            <View key={index} style={styles.playerRow}>
              <View style={styles.playerNumber}>
                <Text style={styles.playerNumberText}>
                  {index + 1}
                </Text>
              </View>

              <TextInput
                style={styles.playerInput}
                placeholder={`Player ${index + 1}`}
                placeholderTextColor="#A39AB7"
                value={name}
                onChangeText={(text) => updateName(index, text)}
                maxLength={24}
                autoCapitalize="words"
              />

              <TouchableOpacity
                style={[
                  styles.removeButton,
                  playerNames.length <= 2 &&
                    styles.disabled,
                ]}
                disabled={playerNames.length <= 2}
                onPress={() => removePlayer(index)}
              >
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          {playerNames.length < MAX_PLAYERS && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={addPlayer}
            >
              <Text style={styles.addText}>
                + Add Player
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.countText}>
            {playerNames.length} / {MAX_PLAYERS} players
          </Text>

          <Text style={styles.sectionTitle}>
            Choose a Category
          </Text>

          <View style={styles.categoryGrid}>
            {NEVER_CATEGORY_OPTIONS.map((option) => {
              const selected = category === option.id;

              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.categoryCard,
                    selected && styles.selectedCategory,
                  ]}
                  onPress={() => setCategory(option.id)}
                >
                  <Text style={styles.categoryEmoji}>
                    {option.emoji}
                  </Text>

                  <Text style={styles.categoryName}>
                    {option.name}
                  </Text>

                  {selected && (
                    <Text style={styles.selectedLabel}>
                      ✓ Selected
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.tip}>
            Each player answers privately.
            Results show the total votes, not who voted.
            Anyone can skip a question.
          </Text>

          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : null}

          <GameButton
            title="Start Game →"
            onPress={startGame}
          />
        </View>
      )}

      {/* PASS DEVICE */}
      {phase === 'pass' && (
        <View style={styles.card}>
          <Text style={styles.step}>
            QUESTION {round + 1} OF {TOTAL_ROUNDS}
          </Text>

          <Text style={styles.largeEmoji}>🔒</Text>

          <Text style={styles.heading}>
            Pass to {players[playerIndex]}
          </Text>

          <Text style={styles.description}>
            Make sure {players[playerIndex]} is the
            only person looking at the screen.
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Player {playerIndex + 1} of {players.length}
            </Text>
            <Text style={styles.infoText}>
              🙋 Answer honestly
            </Text>
            <Text style={styles.infoText}>
              🔐 Your individual vote stays private
            </Text>
          </View>

          <GameButton
            title="I'm Ready →"
            onPress={() => setPhase('answer')}
          />
        </View>
      )}

      {/* PRIVATE ANSWER */}
      {phase === 'answer' && (
        <View style={styles.card}>
          <Text style={styles.step}>
            QUESTION {round + 1} OF {TOTAL_ROUNDS}
          </Text>

          <Text style={styles.heading}>
            {players[playerIndex]}
          </Text>

          <View style={styles.questionBox}>
            <Text style={styles.questionText}>
              {currentQuestion}
            </Text>
          </View>

          <Text style={styles.description}>
            Have you ever done this?
          </Text>

          <TouchableOpacity
            style={styles.haveButton}
            onPress={() => submitAnswer('have')}
          >
            <Text style={styles.answerButtonText}>
              🙋 I Have
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.neverButton}
            onPress={() => submitAnswer('never')}
          >
            <Text style={styles.answerButtonText}>
              😇 I Haven't
            </Text>
          </TouchableOpacity>

          <GameButton
            title="Prefer Not to Say"
            secondary
            onPress={() => submitAnswer('skip')}
          />

          <Text style={styles.tip}>
            Your answer is recorded immediately.
            Pass the device to the next player.
          </Text>
        </View>
      )}

      {/* ROUND RESULTS */}
      {phase === 'results' && currentResult && (
        <View style={styles.card}>
          <Text style={styles.step}>
            QUESTION {round + 1} RESULTS
          </Text>

          <Text style={styles.largeEmoji}>🎉</Text>

          <View style={styles.questionBox}>
            <Text style={styles.questionText}>
              {currentResult.question}
            </Text>
          </View>

          <View style={styles.resultGrid}>
            <View style={styles.resultCard}>
              <Text style={styles.resultEmoji}>🙋</Text>
              <Text style={styles.resultNumber}>
                {currentResult.have}
              </Text>
              <Text style={styles.resultLabel}>
                I Have
              </Text>
            </View>

            <View style={styles.resultCard}>
              <Text style={styles.resultEmoji}>😇</Text>
              <Text style={styles.resultNumber}>
                {currentResult.never}
              </Text>
              <Text style={styles.resultLabel}>
                I Haven't
              </Text>
            </View>
          </View>

          <Text style={styles.tip}>
            {currentResult.skip} player(s) skipped.
            Individual answers remain private.
          </Text>

          <GameButton
            title={
              round + 1 >= TOTAL_ROUNDS
                ? 'See Final Recap →'
                : 'Next Question →'
            }
            onPress={nextRound}
          />
        </View>
      )}

      {/* FINAL RECAP */}
      {phase === 'finished' && (
        <View style={styles.card}>
          <Text style={styles.step}>GAME COMPLETE</Text>

          <Text style={styles.largeEmoji}>🏆</Text>

          <Text style={styles.heading}>
            You survived all 10 questions!
          </Text>

          <Text style={styles.description}>
            Here's how everyone voted throughout the game.
          </Text>

          <View style={styles.resultGrid}>
            <View style={styles.resultCard}>
              <Text style={styles.resultEmoji}>🙋</Text>
              <Text style={styles.resultNumber}>
                {totalHave}
              </Text>
              <Text style={styles.resultLabel}>
                Total I Have
              </Text>
            </View>

            <View style={styles.resultCard}>
              <Text style={styles.resultEmoji}>😇</Text>
              <Text style={styles.resultNumber}>
                {totalNever}
              </Text>
              <Text style={styles.resultLabel}>
                Total I Haven't
              </Text>
            </View>
          </View>

          <Text style={styles.tip}>
            {players.length} players · {TOTAL_ROUNDS} questions
            {'\n'}
            {totalSkipped} skipped answers
          </Text>

          <Text style={styles.sectionTitle}>
            Your Questions
          </Text>

          {history.map((result, index) => (
            <View key={index} style={styles.historyRow}>
              <Text style={styles.historyQuestion}>
                {index + 1}. {result.question}
              </Text>

              <Text style={styles.historyCounts}>
                🙋 {result.have}  ·  😇 {result.never}
                {'  '}·  ⏭️ {result.skip}
              </Text>
            </View>
          ))}

          <GameButton
            title="Play Again"
            onPress={playAgain}
          />

          <GameButton
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
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 60,
  },
  back: {
    marginBottom: 24,
  },
  backText: {
    color: '#D9B8FF',
    fontSize: 14,
    fontWeight: '600',
  },
  logo: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: '#B5ABC9',
    fontSize: 14,
    marginTop: 7,
    marginBottom: 25,
  },
  card: {
    backgroundColor: '#28233F',
    padding: 20,
    borderRadius: 22,
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 14,
  },
  description: {
    color: '#D1C8DF',
    fontSize: 14,
    lineHeight: 23,
    textAlign: 'center',
    marginBottom: 18,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 15,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
    gap: 9,
  },
  playerNumber: {
    backgroundColor: '#524467',
    width: 39,
    height: 39,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerNumberText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  playerInput: {
    flex: 1,
    minWidth: 0,
    height: 47,
    backgroundColor: '#1B1930',
    borderColor: '#5A4B70',
    borderWidth: 1,
    borderRadius: 12,
    color: '#FFFFFF',
    paddingHorizontal: 13,
    fontSize: 15,
  },
  removeButton: {
    backgroundColor: '#693F59',
    height: 39,
    width: 39,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.3,
  },
  removeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 18,
  },
  addButton: {
    paddingVertical: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#BE96E5',
    borderRadius: 12,
    alignItems: 'center',
  },
  addText: {
    color: '#D9B8FF',
    fontSize: 15,
    fontWeight: '700',
  },
  countText: {
    color: '#AD9FBF',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 10,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    backgroundColor: '#3B3354',
    width: '48%',
    minHeight: 108,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  selectedCategory: {
    backgroundColor: '#604378',
    borderColor: '#D7A6FF',
  },
  categoryEmoji: {
    fontSize: 30,
    marginBottom: 8,
  },
  categoryName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  selectedLabel: {
    color: '#E7C9FF',
    fontSize: 11,
    marginTop: 6,
  },
  tip: {
    color: '#B4A7C6',
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
    marginVertical: 18,
  },
  error: {
    color: '#FF9CAD',
    textAlign: 'center',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#D1A5FF',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#554766',
  },
  buttonText: {
    color: '#271836',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
  },
  step: {
    color: '#D7A6FF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 14,
  },
  largeEmoji: {
    fontSize: 52,
    textAlign: 'center',
    marginVertical: 20,
  },
  infoBox: {
    backgroundColor: '#1B1930',
    borderRadius: 15,
    padding: 20,
    gap: 13,
    marginVertical: 12,
  },
  infoText: {
    color: '#E0D6EB',
    fontSize: 14,
    lineHeight: 22,
  },
  questionBox: {
    backgroundColor: '#44335D',
    minHeight: 165,
    borderRadius: 19,
    padding: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  questionText: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 34,
  },
  haveButton: {
    backgroundColor: '#8350A9',
    borderRadius: 14,
    paddingVertical: 19,
    alignItems: 'center',
    marginTop: 10,
  },
  neverButton: {
    backgroundColor: '#354C65',
    borderRadius: 14,
    paddingVertical: 19,
    alignItems: 'center',
    marginTop: 12,
  },
  answerButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 17,
  },
  resultGrid: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 18,
  },
  resultCard: {
    flex: 1,
    backgroundColor: '#44335D',
    borderRadius: 15,
    padding: 16,
    alignItems: 'center',
  },
  resultEmoji: {
    fontSize: 30,
  },
  resultNumber: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '900',
    marginVertical: 7,
  },
  resultLabel: {
    color: '#DBC8EF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  historyRow: {
    backgroundColor: '#39314F',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  historyQuestion: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 22,
  },
  historyCounts: {
    color: '#CDB7DF',
    fontSize: 12,
    marginTop: 10,
  },
});
