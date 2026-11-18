
import { useRouter, type Href } from 'expo-router';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type Game = {
  id: string;
  name: string;
  emoji: string;
  category: string;
  color: string;
  available: boolean;
};

const games: Game[] = [
  {
    id: 'imposter',
    name: 'Imposter',
    emoji: '🕵️',
    category: 'Party',
    color: '#6249A5',
    available: true,
  },
  {
    id: 'charades',
    name: 'Charades',
    emoji: '🎭',
    category: 'Party',
    color: '#277E8E',
    available: true,
  },
  {
    id: 'neverhave',
    name: 'Never Have I Ever',
    emoji: '🙈',
    category: 'Party',
    color: '#8350A9',
    available: true,
  },
  {
    id: 'whoami',
    name: 'Who Am I?',
    emoji: '❓',
    category: 'Party',
    color: '#8765A8',
    available: true,
  },
  {
    id: 'colorclash',
    name: 'Color Clash',
    emoji: '🎴',
    category: 'Card Game',
    color: '#E88B57',
    available: true,
  },
  {
    id: 'chess',
    name: 'Chess',
    emoji: '♟️',
    category: 'Board',
    color: '#49788B',
    available: false,
  },
];

export default function HomeScreen() {
  const router = useRouter();

  const handleGamePress = (game: Game) => {
    if (game.id === 'imposter') {
      router.push('/imposter');
      return;
    }

    if (game.id === 'charades') {
      router.push('/charades');
      return;
    }
    if (game.id === 'neverhave') {
      router.push('/never-have-i-ever' as Href);
      return;
    }
    if (game.id === 'whoami') {
      router.push('/who-am-i' as Href);
      return;
    }
    if (game.id === 'colorclash') {
      router.push('/color-clash' as Href);
      return;
    }

    const message = `${game.name} is coming soon to GameDen!`;

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.alert(message);
      }
    } else {
      Alert.alert(game.name, message);
    }
};

  const availableGames = games.filter((game) => game.available);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.logo}>🎮 GameDen</Text>

            <Text style={styles.subtitle}>
              Your games. Your people. Your den.
            </Text>
          </View>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>G</Text>
          </View>
        </View>

        {/* Welcome Banner */}
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>
            WELCOME TO YOUR DEN
          </Text>

          <Text style={styles.heroTitle}>
            It's game night!
          </Text>

          <Text style={styles.heroDescription}>
            One place for games, laughs, and unforgettable moments.
            Gather your friends and start playing!
          </Text>

          <TouchableOpacity
            style={styles.heroButton}
            onPress={() => router.push('/imposter')}
            activeOpacity={0.8}
          >
            <Text style={styles.heroButtonText}>
              Play Imposter →
            </Text>
          </TouchableOpacity>
        </View>

        {/* Games Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Discover Games
          </Text>

          <Text style={styles.gameCount}>
            {games.length} games
          </Text>
        </View>

        {/* Game Grid */}
        <View style={styles.grid}>
          {games.map((game) => (
            <TouchableOpacity
              key={game.id}
              style={[
                styles.gameCard,
                { backgroundColor: game.color },
              ]}
              onPress={() => handleGamePress(game)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`${game.name}, ${
                game.available ? 'play now' : 'coming soon'
              }`}
            >
              <Text style={styles.gameEmoji}>
                {game.emoji}
              </Text>

              <View>
                <Text style={styles.gameName}>
                  {game.name}
                </Text>

                <Text style={styles.gameCategory}>
                  {game.category} Game
                </Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  game.available
                    ? styles.availableBadge
                    : styles.comingSoonBadge,
                ]}
              >
                <Text style={styles.statusText}>
                  {game.available ? 'PLAY NOW' : 'COMING SOON'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Available Games Summary */}
        <View style={styles.availableSection}>
          <Text style={styles.availableTitle}>
            ✨ Ready to play
          </Text>

          <Text style={styles.availableDescription}>
            {availableGames.length} game available now.
            More games are being added to GameDen!
          </Text>
        </View>

        {/* Future Features */}
        <View style={styles.footerCard}>
          <Text style={styles.footerTitle}>
            🏠 Your Den is growing
          </Text>

          <Text style={styles.footerDescription}>
            Multiplayer rooms, private invites, achievements,
            and even more games are coming soon.
          </Text>
        </View>

        <Text style={styles.footerText}>
          Made for game nights and good memories 💜
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#15182D',
  },

  content: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 60,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },

  headerText: {
    flex: 1,
    paddingRight: 12,
  },

  logo: {
    fontSize: 29,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  subtitle: {
    color: '#A6A9C4',
    fontSize: 12,
    marginTop: 6,
  },

  avatar: {
    backgroundColor: '#7463C5',
    height: 46,
    width: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  hero: {
    backgroundColor: '#31315B',
    padding: 24,
    borderRadius: 22,
    marginBottom: 30,
  },

  heroEyebrow: {
    color: '#C5BAFF',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 31,
    fontWeight: '800',
    marginTop: 12,
  },

  heroDescription: {
    color: '#D0CEE7',
    fontSize: 14,
    lineHeight: 23,
    marginTop: 10,
    marginBottom: 22,
  },

  heroButton: {
    backgroundColor: '#A991FF',
    paddingVertical: 14,
    paddingHorizontal: 22,
    alignSelf: 'flex-start',
    borderRadius: 12,
  },

  heroButtonText: {
    color: '#17142E',
    fontSize: 15,
    fontWeight: '800',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  gameCount: {
    fontSize: 12,
    color: '#A6A9C4',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  gameCard: {
    width: '48%',
    minHeight: 190,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    justifyContent: 'space-between',
  },

  gameEmoji: {
    fontSize: 36,
  },

  gameName: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 17,
    marginTop: 12,
  },

  gameCategory: {
    color: '#F0EAFB',
    fontSize: 12,
    marginTop: 5,
  },

  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 12,
  },

  availableBadge: {
    backgroundColor: 'rgba(60, 200, 130, 0.30)',
  },

  comingSoonBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.17)',
  },

  statusText: {
    color: '#FFFFFF',
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: '800',
  },

  availableSection: {
    backgroundColor: '#303452',
    borderRadius: 18,
    padding: 20,
    marginTop: 8,
  },

  availableTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },

  availableDescription: {
    color: '#CBCDE0',
    fontSize: 13,
    lineHeight: 21,
  },

  footerCard: {
    backgroundColor: '#242841',
    borderRadius: 18,
    padding: 20,
    marginTop: 18,
  },

  footerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },

  footerDescription: {
    color: '#A6A9C4',
    fontSize: 13,
    lineHeight: 21,
    marginTop: 8,
  },

  footerText: {
    color: '#777C9E',
    textAlign: 'center',
    fontSize: 12,
    marginTop: 30,
  },
});
