export const SOUNDS = {
  cardPlay: require('../../assets/color-clash/play.wav'),
  cardDraw: require('../../assets/color-clash/draw.wav'),
  uno: require('../../assets/color-clash/uno.wav'),
  cardDeal: require('../../assets/color-clash/deal.wav'),

  cardWin: require('../../assets/color-clash/win.wav'),

  round: require('../../assets/doodle-clash/round.wav'),
  correct: require('../../assets/doodle-clash/correct.wav'),
  results: require('../../assets/doodle-clash/results.wav'),
  win: require('../../assets/doodle-clash/win.wav'),

  tap: require('../../assets/audio/common/tap.wav'),
  reaction: require('../../assets/audio/common/reaction.wav'),
  countdown: require('../../assets/audio/common/countdown.wav'),
  defeat: require('../../assets/audio/common/defeat.wav'),
  duplicate: require('../../assets/audio/common/duplicate.wav'),
} as const;

export type SoundName = keyof typeof SOUNDS;

export const MUSIC =
  require('../../assets/audio/music/ambient.wav');
