import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, Button } from 'react-native';

import ColorClashLobby from '../../../games/color-clash/Lobby';

const LOBBIES = {
  'color-clash': ColorClashLobby,
};

export default function MultiplayerRoute() {
  const router = useRouter();

  const { game } = useLocalSearchParams<{
    game?: string;
  }>();

  const Lobby =
    typeof game === 'string' &&
    Object.prototype.hasOwnProperty.call(LOBBIES, game)
      ? LOBBIES[game as keyof typeof LOBBIES]
      : null;

  if (!Lobby) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#121629',
        gap: 15,
      }}>
        <Text style={{ color: '#FFFFFF' }}>
          Game not found
        </Text>

        <Button
          title="Return to GameDen"
          onPress={() => router.replace('/')}
        />
      </View>
    );
  }

  return <Lobby key={game} />;
}
