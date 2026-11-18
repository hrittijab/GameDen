
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import Charades from '../games/charades/Charades';
import Imposter from '../games/imposter/Imposter';
import NeverHaveIEver from '../games/never-have-i-ever/NeverHaveIEver';
import WhoAmI from '../games/who-am-i/WhoAmI';

const GAMES = {
  charades: Charades,
  imposter: Imposter,
  'never-have-i-ever': NeverHaveIEver,
  'who-am-i': WhoAmI,
};

type GameId = keyof typeof GAMES;

export default function GameRoute() {
  const router = useRouter();

  const { game } = useLocalSearchParams<{
    game?: string;
  }>();

  const GameComponent =
    typeof game === 'string' &&
    Object.prototype.hasOwnProperty.call(GAMES, game)
      ? GAMES[game as GameId]
      : null;

  if (!GameComponent) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          Game not found
        </Text>

        <Text style={styles.description}>
          This game is currently unavailable.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.buttonText}>
            Return to GameDen
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <GameComponent key={game} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121629',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
  },

  description: {
    color: '#C0C6DE',
    fontSize: 15,
    textAlign: 'center',
  },

  button: {
    backgroundColor: '#A5E1EB',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },

  buttonText: {
    color: '#121629',
    fontSize: 15,
    fontWeight: '800',
  },
});
