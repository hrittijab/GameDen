import {
  createReactionHandler,
} from './multiplayer/reactions';

import {
  COLOR_CLASH_CONFIG,
} from './color-clash/config';

import {
  DOODLE_CLASH_CONFIG,
} from './doodle-clash/config';

import {
  WORD_CLASH_CONFIG,
} from './word-clash/config';

export const sendColorClashReaction =
  createReactionHandler(COLOR_CLASH_CONFIG);

export const sendDoodleClashReaction =
  createReactionHandler(DOODLE_CLASH_CONFIG);

export const sendWordClashReaction =
  createReactionHandler(WORD_CLASH_CONFIG);
