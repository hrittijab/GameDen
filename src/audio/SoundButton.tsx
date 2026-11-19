import {
  Pressable,
  Text,
  StyleSheet,
} from 'react-native';

import {
  useAudio,
} from './AudioProvider';

export default function SoundButton({
  accent = '#A5E1EB',
}: {
  accent?: string;
}) {
  const {
    preferences,
    ready,
    toggleEffects,
  } = useAudio();

  return (
    <Pressable
      disabled={!ready}
      accessibilityRole="button"
      accessibilityLabel={
        preferences.effectsEnabled
          ? 'Mute sound effects'
          : 'Enable sound effects'
      }
      onPress={toggleEffects}
      style={[
        s.button,
        { borderColor: accent },
        !preferences.effectsEnabled && s.muted,
      ]}
    >
      <Text style={s.icon}>
        {preferences.effectsEnabled
          ? '🔊'
          : '🔇'}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: '#303550',
    alignItems: 'center',
    justifyContent: 'center',
  },

  muted: {
    opacity: 0.65,
  },

  icon: {
    fontSize: 22,
  },
});
