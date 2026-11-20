import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import type {
  RoomCreationOptions,
  RoomVisibility,
} from './types';

type Props = {
  value: RoomCreationOptions;
  onChange: (
    value: RoomCreationOptions,
  ) => void;
  minPlayers?: number;
  maxPlayers: number;
  disabled?: boolean;
};

export default function RoomCreationSettings({
  value,
  onChange,
  minPlayers = 2,
  maxPlayers,
  disabled = false,
}: Props) {
  const options: {
    value: RoomVisibility;
    title: string;
    icon: string;
    description: string;
  }[] = [
    {
      value: 'private',
      title: 'Private Room',
      icon: '🔒',
      description:
        'Join using a room code or invitation.',
    },
    {
      value: 'public',
      title: 'Public Room',
      icon: '🌐',
      description:
        'Available to other GameDen players.',
    },
  ];

  const capacities = Array.from(
    {
      length:
        maxPlayers - minPlayers + 1,
    },
    (_, index) =>
      minPlayers + index,
  );

  return (
    <View style={s.root}>
      <Text style={s.heading}>
        Room Settings
      </Text>

      <Text style={s.label}>
        ROOM VISIBILITY
      </Text>

      {options.map(option => {
        const selected =
          value.visibility === option.value;

        return (
          <TouchableOpacity
            key={option.value}

            accessibilityRole="radio"

            accessibilityState={{
              checked: selected,
              disabled,
            }}

            disabled={disabled}

            activeOpacity={0.8}

            style={[
              s.option,
              selected && s.selected,
              disabled && s.disabled,
            ]}

            onPress={() =>
              onChange({
                ...value,
                visibility: option.value,
              })
            }
          >
            <View style={s.iconBox}>
              <Text style={s.icon}>
                {option.icon}
              </Text>
            </View>

            <View style={s.info}>
              <Text style={s.optionTitle}>
                {option.title}
              </Text>

              <Text style={s.caption}>
                {option.description}
              </Text>
            </View>

            <View style={[
              s.radio,

              selected &&
                s.radioSelected,
            ]}>
              {selected && (
                <View style={s.radioDot} />
              )}
            </View>
          </TouchableOpacity>
        );
      })}

      {value.visibility === 'public' && (
        <View style={s.nameSection}>
          <Text style={s.label}>
            ROOM NAME (OPTIONAL)
          </Text>

          <TextInput
            value={value.roomName}

            onChangeText={roomName =>
              onChange({
                ...value,
                roomName,
              })
            }

            editable={!disabled}

            maxLength={32}

            placeholder="Let's play!"

            placeholderTextColor="#898EAA"

            style={s.input}
          />

          <Text style={s.counter}>
            {value.roomName.length}/32
          </Text>
        </View>
      )}

      <View style={s.capacityHeader}>
        <Text style={s.label}>
          MAXIMUM PLAYERS
        </Text>

        <Text style={s.capacityValue}>
          {value.maxPlayers} players
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.capacities}
      >
        {capacities.map(capacity => {
          const selected =
            capacity === value.maxPlayers;

          return (
            <TouchableOpacity
              key={capacity}

              accessibilityRole="button"

              accessibilityLabel={
                `${capacity} players`
              }

              accessibilityState={{
                selected,
                disabled,
              }}

              disabled={disabled}

              style={[
                s.capacity,
                selected &&
                  s.capacitySelected,
              ]}

              onPress={() =>
                onChange({
                  ...value,
                  maxPlayers: capacity,
                })
              }
            >
              <Text style={[
                s.capacityText,

                selected &&
                  s.capacityTextSelected,
              ]}>
                {capacity}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={s.caption}>
        You can start once at least
        {' '}{minPlayers} players have joined.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    backgroundColor: '#1B1F35',
    borderRadius: 17,
    padding: 14,
    gap: 12,
  },

  heading: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
  },

  label: {
    color: '#A5E1EB',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
  },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#303550',
    borderColor: '#505775',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },

  selected: {
    backgroundColor: '#253D49',
    borderColor: '#A5E1EB',
  },

  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFFFFF12',
    alignItems: 'center',
    justifyContent: 'center',
  },

  icon: {
    fontSize: 23,
  },

  info: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },

  optionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  caption: {
    color: '#B7BCD5',
    fontSize: 12,
    lineHeight: 18,
  },

  radio: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderColor: '#898EAA',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioSelected: {
    borderColor: '#A5E1EB',
  },

  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#A5E1EB',
  },

  nameSection: {
    gap: 8,
  },

  input: {
    backgroundColor: '#15182D',
    borderColor: '#505775',
    borderWidth: 1,
    borderRadius: 11,
    padding: 13,
    color: '#FFFFFF',
    fontSize: 15,
  },

  counter: {
    color: '#898EAA',
    fontSize: 10,
    textAlign: 'right',
  },

  capacityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },

  capacityValue: {
    color: '#FFD071',
    fontSize: 14,
    fontWeight: '900',
  },

  capacities: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 3,
  },

  capacity: {
    width: 43,
    height: 43,
    borderRadius: 11,
    backgroundColor: '#393E59',
    borderWidth: 1,
    borderColor: '#505775',
    alignItems: 'center',
    justifyContent: 'center',
  },

  capacitySelected: {
    backgroundColor: '#A5E1EB',
    borderColor: '#A5E1EB',
  },

  capacityText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },

  capacityTextSelected: {
    color: '#15313C',
  },

  disabled: {
    opacity: 0.5,
  },
});
