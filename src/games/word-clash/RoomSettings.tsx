import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';

import type {
  LobbySettingsProps,
} from '../../multiplayer/Lobby';

import { callServer } from '../../multiplayer/api';

import {
  DEFAULT_SETTINGS,
  MODE_NAMES,
  MODE_DESCRIPTIONS,
  type WordSettings,
  type GameMode,
} from './settings';

type Option<T extends string | number> = {
  value: T;
  label: string;
};

function Options<T extends string | number>({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  disabled: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <View style={s.group}>
      <Text style={s.label}>{label}</Text>

      <View style={s.row}>
        {options.map(option => (
          <Pressable
            key={option.value}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{
              selected: value === option.value,
              disabled,
            }}
            style={[
              s.option,
              value === option.value && s.selected,
            ]}
          >
            <Text style={[
              s.optionText,
              value === option.value &&
                s.selectedText,
            ]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Toggle({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onChange}
      accessibilityRole="switch"
      accessibilityState={{
        checked: value,
        disabled,
      }}
      style={s.toggle}
    >
      <Text style={s.toggleLabel}>
        {label}
      </Text>

      <View style={[
        s.switchTrack,
        value && s.switchOn,
      ]}>
        <View style={[
          s.switchDot,
          value && s.dotOn,
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
    ...(room as typeof room & {
      matchSettings?: WordSettings;
    }).matchSettings,
  };

  const isHost = room.hostId === uid;

  const locked =
    disabled ||
    !isHost ||
    room.status !== 'lobby';

  function update<K extends keyof WordSettings>(
    key: K,
    value: WordSettings[K],
  ) {
    if (locked) return;

    void run(async () => {
      await callServer(
        'configureWordClashRoom',
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
          ? 'Customize the challenge.'
          : 'The host chooses the match settings.'}
      </Text>

      <Text style={s.label}>
        GAME MODE
      </Text>

      {(Object.keys(MODE_NAMES) as GameMode[])
        .map(mode => (
          <Pressable
            key={mode}
            disabled={locked}
            onPress={() => update('mode', mode)}
            style={[
              s.mode,
              settings.mode === mode &&
                s.modeSelected,
            ]}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.modeName}>
                {MODE_NAMES[mode]}
              </Text>

              <Text style={s.caption}>
                {MODE_DESCRIPTIONS[mode]}
              </Text>
            </View>

            {settings.mode === mode && (
              <Text style={s.check}>
                Selected
              </Text>
            )}
          </Pressable>
        ))}

      <Options<WordSettings['winningScore']>
        label="WINNING SCORE"
        value={settings.winningScore}
        options={[
          { value: 100, label: '100' },
          { value: 200, label: '200' },
          { value: 300, label: '300' },
          { value: 500, label: '500' },
        ]}
        disabled={locked}
        onChange={value =>
          update('winningScore', value)
        }
      />

      <Options<WordSettings['roundSeconds']>
        label="TIME PER ROUND"
        value={
          settings.mode === 'quick'
            ? 10
            : settings.roundSeconds
        }
        options={[
          { value: 10, label: '10s' },
          { value: 20, label: '20s' },
          { value: 30, label: '30s' },
          { value: 45, label: '45s' },
        ]}
        disabled={
          locked ||
          settings.mode === 'quick'
        }
        onChange={value =>
          update('roundSeconds', value)
        }
      />

      <Options<WordSettings['minimumLength']>
        label="MINIMUM WORD LENGTH"
        value={settings.minimumLength}
        options={[
          { value: 3, label: '3 letters' },
          { value: 4, label: '4 letters' },
          { value: 5, label: '5 letters' },
        ]}
        disabled={locked}
        onChange={value =>
          update('minimumLength', value)
        }
      />

      <Toggle
        label="Streak bonuses"
        value={settings.streakBonus}
        disabled={locked}
        onChange={() =>
          update(
            'streakBonus',
            !settings.streakBonus,
          )
        }
      />

      <Toggle
        label="Allow previously used words"
        value={settings.allowRepeatedWords}
        disabled={locked}
        onChange={() =>
          update(
            'allowRepeatedWords',
            !settings.allowRepeatedWords,
          )
        }
      />

      <Toggle
        label="Random letter selection"
        value={
          settings.randomLetters ||
          settings.mode === 'mystery'
        }
        disabled={
          locked ||
          settings.mode === 'mystery' ||
          settings.mode === 'chain'
        }
        onChange={() =>
          update(
            'randomLetters',
            !settings.randomLetters,
          )
        }
      />

      <Toggle
        label="Player reactions"
        value={settings.reactions}
        disabled={locked}
        onChange={() =>
          update(
            'reactions',
            !settings.reactions,
          )
        }
      />

      <View style={s.summary}>
        <Text style={s.caption}>
          WINNING TARGET
        </Text>

        <Text style={s.target}>
          {settings.winningScore} points
        </Text>

        <Text style={s.caption}>
          {settings.mode === 'quick'
            ? 10
            : settings.roundSeconds}s per round
          {' · '}
          {settings.minimumLength}+ letters
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  panel: {
    backgroundColor: '#2B2843',
    borderRadius: 20,
    padding: 18,
    gap: 14,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  caption: {
    color: '#B7B4CE',
    fontSize: 12,
    lineHeight: 18,
  },
  label: {
    color: '#C9B5FF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
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
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#464064',
  },
  selected: {
    backgroundColor: '#FFD071',
  },
  optionText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  selectedText: {
    color: '#17162D',
  },
  mode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#39334F',
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modeSelected: {
    borderColor: '#FFD071',
    backgroundColor: '#514473',
  },
  modeName: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },
  check: {
    color: '#FFD071',
    fontWeight: '800',
    fontSize: 11,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  toggleLabel: {
    color: '#FFFFFF',
    flex: 1,
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
  switchOn: {
    backgroundColor: '#269D79',
  },
  switchDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  dotOn: {
    alignSelf: 'flex-end',
  },
  summary: {
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#463861',
    gap: 6,
  },
  target: {
    color: '#FFD071',
    fontSize: 26,
    fontWeight: '900',
  },
});
