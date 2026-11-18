
import {
    useLocalSearchParams,
    useRouter,
    type Href,
} from 'expo-router';

import {
    memo,
    useEffect,
    useRef,
    useState,
} from 'react';

import {
    ActivityIndicator,
    Animated,
    Easing,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import {
    autoColorClashGameTurn,
    callColorClashGameUno,
    drawColorClashGameCard,
    ENGINE_VERSION,
    getMatchUser,
    passColorClashGameTurn,
    playColorClashGameCard,
    rematchColorClashGame,
    resolveColorClashGameUno,
    subscribeToColorClashRoom,
    subscribeToMyColorClashHand,
    TURN_DURATION_MS,
    type ColorClashCard,
    type ColorClashColor,
    type ColorClashRoom,
    type PrivateHand,
    type UnoWindow
} from '../../services/colorClashRooms';

import {
    useColorClashSounds,
} from '../../services/colorClashSounds';

// ==========================================
// APPEARANCE
// ==========================================

const NATIVE_ANIMATION =
  Platform.OS !== 'web';

const COLORS = {
  red: '#D73D53',
  blue: '#2478D0',
  green: '#16865A',
  yellow: '#BA8B15',
  wild: '#7547AE',
};

const COLOR_NAMES: ColorClashColor[] = [
  'red',
  'blue',
  'green',
  'yellow',
];

const AVATARS = [
  '🐼', '🦊', '🐱', '🐸',
  '🐯', '🐨', '🐶', '🐰',
  '🦁', '🐵', '🐧', '🦉',
  '🐻', '🐙', '🦄', '🐹',
  '🐢', '🦝', '🐥', '🐺',
];

const AVATAR_COLORS = [
  '#B2E4DF',
  '#F2CC85',
  '#D7B9F4',
  '#A8D6AB',
  '#FFB2B2',
  '#B7D5FF',
];

const EMPTY_HAND: PrivateHand = {
  cards: [],
  revision: -1,
  drawnCardId: null,
  matchNumber: -1,
};

function label(value: string) {
  return ({
    skip: '⊘',
    reverse: '↻',
    draw2: '+2',
    wild: '★',
    wild4: '+4',
  } as Record<string, string>)[value] ?? value;
}

// ==========================================
// PLAYING CARD COMPONENT
// ==========================================

const Card = memo(function Card({
  card,
}: {
  card: ColorClashCard;
}) {
  const background =
    COLORS[card.color as keyof typeof COLORS]
    ?? COLORS.wild;

  return (
    <View
      style={[
        s.card,
        { backgroundColor: background },
      ]}
    >
      <Text style={s.corner}>
        {label(card.value)}
      </Text>

      <View style={s.cardOval}>
        <Text style={s.cardValue}>
          {label(card.value)}
        </Text>
      </View>

      <Text style={s.cardColor}>
        {card.color === 'wild'
          ? 'WILD'
          : card.color.toUpperCase()}
      </Text>
    </View>
  );
});

// ==========================================
// CARD BACK
// ==========================================

const CardBack = memo(function CardBack() {
  return (
    <View style={s.cardBack}>
      <Text style={s.backStar}>✦</Text>
      <Text style={s.backLabel}>CLASH</Text>
    </View>
  );
});

// ==========================================
// DEAL / NEW CARD ENTRY ANIMATION
// ==========================================

const HandCard = memo(function HandCard({
  card,
  playable,
  sending,
  delay,
  onPress,
}: {
  card: ColorClashCard;
  playable: boolean;
  sending: boolean;
  delay: number;
  onPress: () => void;
}) {
  const entry = useRef(
    new Animated.Value(0),
  ).current;

  const pressScale = useRef(
    new Animated.Value(1),
  ).current;

  useEffect(() => {
    const animation = Animated.timing(entry, {
      toValue: 1,
      duration: 180,
      delay,
      useNativeDriver: NATIVE_ANIMATION,
    });

    animation.start();

    return () => animation.stop();
  }, [entry, delay]);

  const animatePress = (value: number) => {
    Animated.timing(pressScale, {
      toValue: value,
      duration: 80,
      useNativeDriver: NATIVE_ANIMATION,
    }).start();
  };

  return (
    <Animated.View
      style={{
        opacity: entry,

        transform: [
          {
            translateY: entry.interpolate({
              inputRange: [0, 1],
              outputRange: [-28, 0],
            }),
          },

          { scale: pressScale },
        ],
      }}
    >
      <TouchableOpacity
        accessibilityLabel={
          `${card.color} ${label(card.value)}`
        }
        disabled={!playable || sending}
        activeOpacity={0.8}
        onPressIn={() => animatePress(0.92)}
        onPressOut={() => animatePress(1)}
        onPress={onPress}
        style={[
          s.cardWrap,

          playable
            ? s.highlight
            : s.dim,

          sending && s.sending,
        ]}
      >
        <Card card={card} />
      </TouchableOpacity>
    </Animated.View>
  );
});

// ==========================================
// COUNTDOWN
// Isolated from the main screen so the entire
// hand does not rerender every 200ms.
// ==========================================

const Countdown = memo(function Countdown({
  deadline,
  duration = TURN_DURATION_MS,
  showBar = true,
}: {
  deadline: number;
  duration?: number;
  showBar?: boolean;
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setNow(Date.now());

    const interval = setInterval(
      () => setNow(Date.now()),
      200,
    );

    return () => clearInterval(interval);
  }, [deadline]);

  const remaining = Math.max(
    0,
    deadline - now,
  );

  const seconds = Math.ceil(
    remaining / 1000,
  );

  const progress = Math.min(
    100,
    (remaining / duration) * 100,
  );

  return (
    <View style={s.countdown}>
      <Text
        style={[
          s.timerText,
          seconds <= 5 && s.timerDanger,
        ]}
      >
        {seconds}s
      </Text>

      {showBar && (
        <View style={s.timerTrack}>
          <View
            style={[
              s.timerFill,

              {
                width: `${progress}%`,

                backgroundColor:
                  seconds <= 5
                    ? '#FF7187'
                    : '#A5E1EB',
              },
            ]}
          />
        </View>
      )}
    </View>
  );
});

