import { Stack } from 'expo-router';

import {
  AudioProvider,
} from '../audio/AudioProvider';

export default function RootLayout() {
  return (
    <AudioProvider>
      <Stack screenOptions={{
        headerShown: false,
      }} />
    </AudioProvider>
  );
}
