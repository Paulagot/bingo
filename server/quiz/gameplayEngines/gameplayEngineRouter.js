// server/quiz/gameplayEngines/gameplayEngineRouter.js
import * as generalTrivia from './generalTriviaEngine.js';
import * as wipeoutEngine from './wipeoutEngine.js';
import * as speedRound from './speedRoundEngine.js';

console.log('[Router] Loaded router from', import.meta.url);

const engines = {
  general_trivia: generalTrivia,
  speed_round: speedRound,
  wipeout: wipeoutEngine,
};

console.log('[Router] engines keys =', Object.keys(engines));

export function getEngine(room) {
  const roundTypeId =
    room?.config?.roundDefinitions?.[room.currentRound - 1]?.roundType;
  console.log('[Router] roundTypeId =', JSON.stringify(roundTypeId)); // ✅ safe here
  return engines[roundTypeId] || null;
}