// ==========================================
// PLAYER AVATAR
// ==========================================

const Avatar = memo(function Avatar({
  index,
  active,
}: {
  index: number;
  active: boolean;
}) {
  const i = Math.max(0, index);

  return (
    <View
      style={[
        s.avatar,

        {
          backgroundColor:
            AVATAR_COLORS[
              i % AVATAR_COLORS.length
            ],
        },

        active && s.avatarActive,
      ]}
    >
      <Text style={s.avatarEmoji}>
        {AVATARS[i % AVATARS.length]}
      </Text>
    </View>
  );
});

// ==========================================
// PLAYER SEAT
// ==========================================

const PlayerSeat = memo(function PlayerSeat({
  name,
  count,
  index,
  active,
  uno,
}: {
  name: string;
  count: number;
  index: number;
  active: boolean;
  uno: boolean;
}) {
  return (
    <View
      style={[
        s.seat,
        active && s.activeSeat,
      ]}
    >
      <Avatar
        index={index}
        active={active}
      />

      <Text
        style={s.seatName}
        numberOfLines={1}
      >
        {name}
      </Text>

      <Text style={s.muted}>
        {count} cards
      </Text>

      <View style={s.miniCards}>
        {Array.from(
          { length: Math.min(count, 5) },

          (_, i) => (
            <View
              key={i}
              style={s.miniCard}
            >
              <Text style={s.miniStar}>
                ✦
              </Text>
            </View>
          ),
        )}
      </View>

      {active && (
        <Text style={s.turnSmall}>
          ● PLAYING
        </Text>
      )}

      {uno && (
        <Text style={s.unoSmall}>
          UNO!
        </Text>
      )}
    </View>
  );
});

// ==========================================
// FLYING CARD ANIMATION
// ==========================================

type Point = {
  x: number;
  y: number;
};

type Flight = {
  id: string;
  from: Point;
  to: Point;
  card?: ColorClashCard;
};

const FlyingCard = memo(function FlyingCard({
  flight,
  onFinish,
}: {
  flight: Flight;
  onFinish: () => void;
}) {
  const progress = useRef(
    new Animated.Value(0),
  ).current;

  useEffect(() => {
    const animation = Animated.timing(
      progress,
      {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),

        useNativeDriver:
          NATIVE_ANIMATION,
      },
    );

    animation.start(({ finished }) => {
      if (finished) onFinish();
    });

    return () => animation.stop();
  }, [progress, onFinish]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        s.flyingCard,

        {
          opacity: progress.interpolate({
            inputRange: [0, 0.8, 1],
            outputRange: [1, 1, 0],
          }),

          transform: [
            {
              translateX:
                progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [
                    flight.from.x - 30,
                    flight.to.x - 30,
                  ],
                }),
            },

            {
              translateY:
                progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [
                    flight.from.y - 40,
                    flight.to.y - 40,
                  ],
                }),
            },

            {
              rotate:
                progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [
                    '-14deg',
                    '0deg',
                  ],
                }),
            },

            {
              scale:
                progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.7, 1],
                }),
            },
          ],
        },
      ]}
    >
      {flight.card ? (
        <Card card={flight.card} />
      ) : (
        <CardBack />
      )}
    </Animated.View>
  );
});

// ==========================================
// VICTORY CONFETTI
// ==========================================

function VictoryConfetti() {
  const progress = useRef(
    new Animated.Value(0),
  ).current;

  useEffect(() => {
    const animation = Animated.timing(
      progress,
      {
        toValue: 1,
        duration: 2400,
        easing: Easing.out(Easing.quad),

        useNativeDriver:
          NATIVE_ANIMATION,
      },
    );

    animation.start();

    return () => animation.stop();
  }, [progress]);

  return (
    <View
      pointerEvents="none"
      style={s.confettiContainer}
    >
      {Array.from(
        { length: 30 },

        (_, index) => (
          <Animated.View
            key={index}
            style={[
              s.confettiPiece,

              {
                left:
                  `${(index * 17 + 6) % 96}%`,

                backgroundColor:
                  Object.values(COLORS)[
                    index % 5
                  ],

                opacity:
                  progress.interpolate({
                    inputRange: [0, 0.85, 1],
                    outputRange: [1, 1, 0],
                  }),

                transform: [
                  {
                    translateY:
                      progress.interpolate({
                        inputRange: [0, 1],

                        outputRange: [
                          -30 - index * 9,

                          320 +
                            (index % 6) * 25,
                        ],
                      }),
                  },

                  {
                    translateX:
                      progress.interpolate({
                        inputRange: [0, 1],

                        outputRange: [
                          0,
                          index % 2
                            ? -35
                            : 35,
                        ],
                      }),
                  },

                  {
                    rotate:
                      progress.interpolate({
                        inputRange: [0, 1],

                        outputRange: [
                          '0deg',

                          `${360 + index * 30}deg`,
                        ],
                      }),
                  },
                ],
              },
            ]}
          />
        ),
      )}
    </View>
  );
}

// ==========================================
// MAIN GAME SCREEN
// ==========================================

