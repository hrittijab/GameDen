import AccountActions from '../player/AccountActions';
import { useState } from 'react';

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

export default function LoginScreen() {
  const {
    user,
    profile,
    ready,
    busy,
    error,
    continueAsGuest,
    continueWithGoogle,
    saveProfile,
    reloadProfile,
  } = usePlayer();

  const [nickname, setNickname] =
    useState('');

  const [avatar, setAvatar] =
    useState(AVATARS[0]);

  const [localError, setLocalError] =
    useState('');

  async function googleLogin() {
    setLocalError('');

    try {
      await continueWithGoogle();
    } catch (reason) {
      setLocalError(
        reason instanceof Error
          ? reason.message
          : 'Google Sign-In failed.',
      );
    }
  }

  async function guestLogin() {
    setLocalError('');

    try {
      await continueAsGuest();
    } catch {
      // Provider displays authentication errors.
    }
  }

  async function completeProfile() {
    setLocalError('');

    try {
      await saveProfile(nickname, avatar);
    } catch (reason) {
      setLocalError(
        reason instanceof Error
          ? reason.message
          : 'Could not create your profile.',
      );
    }
  }

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={s.brand}>
        <View style={s.mark}>
          <Text style={s.letter}>G</Text>
        </View>

        <Text style={s.logo}>
          Game<Text style={s.accent}>Den</Text>
        </Text>

        <Text style={s.caption}>
          Your games. Your people. Your den.
        </Text>
      </View>

      {!ready ? (
        <View style={s.panel}>
          <ActivityIndicator
            size="large"
            color="#A5E1EB"
          />

          <Text style={s.caption}>
            Loading your player identity...
          </Text>
        </View>
      ) : !user ? (
        <>
          <Text style={s.title}>
            Welcome to GameDen
          </Text>

          <Text style={s.description}>
            Create an account to start playing.
          </Text>

          {(Platform.OS === 'web' || Platform.OS === 'android') && (
            <Pressable
              disabled={busy}
              style={[
                s.googleButton,
                busy && s.disabled,
              ]}
              onPress={() => void googleLogin()}
            >
              <Text style={s.googleLetter}>
                G
              </Text>

              <Text style={s.googleText}>
                Continue with Google
              </Text>
            </Pressable>
          )}

          <Pressable
            disabled={busy}
            style={[
              s.primary,
              busy && s.disabled,
            ]}
            onPress={() => void guestLogin()}
          >
            {busy ? (
              <ActivityIndicator
                color="#121629"
              />
            ) : (
              <Text style={s.primaryText}>
                Continue as Guest
              </Text>
            )}
          </Pressable>

          <Text style={s.caption}>
            Your guest identity is saved on
            this browser or app installation.
          </Text>
        </>
      ) : error ? (
        <View style={s.panel}>
          <Text style={s.error}>
            {error}
          </Text>

          <Pressable
            style={s.primary}
            onPress={() => void reloadProfile()}
          >
            <Text style={s.primaryText}>
              Retry Connection
            </Text>
          </Pressable>
        </View>
      ) : !profile ? (
        <>
          <Text style={s.title}>
            Make it yours
          </Text>

          <Text style={s.description}>
            Choose the name and avatar
            your friends will see.
          </Text>

          <View style={s.preview}>
            <View style={s.largeAvatar}>
              <Text style={s.largeEmoji}>
                {avatar}
              </Text>
            </View>

            <Text style={s.previewName}>
              {nickname.trim() || 'Your nickname'}
            </Text>
          </View>

          <Text style={s.label}>
            YOUR GAMING NICKNAME
          </Text>

          <TextInput
            style={s.input}
            value={nickname}
            onChangeText={setNickname}
            placeholder="e.g. PixelMaster"
            placeholderTextColor="#969BB7"
            maxLength={24}
            editable={!busy}
            autoCorrect={false}
          />

          <Text style={s.counter}>
            {nickname.length}/24
          </Text>

          <Text style={s.label}>
            CHOOSE YOUR AVATAR
          </Text>

          <View style={s.avatarGrid}>
            {AVATARS.map(item => (
              <Pressable
                key={item}
                disabled={busy}
                onPress={() => setAvatar(item)}
                style={[
                  s.avatarOption,
                  avatar === item &&
                    s.selectedAvatar,
                ]}
              >
                <Text style={s.emoji}>
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            disabled={
              busy || !nickname.trim()
            }
            style={[
              s.primary,
              (busy || !nickname.trim()) &&
                s.disabled,
            ]}
            onPress={() =>
              void completeProfile()
            }
          >
            {busy ? (
              <ActivityIndicator
                color="#121629"
              />
            ) : (
              <Text style={s.primaryText}>
                Create My Profile
              </Text>
            )}
          </Pressable>

          <Text style={s.caption}>
            Your nickname will be used
            throughout GameDen.
          </Text>
        </>
      ) : (
        <ActivityIndicator
          color="#A5E1EB"
        />
      )}

      {user && !profile && ready && (
        <AccountActions />
      )}

      {!!localError && (
        <Text style={s.error}>
          {localError}
        </Text>
      )}

      {!user && !!error && (
        <Text style={s.error}>
          {error}
        </Text>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({

  googleButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  googleLetter: {
    color: '#4285F4',
    fontWeight: '900',
    fontSize: 23,
  },

  googleText: {
    color: '#202124',
    fontWeight: '800',
    fontSize: 15,
  },

  root: {
    flex: 1,
    backgroundColor: '#121629',
  },

  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    justifyContent: 'center',
    padding: 25,
    gap: 16,
  },

  brand: {
    alignItems: 'center',
    gap: 9,
    marginBottom: 18,
  },

  mark: {
    width: 74,
    height: 74,
    borderRadius: 22,
    backgroundColor: '#A5E1EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  letter: {
    color: '#121629',
    fontSize: 44,
    fontWeight: '900',
  },

  logo: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
  },

  accent: {
    color: '#A5E1EB',
  },

  caption: {
    color: '#A6A9C4',
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 19,
  },

  title: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '900',
  },

  description: {
    color: '#C8CCDF',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
  },

  panel: {
    backgroundColor: '#242841',
    borderRadius: 16,
    padding: 18,
    gap: 15,
  },

  primary: {
    backgroundColor: '#A5E1EB',
    borderRadius: 13,
    padding: 17,
    alignItems: 'center',
  },

  primaryText: {
    color: '#121629',
    fontSize: 16,
    fontWeight: '900',
  },

  disabled: {
    opacity: 0.45,
  },

  preview: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
  },

  largeAvatar: {
    width: 95,
    height: 95,
    borderRadius: 48,
    backgroundColor: '#D7B9F4',
    alignItems: 'center',
    justifyContent: 'center',
  },

  largeEmoji: {
    fontSize: 56,
  },

  previewName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },

  label: {
    color: '#A5E1EB',
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: '900',
  },

  input: {
    backgroundColor: '#242841',
    borderWidth: 1,
    borderColor: '#505775',
    borderRadius: 12,
    padding: 15,
    color: '#FFFFFF',
    fontSize: 16,
  },

  counter: {
    color: '#A6A9C4',
    textAlign: 'right',
    fontSize: 11,
  },

  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },

  avatarOption: {
    width: 54,
    height: 54,
    backgroundColor: '#242841',
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedAvatar: {
    backgroundColor: '#49466D',
    borderColor: '#A5E1EB',
  },

  emoji: {
    fontSize: 29,
  },

  error: {
    color: '#FF9CAD',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
});



