export const AVATARS = [
  '🐼', '🦊', '🐱', '🐸',
  '🐯', '🐨', '🐶', '🐰',
  '🦁', '🐵', '🐧', '🦉',
];

export function isValidAvatar(
  value: unknown,
): value is string {
  return (
    typeof value === 'string' &&
    AVATARS.includes(value)
  );
}

export function getPlayerAvatar(
  room: {
    playerAvatars?: Record<string, string>;
  } | null | undefined,
  uid: string,
): string {
  const avatar = room?.playerAvatars?.[uid];

  return isValidAvatar(avatar)
    ? avatar
    : '👤';
}
