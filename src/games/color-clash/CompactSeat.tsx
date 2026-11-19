import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';

import ReactionBubble from '../../multiplayer/ReactionBubble';

import type {
  Reaction,
} from '../../multiplayer/reactions';

const AVATARS = [
  '🐼', '🦊', '🐱', '🐸',
  '🐯', '🐨', '🐶', '🐰',
  '🦁', '🐵', '🐧', '🦉',
  '🐻', '🐙', '🦄', '🐹',
  '🐢', '🦝', '🐥', '🐺',
];

const COLORS = [
  '#B2E4DF',
  '#F2CC85',
  '#D7B9F4',
  '#A8D6AB',
  '#FFB2B2',
  '#B7D5FF',
];

const STATUS_COLORS = {
  online: '#43D69C',
  offline: '#FF7488',
  connecting: '#FFD071',
};

export type CompactSeatProps = {
  name: string;
  count: number;
  index: number;
  active: boolean;
  host: boolean;
  uno: boolean;
  departed?: boolean;
  connection: 'online' | 'offline' | 'connecting';
  reaction?: Reaction;
  onPress?: () => void;
};

export default function CompactSeat({
  name,
  count,
  index,
  active,
  host,
  uno,
  departed,
  connection,
  reaction,
  onPress,
}: CompactSeatProps) {
  const i = Math.max(0, index);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        `${name}, ${count} cards, ${
          departed ? 'left' : connection
        }${active ? ', current turn' : ''}`
      }
      style={[
        s.seat,
        active && !departed && s.active,
        departed && s.departed,
      ]}
    >
      <View style={s.avatarWrap}>
        <View style={[
          s.avatar,
          {
            backgroundColor:
              COLORS[i % COLORS.length],
          },
          active && !departed && s.activeAvatar,
        ]}>
          <Text style={s.emoji}>
            {AVATARS[i % AVATARS.length]}
          </Text>

          {!departed && (
            <View style={[
              s.dot,
              {
                backgroundColor:
                  STATUS_COLORS[connection],
              },
            ]} />
          )}
        </View>

        <View
          pointerEvents="none"
          style={s.reaction}
        >
          <ReactionBubble
            reaction={reaction}
            compact
          />
        </View>
      </View>

      <Text
        numberOfLines={1}
        style={s.name}
      >
        {host ? '👑 ' : ''}
        {name}
      </Text>

      <View style={s.countBadge}>
        <Text style={s.countText}>
          {departed
            ? 'LEFT'
            : `🃏 ${count}`}
        </Text>
      </View>

      <Text
        numberOfLines={1}
        style={[
          s.status,
          uno && s.uno,
          active && s.turn,
        ]}
      >
        {departed
          ? 'Departed'
          : uno
            ? 'UNO!'
            : active
              ? 'PLAYING'
              : connection === 'offline'
                ? 'Offline'
                : ' '}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  seat: {
    width: '100%',
    minHeight: 108,
    backgroundColor: '#253450',
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#FFFFFF12',
    paddingVertical: 9,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  active: {
    backgroundColor: '#4C4636',
    borderColor: '#FFD071',
    shadowColor: '#FFD071',
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 4,
  },

  departed: {
    opacity: 0.48,
  },

  avatarWrap: {
    position: 'relative',
    zIndex: 5,
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },

  activeAvatar: {
    borderColor: '#FFD071',
  },

  emoji: {
    fontSize: 23,
  },

  dot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#253450',
  },

  reaction: {
    position: 'absolute',
    top: -18,
    right: -15,
    zIndex: 20,
  },

  name: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    maxWidth: '100%',
  },

  countBadge: {
    backgroundColor: '#17233D',
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },

  countText: {
    color: '#DDE6FF',
    fontWeight: '800',
    fontSize: 11,
  },

  status: {
    color: '#A6A9C4',
    fontSize: 8,
    fontWeight: '800',
    minHeight: 11,
  },

  uno: {
    color: '#FF8398',
  },

  turn: {
    color: '#FFD071',
  },
});
