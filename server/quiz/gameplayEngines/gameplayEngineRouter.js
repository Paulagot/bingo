//server/quiz/gameplayEngines/gameplayEngineRouter.js

import * as generalTrivia from './generalTriviaEngine.js';
import * as wipeoutEngine from './wipeoutEngine.js';
// Later you can import others:
// import * as speedRound from './speedRoundEngine.js';

const engines = {
  general_trivia: generalTrivia,
  // speed_round: speedRound,
  wipeout: wipeoutEngine,
  // etc.
};

export function getEngine(room) {
  const roundTypeId = room.config?.roundDefinitions?.[room.currentRound - 1]?.roundType;
  return engines[roundTypeId] || null;
}


