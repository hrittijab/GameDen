import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

import {
  AppState,
  Platform,
  Vibration,
} from 'react-native';

import {
  useAudioPlayer,
} from 'expo-audio';

import {
  usePathname,
} from 'expo-router';

import {
  DEFAULT_AUDIO,
  loadAudioPreferences,
  saveAudioPreferences,
  type AudioPreferences,
} from './preferences';

import {
  SOUNDS,
  MUSIC,
  type SoundName,
} from './soundLibrary';

type AudioContextValue = {
  preferences: AudioPreferences;
  ready: boolean;
  update: (
    patch: Partial<AudioPreferences>,
  ) => void;
  play: (name: SoundName) => void;
  vibrate: (
    kind?: 'light' | 'success' | 'warning',
  ) => void;
  toggleEffects: () => void;
  resumeMusic: () => void;
};

const AudioContext =
  createContext<AudioContextValue | null>(null);

export function AudioProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  const [preferences, setPreferences] =
    useState(DEFAULT_AUDIO);

  const [ready, setReady] =
    useState(false);

  const current = useRef(DEFAULT_AUDIO);
  const loaded = useRef(false);
  const generation = useRef(0);

  const foreground = useRef(
    AppState.currentState !== 'background' &&
    AppState.currentState !== 'inactive',
  );

  const writeQueue = useRef<Promise<void>>(
    Promise.resolve(),
  );

  const cardPlay = useAudioPlayer(SOUNDS.cardPlay);
  const cardDraw = useAudioPlayer(SOUNDS.cardDraw);
  const uno = useAudioPlayer(SOUNDS.uno);
  const cardDeal = useAudioPlayer(SOUNDS.cardDeal);
  const cardWin = useAudioPlayer(SOUNDS.cardWin);

  const round = useAudioPlayer(SOUNDS.round);
  const correct = useAudioPlayer(SOUNDS.correct);
  const results = useAudioPlayer(SOUNDS.results);
  const win = useAudioPlayer(SOUNDS.win);

  const tap = useAudioPlayer(SOUNDS.tap);
  const reaction = useAudioPlayer(SOUNDS.reaction);
  const countdown = useAudioPlayer(SOUNDS.countdown);
  const defeat = useAudioPlayer(SOUNDS.defeat);
  const duplicate = useAudioPlayer(SOUNDS.duplicate);

  const music = useAudioPlayer(MUSIC);

  const players = useRef({
    cardPlay,
    cardDraw,
    uno,
    cardDeal,
    cardWin,
    round,
    correct,
    results,
    win,
    tap,
    reaction,
    countdown,
    defeat,
    duplicate,
  });

  players.current = {
    cardPlay,
    cardDraw,
    uno,
    cardDeal,
    cardWin,
    round,
    correct,
    results,
    win,
    tap,
    reaction,
    countdown,
    defeat,
    duplicate,
  };

  const stopEffects = useCallback(() => {
    generation.current++;

    for (const player of Object.values(
      players.current
    )) {
      try {
        player.pause();
      } catch {
        // Unavailable audio must not affect gameplay.
      }
    }
  }, []);

  const resumeMusic = useCallback(() => {
    if (
      !loaded.current ||
      !foreground.current ||
      !current.current.musicEnabled
    ) return;

    try {
      music.loop = true;
      music.volume = current.current.musicVolume;

      music.play();
    } catch {
      // Browser autoplay may require a user gesture.
    }
  }, [music]);

  useEffect(() => {
    let active = true;

    void loadAudioPreferences().then(value => {
      if (!active) return;

      current.current = value;
      setPreferences(value);

      loaded.current = true;
      setReady(true);
    });

    return () => {
      active = false;
    };
  }, []);

  const update = useCallback(
    (patch: Partial<AudioPreferences>) => {
      if (!loaded.current) return;

      const next = {
        ...current.current,
        ...patch,
      };

      next.effectsVolume = Math.min(
        1,
        Math.max(0, next.effectsVolume),
      );

      next.musicVolume = Math.min(
        1,
        Math.max(0, next.musicVolume),
      );

      current.current = next;

      setPreferences(next);

      if (!next.effectsEnabled) {
        stopEffects();
      }

      if (!next.vibrationEnabled) {
        Vibration.cancel();
      }

      for (const player of Object.values(
        players.current
      )) {
        try {
          player.volume = next.effectsVolume;
        } catch {}
      }

      try {
        music.volume = next.musicVolume;

        if (!next.musicEnabled) {
          music.pause();
        } else if (patch.musicEnabled === true) {
          resumeMusic();
        }
      } catch {}

      writeQueue.current = writeQueue.current
        .catch(() => {})
        .then(() => saveAudioPreferences(next))
        .catch(() => {});
    },
    [music, resumeMusic, stopEffects],
  );

  const play = useCallback(
    (name: SoundName) => {
      const settings = current.current;

      if (
        !loaded.current ||
        !settings.effectsEnabled ||
        !foreground.current ||
        settings.effectsVolume === 0
      ) return;

      const player = players.current[name];
      const version = generation.current;

      try {
        player.volume = settings.effectsVolume;

        void player.seekTo(0).then(() => {
          if (
            generation.current !== version ||
            !current.current.effectsEnabled ||
            !foreground.current
          ) return;

          player.volume =
            current.current.effectsVolume;

          player.play();
        }).catch(() => {});
      } catch {
        // Keep audio errors isolated from gameplay.
      }
    },
    [],
  );

  const vibrate = useCallback(
    (
      kind: 'light' | 'success' | 'warning' = 'light',
    ) => {
      if (
        !loaded.current ||
        !current.current.vibrationEnabled ||
        !foreground.current ||
        Platform.OS === 'web'
      ) return;

      try {
        if (kind === 'success') {
          Vibration.vibrate([0, 70, 50, 90]);
        } else if (kind === 'warning') {
          Vibration.vibrate(70);
        } else {
          Vibration.vibrate(20);
        }
      } catch {}
    },
    [],
  );

  const toggleEffects = useCallback(() => {
    update({
      effectsEnabled:
        !current.current.effectsEnabled,
    });
  }, [update]);

  useEffect(() => {
    if (!ready) return;

    if (preferences.musicEnabled) {
      resumeMusic();
    } else {
      try {
        music.pause();
      } catch {}
    }
  }, [
    ready,
    preferences.musicEnabled,
    resumeMusic,
    music,
  ]);

  useEffect(() => {
    const subscription =
      AppState.addEventListener(
        'change',
        state => {
          foreground.current =
            state === 'active';

          if (!foreground.current) {
            stopEffects();

            try {
              music.pause();
            } catch {}

            Vibration.cancel();
          } else {
            resumeMusic();
          }
        },
      );

    return () => subscription.remove();
  }, [music, resumeMusic, stopEffects]);

  useEffect(() => {
    return () => {
      stopEffects();
      Vibration.cancel();
    };
  }, [pathname, stopEffects]);

  return (
    <AudioContext.Provider
      value={{
        preferences,
        ready,
        update,
        play,
        vibrate,
        toggleEffects,
        resumeMusic,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const value = useContext(AudioContext);

  if (!value) {
    throw new Error(
      'AudioProvider is missing.',
    );
  }

  return value;
}
