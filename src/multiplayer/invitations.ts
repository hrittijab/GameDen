import { Platform } from 'react-native';

export const INVITE_GAMES = {
  'color-clash': 'Color Clash',
  'doodle-clash': 'Doodle Clash',
  'word-clash': 'Word Clash',
} as const;

export type InviteGame =
  keyof typeof INVITE_GAMES;

export type GameInvite = {
  game: InviteGame;
  code: string;
};

export function parseInvite(
  game: unknown,
  code: unknown,
): GameInvite | null {
  if (
    typeof game !== 'string' ||
    !Object.prototype.hasOwnProperty.call(
      INVITE_GAMES,
      game,
    )
  ) {
    return null;
  }

  if (typeof code !== 'string') {
    return null;
  }

  const normalized =
    code.trim().toUpperCase();

  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(normalized)) {
    return null;
  }

  return {
    game: game as InviteGame,
    code: normalized,
  };
}

function getInviteBaseUrl(): string {
  const configured =
    process.env.EXPO_PUBLIC_INVITE_BASE_URL?.trim();

  const fallback =
    Platform.OS === 'web' &&
    typeof window !== 'undefined'
      ? window.location.origin
      : '';

  const base = configured || fallback;

  if (!base) {
    throw new Error(
      'The invitation website is not configured.',
    );
  }

  const url = new URL(base);

  if (
    url.protocol !== 'https:' &&
    !(__DEV__ && url.protocol === 'http:')
  ) {
    throw new Error(
      'Invitation links require a secure website.',
    );
  }

  if (url.username || url.password) {
    throw new Error(
      'Invalid invitation website.',
    );
  }

  return url.origin;
}

export function createInviteUrl(
  game: string,
  code: string,
): string {
  const invite = parseInvite(game, code);

  if (!invite) {
    throw new Error('Invalid room invitation.');
  }

  const url = new URL(
    '/invite',
    getInviteBaseUrl(),
  );

  url.searchParams.set(
    'game',
    invite.game,
  );

  url.searchParams.set(
    'code',
    invite.code,
  );

  return url.toString();
}

export function createInviteMessage(
  game: string,
  code: string,
): string {
  const invite = parseInvite(game, code);

  if (!invite) {
    throw new Error('Invalid room invitation.');
  }

  return [
    `Join me for ${INVITE_GAMES[invite.game]} on GameDen!`,
    '',
    `Room code: ${invite.code}`,
    '',
    createInviteUrl(
      invite.game,
      invite.code,
    ),
  ].join('\n');
}
