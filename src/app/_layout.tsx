import { Stack } from 'expo-router';

import {
  AudioProvider,
} from '../audio/AudioProvider';

import {
  PlayerProvider,
  usePlayer,
} from '../player/PlayerProvider';

function GameDenNavigation() {
  const {
    user,
    profile,
    ready,
    error,
  } = usePlayer();

  const authenticated =
    ready &&
    !!user &&
    !!profile &&
    !error;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Protected
        guard={!authenticated}
      >
        <Stack.Screen name="login" />
      </Stack.Protected>

      <Stack.Protected
        guard={authenticated}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="explore" />
        <Stack.Screen name="multiplayer-hub" />
        <Stack.Screen name="[game]" />
        <Stack.Screen name="category/[category]" />

        <Stack.Screen
          name="multiplayer/[game]/index"
        />

        <Stack.Screen
          name="multiplayer/[game]/match"
        />

        <Stack.Screen name="settings" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="doodle-test" />
      </Stack.Protected>

      {/* Public invitation landing page.
          Gameplay still requires authentication. */}

      <Stack.Screen name="invite" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <PlayerProvider>
      <AudioProvider>
        <GameDenNavigation />
      </AudioProvider>
    </PlayerProvider>
  );
}

