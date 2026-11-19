import {
  View,
  Text,
  Pressable,
  Switch,
  StyleSheet,
} from 'react-native';

import {
  useAudio,
} from './AudioProvider';

import {
  DEFAULT_AUDIO,
} from './preferences';

function VolumeControl({
  label,
  value,
  enabled,
  color,
  onChange,
}: {
  label: string;
  value: number;
  enabled: boolean;
  color: string;
  onChange: (value: number) => void;
}) {
  const percentage = Math.round(value * 100);

  function adjust(amount: number) {
    onChange(
      Math.min(
        1,
        Math.max(
          0,
          Math.round((value + amount) * 100) / 100,
        ),
      ),
    );
  }

  return (
    <View style={[
      s.volumePanel,
      !enabled && s.disabled,
    ]}>
      <View style={s.row}>
        <Text style={s.caption}>{label}</Text>
        <Text style={[
          s.percentage,
          { color },
        ]}>
          {percentage}%
        </Text>
      </View>

      <View style={s.volumeRow}>
        <Pressable
          disabled={!enabled || value <= 0}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          onPress={() => adjust(-0.1)}
          style={s.adjust}
        >
          <Text style={s.adjustText}>−</Text>
        </Pressable>

        <View style={s.track}>
          <View style={[
            s.fill,
            {
              width: `${percentage}%`,
              backgroundColor: color,
            },
          ]} />
        </View>

        <Pressable
          disabled={!enabled || value >= 1}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          onPress={() => adjust(0.1)}
          style={s.adjust}
        >
          <Text style={s.adjustText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SettingRow({
  icon,
  title,
  description,
  enabled,
  disabled,
  onChange,
}: {
  icon: string;
  title: string;
  description: string;
  enabled: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={s.row}>
      <View style={s.iconBox}>
        <Text style={s.icon}>{icon}</Text>
      </View>

      <View style={s.description}>
        <Text style={s.label}>{title}</Text>
        <Text style={s.caption}>
          {description}
        </Text>
      </View>

      <Switch
        accessibilityLabel={title}
        value={enabled}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{
          false: '#55566B',
          true: '#4AB99A',
        }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

export default function AudioSettings() {
  const {
    preferences,
    ready,
    update,
    play,
    vibrate,
    resumeMusic,
  } = useAudio();

  return (
    <View style={s.container}>
      <Text style={s.title}>
        Audio & Feedback
      </Text>

      <Text style={s.caption}>
        Personalize how GameDen sounds and feels.
      </Text>

      <View style={s.panel}>
        <SettingRow
          icon="🔊"
          title="Sound effects"
          description="Gameplay, reactions and celebrations"
          enabled={preferences.effectsEnabled}
          disabled={!ready}
          onChange={value => {
            update({ effectsEnabled: value });

            if (value) play('tap');
          }}
        />

        <VolumeControl
          label="Effects volume"
          value={preferences.effectsVolume}
          enabled={ready && preferences.effectsEnabled}
          color="#A5E1EB"
          onChange={value => {
            update({ effectsVolume: value });
            play('tap');
          }}
        />

        <View style={s.divider} />

        <SettingRow
          icon="🎵"
          title="Background music"
          description="A gentle instrumental soundtrack"
          enabled={preferences.musicEnabled}
          disabled={!ready}
          onChange={value =>
            update({ musicEnabled: value })
          }
        />

        <VolumeControl
          label="Music volume"
          value={preferences.musicVolume}
          enabled={ready && preferences.musicEnabled}
          color="#C5BAFF"
          onChange={value => {
            update({ musicVolume: value });
            resumeMusic();
          }}
        />

        {preferences.musicEnabled && (
          <Pressable
            onPress={resumeMusic}
            accessibilityRole="button"
            style={s.testButton}
          >
            <Text style={s.testText}>
              Play music
            </Text>
          </Pressable>
        )}

        <View style={s.divider} />

        <SettingRow
          icon="📳"
          title="Vibration"
          description="Physical feedback on supported devices"
          enabled={preferences.vibrationEnabled}
          disabled={!ready}
          onChange={value => {
            update({ vibrationEnabled: value });

            if (value) vibrate('light');
          }}
        />
      </View>

      <View style={s.panel}>
        <Text style={s.label}>Test your audio</Text>

        <View style={s.testRow}>
          {([
            ['tap', 'Tap'],
            ['reaction', 'Reaction'],
            ['countdown', 'Countdown'],
            ['win', 'Victory'],
          ] as const).map(([sound, label]) => (
            <Pressable
              key={sound}
              disabled={!ready}
              onPress={() => play(sound)}
              style={s.testButton}
            >
              <Text style={s.testText}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable
        disabled={!ready}
        onPress={() => update(DEFAULT_AUDIO)}
        style={s.reset}
      >
        <Text style={s.resetText}>
          Reset to defaults
        </Text>
      </Pressable>

      <Text style={s.saved}>
        {ready
          ? 'Preferences are stored on this device.'
          : 'Loading preferences...'}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 16,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },

  panel: {
    backgroundColor: '#242841',
    borderRadius: 20,
    padding: 17,
    gap: 16,
    borderColor: '#FFFFFF12',
    borderWidth: 1,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'space-between',
  },

  iconBox: {
    width: 42,
    height: 42,
    backgroundColor: '#393650',
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  icon: {
    fontSize: 22,
  },

  description: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },

  label: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  caption: {
    color: '#A6A9C4',
    fontSize: 12,
    lineHeight: 18,
  },

  volumePanel: {
    gap: 10,
    padding: 12,
    backgroundColor: '#303550',
    borderRadius: 13,
  },

  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  percentage: {
    fontWeight: '900',
    fontSize: 14,
  },

  track: {
    flex: 1,
    height: 9,
    backgroundColor: '#17182F',
    borderRadius: 5,
    overflow: 'hidden',
  },

  fill: {
    height: 9,
    borderRadius: 5,
  },

  adjust: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#494664',
    alignItems: 'center',
    justifyContent: 'center',
  },

  adjustText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },

  divider: {
    height: 1,
    backgroundColor: '#FFFFFF15',
  },

  disabled: {
    opacity: 0.5,
  },

  testRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  testButton: {
    backgroundColor: '#393650',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    flexGrow: 1,
  },

  testText: {
    color: '#D3C5FF',
    fontSize: 12,
    fontWeight: '800',
  },

  reset: {
    padding: 15,
    backgroundColor: '#343956',
    borderRadius: 14,
    alignItems: 'center',
  },

  resetText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  saved: {
    color: '#81D6B8',
    fontSize: 12,
    textAlign: 'center',
  },
});
