import AccountActions from '../player/AccountActions';
import { useState } from 'react';

import { useRouter } from 'expo-router';

import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  AVATARS,
  usePlayer,
} from '../player/PlayerProvider';

export default function ProfileScreen() {
  const router = useRouter();

  const {
    user,
    profile,
    isGuest,
    busy,
    saveProfile,
    linkGoogleAccount,
  } = usePlayer();

  const [editing, setEditing] =
    useState(false);

  const [nickname, setNickname] =
    useState(profile?.nickname ?? '');

  const [avatar, setAvatar] =
    useState(profile?.avatar ?? AVATARS[0]);

  const [error, setError] =
    useState('');

  const [notice, setNotice] =
    useState('');

  if (!user || !profile) {
    return null;
  }

  function beginEditing() {
    setError('');
    setNotice('');
    setNickname(profile!.nickname);
    setAvatar(profile!.avatar);
    setEditing(true);
  }

  async function submitProfile() {
    setError('');
    setNotice('');

    try {
      await saveProfile(nickname, avatar);

      setEditing(false);
      setNotice('Your profile has been updated.');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Could not save your profile.',
      );
    }
  }

  async function upgrade() {
    setError('');
    setNotice('');

    try {
      await linkGoogleAccount();

      setNotice(
        'Google account successfully linked.',
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Could not link Google account.',
      );
    }
  }

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable
        disabled={busy}
        onPress={() => router.replace('/')}
      >
        <Text style={s.back}>
          ← Back to GameDen
        </Text>
      </Pressable>

      <Text style={s.title}>
        My Profile
      </Text>

      <View style={s.profile}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>
            {editing ? avatar : profile.avatar}
          </Text>
        </View>

        <Text style={s.name}>
          {editing
            ? nickname || 'Your nickname'
            : profile.nickname}
        </Text>

        <Text style={s.caption}>
          {isGuest
            ? 'Guest player'
            : 'Registered player'}
        </Text>
      </View>

      {editing ? (
        <View style={s.panel}>
          <Text style={s.label}>
            GAMING NICKNAME
          </Text>

          <TextInput
            value={nickname}
            onChangeText={setNickname}
            maxLength={24}
            editable={!busy}
            style={s.input}
          />

          <Text style={s.label}>
            CHOOSE YOUR AVATAR
          </Text>

          <View style={s.grid}>
            {AVATARS.map(item => (
              <Pressable
                key={item}
                disabled={busy}
                onPress={() => setAvatar(item)}
                style={[
                  s.option,
                  item === avatar && s.selected,
                ]}
              >
                <Text style={s.emoji}>
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            disabled={busy || !nickname.trim()}
            style={[
              s.primary,
              (busy || !nickname.trim()) &&
                s.disabled,
            ]}
            onPress={() => void submitProfile()}
          >
            <Text style={s.primaryText}>
              Save Changes
            </Text>
          </Pressable>

          <Pressable
            disabled={busy}
            style={s.secondary}
            onPress={() => setEditing(false)}
          >
            <Text style={s.white}>
              Cancel
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          disabled={busy}
          style={s.primary}
          onPress={beginEditing}
        >
          <Text style={s.primaryText}>
            Edit Nickname & Avatar
          </Text>
        </Pressable>
      )}

      <View style={s.panel}>
        <Text style={s.sectionTitle}>
          Account
        </Text>

        <Text style={s.label}>
          ACCOUNT TYPE
        </Text>

        <Text style={s.white}>
          {isGuest
            ? 'Guest account'
            : 'Registered account'}
        </Text>

        {!isGuest && !!user.email && (
          <>
            <Text style={s.label}>
              LINKED EMAIL
            </Text>

            <Text
              selectable
              style={s.white}
            >
              {user.email}
            </Text>
          </>
        )}

        {isGuest && (Platform.OS === 'web' || Platform.OS === 'android') && (
          <>
            <Text style={s.caption}>
              Connect your Google account to
              preserve your player profile and
              access it on other devices.
            </Text>

            <Pressable
              disabled={busy || editing}
              style={[
                s.google,
                (busy || editing) && s.disabled,
              ]}
              onPress={() => void upgrade()}
            >
              <Text style={s.googleText}>
                Link Google Account
              </Text>
            </Pressable>
          </>
        )}

        {!isGuest && (
          <Text style={s.success}>
            Your registered account is connected.
          </Text>
        )}
      </View>

      <AccountActions disabled={editing} />

      {busy && (
        <ActivityIndicator
          color="#A5E1EB"
        />
      )}

      {!!error && (
        <Text style={s.error}>
          {error}
        </Text>
      )}

      {!!notice && (
        <Text style={s.success}>
          {notice}
        </Text>
      )}

      <Text style={s.caption}>
        GameDen · Your player identity
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#121629',
  },

  content: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    padding: 24,
    paddingTop: 35,
    paddingBottom: 40,
    gap: 16,
  },

  back: {
    color: '#A5E1EB',
    fontWeight: '800',
    fontSize: 13,
    paddingVertical: 8,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
  },

  profile: {
    backgroundColor: '#242841',
    borderRadius: 20,
    alignItems: 'center',
    padding: 25,
    gap: 12,
  },

  avatar: {
    width: 105,
    height: 105,
    borderRadius: 53,
    backgroundColor: '#D7B9F4',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    fontSize: 65,
  },

  name: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
  },

  caption: {
    color: '#A6A9C4',
    fontSize: 13,
    lineHeight: 20,
  },

  panel: {
    backgroundColor: '#242841',
    borderRadius: 17,
    padding: 17,
    gap: 14,
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
  },

  label: {
    color: '#A5E1EB',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.3,
  },

  input: {
    color: '#FFFFFF',
    backgroundColor: '#121629',
    borderWidth: 1,
    borderColor: '#505775',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },

  option: {
    width: 54,
    height: 54,
    borderRadius: 11,
    backgroundColor: '#303550',
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },

  selected: {
    borderColor: '#A5E1EB',
    backgroundColor: '#49466D',
  },

  emoji: {
    fontSize: 29,
  },

  primary: {
    backgroundColor: '#A5E1EB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

  primaryText: {
    color: '#121629',
    fontSize: 15,
    fontWeight: '900',
  },

  secondary: {
    backgroundColor: '#49466D',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },

  white: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  google: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

  googleText: {
    color: '#202124',
    fontSize: 15,
    fontWeight: '900',
  },

  disabled: {
    opacity: 0.45,
  },

  error: {
    color: '#FF9CAD',
    lineHeight: 20,
    fontSize: 13,
  },

  success: {
    color: '#65CDB1',
    lineHeight: 20,
    fontSize: 13,
  },
});


