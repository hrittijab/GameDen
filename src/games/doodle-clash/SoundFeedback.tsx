import {
  useEffect,
  useRef,
} from 'react';

import {
  useGameAudio,
} from '../../audio/useGameAudio';

import {
  useCountdownAudio,
} from '../../audio/useCountdownAudio';

import type {
  DoodleRoom,
} from './doodleClashRooms';

export default function SoundFeedback({
  room,
  uid,
}: {
  room: DoodleRoom;
  uid: string;
}) {
  const { play, feedback } = useGameAudio();

  useCountdownAudio(
    room.deadline,
    room.status === 'playing' &&
      room.phase === 'drawing',
  );

  const guessed =
    room.guessedIds?.includes(uid) ?? false;

  const identity =
    `${room.matchNumber}-${room.roundNumber}`;

  const previous = useRef({
    identity,
    phase: '',
    guessed: false,
  });

  useEffect(() => {
    const old = previous.current;

    const newRound =
      old.identity !== identity;

    previous.current = {
      identity,
      phase: room.phase,
      guessed,
    };

    if (
      room.phase === 'finished' &&
      old.phase !== 'finished'
    ) {
      const scores = Object.keys(room.players)
        .map(id => room.scores?.[id] ?? 0);

      const highest = Math.max(0, ...scores);

      const won =
        scores.length >= 2 &&
        (room.scores?.[uid] ?? 0) === highest;

      if (won) {
        feedback('win', 'success');
      } else {
        play('defeat');
      }

    } else if (
      guessed &&
      (!old.guessed || newRound)
    ) {
      feedback('correct', 'success');

    } else if (
      room.phase === 'results' &&
      (old.phase !== 'results' || newRound)
    ) {
      play('results');

    } else if (
      room.phase === 'drawing' &&
      (old.phase !== 'drawing' || newRound)
    ) {
      play('round');
    }
  }, [
    identity,
    room.phase,
    room.players,
    room.scores,
    guessed,
    uid,
    play,
    feedback,
  ]);

  return null;
}
