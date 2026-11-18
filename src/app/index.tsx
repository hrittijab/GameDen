import {
  useRouter,
  type Href,
} from 'expo-router';

import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  useWindowDimensions,
} from 'react-native';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import ArtworkCard from '../components/ArtworkCard';

import {
  CATEGORIES,
  GAMES,
  getAvailableGameCount,
} from '../constants/games';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const wide = width >= 950;

  const availableCount =
    GAMES.filter(game => game.available).length;

  return (
    <View style={s.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.content,
          {
            paddingTop: Math.max(insets.top + 20, 35),
            paddingBottom: insets.bottom + 30,
          },
        ]}
      >
        {/* BRAND */}

        <View style={s.header}>
          <View style={s.brand}>
            <View style={s.brandMark}>
              <Text style={s.brandLetter}>G</Text>
            </View>

            <View>
              <Text style={s.logo}>
                Game<Text style={s.logoAccent}>Den</Text>
              </Text>

              <Text style={s.tagline}>
                Your games. Your people. Your den.
              </Text>
            </View>
          </View>
        </View>

        {/* WELCOME */}

        <View style={s.intro}>
          <Text style={s.eyebrow}>
            WELCOME TO YOUR DEN
          </Text>

          <Text style={s.heading}>
            It's game night.
          </Text>

          <Text style={s.subtitle}>
            Play together, challenge your friends,
            or enjoy a game on your own.
          </Text>
        </View>

        {/* CATEGORY HEADER */}

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>
            Choose your game mode
          </Text>

          <Text style={s.count}>
            {CATEGORIES.length} categories
          </Text>
        </View>

        {/* CATEGORY ARTWORK */}

        <View style={[
          s.categories,
          wide && s.categoriesWide,
        ]}>
          {CATEGORIES.map(category => {
            const count =
              getAvailableGameCount(category.id);

            return (
              <View
                key={category.id}
                style={[
                  s.categoryItem,
                  wide && s.categoryItemWide,
                ]}
              >
                <ArtworkCard
                  title={category.title}
                  description={category.description}
                  image={category.image}
                  color={category.color}
                  accent={category.accent}
                  banner
                  meta={
                    count === 0
                      ? 'Coming soon'
                      : `${count} ${count === 1 ? 'game' : 'games'} available`
                  }
                  onPress={() =>
                    router.push(
                      `/category/${category.id}` as Href
                    )
                  }
                />
              </View>
            );
          })}
        </View>

        {/* GAME LIBRARY */}

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/explore')}
          style={({ pressed }) => [
            s.library,
            pressed && { opacity: 0.75 },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={s.libraryTitle}>
              Explore all games
            </Text>

            <Text style={s.libraryDescription}>
              {availableCount} games ready to play.
              Discover the entire collection.
            </Text>
          </View>

          <Text style={s.libraryArrow}>→</Text>
        </Pressable>

        <Text style={s.footer}>
          More games. More memories.
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#121629',
  },

  content: {
    width: '100%',
    maxWidth: 1150,
    alignSelf: 'center',
    paddingHorizontal: 20,
  },

  header: {
    marginBottom: 32,
  },

  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  brandMark: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#A5E1EB',
    justifyContent: 'center',
    alignItems: 'center',
  },

  brandLetter: {
    color: '#121629',
    fontSize: 28,
    fontWeight: '900',
  },

  logo: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -1,
  },

  logoAccent: {
    color: '#A5E1EB',
  },

  tagline: {
    color: '#A6A9C4',
    fontSize: 11,
    marginTop: 3,
  },

  intro: {
    gap: 10,
    marginBottom: 30,
  },

  eyebrow: {
    color: '#B5A5FC',
    letterSpacing: 2,
    fontWeight: '900',
    fontSize: 11,
  },

  heading: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1,
  },

  subtitle: {
    color: '#A6A9C4',
    fontSize: 15,
    lineHeight: 23,
    maxWidth: 500,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 16,
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    flex: 1,
  },

  count: {
    color: '#A6A9C4',
    fontSize: 11,
  },

  categories: {
    gap: 18,
  },

  categoriesWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },

  categoryItem: {
    width: '100%',
  },

  categoryItemWide: {
    width: undefined,
    flex: 1,
    minWidth: 0,
  },

  library: {
    marginTop: 24,
    backgroundColor: '#242841',
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#FFFFFF12',
  },

  libraryTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
  },

  libraryDescription: {
    color: '#A6A9C4',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },

  libraryArrow: {
    color: '#A5E1EB',
    fontSize: 30,
  },

  footer: {
    textAlign: 'center',
    color: '#7F85A6',
    fontSize: 12,
    marginTop: 30,
  },
});
