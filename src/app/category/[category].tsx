import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';

import GameLibrary from '../../components/GameLibrary';

import {
  getCategory,
} from '../../constants/games';

export default function CategoryRoute() {
  const router = useRouter();

  const { category } =
    useLocalSearchParams<{
      category?: string;
    }>();

  const selected =
    typeof category === 'string'
      ? getCategory(category)
      : undefined;

  if (!selected) {
    return (
      <View style={s.root}>
        <Text style={s.title}>
          Category not found
        </Text>

        <Pressable
          onPress={() => router.replace('/')}
          style={s.button}
        >
          <Text style={s.buttonText}>
            Return to GameDen
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <GameLibrary
      key={selected.id}
      category={selected}
    />
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#121629',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 18,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },

  button: {
    backgroundColor: '#A5E1EB',
    padding: 15,
    borderRadius: 12,
  },

  buttonText: {
    color: '#121629',
    fontWeight: '800',
  },
});
