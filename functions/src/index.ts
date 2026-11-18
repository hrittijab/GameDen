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
