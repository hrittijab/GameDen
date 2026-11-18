
import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  createColorClashRoom,
  ensureGuest,
  joinColorClashRoom,
  MAX_COLOR_CLASH_PLAYERS,
  startColorClashGame,
  subscribeToColorClashRoom,
  type ColorClashRoom,
} from '../../services/colorClashRooms';

type ScreenPhase = 'home' | 'lobby';

export default function ColorClashScreen() {
  const router = useRouter();

  const [phase, setPhase] =
    useState<ScreenPhase>('home');

  const [name, setName] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [roomCode, setRoomCode] = useState('');

  const [room, setRoom] =
    useState<ColorClashRoom | null>(null);

  const [myUid, setMyUid] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ========================================
  // AUTHENTICATE PLAYER
  // ========================================

  useEffect(() => {
    let mounted = true;

    ensureGuest()
      .then((user) => {
        if (mounted) {
          setMyUid(user.uid);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Authentication failed.'
          );
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  // ========================================
  // REAL-TIME ROOM LISTENER
  // ========================================

  useEffect(() => {
    if (!roomCode) return;

    return subscribeToColorClashRoom(
      roomCode,

      (updatedRoom) => {
        setRoom(updatedRoom);

        if (!updatedRoom) {
          setError('Room no longer exists.');
        }
      },

      setError
    );
  }, [roomCode]);

  // ========================================
  // AUTOMATIC GAME NAVIGATION
  // ========================================

  useEffect(() => {
    if (
      roomCode &&
      myUid &&
      room &&
      (
        room.status === 'playing' ||
        room.status === 'finished'
      ) &&
      room.players[myUid]
    ) {
      router.replace({
        pathname: '/color-clash/game',

        params: {
          code: roomCode,
        },
      } as Href);
    }
  }, [roomCode, room, myUid, router]);

  // ========================================
  // CREATE ROOM
  // ========================================

  const createRoom = async () => {
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const user = await ensureGuest();

      setMyUid(user.uid);

      const code =
        await createColorClashRoom(name);

      setRoomCode(code);
      setRoom(null);
      setPhase('lobby');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not create room.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // JOIN ROOM
  // ========================================

  const joinRoom = async () => {
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const user = await ensureGuest();

      setMyUid(user.uid);

      const code =
        await joinColorClashRoom(
          codeInput,
          name
        );

      setRoomCode(code);
      setRoom(null);
      setPhase('lobby');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not join room.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // START GAME
  // ========================================

  const startMatch = async () => {
    if (loading || !roomCode) return;

    setLoading(true);
    setError('');

    try {
      await startColorClashGame(roomCode);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not start match.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // NAVIGATION
  // ========================================

  const goBack = () => {
    if (loading) return;

    if (phase === 'lobby') {
      setRoomCode('');
      setRoom(null);
      setError('');
      setPhase('home');
    } else {
      router.replace('/');
    }
  };

  const isHost =
    room?.hostId === myUid;

  const playerEntries = Object.entries(
    room?.players ?? {}
  );

  const playerCount = playerEntries.length;

  const canStart =
    isHost &&
    room?.status === 'lobby' &&
    playerCount >= 2 &&
    playerCount <= MAX_COLOR_CLASH_PLAYERS;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity onPress={goBack}>
        <Text style={styles.back}>
          ← {phase === 'lobby'
            ? 'Back'
            : 'Back to GameDen'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.logo}>
        🎴 Color Clash
      </Text>

      <Text style={styles.subtitle}>
        A colorful online card battle for friends.
      </Text>

      {/* HOME SCREEN */}

      {phase === 'home' && (
        <View style={styles.card}>
          <Text style={styles.title}>
            Play Online
          </Text>

          <Text style={styles.description}>
            Create a private room and play
            with up to 20 friends and players.
          </Text>

          <Text style={styles.label}>
            YOUR NAME
          </Text>

          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            maxLength={24}
            placeholder="Enter your nickname"
            placeholderTextColor="#969BB7"
          />

          <TouchableOpacity
            style={[
              styles.primaryButton,
              loading && styles.disabled,
            ]}
            disabled={loading}
            onPress={createRoom}
          >
            <Text style={styles.primaryText}>
              Create Room
            </Text>
          </TouchableOpacity>

          <View style={styles.separator}>
            <Text style={styles.description}>
              OR
            </Text>
          </View>

          <Text style={styles.label}>
            ROOM CODE
          </Text>

          <TextInput
            style={styles.input}
            value={codeInput}
            onChangeText={(value) =>
              setCodeInput(value.toUpperCase())
            }
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
            placeholder="8-character code"
            placeholderTextColor="#969BB7"
          />

          <TouchableOpacity
            style={[
              styles.secondaryButton,
              loading && styles.disabled,
            ]}
            disabled={loading}
            onPress={joinRoom}
          >
            <Text style={styles.secondaryText}>
              Join Room
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* LOBBY */}

      {phase === 'lobby' && (
        <View style={styles.card}>
          <Text style={styles.label}>
            YOUR ROOM CODE
          </Text>

          <Text
            selectable
            style={styles.code}
          >
            {roomCode}
          </Text>

          <Text style={styles.description}>
            Share this code with your friends.
          </Text>

          <Text style={styles.title}>
            Players ({playerCount}/
            {MAX_COLOR_CLASH_PLAYERS})
          </Text>

          {playerEntries.map(
            ([uid, playerName], index) => (
              <View
                key={uid}
                style={styles.playerRow}
              >
                <Text style={styles.playerText}>
                  {index + 1}. {playerName}

                  {uid === room?.hostId
                    ? ' 👑'
                    : ''}

                  {uid === myUid
                    ? ' (You)'
                    : ''}
                </Text>
              </View>
            )
          )}

          {room?.status === 'lobby' && (
            <>
              {playerCount < 2 ? (
                <Text style={styles.waiting}>
                  Waiting for another player...
                </Text>
              ) : (
                <Text style={styles.waiting}>
                  Players connected!
                </Text>
              )}

              {canStart && (
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    loading && styles.disabled,
                  ]}
                  disabled={loading}
                  onPress={startMatch}
                >
                  <Text style={styles.primaryText}>
                    {loading
                      ? 'Starting Match...'
                      : '🎮 Start Game'}
                  </Text>
                </TouchableOpacity>
              )}

              {!isHost && (
                <Text style={styles.waiting}>
                  Waiting for the host to start
                  the match.
                </Text>
              )}
            </>
          )}

          <View style={styles.statusBox}>
            <Text style={styles.statusText}>
              {isHost
                ? '👑 You are the host'
                : '🎮 You joined'}
            </Text>
          </View>
        </View>
      )}

      {loading && (
        <ActivityIndicator
          style={styles.spinner}
          color="#A5E1EB"
        />
      )}

      {!!error && (
        <Text style={styles.error}>
          {error}
        </Text>
      )}
    </ScrollView>
  );
}

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#15182D',
  },

  content: {
    width: '100%',
    maxWidth: 650,
    alignSelf: 'center',
    padding: 20,
    paddingTop: 45,
    paddingBottom: 60,
  },

  back: {
    color: '#A5E1EB',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 25,
  },

  logo: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
  },

  subtitle: {
    color: '#A6A9C4',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 25,
  },

  card: {
    backgroundColor: '#242841',
    borderRadius: 22,
    padding: 22,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 14,
  },

  description: {
    color: '#C8CCDF',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 15,
  },

  label: {
    color: '#A5E1EB',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 10,
  },

  input: {
    backgroundColor: '#15182D',
    color: '#FFFFFF',
    borderColor: '#505775',
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
  },

  primaryButton: {
    backgroundColor: '#A5E1EB',
    borderRadius: 13,
    padding: 17,
    alignItems: 'center',
    marginTop: 12,
  },

  primaryText: {
    color: '#15313C',
    fontSize: 16,
    fontWeight: '900',
  },

  secondaryButton: {
    backgroundColor: '#554B82',
    borderRadius: 13,
    padding: 17,
    alignItems: 'center',
    marginTop: 12,
  },

  secondaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  disabled: {
    opacity: 0.55,
  },

  separator: {
    alignItems: 'center',
    marginVertical: 24,
  },

  spinner: {
    marginTop: 18,
  },

  error: {
    color: '#FF9CAD',
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 22,
  },

  code: {
    color: '#FFFFFF',
    fontSize: 35,
    fontWeight: '900',
    letterSpacing: 4,
    textAlign: 'center',
    marginVertical: 20,
  },

  playerRow: {
    backgroundColor: '#303550',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },

  playerText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  waiting: {
    color: '#C8CCDF',
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 14,
  },

  statusBox: {
    backgroundColor: '#183943',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },

  statusText: {
    color: '#A5E1EB',
    fontWeight: '700',
  },
});
