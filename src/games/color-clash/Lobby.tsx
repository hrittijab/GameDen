
import {
  useRouter
} from 'expo-router';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

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
  getMatchUser,
  joinColorClashRoom,
  MAX_COLOR_CLASH_PLAYERS,
  startColorClashGame,
  subscribeToColorClashRoom,
  type ColorClashRoom,
} from './colorClashRooms';

import {
  kickColorClashPlayer,
  leaveColorClashRoom,
  useColorClashPresence,
} from './colorClashPresence';

import {
  clearColorClashSession,
  getColorClashSession,
  saveColorClashSession,
} from './colorClashSession';

// ==========================================
// TYPES
// ==========================================

type ScreenPhase = 'home' | 'lobby';

type Confirmation = {
  kind: 'leave' | 'kick';
  targetUid?: string;
  playerName?: string;
};

// ==========================================
// CONFIGURATION
// ==========================================

const AVATARS = [
  '🐼',
  '🦊',
  '🐱',
  '🐸',
  '🐯',
  '🐨',
  '🐶',
  '🐰',
  '🦁',
  '🐵',
  '🐧',
  '🦉',
  '🐻',
  '🐙',
  '🦄',
  '🐹',
  '🐢',
  '🦝',
  '🐥',
  '🐺',
];

const AVATAR_COLORS = [
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

// ==========================================
// MAIN LOBBY SCREEN
// ==========================================

export default function ColorClashScreen() {
  const router = useRouter();

  const [phase, setPhase] =
    useState<ScreenPhase>('home');

  const [name, setName] =
    useState('');

  const [codeInput, setCodeInput] =
    useState('');

  const [roomCode, setRoomCode] =
    useState('');

  const [myUid, setMyUid] =
    useState('');

  const [room, setRoom] =
    useState<ColorClashRoom | null>(null);

  const [initializing, setInitializing] =
    useState(true);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const [notice, setNotice] =
    useState('');

  const [
    confirmation,
    setConfirmation,
  ] = useState<Confirmation | null>(null);

  const actionLock = useRef(false);

  const navigating = useRef(false);

  const leaving = useRef(false);

  // ========================================
  // AUTHENTICATION AND SESSION RECOVERY
  // ========================================

  useEffect(() => {
    let alive = true;

    const initialize = async () => {
      try {
        const user = await ensureGuest();

        if (!alive) return;

        setMyUid(user.uid);

        const session =
          await getColorClashSession();

        if (!alive) return;

        if (
          session &&
          session.uid === user.uid
        ) {
          setName(session.playerName);
          setRoomCode(session.code);
          setPhase('lobby');

          setNotice(
            'Recovering your previous room...',
          );
        } else if (session) {
          // An old session must not be
          // used with a different identity.

          await clearColorClashSession();
        }
      } catch (err) {
        if (!alive) return;

        setError(
          err instanceof Error
            ? err.message
            : 'Could not connect to Firebase.',
        );
      } finally {
        if (alive) {
          setInitializing(false);
        }
      }
    };

    void initialize();

    return () => {
      alive = false;
    };
  }, []);

  // ========================================
  // RESET ROOM STATE
  // ========================================

  const resetRoom = (
    message = '',
  ) => {
    setRoom(null);
    setRoomCode('');
    setCodeInput('');
    setPhase('home');

    setConfirmation(null);
    setNotice(message);

    navigating.current = false;

    void clearColorClashSession()
      .catch(() => {});
  };

  // ========================================
  // REAL-TIME ROOM SUBSCRIPTION
  // ========================================

  useEffect(() => {
    if (!roomCode || !myUid) {
      return;
    }

    let alive = true;

    navigating.current = false;

    const unsubscribe =
      subscribeToColorClashRoom(
        roomCode,

        updatedRoom => {
          if (!alive) return;

          if (leaving.current) {
            return;
          }

          if (!updatedRoom) {
            resetRoom(
              'This room no longer exists.',
            );

            return;
          }

          const member =
            Object.prototype.hasOwnProperty.call(
              updatedRoom.players,
              myUid,
            );

          if (!member) {
            resetRoom(
              'You are no longer a member of this room.',
            );

            return;
          }

          setRoom(updatedRoom);

          setNotice('');
        },

        message => {
          if (!alive) return;

          setError(message);
        },
      );

    return () => {
      alive = false;
      unsubscribe();
    };
  }, [roomCode, myUid]);

  // ========================================
  // CONNECTION TRACKING
  // ========================================

  const member =
    !!myUid &&
    !!room &&
    Object.prototype.hasOwnProperty.call(
      room.players,
      myUid,
    );

  const {
    statusOf,
    error: presenceError,
  } = useColorClashPresence(
    roomCode,

    member &&
      phase === 'lobby',
  );

  // ========================================
  // AUTOMATIC GAME NAVIGATION
  // ========================================

  useEffect(() => {
    if (
      !roomCode ||
      !room ||
      !member ||
      leaving.current ||
      navigating.current
    ) {
      return;
    }

    if (
      room.status !== 'playing' &&
      room.status !== 'finished'
    ) {
      return;
    }

    navigating.current = true;
    router.replace({
      pathname: '/multiplayer/[game]/match',
      params: {
        game: 'color-clash',
        code:  roomCode,
      },
    });
    
  }, [
    roomCode,
    room,
    member,
    router,
  ]);

  // ========================================
  // ACTION LOCK
  // ========================================

  const run = async (
    action: () => Promise<void>,
  ) => {
    if (actionLock.current) {
      return;
    }

    actionLock.current = true;

    setLoading(true);

    setError('');

    try {
      await action();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong.',
      );
    } finally {
      actionLock.current = false;

      setLoading(false);
    }
  };

  // ========================================
  // SAVE AND OPEN ROOM
  // ========================================

  const openRoom = async (
    code: string,
    uid: string,
    playerName: string,
  ) => {
    // Save the actual authenticated identity,
    // not an independently generated player ID.

    try {
      await saveColorClashSession(
        code,
        uid,
        playerName,
      );
    } catch {
      setNotice(
        'Room joined, but local session storage is unavailable.',
      );
    }

    setMyUid(uid);

    setRoom(null);

    setRoomCode(code);

    setPhase('lobby');
  };

  // ========================================
  // CREATE ROOM
  // ========================================

  const createRoom = () =>
    run(async () => {
      const code =
        await createColorClashRoom(name);

      const user =
        await getMatchUser();

      await openRoom(
        code,
        user.uid,
        name.trim(),
      );
    });

  // ========================================
  // JOIN ROOM
  // ========================================

  const joinRoom = () =>
    run(async () => {
      const code =
        await joinColorClashRoom(
          codeInput,
          name,
        );

      const user =
        await getMatchUser();

      await openRoom(
        code,
        user.uid,
        name.trim(),
      );
    });

  // ========================================
  // START MATCH
  // ========================================

  const startMatch = () =>
    run(async () => {
      if (!roomCode) return;

      await startColorClashGame(roomCode);
    });

  // ========================================
  // LEAVE ROOM
  // ========================================

  const confirmLeave = () => {
    setConfirmation({
      kind: 'leave',
    });
  };

  const leaveRoom = () =>
    run(async () => {
      if (!roomCode) return;

      leaving.current = true;

      try {
        await leaveColorClashRoom(
          roomCode,
        );

        resetRoom(
          'You left the room.',
        );
      } finally {
        leaving.current = false;
      }
    });

  // ========================================
  // KICK PLAYER
  // ========================================

  const confirmKick = (
    targetUid: string,
    playerName: string,
  ) => {
    setConfirmation({
      kind: 'kick',
      targetUid,
      playerName,
    });
  };

  const kickPlayer = (
    targetUid: string,
  ) =>
    run(async () => {
      if (!roomCode) return;

      await kickColorClashPlayer(
        roomCode,
        targetUid,
      );

      setConfirmation(null);
    });

  // ========================================
  // CONFIRM ACTION
  // ========================================

  const confirmAction = () => {
    if (!confirmation) return;

    if (confirmation.kind === 'leave') {
      void leaveRoom();
    } else if (
      confirmation.kind === 'kick' &&
      confirmation.targetUid
    ) {
      void kickPlayer(
        confirmation.targetUid,
      );
    }
  };

  // ========================================
  // BACK BUTTON
  // ========================================

  const goBack = () => {
    if (
      loading ||
      initializing
    ) {
      return;
    }

    if (phase === 'lobby') {
      confirmLeave();
    } else {
      router.replace('/');
    }
  };

  // ========================================
  // DERIVED ROOM INFORMATION
  // ========================================

  const isHost =
    room?.hostId === myUid;

  const players = Object.entries(
    room?.players ?? {},
  );

  const onlineCount =
    players.filter(
      ([uid]) =>
        statusOf(uid) === 'online',
    ).length;

  const playerCount =
    players.length;

  const canStart =
    isHost &&
    room?.status === 'lobby' &&
    playerCount >= 2 &&
    playerCount <=
      MAX_COLOR_CLASH_PLAYERS;

  // ========================================
  // INITIAL LOADING SCREEN
  // ========================================

  if (initializing) {
    return (
      <View style={s.loadingScreen}>
        <Text style={s.logo}>
          🎴 Color Clash
        </Text>

        <ActivityIndicator
          size="large"
          color="#A5E1EB"
        />

        <Text style={s.muted}>
          Connecting to your player session...
        </Text>
      </View>
    );
  }

  // ========================================
  // MAIN INTERFACE
  // ========================================

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* HEADER */}

      <TouchableOpacity
        onPress={goBack}
        disabled={loading}
      >
        <Text style={s.back}>
          ← {
            phase === 'lobby'
              ? 'Leave Room'
              : 'Back to GameDen'
          }
        </Text>
      </TouchableOpacity>

      <Text style={s.logo}>
        🎴 Color Clash
      </Text>

      <Text style={s.subtitle}>
        A colorful card battle with friends.
      </Text>

      {/* HOME SCREEN */}

      {phase === 'home' && (
        <View style={s.panel}>
          <Text style={s.heading}>
            Play Online
          </Text>

          <Text style={s.muted}>
            Create a private room or join
            your friends.
          </Text>

          <Text style={s.label}>
            YOUR NICKNAME
          </Text>

          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            maxLength={24}
            placeholder="Enter your name"
            placeholderTextColor="#969BB7"
            editable={!loading}
          />

          <TouchableOpacity
            style={[
              s.primaryButton,

              (
                loading ||
                !name.trim()
              ) &&
                s.disabled,
            ]}

            disabled={
              loading ||
              !name.trim()
            }

            onPress={createRoom}
          >
            <Text style={s.primaryText}>
              + Create Room
            </Text>
          </TouchableOpacity>

          <View style={s.separator}>
            <View style={s.divider} />

            <Text style={s.muted}>
              OR
            </Text>

            <View style={s.divider} />
          </View>

          <Text style={s.label}>
            ROOM CODE
          </Text>

          <TextInput
            style={s.input}
            value={codeInput}

            onChangeText={value =>
              setCodeInput(
                value.toUpperCase(),
              )
            }

            maxLength={8}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!loading}

            placeholder="8-character code"
            placeholderTextColor="#969BB7"
          />

          <TouchableOpacity
            style={[
              s.secondaryButton,

              (
                loading ||
                !name.trim() ||
                codeInput.trim().length !== 8
              ) &&
                s.disabled,
            ]}

            disabled={
              loading ||
              !name.trim() ||
              codeInput.trim().length !== 8
            }

            onPress={joinRoom}
          >
            <Text style={s.white}>
              Join Room
            </Text>
          </TouchableOpacity>

          <Text style={s.smallMuted}>
            Supports 2–20 players
          </Text>
        </View>
      )}

      {/* ROOM LOBBY */}

      {phase === 'lobby' && (
        <>
          {/* ROOM CODE */}

          <View style={s.codePanel}>
            <Text style={s.label}>
              PRIVATE ROOM CODE
            </Text>

            <Text
              selectable
              style={s.roomCode}
            >
              {roomCode}
            </Text>

            <Text style={s.muted}>
              Share this code with your friends.
            </Text>
          </View>

          {/* CONNECTION SUMMARY */}

          <View style={s.connectionSummary}>
            <View style={s.onlineSummary}>
              <View
                style={[
                  s.statusDot,

                  {
                    backgroundColor:
                      STATUS_COLORS.online,
                  },
                ]}
              />

              <Text style={s.white}>
                {onlineCount} online
              </Text>
            </View>

            <Text style={s.muted}>
              {playerCount}/
              {MAX_COLOR_CLASH_PLAYERS}
              {' '}players
            </Text>
          </View>

          {/* PLAYERS */}

          <View style={s.panel}>
            <Text style={s.heading}>
              Players
            </Text>

            {!room && (
              <ActivityIndicator
                color="#A5E1EB"
              />
            )}

            {players.map(
              ([uid, playerName], index) => {
                const status =
                  statusOf(uid);

                const host =
                  uid === room?.hostId;

                const isMe =
                  uid === myUid;

                return (
                  <View
                    key={uid}

                    style={[
                      s.playerRow,

                      isMe &&
                        s.myPlayerRow,
                    ]}
                  >
                    {/* PLAYER AVATAR */}

                    <View
                      style={[
                        s.avatar,

                        {
                          backgroundColor:
                            AVATAR_COLORS[
                              index %
                              AVATAR_COLORS.length
                            ],
                        },
                      ]}
                    >
                      <Text style={s.avatarText}>
                        {
                          AVATARS[
                            index %
                            AVATARS.length
                          ]
                        }
                      </Text>

                      <View
                        style={[
                          s.avatarStatus,

                          {
                            backgroundColor:
                              STATUS_COLORS[
                                status
                              ],
                          },
                        ]}
                      />
                    </View>

                    {/* PLAYER INFORMATION */}

                    <View style={s.playerInfo}>
                      <View style={s.playerNameRow}>
                        <Text style={s.playerName}>
                          {playerName}

                          {isMe
                            ? ' (You)'
                            : ''}
                        </Text>

                        {host && (
                          <View style={s.hostBadge}>
                            <Text style={s.hostText}>
                              👑 HOST
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={s.statusRow}>
                        <View
                          style={[
                            s.statusDot,

                            {
                              backgroundColor:
                                STATUS_COLORS[
                                  status
                                ],
                            },
                          ]}
                        />

                        <Text
                          style={[
                            s.statusText,

                            {
                              color:
                                STATUS_COLORS[
                                  status
                                ],
                            },
                          ]}
                        >
                          {status === 'online'
                            ? 'Online'

                            : status === 'offline'
                              ? 'Disconnected'

                              : 'Connecting...'}
                        </Text>
                      </View>
                    </View>

                    {/* KICK BUTTON */}

                    {isHost &&
                      !isMe &&
                      room?.status === 'lobby' && (
                        <TouchableOpacity
                          disabled={loading}

                          style={s.kickButton}

                          onPress={() =>
                            confirmKick(
                              uid,
                              playerName,
                            )
                          }
                        >
                          <Text style={s.kickText}>
                            Kick
                          </Text>
                        </TouchableOpacity>
                      )}
                  </View>
                );
              },
            )}
          </View>

          {/* START GAME PANEL */}

          <View style={s.panel}>
            {isHost ? (
              <>
                <Text style={s.heading}>
                  You're the host!
                </Text>

                <Text style={s.muted}>
                  {playerCount < 2

                    ? 'Waiting for another player to join.'

                    : 'Start the match whenever everyone is ready.'}
                </Text>

                {onlineCount < playerCount &&
                  playerCount >= 2 && (
                    <Text style={s.warning}>
                      Some players may not be connected.
                    </Text>
                  )}

                <TouchableOpacity
                  disabled={
                    !canStart ||
                    loading
                  }

                  style={[
                    s.primaryButton,

                    (
                      !canStart ||
                      loading
                    ) &&
                      s.disabled,
                  ]}

                  onPress={startMatch}
                >
                  <Text style={s.primaryText}>
                    {loading
                      ? 'Please wait...'
                      : '🎮 Start Game'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <ActivityIndicator
                  color="#A5E1EB"
                />

                <Text style={s.muted}>
                  Waiting for the host
                  to start the game...
                </Text>
              </>
            )}
          </View>

          {/* LEAVE BUTTON */}

          <TouchableOpacity
            disabled={loading}
            onPress={confirmLeave}
            style={s.leaveButton}
          >
            <Text style={s.leaveText}>
              Leave Room
            </Text>
          </TouchableOpacity>
        </>
      )}

      {/* CONFIRMATION PANEL */}

      {confirmation && (
        <View style={s.confirmPanel}>
          <Text style={s.heading}>
            {
              confirmation.kind === 'leave'
                ? 'Leave this room?'
                : 'Remove player?'
            }
          </Text>

          <Text style={s.muted}>
            {
              confirmation.kind === 'leave'

                ? isHost
                  ? 'If other players remain, another player will become the host.'

                  : 'You will be removed from the room.'

                : `Remove ${
                    confirmation.playerName
                    ?? 'this player'
                  } from the lobby?`
            }
          </Text>

          <View style={s.confirmButtons}>
            <TouchableOpacity
              disabled={loading}

              style={s.cancelButton}

              onPress={() =>
                setConfirmation(null)
              }
            >
              <Text style={s.white}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={loading}

              style={s.dangerButton}

              onPress={confirmAction}
            >
              <Text style={s.white}>
                {loading
                  ? 'Processing...'

                  : confirmation.kind === 'leave'
                    ? 'Leave'
                    : 'Remove'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* LOADING */}

      {loading && (
        <ActivityIndicator
          color="#A5E1EB"
        />
      )}

      {/* NOTICE */}

      {!!notice && (
        <View style={s.noticeBox}>
          <Text style={s.noticeText}>
            {notice}
          </Text>
        </View>
      )}

      {/* ERROR */}

      {!!error && (
        <View style={s.errorBox}>
          <Text style={s.errorText}>
            {error}
          </Text>

          <TouchableOpacity
            onPress={() => setError('')}
          >
            <Text style={s.back}>
              Dismiss
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* CONNECTION ERROR */}

      {!!presenceError && (
        <Text style={s.warning}>
          Connection status is temporarily
          unavailable.
        </Text>
      )}

      {/* FOOTER */}

      <Text style={s.footer}>
        GameDen · Color Clash V6
      </Text>
    </ScrollView>
  );
}

// ==========================================
// STYLES
// ==========================================

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#15182D',
  },

  content: {
    width: '100%',
    maxWidth: 650,
    alignSelf: 'center',
    padding: 20,
    paddingTop: 35,
    paddingBottom: 40,
    gap: 15,
  },

  loadingScreen: {
    flex: 1,
    backgroundColor: '#15182D',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 20,
  },

  logo: {
    color: '#FFFFFF',
    fontSize: 31,
    fontWeight: '900',
  },

  subtitle: {
    color: '#A6A9C4',
    fontSize: 14,
    marginBottom: 8,
  },

  back: {
    color: '#A5E1EB',
    fontSize: 14,
    fontWeight: '800',
    paddingVertical: 6,
  },

  panel: {
    backgroundColor: '#242841',
    padding: 18,
    borderRadius: 20,
    gap: 14,
  },

  heading: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },

  muted: {
    color: '#C8CCDF',
    fontSize: 13,
    lineHeight: 20,
  },

  smallMuted: {
    color: '#A6A9C4',
    fontSize: 12,
    textAlign: 'center',
  },

  label: {
    color: '#A5E1EB',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  input: {
    color: '#FFFFFF',
    backgroundColor: '#15182D',
    padding: 15,
    borderRadius: 12,
    borderColor: '#505775',
    borderWidth: 1,
    fontSize: 16,
  },

  primaryButton: {
    backgroundColor: '#A5E1EB',
    borderRadius: 12,
    padding: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryText: {
    color: '#15313C',
    fontSize: 16,
    fontWeight: '900',
  },

  secondaryButton: {
    backgroundColor: '#554B82',
    borderRadius: 12,
    padding: 17,
    alignItems: 'center',
  },

  white: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  disabled: {
    opacity: 0.45,
  },

  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginVertical: 6,
  },

  divider: {
    height: 1,
    flex: 1,
    backgroundColor: '#505775',
  },

  codePanel: {
    padding: 22,
    borderRadius: 20,
    backgroundColor: '#203B49',
    alignItems: 'center',
    gap: 12,
  },

  roomCode: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 34,
    letterSpacing: 5,
  },

  connectionSummary: {
    backgroundColor: '#242841',
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  onlineSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  playerRow: {
    backgroundColor: '#303550',
    padding: 12,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },

  myPlayerRow: {
    borderColor: '#A5E1EB',
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  avatarText: {
    fontSize: 25,
  },

  avatarStatus: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#303550',
  },

  playerInfo: {
    flex: 1,
    gap: 5,
  },

  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },

  playerName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  hostBadge: {
    backgroundColor: '#6B5429',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },

  hostText: {
    color: '#FFD071',
    fontSize: 9,
    fontWeight: '900',
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },

  kickButton: {
    backgroundColor: '#633247',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 7,
  },

  kickText: {
    color: '#FFB0BC',
    fontSize: 12,
    fontWeight: '800',
  },

  leaveButton: {
    borderWidth: 1,
    borderColor: '#D76279',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },

  leaveText: {
    color: '#FF9CAD',
    fontWeight: '800',
  },

  confirmPanel: {
    backgroundColor: '#382940',
    borderWidth: 1,
    borderColor: '#D76279',
    padding: 18,
    borderRadius: 16,
    gap: 14,
  },

  confirmButtons: {
    flexDirection: 'row',
    gap: 10,
  },

  cancelButton: {
    backgroundColor: '#505775',
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },

  dangerButton: {
    backgroundColor: '#D73D53',
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },

  warning: {
    color: '#FFD071',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },

  noticeBox: {
    backgroundColor: '#203B49',
    padding: 12,
    borderRadius: 10,
  },

  noticeText: {
    color: '#A5E1EB',
    textAlign: 'center',
    lineHeight: 20,
  },

  errorBox: {
    backgroundColor: '#532741',
    padding: 14,
    borderRadius: 12,
    gap: 8,
    alignItems: 'center',
  },

  errorText: {
    color: '#FF9CAD',
    fontSize: 13,
    textAlign: 'center',
  },

  footer: {
    color: '#8287A4',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 10,
  },
});


