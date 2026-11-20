import {
  useCallback,
  useState,
} from 'react';

import {
  useFocusEffect,
  useRouter,
} from 'expo-router';

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  subscribeToPublicRooms,
  type PublicRoom,
} from '../multiplayer/publicRooms';

import type {
  InviteGame,
} from '../multiplayer/invitations';

const GAMES = [
  {
    id: 'color-clash',
    title: 'Color Clash',
    icon: '🎴',
    color: '#B2E4DF',
  },

  {
    id: 'doodle-clash',
    title: 'Doodle Clash',
    icon: '🎨',
    color: '#D7B9F4',
  },

  {
    id: 'word-clash',
    title: 'Word Clash',
    icon: '🔤',
    color: '#F2CC85',
  },
] as const;

type Filter = 'all' | InviteGame;

export default function MultiplayerHub() {
  const router = useRouter();

  const insets = useSafeAreaInsets();

  const [rooms, setRooms] =
    useState<PublicRoom[]>([]);

  const [filter, setFilter] =
    useState<Filter>('all');

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [refreshKey, setRefreshKey] =
    useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      setLoading(true);
      setError('');
      setRooms([]);

      const unsubscribe =
        subscribeToPublicRooms(
          result => {
            if (!active) return;

            setRooms(result);
            setLoading(false);
            setError('');
          },

          message => {
            if (!active) return;

            setError(message);
            setRooms([]);
            setLoading(false);
          },
        );

      return () => {
        active = false;
        unsubscribe();
      };
    }, [refreshKey]),
  );

  function openGame(game: InviteGame) {
    router.push({
      pathname: '/multiplayer/[game]',

      params: {
        game,
      },
    });
  }

  function join(room: PublicRoom) {
    router.push({
      pathname: '/multiplayer/[game]',

      params: {
        game: room.game,
        inviteCode: room.code,
      },
    });
  }

  const visibleRooms = rooms.filter(
    room =>
      filter === 'all' ||
      room.game === filter,
  );

  return (
    <ScrollView
      style={s.root}

      contentContainerStyle={[
        s.content,

        {
          paddingTop:
            Math.max(insets.top + 15, 35),

          paddingBottom:
            insets.bottom + 30,
        },
      ]}

      showsVerticalScrollIndicator={false}
    >
      <Pressable
        accessibilityRole="button"

        onPress={() =>
          router.replace('/')
        }
      >
        <Text style={s.back}>
          ← Back to GameDen
        </Text>
      </Pressable>

      <View style={s.intro}>
        <Text style={s.eyebrow}>
          PLAY TOGETHER
        </Text>

        <Text style={s.title}>
          Multiplayer Hub
        </Text>

        <Text style={s.subtitle}>
          Meet new players, invite your friends
          and find your next match.
        </Text>
      </View>

      <Text style={s.heading}>
        Create or join a room
      </Text>

      <View style={s.gameGrid}>
        {GAMES.map(game => (
          <Pressable
            key={game.id}

            accessibilityRole="button"

            onPress={() =>
              openGame(game.id)
            }

            style={({ pressed }) => [
              s.gameCard,

              {
                borderColor: game.color,
              },

              pressed && s.pressed,
            ]}
          >
            <Text style={s.gameIcon}>
              {game.icon}
            </Text>

            <Text style={s.gameTitle}>
              {game.title}
            </Text>

            <Text style={[
              s.gameAction,

              {
                color: game.color,
              },
            ]}>
              Create / Join
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={s.divider} />

      <View style={s.sectionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.heading}>
            Public Rooms
          </Text>

          <Text style={s.caption}>
            Find a group that suits you.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"

          accessibilityLabel="Refresh public rooms"

          onPress={() =>
            setRefreshKey(value => value + 1)
          }

          style={s.refresh}
        >
          <Text style={s.refreshText}>
            ↻ Refresh
          </Text>
        </Pressable>
      </View>

      <View style={s.filters}>
        {[
          {
            id: 'all' as const,
            title: 'All Games',
          },

          ...GAMES,
        ].map(game => (
          <Pressable
            key={game.id}

            accessibilityRole="button"

            accessibilityState={{
              selected: filter === game.id,
            }}

            onPress={() =>
              setFilter(game.id)
            }

            style={[
              s.filter,

              filter === game.id &&
                s.selectedFilter,
            ]}
          >
            <Text style={[
              s.filterText,

              filter === game.id &&
                s.selectedFilterText,
            ]}>
              {game.title}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading && (
        <View style={s.empty}>
          <ActivityIndicator
            size="large"
            color="#A5E1EB"
          />

          <Text style={s.caption}>
            Finding public rooms...
          </Text>
        </View>
      )}

      {!!error && (
        <View style={s.errorBox}>
          <Text style={s.errorText}>
            Could not load public rooms.
          </Text>

          <Text style={s.caption}>
            {error}
          </Text>

          <Pressable
            onPress={() =>
              setRefreshKey(value => value + 1)
            }
          >
            <Text style={s.back}>
              Try again
            </Text>
          </Pressable>
        </View>
      )}

      {!loading &&
        !error &&
        visibleRooms.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>
              🎮
            </Text>

            <Text style={s.heading}>
              No rooms available
            </Text>

            <Text style={s.caption}>
              Create a public room and let
              other players join you!
            </Text>

            {filter !== 'all' && (
              <Pressable
                onPress={() =>
                  openGame(filter)
                }

                style={s.joinButton}
              >
                <Text style={s.joinText}>
                  Create Room
                </Text>
              </Pressable>
            )}
          </View>
        )}

      {!loading &&
        !error &&
        visibleRooms.map(room => {
          const game = GAMES.find(
            item => item.id === room.game,
          );

          if (!game) return null;

          const available =
            room.maxPlayers -
            room.playerCount;

          const progress =
            room.playerCount /
            room.maxPlayers;

          return (
            <View
              key={room.id}
              style={s.roomCard}
            >
              <View style={s.roomRow}>
                <View style={[
                  s.iconBox,

                  {
                    backgroundColor:
                      game.color,
                  },
                ]}>
                  <Text style={s.roomIcon}>
                    {game.icon}
                  </Text>
                </View>

                <View style={s.roomInfo}>
                  <Text
                    style={s.roomName}
                    numberOfLines={2}
                  >
                    {room.roomName}
                  </Text>

                  <Text style={[
                    s.roomGame,

                    {
                      color: game.color,
                    },
                  ]}>
                    {room.title}
                  </Text>

                  <Text
                    style={s.caption}
                    numberOfLines={1}
                  >
                    {room.hostAvatar}
                    {' '}{room.hostName}
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"

                  accessibilityLabel={
                    `Join ${room.roomName}`
                  }

                  style={s.joinButton}

                  onPress={() =>
                    join(room)
                  }
                >
                  <Text style={s.joinText}>
                    Join
                  </Text>
                </Pressable>
              </View>

              <View style={s.capacityRow}>
                <Text style={s.caption}>
                  👥 {room.playerCount}/
                  {room.maxPlayers} players
                </Text>

                <Text style={s.available}>
                  {available}
                  {' '}
                  {available === 1
                    ? 'seat'
                    : 'seats'}
                  {' available'}
                </Text>
              </View>

              <View style={s.track}>
                <View style={[
                  s.fill,

                  {
                    width: `${progress * 100}%`,

                    backgroundColor:
                      game.color,
                  },
                ]} />
              </View>
            </View>
          );
        })}

      {!loading && !error && (
        <Text style={s.footer}>
          {visibleRooms.length} available
          {' '}
          {visibleRooms.length === 1
            ? 'room'
            : 'rooms'}
          {' · '}GameDen Multiplayer
        </Text>
      )}
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
    maxWidth: 800,
    alignSelf: 'center',
    paddingHorizontal: 20,
    gap: 16,
  },

  back: {
    color: '#A5E1EB',
    fontSize: 14,
    fontWeight: '800',
    paddingVertical: 6,
  },

  intro: {
    gap: 7,
    marginBottom: 7,
  },

  eyebrow: {
    color: '#B5A5FC',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
  },

  subtitle: {
    color: '#A6A9C4',
    fontSize: 14,
    lineHeight: 21,
  },

  heading: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },

  gameGrid: {
    flexDirection: 'row',
    gap: 8,
  },

  gameCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#303550',
    paddingVertical: 16,
    paddingHorizontal: 5,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  gameIcon: {
    fontSize: 32,
  },

  gameTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    textAlign: 'center',
  },

  gameAction: {
    fontSize: 10,
    fontWeight: '800',
  },

  pressed: {
    opacity: 0.7,
  },

  divider: {
    height: 1,
    backgroundColor: '#303550',
    marginVertical: 7,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  refresh: {
    backgroundColor: '#303550',
    borderRadius: 10,
    padding: 10,
  },

  refreshText: {
    color: '#A5E1EB',
    fontSize: 12,
    fontWeight: '800',
  },

  caption: {
    color: '#A6A9C4',
    fontSize: 12,
    lineHeight: 18,
  },

  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },

  filter: {
    backgroundColor: '#303550',
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  selectedFilter: {
    backgroundColor: '#A5E1EB',
  },

  filterText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  selectedFilterText: {
    color: '#15313C',
  },

  roomCard: {
    backgroundColor: '#242841',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#FFFFFF12',
    padding: 15,
    gap: 14,
  },

  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  roomIcon: {
    fontSize: 26,
  },

  roomInfo: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },

  roomName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

  roomGame: {
    fontSize: 11,
    fontWeight: '800',
  },

  joinButton: {
    backgroundColor: '#A5E1EB',
    borderRadius: 11,
    paddingHorizontal: 17,
    paddingVertical: 13,
    alignItems: 'center',
  },

  joinText: {
    color: '#15313C',
    fontSize: 13,
    fontWeight: '900',
  },

  capacityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },

  available: {
    color: '#65CDB1',
    fontSize: 11,
    fontWeight: '800',
  },

  track: {
    height: 5,
    backgroundColor: '#49516F',
    borderRadius: 6,
    overflow: 'hidden',
  },

  fill: {
    height: '100%',
    borderRadius: 6,
  },

  empty: {
    backgroundColor: '#242841',
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    gap: 13,
  },

  emptyIcon: {
    fontSize: 45,
  },

  errorBox: {
    backgroundColor: '#532741',
    borderRadius: 14,
    padding: 17,
    gap: 10,
  },

  errorText: {
    color: '#FF9CAD',
    fontSize: 14,
    fontWeight: '800',
  },

  footer: {
    color: '#8287A4',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 10,
  },
});
