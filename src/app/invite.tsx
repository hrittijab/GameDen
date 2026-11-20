import {
  Redirect,
  useLocalSearchParams,
  useRouter,
  type Href,
} from 'expo-router';

import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  usePlayer,
} from '../player/PlayerProvider';

import LoginScreen from './login';

import {
  INVITE_GAMES,
  parseInvite,
} from '../multiplayer/invitations';

export default function InviteScreen() {
  const router = useRouter();

  const params =
    useLocalSearchParams<{
      game?: string;
      code?: string;
    }>();

  const {
    user,
    profile,
    ready,
    error,
  } = usePlayer();

  const invite = parseInvite(
    params.game,
    params.code,
  );

  if (!invite) {
    return (
      <View style={s.invalid}>
        <Text style={s.icon}>
          🔗
        </Text>

        <Text style={s.title}>
          Invalid Invitation
        </Text>

        <Text style={s.caption}>
          Ask your friend to send you
          a new invitation.
        </Text>

        <TouchableOpacity
          style={s.button}

          onPress={() =>
            router.replace('/')
          }
        >
          <Text style={s.buttonText}>
            Return to GameDen
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (
    ready &&
    user &&
    profile &&
    !error
  ) {
    return (
      <Redirect
        href={{
          pathname: '/multiplayer/[game]',

          params: {
            game: invite.game,
            inviteCode: invite.code,
          },
        } as Href}
      />
    );
  }

  return (
    <View style={s.root}>
      <View style={s.banner}>
        <Text style={s.bannerLabel}>
          YOU HAVE BEEN INVITED!
        </Text>

        <Text style={s.title}>
          {INVITE_GAMES[invite.game]}
        </Text>

        <Text style={s.caption}>
          Room {invite.code}
        </Text>

        <Text style={s.caption}>
          Sign in or create your player profile
          to continue.
        </Text>
      </View>

      <View style={s.login}>
        <LoginScreen />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#121629',
    paddingTop: 12,
  },

  banner: {
    backgroundColor: '#242841',
    borderWidth: 1,
    borderColor: '#A5E1EB55',
    borderRadius: 17,
    padding: 15,
    marginHorizontal: 16,
    gap: 7,
    alignItems: 'center',
  },

  bannerLabel: {
    color: '#A5E1EB',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },

  caption: {
    color: '#A6A9C4',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },

  login: {
    flex: 1,
  },

  invalid: {
    flex: 1,
    backgroundColor: '#121629',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 18,
  },

  icon: {
    fontSize: 55,
  },

  button: {
    backgroundColor: '#A5E1EB',
    padding: 14,
    borderRadius: 12,
  },

  buttonText: {
    color: '#15313C',
    fontWeight: '900',
  },
});
