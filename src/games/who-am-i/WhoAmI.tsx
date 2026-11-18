
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
    WHO_AM_I_OPTIONS,
    getWhoAmIWords,
    type WhoAmISelection,
} from './whoAmIWords';

type Phase =
  | 'setup'
  | 'ready'
  | 'reveal'
  | 'guessing'
  | 'result'
  | 'finished';

type TurnResult = {
  player: string;
  identity: string;
  correct: boolean;
};

const MAX_PLAYERS = 12;

function shuffle<T>(items: T[]): T[] {
  const result = [...items];

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

export default function WhoAmIScreen() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('setup');
  const [playerNames, setPlayerNames] = useState(['', '', '']);
  const [players, setPlayers] = useState<string[]>([]);
  const [category, setCategory] =
    useState<WhoAmISelection>('bollywood');
  const [duration, setDuration] = useState(90);

  const [turn, setTurn] = useState(0);
  const [identities, setIdentities] = useState<string[]>([]);
  const [remaining, setRemaining] = useState(90);
  const [correct, setCorrect] = useState(false);
  const [history, setHistory] = useState<TurnResult[]>([]);
  const [error, setError] = useState('');

  const deadline = useRef<number | null>(null);

  const currentPlayer = players[turn] ?? '';
  const currentIdentity = identities[turn] ?? '';

  const updateName = (index: number, value: string) => {
    setPlayerNames((previous) =>
      previous.map((name, i) => i === index ? value : name)
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

    if (names.length < 2 || names.some((name) => !name)) {
      setError('Enter names for every player.');
      return;
    }

    const uniqueNames = new Set(
      names.map((name) => name.toLowerCase())
    );

    if (uniqueNames.size !== names.length) {
      setError('Each player must have a different name.');
      return;
    }

    const pool = getWhoAmIWords(category);

    if (pool.length < names.length) {
      setError('Not enough identities for every player.');
      return;
    }

    deadline.current = null;

    setPlayers(names);
    setIdentities(shuffle(pool).slice(0, names.length));
    setTurn(0);
    setRemaining(duration);
    setCorrect(false);
    setHistory([]);
    setError('');
    setPhase('ready');
  };

  const startGuessing = () => {
    deadline.current = Date.now() + duration * 1000;
    setRemaining(duration);
    setPhase('guessing');
  };

  useEffect(() => {
    if (phase !== 'guessing') return;

    const updateTimer = () => {
      if (deadline.current === null) return;

      const seconds = Math.max(
        0,
        Math.ceil((deadline.current - Date.now()) / 1000)
      );

      setRemaining(seconds);

      if (seconds === 0) {
        deadline.current = null;
        setCorrect(false);
        setPhase('result');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 200);

    return () => clearInterval(interval);
  }, [phase]);

  const endTurn = (wasCorrect: boolean) => {
    if (phase !== 'guessing') return;

    if (
      deadline.current === null ||
      Date.now() >= deadline.current
    ) {
      deadline.current = null;
      setRemaining(0);
      setCorrect(false);
      setPhase('result');
      return;
    }

    deadline.current = null;
    setCorrect(wasCorrect);
    setPhase('result');
  };

  const nextTurn = () => {
    setHistory((previous) => [
      ...previous,
      {
        player: currentPlayer,
        identity: currentIdentity,
        correct,
      },
    ]);

    deadline.current = null;

    if (turn + 1 >= players.length) {
      setPhase('finished');
    } else {
      setTurn((previous) => previous + 1);
      setRemaining(duration);
      setCorrect(false);
      setPhase('ready');
    }
  };

  const playAgain = () => {
    deadline.current = null;
    setPhase('setup');
    setTurn(0);
    setRemaining(duration);
    setCorrect(false);
    setHistory([]);
    setError('');
  };

  const totalCorrect = history.filter(
    (result) => result.correct
  ).length;

  const winners = history
    .filter((result) => result.correct)
    .map((result) => result.player);

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

      <Text style={styles.logo}>❓ Who Am I?</Text>
      <Text style={styles.subtitle}>
        Find out who you are without seeing your identity!
      </Text>

      {phase === 'setup' && (
        <View style={styles.card}>
          <Text style={styles.heading}>Who's Playing?</Text>
          <Text style={styles.description}>
            Add 2–12 players. Each person gets one turn
            to guess a hidden identity.
          </Text>

          <Text style={styles.sectionTitle}>Players</Text>

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
                placeholderTextColor="#969BB7"
                value={name}
                onChangeText={(value) => updateName(index, value)}
                maxLength={24}
                autoCapitalize="words"
              />

              <TouchableOpacity
                style={[
                  styles.removeButton,
                  playerNames.length <= 2 && styles.disabled,
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
              <Text style={styles.addText}>+ Add Player</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.countText}>
            {playerNames.length} / {MAX_PLAYERS} players
          </Text>

          <Text style={styles.sectionTitle}>
            Choose a Category
          </Text>

          <View style={styles.categoryGrid}>
            {WHO_AM_I_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.categoryCard,
                  category === option.id && styles.selectedCategory,
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
                  <Text style={styles.selectedText}>✓ Selected</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>
            Time Per Player
          </Text>

          <View style={styles.durationRow}>
            {[60, 90, 120].map((seconds) => (
              <TouchableOpacity
                key={seconds}
                style={[
                  styles.durationOption,
                  duration === seconds && styles.selectedDuration,
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
            Ask yes-or-no questions. Everyone else answers
            truthfully. A correct guess earns one point.
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <GameButton title="Start Game →" onPress={startGame} />
        </View>
      )}

      {phase === 'ready' && (
        <View style={styles.card}>
          <Text style={styles.step}>
            PLAYER {turn + 1} OF {players.length}
          </Text>

          <Text style={styles.largeEmoji}>🙈</Text>

          <Text style={styles.heading}>
            {currentPlayer}'s Turn
          </Text>

          <Text style={styles.description}>
            {currentPlayer}, look away from the screen.
            Someone else should reveal your secret identity.
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              🔒 The guesser must not see the identity
            </Text>
            <Text style={styles.infoText}>
              ❓ Ask questions with yes-or-no answers
            </Text>
            <Text style={styles.infoText}>
              ⏱️ {duration} seconds per turn
            </Text>
          </View>

          <GameButton
            title="Everyone Else Is Ready — Reveal"
            onPress={() => setPhase('reveal')}
          />
        </View>
      )}

      {phase === 'reveal' && (
        <View style={styles.card}>
          <Text style={styles.step}>SECRET IDENTITY</Text>
          <Text style={styles.heading}>
            Don't show {currentPlayer}!
          </Text>

          <View style={styles.identityBox}>
            <Text style={styles.identityLabel}>
              WHO IS {currentPlayer.toUpperCase()}?
            </Text>
            <Text style={styles.identityText}>
              {currentIdentity}
            </Text>
          </View>

          <Text style={styles.description}>
            Let everyone except {currentPlayer} read the answer.
            Then hide the screen before they look again.
          </Text>

          <GameButton
            title="Hide Identity & Start Timer →"
            onPress={startGuessing}
          />
        </View>
      )}

      {phase === 'guessing' && (
        <View style={styles.card}>
          <Text style={styles.step}>
            {currentPlayer.toUpperCase()} IS GUESSING
          </Text>

          <Text
            style={[
              styles.timer,
              remaining <= 10 && styles.timerWarning,
            ]}
          >
            {remaining}s
          </Text>

          <Text style={styles.timerCaption}>TIME REMAINING</Text>

          <View style={styles.hiddenBox}>
            <Text style={styles.largeEmoji}>❓</Text>
            <Text style={styles.hiddenTitle}>
              Who am I?
            </Text>
            <Text style={styles.description}>
              Ask the group yes-or-no questions.
              Your identity is hidden!
            </Text>
          </View>

          <GameButton
            title="✓ Guessed Correctly! (+1)"
            onPress={() => endTurn(true)}
          />
          <GameButton
            title="Give Up (0 Points)"
            secondary
            onPress={() => endTurn(false)}
          />
        </View>
      )}

      {phase === 'result' && (
        <View style={styles.card}>
          <Text style={styles.step}>TURN COMPLETE</Text>
          <Text style={styles.largeEmoji}>
            {correct ? '🎉' : '😅'}
          </Text>
          <Text style={styles.heading}>
            {correct ? 'Correct Guess!' : "Time's Up / Gave Up"}
          </Text>

          <Text style={styles.description}>
            {currentPlayer}'s identity was:
          </Text>

          <View style={styles.identityBox}>
            <Text style={styles.identityText}>
              {currentIdentity}
            </Text>
          </View>

          <Text style={styles.points}>
            {correct ? '+1 Point' : '+0 Points'}
          </Text>

          <GameButton
            title={
              turn + 1 >= players.length
                ? 'See Final Results →'
                : 'Next Player →'
            }
            onPress={nextTurn}
          />
        </View>
      )}

      {phase === 'finished' && (
        <View style={styles.card}>
          <Text style={styles.step}>GAME OVER</Text>
          <Text style={styles.largeEmoji}>🏆</Text>
          <Text style={styles.heading}>Final Results</Text>

          <Text style={styles.description}>
            {totalCorrect} of {players.length} identities guessed correctly.
          </Text>

          {history.map((result, index) => (
            <View key={index} style={styles.resultRow}>
              <View style={styles.resultInfo}>
                <Text style={styles.resultName}>
                  {result.player}
                </Text>
                <Text style={styles.resultIdentity}>
                  {result.identity}
                </Text>
              </View>
              <Text style={styles.resultPoints}>
                {result.correct ? '✅ 1 pt' : '❌ 0 pts'}
              </Text>
            </View>
          ))}

          <Text style={styles.tip}>
            {winners.length === 0
              ? 'Nobody guessed correctly this time!'
              : winners.length === 1
                ? `${winners[0]} wins!`
                : `${winners.join(', ')} tied for first place!`}
          </Text>

          <GameButton title="Play Again" onPress={playAgain} />
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
  back: { marginBottom: 24 },
  backText: { color: '#C4B5FD', fontSize: 14, fontWeight: '600' },
  logo: { color: '#FFFFFF', fontSize: 29, fontWeight: '800' },
  subtitle: {
    color: '#A6A9C4',
    fontSize: 14,
    marginTop: 7,
    marginBottom: 25,
  },
  card: {
    backgroundColor: '#242841',
    borderRadius: 22,
    padding: 20,
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 15,
  },
  description: {
    color: '#CBD0E2',
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
    marginBottom: 14,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 11,
  },
  playerNumber: {
    backgroundColor: '#474C70',
    width: 39,
    height: 39,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerNumberText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  playerInput: {
    flex: 1,
    minWidth: 0,
    height: 47,
    backgroundColor: '#171B30',
    borderColor: '#4D5278',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    color: '#FFFFFF',
    fontSize: 15,
  },
  removeButton: {
    backgroundColor: '#633C55',
    width: 39,
    height: 39,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.3 },
  removeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  addButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#B9A6FF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addText: {
    color: '#C4B5FD',
    fontSize: 15,
    fontWeight: '800',
  },
  countText: {
    color: '#A6A9C4',
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
    backgroundColor: '#303550',
    width: '48%',
    minHeight: 105,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  selectedCategory: {
    backgroundColor: '#514184',
    borderColor: '#B9A6FF',
  },
  categoryEmoji: { fontSize: 29, marginBottom: 8 },
  categoryName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  selectedText: {
    color: '#E0D2FF',
    fontSize: 11,
    marginTop: 5,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 9,
  },
  durationOption: {
    flex: 1,
    backgroundColor: '#303550',
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedDuration: {
    backgroundColor: '#514184',
    borderColor: '#B9A6FF',
  },
  durationText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  tip: {
    color: '#A6A9C4',
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
    marginVertical: 19,
  },
  error: {
    color: '#FF9CAD',
    marginBottom: 12,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#B9A6FF',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginTop: 12,
    alignItems: 'center',
  },
  secondaryButton: { backgroundColor: '#464B6E' },
  buttonText: {
    color: '#211A3B',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  secondaryButtonText: { color: '#FFFFFF' },
  step: {
    color: '#B9A6FF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 14,
  },
  largeEmoji: {
    fontSize: 52,
    textAlign: 'center',
    marginVertical: 19,
  },
  infoBox: {
    backgroundColor: '#15182D',
    padding: 19,
    borderRadius: 15,
    gap: 14,
    marginVertical: 12,
  },
  infoText: {
    color: '#DFE0EC',
    fontSize: 14,
    lineHeight: 23,
  },
  identityBox: {
    backgroundColor: '#39335B',
    minHeight: 160,
    padding: 22,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  identityLabel: {
    color: '#C4B5FD',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 16,
    letterSpacing: 1,
  },
  identityText: {
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '800',
    textAlign: 'center',
  },
  hiddenBox: {
    backgroundColor: '#292D49',
    borderRadius: 19,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  hiddenTitle: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '800',
    marginBottom: 12,
  },
  timer: {
    color: '#C4B5FD',
    fontSize: 75,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 10,
  },
  timerWarning: { color: '#FF9CAD' },
  timerCaption: {
    color: '#A6A9C4',
    fontSize: 12,
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 23,
  },
  points: {
    color: '#B9A6FF',
    fontSize: 39,
    fontWeight: '900',
    textAlign: 'center',
    marginVertical: 12,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#303550',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    gap: 10,
  },
  resultInfo: { flex: 1 },
  resultName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  resultIdentity: {
    color: '#A6A9C4',
    fontSize: 12,
    marginTop: 5,
  },
  resultPoints: {
    color: '#E1D8FF',
    fontSize: 14,
    fontWeight: '800',
  },
});