export default function ColorClashGame() {
  const router = useRouter();

  const params =
    useLocalSearchParams<{ code?: string }>();

  const code =
    typeof params.code === 'string' &&
    /^[A-HJ-NP-Z2-9]{8}$/.test(params.code)
      ? params.code
      : '';

  const [uid, setUid] = useState('');

  const [room, setRoom] =
    useState<ColorClashRoom | null>(null);

  const [handState, setHandState] =
    useState<PrivateHand>(EMPTY_HAND);

  const [wild, setWild] =
    useState<ColorClashCard | null>(null);

  const [busy, setBusy] = useState(false);

  const [waitingFor, setWaitingFor] =
    useState<number | null>(null);

  const [sendingCard, setSendingCard] =
    useState<string | null>(null);

  const [error, setError] =
    useState('');

  const [soundEnabled, setSoundEnabled] =
    useState(true);

  const [confirmedWindow, setConfirmedWindow] =
    useState<{
      window: UnoWindow;
      revision: number;
      matchNumber: number;
    } | null>(null);

  const [unoSubmission, setUnoSubmission] =
    useState<{
      id: string;
      status: 'sending' | 'confirmed';
    } | null>(null);

  const [flight, setFlight] =
    useState<Flight | null>(null);

  const [arenaSize, setArenaSize] =
    useState({
      width: 330,
      height: 300,
    });

  const actionLock = useRef(false);
  const unoLock = useRef(false);
  const automaticLock = useRef(false);

  const lastAutomaticAttempt = useRef(0);
  const lastEventId = useRef('');

  const roomRef = useRef(room);
  roomRef.current = room;

  const latestHand = useRef(handState);
  latestHand.current = handState;

  const { sound, feedback } =
    useColorClashSounds(soundEnabled);

  const hand = handState.cards;

  const rev = room?.revision ?? -1;

  const member =
    !!uid && !!room?.players[uid];

  const matchNumber =
    room?.matchNumber ?? -1;

  // ========================================
  // AUTHENTICATION
  // ========================================

  useEffect(() => {
    let alive = true;

    getMatchUser()
      .then(user => {
        if (alive) setUid(user.uid);
      })
      .catch(error => {
        if (alive) {
          setError(error.message);
        }
      });

    return () => {
      alive = false;
    };
  }, []);

  // ========================================
  // PUBLIC ROOM SUBSCRIPTION
  // ========================================

  useEffect(() => {
    if (!code || !uid) return;

    return subscribeToColorClashRoom(
      code,

      updatedRoom => {
        setRoom(updatedRoom);

        if (!updatedRoom) {
          setError('Room not found.');
        }
      },

      setError,
    );
  }, [code, uid]);

  // ========================================
  // PRIVATE HAND SUBSCRIPTION
  // ========================================

  useEffect(() => {
    if (!code || !uid || !member) {
      return;
    }

    return subscribeToMyColorClashHand(
      code,
      uid,

      (
        cards,
        revision,
        drawnCardId,
        handMatchNumber,
      ) => {
        setHandState({
          cards,
          revision,
          drawnCardId,

          matchNumber: handMatchNumber,
        });
      },

      setError,
    );
  }, [code, uid, member]);

  // ========================================
  // REMATCH RESET
  // ========================================

  useEffect(() => {
    setWild(null);
    setConfirmedWindow(null);
    setUnoSubmission(null);
    setSendingCard(null);
    setWaitingFor(null);
    setError('');
    setFlight(null);
  }, [matchNumber]);

  // ========================================
  // CLEAR OLD WILD SELECTIONS
  // ========================================

  useEffect(() => {
    setWild(null);
  }, [rev]);

  // ========================================
  // WAIT FOR AUTHORITATIVE SERVER SNAPSHOT
  // ========================================

  useEffect(() => {
    if (
      waitingFor !== null &&
      rev >= waitingFor
    ) {
      setWaitingFor(null);
      setSendingCard(null);
    }
  }, [rev, waitingFor]);

  // ========================================
  // DERIVED MATCH STATE
  // ========================================

  const myTurn =
    member &&
    room?.status === 'playing' &&
    room.currentPlayerId === uid;

  const ready =
    !!room &&
    handState.matchNumber === matchNumber &&
    handState.revision ===
      room.handRevisions?.[uid] &&
    hand.length === room.cardCounts?.[uid];

  const ownWindow =
    room?.unoWindows?.[uid] ??
    (
      confirmedWindow &&
      confirmedWindow.matchNumber === matchNumber &&
      rev < confirmedWindow.revision
        ? confirmedWindow.window
        : null
    );

  const canAct =
    !!myTurn &&
    ready &&
    !busy &&
    waitingFor === null &&
    !ownWindow &&
    room?.engineVersion === ENGINE_VERSION;

  const penalty =
    room?.pending?.amount ?? 0;

  const skip =
    room?.pending?.kind === 'skip' ||
    room?.pending?.kind === 'reverse';

  // ========================================
  // CHECK PLAYABLE CARDS
  // ========================================

  const legal = (
    card: ColorClashCard,
  ): boolean => {
    if (!canAct || !room?.topCard) {
      return false;
    }

    if (
      room.phase === 'drawn' &&
      card.id !== handState.drawnCardId
    ) {
      return false;
    }

    if (room.pending) {
      return card.value === room.pending.kind;
    }

    if (card.value === 'wild4') {
      return !hand.some(
        item =>
          item.color === room.activeColor,
      );
    }

    return (
      card.value === 'wild' ||
      card.color === room.activeColor ||
      card.value === room.topCard.value
    );
  };

  // ========================================
  // PLAYER POSITIONS
  // ========================================

  const ids = room?.playerOrder ?? [];

  const myIndex = ids.indexOf(uid);

  const others =
    myIndex >= 0
      ? [
          ...ids.slice(myIndex + 1),
          ...ids.slice(0, myIndex),
        ]
      : [];

  function playerPoint(
    playerId: string,
  ): Point {
    const width = arenaSize.width;
    const height = arenaSize.height;

    if (playerId === uid) {
      return {
        x: width / 2,
        y: height - 65,
      };
    }

    if (playerId === others[0]) {
      return {
        x: width * 0.13,
        y: 95,
      };
    }

    if (
      playerId ===
      others[others.length - 1]
    ) {
      return {
        x: width * 0.87,
        y: 95,
      };
    }

    return {
      x: width / 2,
      y: 12,
    };
  }

  // ========================================
  // ANIMATION AND SOUND EVENTS
  // ========================================

  useEffect(() => {
    const event = room?.lastEvent;

    if (
      !event ||
      !member ||
      lastEventId.current === event.id
    ) {
      return;
    }

    lastEventId.current = event.id;

    const discardPoint = {
      x: arenaSize.width * 0.56,
      y: 100,
    };

    const deckPoint = {
      x: arenaSize.width * 0.43,
      y: 100,
    };

    if (event.kind === 'start') {
      sound('deal');
      return;
    }

    if (
      event.kind === 'play' &&
      event.card
    ) {
      sound('play');

      setFlight({
        id: event.id,

        from: playerPoint(event.uid),
        to: discardPoint,

        card: event.card,
      });
    } else if (
      event.kind === 'draw' ||
      event.kind === 'penalty'
    ) {
      if ((event.count ?? 0) > 0) {
        sound('draw');

        setFlight({
          id: event.id,
          from: deckPoint,

          to: playerPoint(event.uid),
        });
      }
    } else if (event.kind === 'uno') {
      if (event.uid !== uid) {
        sound('uno');
      }
    } else if (event.kind === 'win') {
      sound('win');
    }
  }, [
    room?.lastEvent?.id,
    member,
    uid,
    sound,
    arenaSize.width,
    arenaSize.height,
  ]);

  // ========================================
  // EXECUTE NORMAL MOVE
  // ========================================

  type MoveResponse = {
    success: boolean;
    revision?: number;
    unoWindow?: UnoWindow | null;
  };

  const run = async (
    fn: () => Promise<MoveResponse>,
    cardId?: string,
  ) => {
    if (
      actionLock.current ||
      waitingFor !== null
    ) {
      return;
    }

    actionLock.current = true;

    setBusy(true);
    setSendingCard(cardId ?? null);
    setError('');

    try {
      const result = await fn();

      if (
        result.unoWindow &&
        result.revision !== undefined
      ) {
        setConfirmedWindow({
          window: result.unoWindow,
          revision: result.revision,
          matchNumber,
        });
      }

      const latestRevision =
        roomRef.current?.revision ?? -1;

      if (
        result.revision !== undefined &&
        result.revision > latestRevision
      ) {
        setWaitingFor(result.revision);
      } else {
        setWaitingFor(null);
        setSendingCard(null);
      }
    } catch (error) {
      setWaitingFor(null);
      setSendingCard(null);

      setError(
        error instanceof Error
          ? error.message
          : 'Action failed.',
      );
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  };

  // ========================================
  // PLAY CARD
  // ========================================

  const play = (
    card: ColorClashCard,
    color?: ColorClashColor,
  ) => {
    if (!legal(card)) return;

    setWild(null);

    void run(
      () =>
        playColorClashGameCard(
          code,
          card.id,
          rev,
          color,
        ),

      card.id,
    );
  };

  const clickCard = (
    card: ColorClashCard,
  ) => {
    if (!legal(card) || wild) {
      return;
    }

    if (card.color === 'wild') {
      setWild(card);
    } else {
      play(card);
    }
  };

  // ========================================
  // INSTANT UNO BUTTON
  // Completely independent of normal moves.
  // ========================================

  const pressUno = async () => {
    if (
      !ownWindow ||
      unoLock.current
    ) {
      return;
    }

    const windowId = ownWindow.id;

    if (
      unoSubmission?.id === windowId &&
      unoSubmission.status === 'confirmed'
    ) {
      return;
    }

    unoLock.current = true;

    // Immediate visual response.

    setUnoSubmission({
      id: windowId,
      status: 'sending',
    });

    setError('');

    feedback('uno');

    try {
      await callColorClashGameUno(
        code,
        windowId,
      );

      setUnoSubmission({
        id: windowId,
        status: 'confirmed',
      });
    } catch (error) {
      // Make the button retryable.
      // Do not reset it because somebody
      // else played a card.

      setUnoSubmission(null);

      setError(
        error instanceof Error
          ? error.message
          : 'Could not announce UNO.',
      );
    } finally {
      unoLock.current = false;
    }
  };

  // Clear local confirmation only when the
  // one-card state has actually ended.

  useEffect(() => {
    if (
      room?.cardCounts?.[uid] !== 1 &&
      !ownWindow
    ) {
      setUnoSubmission(null);
    }
  }, [
    room?.cardCounts?.[uid],
    ownWindow?.id,
    uid,
  ]);

  // ========================================
  // AUTOMATIC GAME ACTIONS
  // ========================================

  useEffect(() => {
    if (
      !member ||
      room?.status !== 'playing'
    ) {
      return;
    }

    const tick = async () => {
      if (
        automaticLock.current ||
        actionLock.current
      ) {
        return;
      }

      const current = roomRef.current;
      const privateHand = latestHand.current;

      if (
        !current ||
        current.status !== 'playing'
      ) {
        return;
      }

      const now = Date.now();

      if (
        now - lastAutomaticAttempt.current <
        700
      ) {
        return;
      }

      // Resolve expired UNO windows.
      // Short client-side grace reduces races
      // with announcements already in flight.

      const expiredUno = Object.entries(
        current.unoWindows ?? {},
      ).find(
        ([targetUid, window]) =>
          now >= window.deadline + 750 &&
          !(
            targetUid === uid &&
            unoLock.current
          ),
      );

      const actor =
        current.currentPlayerId;

      const timedOut =
        !!actor &&
        !current.unoWindows?.[actor] &&
        now >=
          (current.turnDeadline ?? Infinity);

      const handReady =
        privateHand.matchNumber ===
          current.matchNumber &&
        privateHand.revision ===
          current.handRevisions?.[uid];

      const forced =
        actor === uid &&
        handReady &&
        !!current.pending &&
        !current.unoWindows?.[uid] &&
        !privateHand.cards.some(
          card =>
            card.value === current.pending?.kind,
        );

      if (
        !expiredUno &&
        !timedOut &&
        !forced
      ) {
        return;
      }

      automaticLock.current = true;

      lastAutomaticAttempt.current = now;

      try {
        if (expiredUno) {
          const [
            targetUid,
            window,
          ] = expiredUno;

          await resolveColorClashGameUno(
            code,
            targetUid,
            window.id,
          );
        } else {
          await autoColorClashGameTurn(
            code,
            current.revision ?? -1,
          );
        }
      } catch {
        // Another connected player may already
        // have completed the same action.
        // The next tick will retry if needed.
      } finally {
        automaticLock.current = false;
      }
    };

    const interval = setInterval(
      () => {
        void tick();
      },
      350,
    );

    return () => clearInterval(interval);
  }, [member, code, uid, room?.status]);

  // ========================================
  // SOUND TOGGLE
  // ========================================

  const toggleSound = () => {
    if (soundEnabled) {
      setSoundEnabled(false);
    } else {
      setSoundEnabled(true);
    }
  };

  // ========================================
  // EXIT
  // ========================================

  const exit = () => {
    router.replace('/color-clash' as Href);
  };

  // ========================================
  // PLAYER SEAT RENDERER
  // ========================================

  const seat = (playerId: string) => (
    <PlayerSeat
      key={playerId}

      name={
        room?.players[playerId] ?? 'Player'
      }

      count={
        room?.cardCounts?.[playerId] ?? 0
      }

      index={ids.indexOf(playerId)}

      active={
        room?.currentPlayerId === playerId
      }

      uno={
        !!room?.unoCalled?.[playerId] &&
        room?.cardCounts?.[playerId] === 1
      }
    />
  );

  // ========================================
  // LOADING AND MEMBERSHIP
  // ========================================

  if (!room || !member) {
    return (
      <View style={s.loading}>
        <Text style={s.heading}>
          {!code
            ? 'Invalid room code'
            : room && !member
              ? 'You are not in this match.'
              : 'Connecting to Color Clash…'}
        </Text>

        {!error && !room && !!code && (
          <ActivityIndicator color="#A5E1EB" />
        )}

        {!!error && (
          <Text style={s.error}>
            {error}
          </Text>
        )}

        <TouchableOpacity
          style={s.button}
          onPress={exit}
        >
          <Text style={s.buttonText}>
            Room menu
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ========================================
  // OLD MATCH VERSION
  // ========================================

  if (
    room.engineVersion !== ENGINE_VERSION
  ) {
    return (
      <View style={s.loading}>
        <Text style={s.heading}>
          Create a new room
        </Text>

        <Text style={s.muted}>
          This match was created with an old
          version of Color Clash.
        </Text>

        <TouchableOpacity
          style={s.button}
          onPress={exit}
        >
          <Text style={s.buttonText}>
            Room menu
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ========================================
  // WINNER SCREEN
  // ========================================

  if (room.status === 'finished') {
    const winner =
      room.winnerId === uid;

    const isHost =
      room.hostId === uid;

    return (
      <View style={s.victoryScreen}>
        <ScrollView
          contentContainerStyle={s.victoryContent}
        >
          <Text style={s.trophy}>
            🏆
          </Text>

          <Text style={s.victoryTitle}>
            {winner
              ? 'YOU WIN!'
              : `${
                  room.players[
                    room.winnerId ?? ''
                  ] ?? 'Player'
                } WINS!`}
          </Text>

          <Text style={s.muted}>
            Match {room.matchNumber} completed
          </Text>

          <View style={s.results}>
            {ids.map(id => (
              <View
                key={id}
                style={s.resultRow}
              >
                <Avatar
                  index={ids.indexOf(id)}
                  active={id === room.winnerId}
                />

                <Text style={s.resultName}>
                  {room.players[id]}
                  {id === room.winnerId
                    ? ' 🏆'
                    : ''}
                </Text>

                <Text style={s.muted}>
                  {room.cardCounts?.[id] ?? 0}
                  {' '}left
                </Text>
              </View>
            ))}
          </View>

          {isHost ? (
            <TouchableOpacity
              style={[
                s.button,
                busy && s.dim,
              ]}
              disabled={busy}
              onPress={() =>
                void run(() =>
                  rematchColorClashGame(
                    code,
                    rev,
                  ),
                )
              }
            >
              <Text style={s.buttonText}>
                {busy
                  ? 'Starting…'
                  : '🔄 Play Again'}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={s.muted}>
              Waiting for the host to start
              another match.
            </Text>
          )}

          <TouchableOpacity
            onPress={exit}
            style={s.secondaryButton}
          >
            <Text style={s.white}>
              Return to Rooms
            </Text>
          </TouchableOpacity>

          {!!error && (
            <Text style={s.error}>
              {error}
            </Text>
          )}
        </ScrollView>

        {winner && (
          <VictoryConfetti
            key={`victory-${matchNumber}`}
          />
        )}
      </View>
    );
  }

  // ========================================
  // GAME STATE
  // ========================================

  const turnName =
    room.players[
      room.currentPlayerId ?? ''
    ] ?? 'Waiting';

  const unoPending =
    !!ownWindow &&
    unoSubmission?.id === ownWindow.id;

  const unoSending =
    unoPending &&
    unoSubmission?.status === 'sending';

  const unoConfirmed =
    (
      unoPending &&
      unoSubmission?.status === 'confirmed'
    ) ||
    (
      !!room.unoCalled?.[uid] &&
      room.cardCounts?.[uid] === 1
    );

  const forced =
    canAct &&
    !!room.pending &&
    !hand.some(legal);

  const canDraw =
    canAct && !wild && !forced;

  // ========================================
  // GAME INTERFACE
  // ========================================

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
    >
      {/* HEADER */}

      <View style={s.header}>
        <TouchableOpacity
          onPress={exit}
          disabled={busy}
        >
          <Text style={s.link}>
            ← Rooms
          </Text>
        </TouchableOpacity>

        <Text style={s.heading}>
          Color Clash
        </Text>

        <TouchableOpacity
          onPress={toggleSound}
        >
          <Text style={s.soundIcon}>
            {soundEnabled ? '🔊' : '🔇'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* TURN INDICATOR */}

      <View style={s.turnBanner}>
        <View style={s.turnRow}>
          <Text style={s.turnText}>
            {myTurn
              ? 'YOUR TURN'
              : `${turnName}'s turn`}
          </Text>

          <Text style={s.direction}>
            {room.direction === 1
              ? '↻'
              : '↺'}
          </Text>
        </View>

        {!!room.turnDeadline && (
          <Countdown
            deadline={room.turnDeadline}
          />
        )}
      </View>

      {/* OTHER PLAYERS */}

      {others.length > 2 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.extraSeats}
        >
          {others.slice(1, -1).map(seat)}
        </ScrollView>
      )}

      {/* GAME ARENA */}

      <View
        style={s.arena}
        onLayout={event => {
          const {
            width,
            height,
          } = event.nativeEvent.layout;

          setArenaSize(old =>
            old.width === width &&
            old.height === height
              ? old
              : { width, height },
          );
        }}
      >
        {/* TABLE */}

        <View style={s.table}>
          <View style={s.tableRow}>
            <View style={s.side}>
              {others[0] &&
                seat(others[0])}
            </View>

            <View style={s.center}>
              <View style={s.piles}>
                {/* DRAW PILE */}

                <TouchableOpacity
                  disabled={
                    !canDraw ||
                    skip ||
                    room.phase === 'drawn'
                  }
                  activeOpacity={0.7}

                  onPress={() =>
                    void run(() =>
                      drawColorClashGameCard(
                        code,
                        rev,
                      ),
                    )
                  }
                >
                  <CardBack />

                  <Text style={s.pileLabel}>
                    DRAW
                  </Text>
                </TouchableOpacity>

                {/* DISCARD PILE */}

                <View>
                  {room.topCard && (
                    <Card card={room.topCard} />
                  )}

                  <Text style={s.pileLabel}>
                    DISCARD
                  </Text>
                </View>
              </View>

              {/* ACTIVE COLOR */}

              <View style={s.activeColorRow}>
                <View
                  style={[
                    s.colorDot,

                    {
                      backgroundColor:
                        COLORS[
                          room.activeColor as
                            keyof typeof COLORS
                        ] ?? COLORS.wild,
                    },
                  ]}
                />

                <Text style={s.whiteSmall}>
                  {room.activeColor?.toUpperCase()}
                </Text>
              </View>

              {penalty > 0 && (
                <Text style={s.penalty}>
                  +{penalty} PENDING
                </Text>
              )}

              {skip && (
                <Text style={s.penalty}>
                  COUNTER OR SKIP
                </Text>
              )}
            </View>

            <View style={s.side}>
              {others.length > 1 &&
                seat(
                  others[others.length - 1],
                )}
            </View>
          </View>

          {/* LAST PLAYER / ACTION */}

          <View style={s.actionBox}>
            {room.lastPlayedBy && (
              <Text style={s.playedBy}>
                Last card:{' '}

                {
                  room.players[
                    room.lastPlayedBy
                  ]
                }

                {' · '}

                {label(
                  room.topCard?.value ?? '',
                )}
              </Text>
            )}

            <Text style={s.actionText}>
              {room.lastAction}
            </Text>
          </View>
        </View>

        {/* PRIVATE HAND */}

        <View
          style={[
            s.self,
            myTurn && s.activeSeat,
          ]}
        >
          <View style={s.selfHeader}>
            <Avatar
              index={myIndex}
              active={!!myTurn}
            />

            <View>
              <Text style={s.seatName}>
                {room.players[uid]} (You)
              </Text>

              <Text style={s.muted}>
                {room.cardCounts?.[uid] ?? hand.length}
                {' '}cards
              </Text>
            </View>

            {unoConfirmed && (
              <Text style={s.unoSmall}>
                UNO ✓
              </Text>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.hand}
          >
            {handState.matchNumber === matchNumber &&
              hand.map((card, index) => (
                <HandCard
                  key={`${matchNumber}-${card.id}`}

                  card={card}

                  playable={
                    legal(card) &&
                    !wild
                  }

                  sending={
                    sendingCard === card.id
                  }

                  delay={
                    room.lastEvent?.kind === 'start'
                      ? index * 75
                      : 0
                  }

                  onPress={() =>
                    clickCard(card)
                  }
                />
              ))}
          </ScrollView>

          {!ready && (
            <Text style={s.muted}>
              Synchronizing cards…
            </Text>
          )}
        </View>

        {/* FLYING CARD OVERLAY */}

        {flight && (
          <FlyingCard
            key={flight.id}
            flight={flight}

            onFinish={() =>
              setFlight(current =>
                current?.id === flight.id
                  ? null
                  : current,
              )
            }
          />
        )}
      </View>

      {/* UNO BUTTON */}

      {(ownWindow || unoConfirmed) && (
        <View
          style={[
            s.unoPanel,

            unoConfirmed &&
              s.unoSuccess,
          ]}
        >
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.65}

            disabled={
              unoSending ||
              unoConfirmed ||
              !ownWindow
            }

            style={[
              s.unoButton,

              unoConfirmed &&
                s.unoButtonConfirmed,
            ]}

            onPress={() => {
              void pressUno();
            }}
          >
            <Text style={s.unoTitle}>
              {unoConfirmed
                ? 'UNO CALLED ✓'
                : unoSending
                  ? 'Calling UNO…'
                  : 'UNO!'}
            </Text>

            {!unoConfirmed &&
              !unoSending &&
              ownWindow && (
                <Text style={s.whiteSmall}>
                  TAP NOW — ONE CARD LEFT
                </Text>
              )}
          </TouchableOpacity>

          {!!ownWindow &&
            !unoConfirmed && (
              <Countdown
                deadline={ownWindow.deadline}
                duration={5000}
              />
            )}

          <Text style={s.whiteSmall}>
            {unoConfirmed
              ? 'Announcement confirmed.'
              : unoSending
                ? 'Waiting for server confirmation.'
                : 'Call UNO or receive two penalty cards.'}
          </Text>
        </View>
      )}

      {/* WILD COLOR SELECTION */}

      {wild && (
        <View style={s.panel}>
          <Text style={s.heading}>
            Choose a color
          </Text>

          <View style={s.colorRow}>
            {COLOR_NAMES.map(color => (
              <TouchableOpacity
                key={color}
                disabled={!canAct}

                style={[
                  s.colorButton,

                  {
                    backgroundColor:
                      COLORS[color],
                  },
                ]}

                onPress={() =>
                  play(wild, color)
                }
              >
                <Text style={s.white}>
                  {color.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={() => setWild(null)}
          >
            <Text style={s.link}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* GAMEPLAY CONTROLS */}

      <View style={s.controls}>
        {room.phase === 'drawn' || skip ? (
          <TouchableOpacity
            disabled={!canDraw}

            style={[
              s.button,
              !canDraw && s.dim,
            ]}

            onPress={() =>
              void run(() =>
                passColorClashGameTurn(
                  code,
                  rev,
                ),
              )
            }
          >
            <Text style={s.buttonText}>
              {skip
                ? 'Accept Skip'
                : 'Keep Card / Pass'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            disabled={!canDraw}

            style={[
              s.button,
              !canDraw && s.dim,
            ]}

            onPress={() =>
              void run(() =>
                drawColorClashGameCard(
                  code,
                  rev,
                ),
              )
            }
          >
            <Text style={s.buttonText}>
              {busy
                ? 'Processing…'
                : penalty
                  ? `Draw ${penalty} Cards`
                  : 'Draw Card'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* GAME HINT */}

      <Text style={s.hint}>
        {ownWindow && !unoConfirmed
          ? 'Remember to call UNO!'
          : !myTurn
            ? `Waiting for ${turnName}…`
            : forced
              ? 'Applying automatic penalty…'
              : penalty > 0
                ? `Counter with ${
                    room.pending?.kind === 'wild4'
                      ? '+4'
                      : '+2'
                  } or draw ${penalty}.`
                : skip
                  ? 'Counter the action or accept the skip.'
                  : room.phase === 'drawn'
                    ? 'Play the drawn card or keep it.'
                    : 'Tap a highlighted card to play.'}
      </Text>

      {/* ERROR STATUS */}

      {!!error && (
        <View style={s.errorBox}>
          <Text style={s.error}>
            {error}
          </Text>

          <TouchableOpacity
            onPress={() => setError('')}
          >
            <Text style={s.link}>
              Dismiss
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={s.roomLabel}>
        Room {code} · Match {matchNumber}
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
    backgroundColor: '#121629',
  },

  content: {
    width: '100%',
    maxWidth: 820,
    alignSelf: 'center',
    padding: 12,
    paddingTop: 18,
    paddingBottom: 24,
    gap: 12,
  },

  loading: {
    flex: 1,
    backgroundColor: '#121629',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 18,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  heading: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
  },

  link: {
    color: '#A5E1EB',
    fontSize: 13,
    fontWeight: '700',
    padding: 5,
  },

  soundIcon: {
    fontSize: 23,
    padding: 5,
  },

  muted: {
    color: '#C0C6DE',
    fontSize: 12,
    textAlign: 'center',
  },

  white: {
    color: '#FFFFFF',
    fontWeight: '900',
    textAlign: 'center',
  },

  whiteSmall: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },

  turnBanner: {
    backgroundColor: '#26324D',
    padding: 13,
    borderRadius: 14,
    gap: 7,
  },

  turnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  turnText: {
    color: '#A5E1EB',
    fontWeight: '900',
    fontSize: 19,
  },

  direction: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },

  countdown: {
    width: '100%',
    gap: 5,
    alignItems: 'center',
  },

  timerText: {
    color: '#A5E1EB',
    fontSize: 17,
    fontWeight: '900',
  },

  timerDanger: {
    color: '#FF8597',
  },

  timerTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#49516F',
    borderRadius: 10,
    overflow: 'hidden',
  },

  timerFill: {
    height: 6,
    borderRadius: 10,
  },

  arena: {
    position: 'relative',
    gap: 10,
  },

  table: {
    backgroundColor: '#16433C',
    borderColor: '#438278',
    borderWidth: 2,
    borderRadius: 26,
    padding: 8,
    gap: 10,
  },

  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    minHeight: 170,
  },

  side: {
    flex: 1,
    minWidth: 0,
  },

  center: {
    flex: 1.65,
    alignItems: 'center',
    gap: 7,
  },

  piles: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  pileLabel: {
    color: '#C8E7E1',
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 5,
  },

  activeColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  colorDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },

  avatarActive: {
    borderColor: '#FFD071',
  },

  avatarEmoji: {
    fontSize: 25,
  },

  seat: {
    backgroundColor: '#253450',
    borderRadius: 12,
    padding: 7,
    minWidth: 0,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    gap: 5,
  },

  activeSeat: {
    borderColor: '#FFD071',
    borderWidth: 2,
  },

  seatName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },

  miniCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 2,
  },

  miniCard: {
    width: 12,
    height: 20,
    backgroundColor: '#7547AE',
    borderWidth: 1,
    borderColor: '#D7C5F1',
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },

  miniStar: {
    color: '#FFFFFF',
    fontSize: 8,
  },

  turnSmall: {
    color: '#FFD071',
    fontSize: 9,
    fontWeight: '900',
  },

  unoSmall: {
    color: '#FF879A',
    fontWeight: '900',
    fontSize: 13,
  },

  extraSeats: {
    gap: 8,
  },

  actionBox: {
    backgroundColor: '#10302C',
    borderRadius: 10,
    padding: 9,
    gap: 4,
  },

  playedBy: {
    color: '#A5E1EB',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },

  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },

  penalty: {
    color: '#FFD071',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },

  self: {
    backgroundColor: '#242841',
    padding: 11,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 9,
  },

  selfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },

  hand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingTop: 9,
    paddingBottom: 6,
  },

  card: {
    width: 61,
    height: 89,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    padding: 4,
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  cardOval: {
    width: 41,
    height: 49,
    borderRadius: 25,
    backgroundColor: '#FFFFFF29',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-15deg' }],
  },

  cardValue: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
    transform: [{ rotate: '15deg' }],
  },

  corner: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    alignSelf: 'flex-start',
  },

  cardColor: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '800',
  },

  cardBack: {
    width: 61,
    height: 89,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#382858',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },

  backStar: {
    color: '#D6B9FF',
    fontSize: 29,
    fontWeight: '900',
  },

  backLabel: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },

  cardWrap: {
    padding: 2,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 12,
  },

  highlight: {
    borderColor: '#A5E1EB',
  },

  dim: {
    opacity: 0.55,
  },

  sending: {
    opacity: 0.15,
    transform: [
      { translateY: -10 },
    ],
  },

  flyingCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 50,
    elevation: 15,
  },

  unoPanel: {
    backgroundColor: '#532741',
    borderColor: '#EE647D',
    borderWidth: 2,
    padding: 12,
    borderRadius: 16,
    gap: 8,
  },

  unoSuccess: {
    backgroundColor: '#164C3D',
    borderColor: '#60D5AC',
  },

  unoButton: {
    backgroundColor: '#E43D59',
    padding: 15,
    borderRadius: 12,
    gap: 3,
    alignItems: 'center',
    minHeight: 58,
    justifyContent: 'center',
  },

  unoButtonConfirmed: {
    backgroundColor: '#16865A',
  },

  unoTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 22,
    textAlign: 'center',
  },

  panel: {
    backgroundColor: '#303550',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    alignItems: 'center',
  },

  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },

  colorButton: {
    padding: 14,
    borderRadius: 10,
    minWidth: 65,
  },

  controls: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },

  button: {
    backgroundColor: '#A5E1EB',
    borderRadius: 12,
    padding: 15,
    minWidth: 150,
    alignItems: 'center',
  },

  buttonText: {
    color: '#15313C',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },

  secondaryButton: {
    backgroundColor: '#514B77',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },

  hint: {
    color: '#C8CCDF',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },

  errorBox: {
    backgroundColor: '#532741',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
  },

  error: {
    color: '#FF9CAD',
    fontSize: 13,
    textAlign: 'center',
  },

  roomLabel: {
    color: '#898EAA',
    fontSize: 10,
    textAlign: 'center',
  },

  victoryScreen: {
    flex: 1,
    backgroundColor: '#121629',
    position: 'relative',
  },

  victoryContent: {
    padding: 25,
    gap: 18,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: 650,
    alignSelf: 'center',
  },

  trophy: {
    fontSize: 85,
    marginTop: 20,
  },

  victoryTitle: {
    color: '#A5E1EB',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
  },

  results: {
    width: '100%',
    backgroundColor: '#242841',
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },

  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  resultName: {
    color: '#FFFFFF',
    fontWeight: '800',
    flex: 1,
  },

  confettiContainer: {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  overflow: 'hidden',
  zIndex: 100,
},

  confettiPiece: {
    position: 'absolute',
    top: 0,
    width: 8,
    height: 14,
    borderRadius: 2,
  },
});
