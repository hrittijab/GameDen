import { useRouter } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { usePlayer } from './PlayerProvider';

export default function PlayerCard() {
  const router = useRouter();
  const {
    user,
    profile,
    isGuest,
  } = usePlayer();

  if (!user || !profile) return null;

  return (
    <Pressable
      style={s.card}
      accessibilityRole="button"
      onPress={() => router.push('/profile')}
    >
      <View style={s.avatar}>
        <Text style={s.emoji}>
          {profile.avatar}
        </Text>
      </View>

      <View style={s.info}>
        <Text
          style={s.name}
          numberOfLines={1}
        >
          {profile.nickname}
        </Text>

        <Text style={s.caption}>
          {isGuest
            ? 'Guest player'
            : 'Registered player'}
        </Text>
      </View>

      <View style={s.verified}>
        <Text style={s.verifiedText}>
          PROFILE ›
        </Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#242841',
    borderColor: '#505775',
    borderWidth: 1,
    borderRadius: 18,
    padding: 15,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },

  avatar: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: '#D7B9F4',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emoji: {
    fontSize: 34,
  },

  info: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },

  name: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },

  caption: {
    color: '#A6A9C4',
    fontSize: 12,
  },

  verified: {
    backgroundColor: '#203D40',
    borderRadius: 8,
    padding: 8,
  },

  verifiedText: {
    color: '#65CDB1',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
});

