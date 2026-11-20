import {
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Props = {
  status: 'online' | 'offline' | 'connecting';
};

export default function ConnectionNotice({
  status,
}: Props) {
  const [browserOffline, setBrowserOffline] =
    useState(
      typeof navigator !== 'undefined' &&
      navigator.onLine === false,
    );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const offline = () => setBrowserOffline(true);
    const online = () => setBrowserOffline(false);

    window.addEventListener?.('offline', offline);
    window.addEventListener?.('online', online);

    return () => {
      window.removeEventListener?.(
        'offline',
        offline,
      );

      window.removeEventListener?.(
        'online',
        online,
      );
    };
  }, []);

  if (
    !browserOffline &&
    status === 'online'
  ) {
    return null;
  }

  const disconnected =
    browserOffline ||
    status === 'offline';

  return (
    <View
      style={s.container}
      accessibilityLiveRegion="polite"
    >
      <Text style={s.icon}>
        {disconnected ? '📡' : '🔄'}
      </Text>

      <View style={s.info}>
        <Text style={s.heading}>
          {disconnected
            ? 'Connection interrupted'
            : 'Connecting to match'}
        </Text>

        <Text style={s.caption}>
          Attempting to reconnect automatically...
        </Text>

        <Text style={s.caption}>
          Your match may continue while offline.
        </Text>
      </View>

      <ActivityIndicator color="#FFD071" />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: '#443A2B',
    borderColor: '#FFD071',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 6,
  },

  icon: {
    fontSize: 25,
  },

  info: {
    flex: 1,
    gap: 4,
  },

  heading: {
    color: '#FFD071',
    fontWeight: '900',
    fontSize: 14,
  },

  caption: {
    color: '#DDCFB8',
    fontSize: 11,
    lineHeight: 16,
  },
});
