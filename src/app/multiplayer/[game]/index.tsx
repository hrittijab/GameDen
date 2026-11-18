import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import {
  View,
  Text,
  Button,
} from 'react-native';

import MultiplayerLobby, {
  type MultiplayerLobbyConfig,
} from '../../../multiplayer/Lobby';

import {
  COLOR_CLASH_CONFIG,
} from '../../../games/color-clash/config';

const GAMES: Record<
  string,
  MultiplayerLobbyConfig
> = {
  'color-clash': COLOR_CLASH_CONFIG,
};

export default function MultiplayerRoute() {
  const router = useRouter();

  const { game } = useLocalSearchParams<{
    game?: string;
  }>();

  const config =
    typeof game === 'string' &&
    Object.prototype.hasOwnProperty.call(
      GAMES,
      game,
    )
      ? GAMES[game]
      : null;

  if (!config) {
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

  return (
    <MultiplayerLobby
      key={config.gameId}
      config={config}
    />
  );
}
