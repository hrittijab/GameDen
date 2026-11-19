import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';

import {
  callServer,
} from '../../multiplayer/api';

import type {
  LobbySettingsProps,
} from '../../multiplayer/Lobby';

import {
  DEFAULT_SETTINGS,
  MODES,
  adaptiveTurns,
  type MatchSettings,
} from './settings';

type Choice<T extends string | number> = {
  value: T;
  label: string;
};

function Options<T extends string | number>({
  label,
  value,
  choices,
  disabled,
  onChange,
}: {
  label: string;
  value: T;
  choices: Choice<T>[];
  disabled: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <View style={s.group}>
      <Text style={s.label}>
        {label}
      </Text>

      <View style={s.row}>
        {choices.map(choice => (
          <Pressable
            key={choice.value}
            disabled={disabled}
            onPress={() => onChange(choice.value)}
            accessibilityRole="button"
            accessibilityState={{
              selected: value === choice.value,
              disabled,
            }}
            style={[
              s.option,
              value === choice.value &&
                s.selected,
            ]}
          >
            <Text style={[
              s.optionText,
              value === choice.value &&
                s.selectedText,
            ]}>
              {choice.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Toggle({
  label,
  enabled,
  disabled,
  onChange,
}: {
  label: string;
  enabled: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onChange}
      accessibilityRole="switch"
      accessibilityState={{
        checked: enabled,
        disabled,
      }}
      style={s.toggleRow}
    >
      <Text style={s.toggleLabel}>
        {label}
      </Text>

      <View style={[
        s.switchTrack,
        enabled && s.switchEnabled,
      ]}>
        <View style={[
          s.switchDot,
          enabled && s.switchDotEnabled,
        ]} />
      </View>
    </Pressable>
  );
}

export default function RoomSettings({
  room,
  code,
  uid,
  disabled,
  run,
}: LobbySettingsProps) {
  const settings = {
    ...DEFAULT_SETTINGS,
    ...(
      room as typeof room & {
        matchSettings?: MatchSettings;
      }
    ).matchSettings,
  };

  const isHost = room.hostId === uid;

  const locked =
    disabled ||
    !isHost ||
    room.status !== 'lobby';

  const playerCount =
    Object.keys(room.players).length;

  const turns = adaptiveTurns(
    playerCount,
    settings,
  );

  const totalRounds =
    playerCount >= 2
      ? playerCount * turns
      : 0;

  function update<K extends keyof MatchSettings>(
    key: K,
    value: MatchSettings[K],
  ) {
    if (locked) return;

    void run(async () => {
      await callServer(
        'configureDoodleClashRoom',
        {
          code,
          settings: {
            [key]: value,
          },
        },
      );
    });
  }

  return (
    <View style={s.panel}>
      <Text style={s.title}>
        Match Settings
      </Text>

      <Text style={s.caption}>
        {isHost
          ? 'Customize how your friends play.'
          : 'The host chooses these settings.'}
      </Text>

      <Text style={s.label}>
        GAME MODE
      </Text>

      {MODES.map(mode => (
        <Pressable
          key={mode.value}
          disabled={locked}
          onPress={() =>
            update('mode', mode.value)
          }
          style={[
            s.modeCard,
            settings.mode === mode.value &&
              s.modeSelected,
          ]}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.modeTitle}>
              {mode.label}
            </Text>

            <Text style={s.caption}>
              {mode.description}
            </Text>
          </View>

          {settings.mode === mode.value && (
            <Text style={s.check}>
              Selected
            </Text>
          )}
        </Pressable>
      ))}

      <Options<MatchSettings['matchLength']>
        label="MATCH LENGTH"
        value={settings.matchLength}
        disabled={
          locked ||
          settings.turnsPerPlayer > 0
        }
        choices={[
          { value: 'quick', label: 'Quick' },
          { value: 'standard', label: 'Standard' },
          { value: 'extended', label: 'Extended' },
        ]}
        onChange={value =>
          update('matchLength', value)
        }
      />

      <Options<MatchSettings['drawingSeconds']>
        label="DRAWING TIME"
        value={
          settings.mode === 'speed'
            ? 30
            : settings.drawingSeconds
        }
        disabled={
          locked ||
          settings.mode === 'speed'
        }
        choices={[
          { value: 30, label: '30s' },
          { value: 60, label: '60s' },
          { value: 90, label: '90s' },
          { value: 120, label: '120s' },
        ]}
        onChange={value =>
          update(
            'drawingSeconds',
            value,
          )
        }
      />

      <Options<number>
        label="TURNS PER PLAYER"
        value={settings.turnsPerPlayer}
        disabled={locked}
        choices={[
          { value: 0, label: 'Auto' },
          ...Array.from(
            { length: 10 },
            (_, index) => ({
              value: index + 1,
              label: String(index + 1),
            }),
          ),
        ]}
        onChange={value =>
          update('turnsPerPlayer', value)
        }
      />

      <Options<MatchSettings['difficulty']>
        label="WORD DIFFICULTY"
        value={settings.difficulty}
        disabled={locked}
        choices={[
          { value: 'mixed', label: 'Mixed' },
          { value: 'easy', label: 'Easy' },
          { value: 'medium', label: 'Medium' },
          { value: 'hard', label: 'Hard' },
        ]}
        onChange={value =>
          update('difficulty', value)
        }
      />

      <Toggle
        label="Progressive hints"
        enabled={
          settings.hints &&
          settings.mode !== 'nohint'
        }
        disabled={
          locked ||
          settings.mode === 'nohint'
        }
        onChange={() =>
          update('hints', !settings.hints)
        }
      />

      <Toggle
        label="Live guess feed"
        enabled={settings.guessFeed}
        disabled={locked}
        onChange={() =>
          update('guessFeed', !settings.guessFeed)
        }
      />

      <Toggle
        label="Player reactions"
        enabled={settings.reactions}
        disabled={locked}
        onChange={() =>
          update('reactions', !settings.reactions)
        }
      />

      <View style={s.summary}>
        <Text style={s.summaryTitle}>
          {turns} turns per player
        </Text>

        <Text style={s.roundCount}>
          {totalRounds > 0
            ? `${totalRounds} total rounds`
            : 'Waiting for more players'}
        </Text>

        {!!totalRounds && (
          <Text style={s.caption}>
            Up to approximately {
              Math.ceil(
                totalRounds *
                (
                  (
                    settings.mode === 'speed'
                      ? 30
                      : settings.drawingSeconds
                  ) + 20
                ) / 60,
              )
            } minutes, excluding loading time.
          </Text>
        )}
      </View>

      {!isHost && (
        <Text style={s.caption}>
          Settings are controlled by the room host.
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  panel: {
    backgroundColor: '#242841',
    padding: 18,
    borderRadius: 20,
    gap: 14,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  caption: {
    color: '#A6A9C4',
    fontSize: 12,
    lineHeight: 18,
  },
  label: {
    color: '#C5BAFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  group: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    backgroundColor: '#343956',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
  },
  selected: {
    backgroundColor: '#A5E1EB',
  },
  optionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  selectedText: {
    color: '#121629',
  },
  modeCard: {
    backgroundColor: '#303550',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modeSelected: {
    borderColor: '#A5E1EB',
    backgroundColor: '#254451',
  },
  modeTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  check: {
    color: '#A5E1EB',
    fontSize: 11,
    fontWeight: '800',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  toggleLabel: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  switchTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#505775',
    padding: 3,
    justifyContent: 'center',
  },
  switchEnabled: {
    backgroundColor: '#269D79',
  },
  switchDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  switchDotEnabled: {
    alignSelf: 'flex-end',
  },
  summary: {
    backgroundColor: '#203B49',
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  summaryTitle: {
    color: '#A5E1EB',
    fontSize: 17,
    fontWeight: '900',
  },
  roundCount: {
    color: '#FFD071',
    fontSize: 24,
    fontWeight: '900',
  },
});


