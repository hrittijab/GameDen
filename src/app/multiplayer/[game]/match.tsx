import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, Button } from 'react-native';

import ColorClashGame from '../../../games/color-clash/Game';

const GAMES = {
  'color-clash': ColorClashGame,
};

export default function MultiplayerMatchRoute() {
  const router = useRouter();

  const { game } = useLocalSearchParams<{
    game?: string;
    code?: string;
  }>();

  const Game =
    typeof game === 'string' &&
    Object.prototype.hasOwnProperty.call(GAMES, game)
      ? GAMES[game as keyof typeof GAMES]
      : null;

  if (!Game) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#121629',
        gap: 15,
      }}>
        <Text style={{ color: '#FFFFFF' }}>
          Match not found
        </Text>

        <Button
          title="Return to GameDen"
          onPress={() => router.replace('/')}
        />
      </View>
    );
  }

  return <Game key={game} />;
}
