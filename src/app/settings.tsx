import {
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  View,
} from 'react-native';

import {
  useRouter,
} from 'expo-router';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import AudioSettings from '../audio/AudioSettings';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={[
        s.content,
        {
          paddingTop: Math.max(
            24,
            insets.top + 12,
          ),
          paddingBottom: insets.bottom + 24,
        },
      ]}
    >
      <View style={s.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          }}
          style={s.back}
        >
          <Text style={s.backText}>←</Text>
        </Pressable>

        <Text style={s.title}>Settings</Text>
      </View>

      <AudioSettings />

      <View style={s.footer}>
        <Text style={s.brand}>GameDen</Text>
        <Text style={s.caption}>
          Your games. Your people. Your den.
        </Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#121629',
  },

  content: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: 18,
    gap: 24,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  back: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#303550',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backText: {
    color: '#A5E1EB',
    fontSize: 25,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '900',
  },

  footer: {
    alignItems: 'center',
    gap: 5,
  },

  brand: {
    color: '#A5E1EB',
    fontSize: 20,
    fontWeight: '900',
  },

  caption: {
    color: '#A6A9C4',
    fontSize: 11,
    textAlign: 'center',
  },
});
