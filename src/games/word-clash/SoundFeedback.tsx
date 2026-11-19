import {
  useEffect,
  useRef,
} from 'react';

import {
  useAudioPlayer,
} from 'expo-audio';

import type { WordRoom } from './types';

type Player = ReturnType<typeof useAudioPlayer>;

async function play(player: Player) {
  try {
    await player.seekTo(0);
    player.play();
  } catch {
    // Audio failures must not interrupt gameplay.
  }
}

export default function SoundFeedback({
  room,
  uid,
  enabled,
}: {
  room: WordRoom;
  uid: string;
  enabled: boolean;
}) {
  const roundSound = useAudioPlayer(
    require('../../../assets/doodle-clash/round.wav'),
  );

  const submitSound = useAudioPlayer(
    require('../../../assets/doodle-clash/correct.wav'),
  );

  const resultsSound = useAudioPlayer(
    require('../../../assets/doodle-clash/results.wav'),
  );

  const winSound = useAudioPlayer(
    require('../../../assets/doodle-clash/win.wav'),
  );

  const submitted =
    room.submittedIds?.includes(uid) ?? false;

  const previous = useRef({
    phase: '',
    matchNumber: 0,
    roundNumber: 0,
    submitted: false,
  });

  useEffect(() => {
    const old = previous.current;

    const newRound =
      old.matchNumber !== room.matchNumber ||
      old.roundNumber !== room.roundNumber;

    previous.current = {
      phase: room.phase,
      matchNumber: room.matchNumber,
      roundNumber: room.roundNumber,
      submitted,
    };

    if (!enabled) return;

    if (
      room.phase === 'finished' &&
      old.phase !== 'finished'
    ) {
      void play(winSound);
    } else if (
      room.phase === 'results' &&
      (old.phase !== 'results' || newRound)
    ) {
      void play(resultsSound);
    } else if (
      room.phase === 'typing' &&
      (old.phase !== 'typing' || newRound)
    ) {
      void play(roundSound);
    } else if (
      room.phase === 'typing' &&
      submitted &&
      !old.submitted
    ) {
      void play(submitSound);
    }
  }, [
    room.phase,
    room.matchNumber,
    room.roundNumber,
    submitted,
    enabled,
    roundSound,
    submitSound,
    resultsSound,
    winSound,
  ]);

  return null;
}
