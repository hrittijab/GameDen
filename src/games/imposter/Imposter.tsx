
import { CATEGORIES } from './imposterCategories';
import { IMPOSTER_HINTS } from './imposterHints';
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

type Phase = 'setup' | 'reveal' | 'discussion' | 'voting' | 'results';
type CategoryKey = keyof typeof CATEGORIES;
type Selection = CategoryKey | 'mixed';

const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[];

const CATEGORY_OPTIONS = [
  ...CATEGORY_KEYS.map((id) => ({
    id: id as Selection,
    name: CATEGORIES[id].name,
    emoji: CATEGORIES[id].emoji,
  })),
  {
    id: 'mixed' as Selection,
    name: 'Surprise Me',
    emoji: '🎲',
  },
];

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
      style={[styles.button, secondary && styles.secondaryButton]}
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

export default function ImposterScreen() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('setup');
  const [playerNames, setPlayerNames] = useState<string[]>(['', '', '']);
  const [category, setCategory] = useState<Selection>('food');
  const [roundCategory, setRoundCategory] = useState<CategoryKey>('food');

  const [players, setPlayers] = useState<string[]>([]);
  const [word, setWord] = useState('');
  const [hint, setHint] = useState('');
  const [imposterIndex, setImposterIndex] = useState(-1);

  const [revealIndex, setRevealIndex] = useState(0);
  const [showRole, setShowRole] = useState(false);

  const [voterIndex, setVoterIndex] = useState(0);
  const [votes, setVotes] = useState<number[]>([]);
  const [error, setError] = useState('');

  const updatePlayerName = (index: number, name: string) => {
    setPlayerNames((current) =>
      current.map((player, i) => (i === index ? name : player))
    );
    setError('');
  };

  const addPlayer = () => {
    if (playerNames.length < 12) {
      setPlayerNames((current) => [...current, '']);
    }
  };

  const removePlayer = (index: number) => {
    if (playerNames.length > 3) {
      setPlayerNames((current) =>
        current.filter((_, i) => i !== index)
      );
    }
  };

  const startGame = () => {
    const names = playerNames.map((name) => name.trim());

    if (
      names.length < 3 ||
      names.length > 12 ||
      names.some((name) => !name)
    ) {
      setError('Please enter names for all 3–12 players.');
      return;
    }

    const uniqueNames = new Set(
      names.map((name) => name.toLowerCase())
    );

    if (uniqueNames.size !== names.length) {
      setError('Every player must have a different name.');
      return;
    }

    const chosenCategory: CategoryKey =
      category === 'mixed'
        ? CATEGORY_KEYS[Math.floor(Math.random() * CATEGORY_KEYS.length)]
        : category;

    const wordList = CATEGORIES[chosenCategory].words;

    const chosenWord =
      wordList[Math.floor(Math.random() * wordList.length)];

    const hintKey = `${chosenCategory}:${chosenWord}`;

    const chosenHint =
      IMPOSTER_HINTS[hintKey] ??
      `The secret word belongs to the ${CATEGORIES[chosenCategory].name} category.`;

    setPlayers(names);
    setRoundCategory(chosenCategory);
    setWord(chosenWord);
    setHint(chosenHint);
    setImposterIndex(Math.floor(Math.random() * names.length));

    setRevealIndex(0);
    setShowRole(false);
    setVoterIndex(0);
    setVotes([]);
    setError('');
    setPhase('reveal');
  };

  const nextReveal = () => {
    setShowRole(false);

    if (revealIndex + 1 < players.length) {
      setRevealIndex((current) => current + 1);
    } else {
      setPhase('discussion');
    }
  };

  const castVote = (suspectIndex: number) => {
    const updatedVotes = [...votes, suspectIndex];
    setVotes(updatedVotes);

    if (voterIndex + 1 < players.length) {
      setVoterIndex((current) => current + 1);
    } else {
      setPhase('results');
    }
  };

  const playAgain = () => {
    setPhase('setup');
    setShowRole(false);
    setVotes([]);
    setError('');
  };

  const voteCounts = players.map(
    (_, index) => votes.filter((vote) => vote === index).length
  );

  const maxVotes = Math.max(0, ...voteCounts);

  const topSuspects = voteCounts
    .map((count, index) => ({ count, index }))
    .filter((entry) => entry.count === maxVotes && maxVotes > 0);

  const crewWins =
    topSuspects.length === 1 &&
    topSuspects[0].index === imposterIndex;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity
        onPress={() => router.replace('/')}
        style={styles.back}
      >
        <Text style={styles.backText}>← Back to GameDen</Text>
      </TouchableOpacity>

      <Text style={styles.logo}>🕵️ Guess the Imposter</Text>
      <Text style={styles.subtitle}>
        Trust nobody. Find the hidden player.
      </Text>

      {/* PLAYER SETUP */}

      {phase === 'setup' && (
        <View style={styles.card}>
          <Text style={styles.heading}>Who's playing?</Text>

          <Text style={styles.description}>
            Add your friends and choose a category.
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
                placeholder={`Player ${index + 1} name`}
                placeholderTextColor="#9094B5"
                value={name}
                onChangeText={(text) => updatePlayerName(index, text)}
                maxLength={24}
                autoCapitalize="words"
                autoCorrect={false}
              />

              <TouchableOpacity
                style={[
                  styles.removeButton,
                  playerNames.length <= 3 && styles.disabledButton,
                ]}
                disabled={playerNames.length <= 3}
                onPress={() => removePlayer(index)}
              >
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          {playerNames.length < 12 && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={addPlayer}
            >
              <Text style={styles.addText}>+ Add Player</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.playerCount}>
            {playerNames.length} / 12 players
          </Text>

          <Text style={styles.sectionTitle}>
            Choose a Category
          </Text>

          <View style={styles.categoryGrid}>
            {CATEGORY_OPTIONS.map((option) => {
              const selected = category === option.id;

              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.categoryCard,
                    selected && styles.selectedCategory,
                  ]}
                  onPress={() => setCategory(option.id)}
                  activeOpacity={0.8}
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
            {category === 'mixed'
              ? 'Surprise Me chooses a random category every round.'
              : `Selected: ${CATEGORIES[category].name}`}
            {'\n'}
            One player will secretly become the Imposter.
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

      {/* PRIVATE ROLE REVEAL */}

      {phase === 'reveal' && (
        <View style={styles.card}>
          <Text style={styles.step}>
            PLAYER {revealIndex + 1} OF {players.length}
          </Text>

          <Text style={styles.heading}>
            {players[revealIndex]}
          </Text>

          {!showRole ? (
            <>
              <Text style={styles.description}>
                Pass the device to {players[revealIndex]}.
                Make sure nobody else can see the screen!
              </Text>

              <View style={styles.secretBox}>
                <Text style={styles.secretEmoji}>🔒</Text>
                <Text style={styles.secretText}>
                  Your role is hidden
                </Text>
              </View>

              <GameButton
                title="Reveal My Role"
                onPress={() => setShowRole(true)}
              />
            </>
          ) : (
            <>
              <View style={styles.secretBox}>
                {revealIndex === imposterIndex ? (
                  <>
                    <Text style={styles.secretEmoji}>🕵️</Text>

                    <Text style={styles.imposterText}>
                      YOU ARE THE IMPOSTER!
                    </Text>

                    <Text style={styles.step}>
                      CATEGORY: {CATEGORIES[roundCategory].name}
                    </Text>

                    <View style={styles.hintBox}>
                      <Text style={styles.hintLabel}>
                        YOUR SECRET HINT
                      </Text>

                      <Text style={styles.hintText}>
                        {hint}
                      </Text>
                    </View>

                    <Text style={styles.description}>
                      Blend in with everyone else.
                      Your hint is related to their secret word,
                      but does not reveal the exact answer.
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.secretEmoji}>✅</Text>

                    <Text style={styles.step}>
                      YOUR SECRET WORD
                    </Text>

                    <Text style={styles.word}>
                      {word}
                    </Text>

                    <Text style={styles.description}>
                      Give clues without saying the word.
                      Don't make your hints too obvious!
                    </Text>
                  </>
                )}
              </View>

              <GameButton
                title={
                  revealIndex + 1 === players.length
                    ? 'Hide Role & Start Discussion →'
                    : 'Hide Role & Pass Device →'
                }
                onPress={nextReveal}
              />
            </>
          )}
        </View>
      )}

      {/* DISCUSSION */}

      {phase === 'discussion' && (
        <View style={styles.card}>
          <Text style={styles.step}>
            DISCUSSION TIME
          </Text>

          <Text style={styles.heading}>
            Who is the Imposter?
          </Text>

          <Text style={styles.description}>
            Category: {CATEGORIES[roundCategory].name}
          </Text>

          <View style={styles.secretBox}>
            <Text style={styles.secretEmoji}>💬</Text>
            <Text style={styles.secretText}>
              Talk. Observe. Suspect.
            </Text>
          </View>

          <Text style={styles.tip}>
            Each player gives a clue about the secret word.
            Don't say the word itself or give it away!
            The Imposter must try to blend in.
          </Text>

          <GameButton
            title="Start Voting →"
            onPress={() => {
              setVoterIndex(0);
              setVotes([]);
              setPhase('voting');
            }}
          />
        </View>
      )}

      {/* VOTING */}

      {phase === 'voting' && (
        <View style={styles.card}>
          <Text style={styles.step}>
            VOTE {voterIndex + 1} OF {players.length}
          </Text>

          <Text style={styles.heading}>
            {players[voterIndex]}, your vote!
          </Text>

          <Text style={styles.description}>
            Pass the device to {players[voterIndex]}.
            Who do you think is the Imposter?
          </Text>

          {players.map((player, index) => {
            if (index === voterIndex) return null;

            return (
              <TouchableOpacity
                key={index}
                style={styles.voteOption}
                onPress={() => castVote(index)}
              >
                <Text style={styles.voteText}>
                  {player}
                </Text>
                <Text style={styles.voteArrow}>→</Text>
              </TouchableOpacity>
            );
          })}

          <Text style={styles.tip}>
            Tap a name to submit your vote.
            Your vote will be recorded immediately.
          </Text>
        </View>
      )}

      {/* RESULTS */}

      {phase === 'results' && (
        <View style={styles.card}>
          <Text style={styles.step}>GAME OVER</Text>

          <Text style={styles.resultEmoji}>
            {crewWins ? '🏆' : '🕵️'}
          </Text>

          <Text style={styles.heading}>
            {crewWins
              ? 'The Crew Wins!'
              : 'The Imposter Wins!'}
          </Text>

          <Text style={styles.description}>
            The Imposter was:
          </Text>

          <Text style={styles.highlightName}>
            {players[imposterIndex]}
          </Text>

          <Text style={styles.description}>
            Category: {CATEGORIES[roundCategory].name}
          </Text>

          <Text style={styles.description}>
            The secret word was:
          </Text>

          <Text style={styles.word}>
            {word}
          </Text>

          <Text style={styles.sectionTitle}>
            Voting Results
          </Text>

          {players.map((player, index) => (
            <View key={index} style={styles.voteResult}>
              <Text style={styles.voteText}>
                {player}
                {index === imposterIndex ? ' 🕵️' : ''}
              </Text>

              <Text style={styles.voteText}>
                {voteCounts[index]} vote(s)
              </Text>
            </View>
          ))}

          {topSuspects.length > 1 && (
            <Text style={styles.tip}>
              The vote was tied, so the Imposter escaped!
            </Text>
          )}

          <GameButton
            title="Play Another Round"
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
    padding: 20,
    paddingTop: 45,
    paddingBottom: 60,
  },
  back: {
    marginBottom: 25,
  },
  backText: {
    color: '#C5BAFF',
    fontSize: 14,
    fontWeight: '600',
  },
  logo: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '800',
  },
  subtitle: {
    color: '#A6A9C4',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 30,
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
    marginBottom: 16,
  },
  description: {
    color: '#CBCDE0',
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    marginTop: 15,
    marginBottom: 15,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  playerNumber: {
    backgroundColor: '#464B6E',
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerNumberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  playerInput: {
    flex: 1,
    minWidth: 0,
    height: 48,
    backgroundColor: '#15182D',
    borderColor: '#484C6C',
    borderWidth: 1,
    borderRadius: 12,
    color: '#FFFFFF',
    paddingHorizontal: 15,
    fontSize: 15,
  },
  removeButton: {
    backgroundColor: '#663D55',
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.3,
  },
  removeText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#A991FF',
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 12,
    marginTop: 5,
  },
  addText: {
    color: '#C5BAFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  playerCount: {
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
    width: '31%',
    minHeight: 110,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    marginBottom: 10,
  },
  selectedCategory: {
    backgroundColor: '#52408C',
    borderColor: '#BDA6FF',
  },
  categoryEmoji: {
    fontSize: 29,
    marginBottom: 8,
  },
  categoryName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  selectedLabel: {
    color: '#D6C9FF',
    fontSize: 10,
    marginTop: 5,
  },
  error: {
    color: '#FF8B9A',
    marginBottom: 12,
    textAlign: 'center',
  },
  tip: {
    color: '#A6A9C4',
    fontSize: 13,
    lineHeight: 21,
    marginVertical: 18,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#A991FF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginTop: 10,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#464B6E',
  },
  buttonText: {
    color: '#17142E',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
  },
  step: {
    color: '#B9A6FF',
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  secretBox: {
    backgroundColor: '#15182D',
    borderRadius: 18,
    padding: 25,
    minHeight: 190,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 15,
  },
  secretEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  secretText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  imposterText: {
    color: '#FF8B9A',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  word: {
    color: '#B9A6FF',
    fontSize: 29,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 20,
  },
  hintBox: {
    backgroundColor: '#303550',
    borderRadius: 14,
    padding: 18,
    marginVertical: 14,
    alignItems: 'center',
    width: '100%',
  },
  hintLabel: {
    color: '#BDA6FF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  hintText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 26,
  },
  voteOption: {
    backgroundColor: '#393D5B',
    padding: 17,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  voteText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  voteArrow: {
    color: '#B9A6FF',
    fontSize: 20,
  },
  resultEmoji: {
    textAlign: 'center',
    fontSize: 52,
    marginBottom: 15,
  },
  highlightName: {
    color: '#FFB9C4',
    fontSize: 27,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 25,
  },
  voteResult: {
    backgroundColor: '#393D5B',
    padding: 15,
    borderRadius: 11,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
});

