import { useRouter } from 'expo-router';

import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import ArtworkCard from './ArtworkCard';

import {
  GAMES,
  type Game,
  type GameCategory,
} from '../constants/games';

type Props = {
  category?: GameCategory;
};

export default function GameLibrary({
  category,
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const games = category
    ? GAMES.filter(
        game => game.category === category.id
      )
    : GAMES;

  const availableCount =
    games.filter(game => game.available).length;

  const columns =
    width >= 1000 ? 4 :
    width >= 650 ? 3 :
    2;

  const contentWidth =
    Math.min(width, 1100) - 40;

  const cardWidth =
    Math.floor(
      (contentWidth - (columns - 1) * 12) /
      columns
    );

  function openGame(game: Game) {
    if (!game.available) return;

    if (game.mode === 'online') {
      router.push({
        pathname: '/multiplayer/[game]',
        params: {
          game: game.id,
        },
      });

      return;
    }

    router.push({
      pathname: '/[game]',
      params: {
        game: game.id,
      },
    });
  }

  return (
    <View style={s.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.content,
          {
            paddingTop: Math.max(insets.top + 15, 30),
            paddingBottom: insets.bottom + 30,
          },
        ]}
      >
        {/* NAVIGATION */}

        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace('/')
          }
          style={s.backButton}
        >
          <Text style={s.backText}>
            ← Back to GameDen
          </Text>
        </Pressable>

        {/* CATEGORY HERO */}

        <View style={[
          s.hero,
          {
            backgroundColor:
              category?.color ?? '#292D4B',
          },
        ]}>
          {category && (
            <Image
              source={category.image}
              style={s.heroImage}
              resizeMode="cover"
            />
          )}

          <View style={s.heroBody}>
            <Text style={[
              s.eyebrow,
              {
                color:
                  category?.accent ?? '#A5E1EB',
              },
            ]}>
              GAMEDEN COLLECTION
            </Text>

            <Text style={s.heading}>
              {category?.title ?? 'All Games'}
            </Text>

            <Text style={s.subtitle}>
              {category?.description ??
                'Find your next favorite game.'}
            </Text>
          </View>
        </View>

        {/* GAME LIST */}

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>
            {games.length ? 'Discover games' : 'Coming soon'}
          </Text>

          <Text style={s.count}>
            {availableCount} available
          </Text>
        </View>

        {games.length > 0 ? (
          <View style={s.grid}>
            {games.map(game => (
              <View
                key={game.id}
                style={{
                  width: cardWidth,
                }}
              >
                <ArtworkCard
                  image={game.image}
                  title={game.name}
                  description={game.description}
                  color={game.color}
                  accent={
                    category?.accent ?? '#A5E1EB'
                  }
                  available={game.available}
                  meta={
                    game.available
                      ? `${game.players} · ${game.mode === 'online' ? 'Online' : 'Offline'}`
                      : 'Coming soon'
                  }
                  onPress={() => openGame(game)}
                />
              </View>
            ))}
          </View>
        ) : (
          <View style={s.emptyState}>
            <Text style={s.emptyEyebrow}>
              IN DEVELOPMENT
            </Text>

            <Text style={s.emptyTitle}>
              Something fun is coming.
            </Text>

            <Text style={s.emptyDescription}>
              New games are being built for this
              collection. Check out our other
              games in the meantime.
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/')}
              style={s.emptyButton}
            >
              <Text style={s.emptyButtonText}>
                Discover more games →
              </Text>
            </Pressable>
          </View>
        )}

        <Text style={s.footer}>
          Your games. Your people. Your den.
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
    maxWidth: 1100,
    paddingHorizontal: 20,
    alignSelf: 'center',
  },

  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    marginBottom: 16,
  },

  backText: {
    color: '#A5E1EB',
    fontWeight: '800',
    fontSize: 14,
  },

  hero: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 26,
  },

  heroImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    maxHeight: 300,
  },

  heroBody: {
    padding: 22,
    gap: 9,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },

  heading: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
  },

  subtitle: {
    color: '#D0D1E5',
    fontSize: 14,
    lineHeight: 21,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    flex: 1,
  },

  count: {
    color: '#A6A9C4',
    fontSize: 12,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  emptyState: {
    backgroundColor: '#242841',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    gap: 14,
  },

  emptyEyebrow: {
    color: '#FFD071',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },

  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
    textAlign: 'center',
  },

  emptyDescription: {
    color: '#A6A9C4',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 360,
  },

  emptyButton: {
    backgroundColor: '#A5E1EB',
    borderRadius: 13,
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginTop: 8,
  },

  emptyButtonText: {
    color: '#15313C',
    fontSize: 14,
    fontWeight: '900',
  },

  footer: {
    color: '#7F85A6',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 30,
  },
});

