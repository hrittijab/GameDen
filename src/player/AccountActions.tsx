import DeleteAccount from './DeleteAccount';
import {
  useState,
  useRef,
} from 'react';

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { usePlayer } from './PlayerProvider';

type Action =
  | 'logout'
  | 'switch'
  | 'abandon';

export default function AccountActions({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const {
    user,
    isGuest,
    busy,
    logout,
    deleteAccount,
  } = usePlayer();

  const [confirmation, setConfirmation] =
    useState<Action | null>(null);

  const [confirmationText, setConfirmationText] =
    useState('');

  const [error, setError] =
    useState('');

  const lock = useRef(false);

  if (!user) return null;

  const blocked = disabled || busy;

  const canConfirm =
    confirmation !== 'abandon' ||
    confirmationText.trim() === 'ABANDON';

  function request(action: Action) {
    if (blocked || lock.current) return;

    setError('');
    setConfirmationText('');
    setConfirmation(action);
  }

  function cancel() {
    if (lock.current) return;

    setConfirmation(null);
    setConfirmationText('');
    setError('');
  }

  async function confirm() {
    if (
      blocked ||
      lock.current ||
      !confirmation ||
      !canConfirm
    ) {
      return;
    }

    // Prevent guest accounts from using
    // ordinary logout or switch actions.

    if (
      isGuest &&
      confirmation !== 'abandon'
    ) {
      setError(
        'Link Google or explicitly abandon your guest account.',
      );

      return;
    }

    lock.current = true;
    setError('');

    try {
      await logout(confirmation === 'abandon');

      setConfirmation(null);
      setConfirmationText('');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Could not complete account action.',
      );
    } finally {
      lock.current = false;
    }
  }

  return (
    <View style={s.section}>
      <Text style={s.heading}>
        Account Management
      </Text>

      {isGuest ? (
        <>
          <View style={s.protection}>
            <Text style={s.protectionTitle}>
              Guest Account Protection
            </Text>

            <Text style={s.caption}>
              Your guest account stays signed in
              on this device.
            </Text>

            <Text style={s.caption}>
              Link Google using the Account
              section above to keep your
              profile recoverable.
            </Text>
          </View>

          <Text style={s.sectionLabel}>
            DANGER ZONE
          </Text>

          <Pressable
            disabled={blocked || !!confirmation}
            accessibilityRole="button"
            style={[
              s.abandonRow,
              blocked && s.disabled,
            ]}
            onPress={() => request('abandon')}
          >
            <View style={s.info}>
              <Text style={s.dangerText}>
                Abandon Guest Account
              </Text>

              <Text style={s.caption}>
                Permanently risk losing access
                to this guest identity.
              </Text>
            </View>

            <Text style={s.arrow}>›</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Pressable
            disabled={blocked || !!confirmation}
            accessibilityRole="button"
            style={[
              s.row,
              blocked && s.disabled,
            ]}
            onPress={() => request('switch')}
          >
            <Text style={s.icon}>🔄</Text>

            <View style={s.info}>
              <Text style={s.title}>
                Switch Account
              </Text>

              <Text style={s.caption}>
                Sign out and choose another
                GameDen account.
              </Text>
            </View>

            <Text style={s.arrow}>›</Text>
          </Pressable>

          <Pressable
            disabled={blocked || !!confirmation}
            accessibilityRole="button"
            style={[
              s.row,
              blocked && s.disabled,
            ]}
            onPress={() => request('logout')}
          >
            <Text style={s.icon}>↪</Text>

            <View style={s.info}>
              <Text style={s.dangerText}>
                Sign Out
              </Text>

              <Text style={s.caption}>
                End your current login session.
              </Text>
            </View>

            <Text style={s.arrow}>›</Text>
          </Pressable>
        </>
      )}

      {confirmation && (
        <View style={s.confirm}>
          <Text style={s.confirmTitle}>
            {confirmation === 'abandon'
              ? 'Abandon guest account?'
              : confirmation === 'switch'
                ? 'Switch account?'
                : 'Sign out?'}
          </Text>

          {confirmation === 'abandon' ? (
            <>
              <Text style={s.warning}>
                This action may permanently
                remove your ability to access
                this guest account.
              </Text>

              <Text style={s.caption}>
                You may lose access to your
                nickname, avatar, match history,
                achievements and future rewards.
              </Text>

              <Text style={s.caption}>
                This cannot be undone through
                ordinary guest sign-in.
              </Text>

              <Text style={s.caption}>
                Link Google first if you want
                to preserve your account.
              </Text>

              <Text style={s.sectionLabel}>
                TYPE ABANDON TO CONFIRM
              </Text>

              <TextInput
                style={s.input}
                value={confirmationText}
                onChangeText={setConfirmationText}
                placeholder="ABANDON"
                placeholderTextColor="#969BB7"
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!blocked}
                maxLength={20}
              />
            </>
          ) : (
            <Text style={s.caption}>
              Your saved profile will remain
              available when you sign into
              the same registered account.
            </Text>
          )}

          <Text style={s.caption}>
            You will leave your saved
            multiplayer rooms. Leaving an
            active match may result in
            a forfeit.
          </Text>

          <View style={s.buttons}>
            <Pressable
              disabled={blocked}
              style={s.cancel}
              onPress={cancel}
            >
              <Text style={s.white}>
                Cancel
              </Text>
            </Pressable>

            <Pressable
              disabled={blocked || !canConfirm}
              style={[
                s.danger,
                (blocked || !canConfirm) &&
                  s.disabled,
              ]}
              onPress={() => void confirm()}
            >
              {busy ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <Text style={s.white}>
                  {confirmation === 'abandon'
                    ? 'Abandon Account'
                    : confirmation === 'switch'
                      ? 'Switch'
                      : 'Sign Out'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      <DeleteAccount
        disabled={blocked || !!confirmation}
        onDelete={deleteAccount}
      />

      {!!error && (
        <Text style={s.error}>
          {error}
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  section: {
    backgroundColor: '#242841',
    borderRadius: 17,
    padding: 16,
    gap: 13,
  },

  heading: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
  },

  protection: {
    backgroundColor: '#203D40',
    borderColor: '#356D69',
    borderWidth: 1,
    borderRadius: 13,
    padding: 15,
    gap: 9,
  },

  protectionTitle: {
    color: '#65CDB1',
    fontSize: 14,
    fontWeight: '900',
  },

  sectionLabel: {
    color: '#FF9CAD',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginTop: 8,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    backgroundColor: '#303550',
    borderRadius: 12,
  },

  abandonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    backgroundColor: '#382940',
    borderWidth: 1,
    borderColor: '#633247',
    borderRadius: 12,
  },

  icon: {
    color: '#A5E1EB',
    fontSize: 24,
  },

  info: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  caption: {
    color: '#C8CCDF',
    fontSize: 12,
    lineHeight: 19,
  },

  arrow: {
    color: '#A5E1EB',
    fontSize: 24,
  },

  dangerText: {
    color: '#FF9CAD',
    fontSize: 14,
    fontWeight: '900',
  },

  confirm: {
    backgroundColor: '#382940',
    borderColor: '#D76279',
    borderWidth: 1,
    borderRadius: 13,
    padding: 15,
    gap: 12,
  },

  confirmTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },

  warning: {
    color: '#FFD071',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '800',
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
    padding: 13,
    alignItems: 'center',
  },

  danger: {
    flex: 1,
    backgroundColor: '#D73D53',
    borderRadius: 10,
    padding: 13,
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


