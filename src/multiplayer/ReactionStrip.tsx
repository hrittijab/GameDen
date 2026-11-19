import {
  View,
  StyleSheet,
} from 'react-native';

import ReactionBubble from './ReactionBubble';

import {
  getReaction,
  reactionsEnabled,
  type ReactionRoom,
} from './reactions';

export default function ReactionStrip({
  room,
  uid,
}: {
  room: ReactionRoom;
  uid: string;
}) {
  if (!reactionsEnabled(room)) {
    return null;
  }

  const reactions = Object.entries(room.players)
    .map(([id, name]) => ({
      id,
      name,
      reaction: getReaction(room, id),
    }))
    .filter(item => !!item.reaction)
    .sort((a, b) =>
      (b.reaction?.timestamp ?? 0) -
      (a.reaction?.timestamp ?? 0),
    )
    .slice(0, 2);

  return (
    <View
      pointerEvents="none"
      style={s.strip}
    >
      {reactions.map(item => (
        <ReactionBubble
          key={item.id}
          reaction={item.reaction}
          name={item.id === uid ? 'You' : item.name}
          compact
        />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  strip: {
    height: 55,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: 7,
  },
});

