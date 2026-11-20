import { useEffect, useRef, useState } from 'react';

import {
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  createInviteMessage,
  createInviteUrl,
} from './invitations';

type Props = {
  game: string;
  code: string;
  disabled?: boolean;
};

export default function InvitePanel({
  game,
  code,
  disabled = false,
}: Props) {
  const [expanded, setExpanded] =
    useState(false);

  const [sharing, setSharing] =
    useState(false);

  const [notice, setNotice] =
    useState('');

  const [error, setError] =
    useState('');

  const lock = useRef(false);

  const timer = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, []);

  let link = '';
  let linkError = '';

  try {
    link = createInviteUrl(game, code);
  } catch (reason) {
    linkError =
      reason instanceof Error
        ? reason.message
        : 'Invitation unavailable.';
  }

  function showNotice(message: string) {
    setNotice(message);

    if (timer.current) {
      clearTimeout(timer.current);
    }

    timer.current = setTimeout(() => {
      setNotice('');
    }, 3500);
  }

  async function copy(value: string) {
    setError('');

    try {
      if (
        Platform.OS === 'web' &&
        typeof navigator !== 'undefined' &&
        navigator.clipboard?.writeText
      ) {
        await navigator.clipboard.writeText(
          value,
        );

        showNotice('Copied!');
        return;
      }

      setExpanded(true);

      showNotice(
        'Press and hold the text to copy it.',
      );
    } catch {
      setExpanded(true);

      showNotice(
        'Select the displayed text to copy it.',
      );
    }
  }

  async function shareInvite() {
    if (
      disabled ||
      lock.current ||
      !link
    ) {
      return;
    }

    lock.current = true;

    setSharing(true);
    setError('');

    try {
      const message =
        createInviteMessage(game, code);

      if (Platform.OS === 'web') {
        if (
          typeof navigator !== 'undefined' &&
          typeof navigator.share === 'function'
        ) {
          await navigator.share({
            title: 'GameDen Invitation',
            text: message,
          });
        } else {
          setExpanded(true);

          await copy(link);
        }

        return;
      }

      await Share.share({
        title: 'GameDen Invitation',
        message,
      });
    } catch (reason) {
      if (
        reason instanceof Error &&
        reason.name === 'AbortError'
      ) {
        return;
      }

      setError(
        'Could not share. You can copy the invitation instead.',
      );

      setExpanded(true);
    } finally {
      lock.current = false;
      setSharing(false);
    }
  }

  return (
    <View style={s.root}>
      <Text style={s.title}>
        Invite your friends
      </Text>

      <Text style={s.caption}>
        Share this room and play together.
      </Text>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Invite friends"

        disabled={
          disabled ||
          sharing ||
          !link
        }

        activeOpacity={0.8}

        style={[
          s.primary,

          (
            disabled ||
            sharing ||
            !link
          ) && s.disabled,
        ]}

        onPress={() =>
          void shareInvite()
        }
      >
        <Text style={s.primaryText}>
          {sharing
            ? 'Opening share menu...'
            : '🔗 Invite Friends'}
        </Text>
      </TouchableOpacity>

      <View style={s.actions}>
        <TouchableOpacity
          accessibilityRole="button"

          disabled={disabled}

          style={[
            s.secondary,
            disabled && s.disabled,
          ]}

          onPress={() =>
            void copy(code)
          }
        >
          <Text style={s.white}>
            Copy Code
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"

          disabled={
            disabled || !link
          }

          style={[
            s.secondary,

            (
              disabled || !link
            ) && s.disabled,
          ]}

          onPress={() =>
            void copy(link)
          }
        >
          <Text style={s.white}>
            Copy Link
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        accessibilityRole="button"

        onPress={() =>
          setExpanded(old => !old)
        }
      >
        <Text style={s.toggle}>
          {expanded
            ? 'Hide invitation details ▲'
            : 'Show invitation details ▼'}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={s.details}>
          <Text style={s.label}>
            ROOM CODE
          </Text>

          <Text
            selectable
            style={s.code}
          >
            {code}
          </Text>

          {!!link && (
            <>
              <Text style={s.label}>
                INVITATION LINK
              </Text>

              <Text
                selectable
                style={s.link}
              >
                {link}
              </Text>
            </>
          )}

          <Text style={s.caption}>
            Press and hold the text to copy it.
          </Text>
        </View>
      )}

      {!!notice && (
        <Text
          accessibilityLiveRegion="polite"
          style={s.notice}
        >
          {notice}
        </Text>
      )}

      {!!(error || linkError) && (
        <Text style={s.error}>
          {error || linkError}
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    backgroundColor: '#242841',
    borderWidth: 1,
    borderColor: '#FFFFFF15',
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'center',
  },

  caption: {
    color: '#A6A9C4',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },

  primary: {
    backgroundColor: '#A5E1EB',
    borderRadius: 13,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },

  primaryText: {
    color: '#15313C',
    fontSize: 16,
    fontWeight: '900',
  },

  actions: {
    flexDirection: 'row',
    gap: 10,
  },

  secondary: {
    flex: 1,
    backgroundColor: '#514B77',
    borderRadius: 11,
    padding: 13,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },

  white: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    textAlign: 'center',
  },

  toggle: {
    color: '#A5E1EB',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    padding: 6,
  },

  details: {
    backgroundColor: '#171B31',
    borderRadius: 12,
    padding: 13,
    gap: 9,
  },

  label: {
    color: '#A6A9C4',
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 1,
  },

  code: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 3,
  },

  link: {
    color: '#A5E1EB',
    fontSize: 12,
    lineHeight: 19,
  },

  notice: {
    color: '#60D5AC',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },

  error: {
    color: '#FF9CAD',
    fontSize: 12,
    textAlign: 'center',
  },

  disabled: {
    opacity: 0.5,
  },
});

