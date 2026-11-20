import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getPlayerAvatar } from './avatars';

export default function PlayerAvatar({
  room,
  uid,
  size = 34,
}: {
  room: {
    playerAvatars?: Record<string, string>;
  } | null | undefined;
  uid: string;
  size?: number;
}) {
  return (
    <View style={[
      s.avatar,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
      },
    ]}>
      <Text style={{
        fontSize: size * 0.62,
        textAlign: 'center',
      }}>
        {getPlayerAvatar(room, uid)}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  avatar: {
    backgroundColor: '#D7B9F4',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderWidth: 1,
    borderColor: '#FFFFFF30',
  },
});
