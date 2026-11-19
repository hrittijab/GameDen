import AsyncStorage from '@react-native-async-storage/async-storage';

export type AudioPreferences = {
  effectsEnabled: boolean;
  musicEnabled: boolean;
  vibrationEnabled: boolean;
  effectsVolume: number;
  musicVolume: number;
};

export const DEFAULT_AUDIO: AudioPreferences = {
  effectsEnabled: true,
  musicEnabled: false,
  vibrationEnabled: true,
  effectsVolume: 0.8,
  musicVolume: 0.35,
};

const KEY = '@gameden/audio/v1';

function volume(
  value: unknown,
  fallback: number,
) {
  return (
    typeof value === 'number' &&
    Number.isFinite(value)
  )
    ? Math.min(1, Math.max(0, value))
    : fallback;
}

export async function loadAudioPreferences():
  Promise<AudioPreferences> {
  try {
    const raw = await AsyncStorage.getItem(KEY);

    if (!raw) return { ...DEFAULT_AUDIO };

    const data = JSON.parse(raw);

    if (!data || typeof data !== 'object') {
      return { ...DEFAULT_AUDIO };
    }

    return {
      effectsEnabled:
        typeof data.effectsEnabled === 'boolean'
          ? data.effectsEnabled
          : DEFAULT_AUDIO.effectsEnabled,

      musicEnabled:
        typeof data.musicEnabled === 'boolean'
          ? data.musicEnabled
          : DEFAULT_AUDIO.musicEnabled,

      vibrationEnabled:
        typeof data.vibrationEnabled === 'boolean'
          ? data.vibrationEnabled
          : DEFAULT_AUDIO.vibrationEnabled,

      effectsVolume: volume(
        data.effectsVolume,
        DEFAULT_AUDIO.effectsVolume,
      ),

      musicVolume: volume(
        data.musicVolume,
        DEFAULT_AUDIO.musicVolume,
      ),
    };
  } catch {
    return { ...DEFAULT_AUDIO };
  }
}

export async function saveAudioPreferences(
  preferences: AudioPreferences,
) {
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify(preferences),
  );
}
