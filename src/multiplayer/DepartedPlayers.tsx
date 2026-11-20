import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

type DepartedPlayer = {
  name: string;
  score: number;
  reason: 'quit' | 'timeout';
  leftAt: number;
};

type Props = {
  room: {
    players: Record<string, string>;
  };
};

export default function DepartedPlayers({
  room,
}: Props) {
  const departures = (
    room as typeof room & {
      departedPlayers?: Record<
        string,
        DepartedPlayer
      >;
    }
  ).departedPlayers ?? {};

  const players = Object.entries(
    departures,
  )
    .filter(([id]) =>
      !Object.prototype.hasOwnProperty.call(
        room.players,
        id,
      ),
    )
    .sort(
      (a, b) =>
        b[1].score - a[1].score,
    );

  if (!players.length) return null;

  return (
    <View style={s.container}>
      <Text style={s.heading}>
        Players who left ({players.length})
      </Text>

      {players.map(([id, player]) => (
        <View
          key={id}
          style={s.row}
        >
          <View style={s.avatar}>
            <Text style={s.avatarText}>
              {player.name.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={s.info}>
            <Text
              style={s.name}
              numberOfLines={1}
            >
              {player.name}
            </Text>

            <Text style={s.left}>
              LEFT
            </Text>

            <Text style={s.reason}>
              {player.reason === 'timeout'
                ? 'Connection timed out'
                : 'Quit the match'}
            </Text>
          </View>

          <View style={s.scoreBox}>
            <Text style={s.score}>
              {player.score ?? 0}
            </Text>

            <Text style={s.reason}>
              points
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: '#242841',
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },

  heading: {
    color: '#C8CCDF',
    fontSize: 15,
    fontWeight: '800',
  },

  row: {
    backgroundColor: '#302735',
    borderColor: '#754459',
    borderWidth: 1,
    borderRadius: 13,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  avatar: {
    backgroundColor: '#484252',
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    color: '#C8C4D4',
    fontSize: 19,
    fontWeight: '800',
  },

  info: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },

  name: {
    color: '#C8C4D4',
    fontSize: 14,
    fontWeight: '800',
  },

  left: {
    color: '#FF8398',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  reason: {
    color: '#A6A9C4',
    fontSize: 11,
  },

  scoreBox: {
    alignItems: 'flex-end',
    gap: 3,
  },

  score: {
    color: '#A6A9C4',
    fontSize: 22,
    fontWeight: '900',
  },
});
