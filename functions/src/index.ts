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


export {
  previewDoodleClashStroke,
} from './doodle-clash/liveDrawing';

export {
  maintainDoodleClashMatch,
} from './doodle-clash/maintenance';

export {
  configureDoodleClashRoom,
} from './doodle-clash/configureRoom';



export {
  startWordClashMatch,
  selectWordClashLetter,
  submitWordClashWord,
  getMyWordClashSubmission,
  advanceWordClashPhase,
} from './word-clash/handlers';

export {
  heartbeatWordClash,
  leaveWordClashRoom,
  kickWordClashPlayer,
} from './word-clash/lifecycle';

export {
  configureWordClashRoom,
} from './word-clash/configureRoom';

export {
  maintainWordClashMatch,
} from './word-clash/maintenance';



export {
  sendColorClashReaction,
  sendDoodleClashReaction,
  sendWordClashReaction,
} from './reactions';


export {
  maintainColorClashMatch,
} from './color-clash/maintenance';
