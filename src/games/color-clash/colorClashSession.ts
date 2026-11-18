import {
  saveSession,
  getSession,
  clearSession,
} from '../../multiplayer/session';

export type {
  MultiplayerSession as ColorClashSession,
} from '../../multiplayer/types';

const GAME_ID = 'color-clash';

export const saveColorClashSession = (
  code: string,
  uid: string,
  playerName: string,
) =>
  saveSession(
    GAME_ID,
    code,
    uid,
    playerName,
  );

export const getColorClashSession = () =>
  getSession(GAME_ID);

export const clearColorClashSession = () =>
  clearSession(GAME_ID);
