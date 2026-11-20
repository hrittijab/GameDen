import {
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Props = {
  disabled?: boolean;
  onDelete: () => Promise<void>;
};

export default function DeleteAccount({
  disabled = false,
  onDelete,
}: Props) {
  const [expanded, setExpanded] =
    useState(false);

  const [confirmation, setConfirmation] =
    useState('');

  const [working, setWorking] =
    useState(false);

  const [error, setError] =
    useState('');

  const lock = useRef(false);

  const blocked = disabled || working;

  const confirmed =
    confirmation === 'DELETE';

  async function remove() {
    if (
      blocked ||
      lock.current ||
      !confirmed
    ) {
      return;
    }

    lock.current = true;
    setWorking(true);
    setError('');

    try {
      await onDelete();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Account deletion failed.',
      );
    } finally {
      lock.current = false;
      setWorking(false);
    }
  }

  return (
    <View style={s.root}>
      <Text style={s.label}>
        DANGER ZONE
      </Text>

      {!expanded ? (
        <Pressable
          disabled={blocked}
          accessibilityRole="button"
          style={[
            s.option,
            blocked && s.disabled,
          ]}
          onPress={() => {
            setExpanded(true);
            setError('');
          }}
        >
          <Text style={s.dangerText}>
            Delete Account
          </Text>

          <Text style={s.caption}>
            Permanently remove your
            GameDen account.
          </Text>
        </Pressable>
      ) : (
        <View style={s.panel}>
          <Text style={s.title}>
            Delete your account?
          </Text>

          <Text style={s.warning}>
            This action cannot be undone.
          </Text>

          <Text style={s.caption}>
            Your player profile and
            authentication account will
            be permanently removed.
          </Text>

          <Text style={s.caption}>
            You will leave your multiplayer
            rooms. Active matches may
            be forfeited.
          </Text>

          <Text style={s.caption}>
            You cannot restore this account
            by signing in again.
          </Text>

          <Text style={s.label}>
            TYPE DELETE TO CONFIRM
          </Text>

          <TextInput
            value={confirmation}
            onChangeText={setConfirmation}
            placeholder="DELETE"
            placeholderTextColor="#969BB7"
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!blocked}
            maxLength={20}
            style={s.input}
          />

          <View style={s.buttons}>
            <Pressable
              disabled={blocked}
              style={s.cancel}
              onPress={() => {
                setExpanded(false);
                setConfirmation('');
                setError('');
              }}
            >
              <Text style={s.white}>
                Cancel
              </Text>
            </Pressable>

            <Pressable
              disabled={blocked || !confirmed}
              style={[
                s.danger,
                (blocked || !confirmed) &&
                  s.disabled,
              ]}
              onPress={() => void remove()}
            >
              {working ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <Text style={s.white}>
                  Delete Account
                </Text>
              )}
            </Pressable>
          </View>

          {!!error && (
            <Text style={s.error}>
              {error}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    gap: 12,
  },

  label: {
    color: '#FF9CAD',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.3,
  },

  option: {
    backgroundColor: '#382940',
    borderColor: '#633247',
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    gap: 6,
  },

  dangerText: {
    color: '#FF9CAD',
    fontSize: 15,
    fontWeight: '900',
  },

  caption: {
    color: '#C8CCDF',
    fontSize: 13,
    lineHeight: 20,
  },

  panel: {
    backgroundColor: '#382940',
    borderColor: '#D76279',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 13,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
  },

  warning: {
    color: '#FFD071',
    fontSize: 14,
    fontWeight: '900',
  },

  input: {
    backgroundColor: '#121629',
    borderColor: '#D76279',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  buttons: {
    flexDirection: 'row',
    gap: 10,
  },

  cancel: {
    flex: 1,
    backgroundColor: '#505775',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },

  danger: {
    flex: 1,
    backgroundColor: '#D73D53',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },

  white: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },

  disabled: {
    opacity: 0.45,
  },

  error: {
    color: '#FF9CAD',
    fontSize: 13,
    lineHeight: 20,
  },
});
