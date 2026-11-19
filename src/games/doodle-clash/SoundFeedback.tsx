import {
  useEffect,
  useRef,
} from 'react';

import {
  useAudioPlayer,
} from 'expo-audio';

import type {
  DoodleRoom,
} from './doodleClashRooms';

type Props = {
  room: DoodleRoom;
  uid: string;
  enabled: boolean;
};

type Player = ReturnType<typeof useAudioPlayer>;

async function play(player: Player) {
  try {
    await player.seekTo(0);
    player.play();
  } catch {
    // Audio must never interrupt gameplay.
  }
}

export default function SoundFeedback({
  room,
  uid,
  enabled,
}: Props) {
  const roundSound = useAudioPlayer(
    require('../../../assets/doodle-clash/round.wav'),
  );

  const correctSound = useAudioPlayer(
    require('../../../assets/doodle-clash/correct.wav'),
  );

  const resultSound = useAudioPlayer(
    require('../../../assets/doodle-clash/results.wav'),
  );

  const winSound = useAudioPlayer(
    require('../../../assets/doodle-clash/win.wav'),
  );

  const previous = useRef({
    phase: '',
    matchNumber: 0,
    guessed: false,
  });

  const guessed =
    room.guessedIds?.includes(uid) ?? false;

  useEffect(() => {
    const old = previous.current;

    previous.current = {
      phase: room.phase,
      matchNumber: room.matchNumber,
      guessed,
    };

    if (!enabled) return;

    if (
      room.phase === 'finished' &&
      old.phase !== 'finished'
    ) {
      void play(winSound);
    } else if (
      guessed &&
      (
        !old.guessed ||
        old.matchNumber !== room.matchNumber
      )
    ) {
      void play(correctSound);
    } else if (
      room.phase === 'results' &&
      old.phase !== 'results'
    ) {
      void play(resultSound);
    } else if (
      room.phase === 'drawing' &&
      (
        old.phase !== 'drawing' ||
        old.matchNumber !== room.matchNumber
      )
    ) {
      void play(roundSound);
    }
  }, [
    room.phase,
    room.matchNumber,
    guessed,
    enabled,
    roundSound,
    correctSound,
    resultSound,
    winSound,
  ]);

  return null;
}
