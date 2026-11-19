import {
  useEffect,
  useRef,
} from 'react';

import {
  useGameAudio,
} from '../audio/useGameAudio';

import {
  DISPLAY_MS,
  reactionsEnabled,
  type ReactionRoom,
} from './reactions';

export function useReactionAudio(
  room: ReactionRoom,
  code: string,
) {
  const { play } = useGameAudio();

  const previous = useRef<{
    identity: string;
    ids: Set<string>;
  }>({
    identity: '',
    ids: new Set(),
  });

  useEffect(() => {
    const identity =
      `${code}-${room.matchNumber}`;

    if (
      previous.current.identity !== identity ||
      !reactionsEnabled(room)
    ) {
      previous.current = {
        identity,
        ids: new Set(
          Object.values(
            room.sharedReactions ?? {},
          ).map(reaction => reaction.id),
        ),
      };

      return;
    }

    const entries = Object.entries(
      room.sharedReactions ?? {},
    ).filter(([uid, reaction]) =>
      Object.prototype.hasOwnProperty.call(
        room.players,
        uid,
      ) &&
      reaction.matchNumber === room.matchNumber
    );

    const old = previous.current.ids;

    const incoming = entries.some(([, reaction]) =>
      !old.has(reaction.id) &&
      Date.now() - reaction.timestamp < DISPLAY_MS
    );

    previous.current.ids = new Set(
      entries.map(([, reaction]) => reaction.id),
    );

    if (incoming) {
      play('reaction');
    }
  }, [
    room.sharedReactions,
    room.matchNumber,
    room.matchSettings?.reactions,
    room.status,
    room.players,
    code,
    play,
  ]);
}
