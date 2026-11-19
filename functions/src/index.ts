// ==========================================
// GAMEDEN CLOUD FUNCTIONS
// ==========================================

import './multiplayer/firebase';

// ==========================================
// COLOR CLASH - GAMEPLAY
// ==========================================

export {
  startColorClashMatch,
  rematchColorClashMatch,
  playColorClashCard,
  drawColorClashCard,
  passColorClashTurn,
  autoColorClashTurn,
  callColorClashUno,
  resolveColorClashUno,
} from './color-clash/handlers';

// ==========================================
// COLOR CLASH - MULTIPLAYER LIFECYCLE
// ==========================================

export {
  heartbeatColorClash,
  kickColorClashPlayer,
  leaveColorClashRoom,
} from './color-clash/lifecycle';

// ==========================================
// DOODLE CLASH - GAMEPLAY
// ==========================================

export {
  startDoodleClashMatch,
  updateDoodleClashDrawing,
  getDoodleClashWord,
  selectDoodleClashWord,
  guessDoodleClashWord,
  advanceDoodleClashRound,
} from './doodle-clash/handlers';

// ==========================================
// DOODLE CLASH - MULTIPLAYER LIFECYCLE
// ==========================================

export {
  heartbeatDoodleClash,
  leaveDoodleClashRoom,
  kickDoodleClashPlayer,
} from './doodle-clash/lifecycle';

