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
  WordRoom,
} from './types';

export default function SoundFeedback({
  room,
  uid,
}: {
  room: WordRoom;
  uid: string;
}) {
  const { play, feedback } = useGameAudio();

  useCountdownAudio(
    room.deadline,
    room.status === 'playing' &&
      (
        room.phase === 'typing' ||
        room.phase === 'countdown'
      ),
  );

  const submitted =
    room.submittedIds?.includes(uid) ?? false;

  const identity =
    `${room.matchNumber}-${room.roundNumber}`;

  const previous = useRef({
    identity,
    phase: '',
    submitted: false,
  });

  useEffect(() => {
    const old = previous.current;

    const newRound =
      old.identity !== identity;

    previous.current = {
      identity,
      phase: room.phase,
      submitted,
    };

    if (
      room.phase === 'finished' &&
      old.phase !== 'finished'
    ) {
      if (room.winnerIds?.includes(uid)) {
        feedback('win', 'success');
      } else {
        play('defeat');
      }

    } else if (
      room.phase === 'results' &&
      (old.phase !== 'results' || newRound)
    ) {
      const result = room.results?.find(
        item => item.uid === uid,
      );

      if (result?.outcome === 'duplicate') {
        feedback('duplicate', 'warning');
      } else if (result?.outcome === 'valid') {
        feedback('correct', 'success');
      } else {
        play('results');
      }

    } else if (
      room.phase === 'typing' &&
      (old.phase !== 'typing' || newRound)
    ) {
      play('round');

    } else if (
      room.phase === 'typing' &&
      submitted &&
      !old.submitted
    ) {
      feedback('tap');
    }
  }, [
    identity,
    room.phase,
    room.winnerIds,
    room.results,
    submitted,
    uid,
    play,
    feedback,
  ]);

  return null;
}
