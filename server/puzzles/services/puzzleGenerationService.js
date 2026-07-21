import database from '../../config/database.js';
import anagramEngine from '../engines/anagramEngine.js';
import sequenceOrderingEngine from '../engines/sequenceOrderingEngine.js';
import matchPairsEngine from '../engines/matchPairsEngine.js';
import wordSearchEngine from '../engines/wordSearchEngine.js';
import slidingTileEngine from '../engines/slidingTileEngine.js';
import sudokuEngine from '../engines/sudokuEngine.js';
import patternCompletionEngine from '../engines/patternCompletionEngine.js';
import wordLadderEngine from '../engines/wordLadderEngine.js';
import cryptogramEngine from '../engines/cryptogramEngine.js';
import numberPathEngine from '../engines/numberPathEngine.js';
import towersOfHanoiEngine from '../engines/towersOfHanoiEngine.js';
import nonogramEngine from '../engines/nonogramEngine.js';
import memoryPairsEngine from '../engines/memoryPairsEngine.js';
import { PuzzleType } from '../puzzleTypes.js';

import { v4 as uuidv4 } from 'uuid';

const ENGINE_MAP = {
  [PuzzleType.ANAGRAM]:           anagramEngine,
  [PuzzleType.SEQUENCE_ORDERING]: sequenceOrderingEngine,
  [PuzzleType.MATCH_PAIRS]:       matchPairsEngine,
  [PuzzleType.WORD_SEARCH]:       wordSearchEngine,
  [PuzzleType.SLIDING_TILE]:     slidingTileEngine, 
  [PuzzleType.SUDOKU]:           sudokuEngine,
  [PuzzleType.PATTERN_COMPLETION]: patternCompletionEngine,
  [PuzzleType.WORD_LADDER]:        wordLadderEngine,
  [PuzzleType.CRYPTOGRAM]:         cryptogramEngine,
  [PuzzleType.NUMBER_PATH]:        numberPathEngine,
  [PuzzleType.TOWERS_OF_HANOI]:    towersOfHanoiEngine,
  [PuzzleType.NONOGRAM]:           nonogramEngine,
  [PuzzleType.MEMORY_PAIRS]:       memoryPairsEngine,
  [PuzzleType.PATTERN_COMPLETION]: patternCompletionEngine,
};

export function getEngine(puzzleType) {
  const engine = ENGINE_MAP[puzzleType];
  if (!engine) throw new Error(`No engine registered for puzzle type: ${puzzleType}`);
  return engine;
}

export function getSupportedPuzzleTypes() {
  return Object.keys(ENGINE_MAP);
}

/**
 * Generate a puzzle for a challenge week.
 * Runs once — if already generated returns the existing instance.
 * All players in the same challenge+week get the same instance.
 */


export async function generatePuzzleForWeek({ challengeId, weekNumber, puzzleType, difficulty = 'medium', clubId }) {
  // Return existing instance if already generated for this challenge+week
  const [existing] = await database.connection.execute(
    `SELECT id, puzzle_type, difficulty, seed, puzzle_data, solution_data, meta
     FROM fundraisely_puzzle_instances
     WHERE challenge_id = ? AND week_number = ?
     LIMIT 1`,
    [challengeId, weekNumber]
  );

  if (existing?.length) return existing[0];

  // Generate fresh
  const engine     = getEngine(puzzleType);
  const seed       = `${challengeId}-w${weekNumber}-${puzzleType}`;
  const instance   = engine.generate({ difficulty, seed });
  const instanceId = uuidv4(); // ← generate UUID before insert

  await database.connection.execute(
    `INSERT INTO fundraisely_puzzle_instances
       (id, challenge_id, club_id, week_number, puzzle_type, difficulty, seed, puzzle_data, solution_data, meta)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      instanceId,    // ← explicit UUID, not auto-increment
      challengeId,
      clubId,
      weekNumber,
      instance.puzzleType,
      instance.difficulty,
      instance.seed,
      JSON.stringify(instance.puzzleData),
      JSON.stringify(instance.solutionData),
      JSON.stringify(instance.meta ?? {}),
    ]
  );

  // Fetch back using the UUID we generated — no insertId needed
  const [rows] = await database.connection.execute(
    `SELECT id, puzzle_type, difficulty, seed, puzzle_data, solution_data, meta
     FROM fundraisely_puzzle_instances WHERE id = ? LIMIT 1`,
    [instanceId]
  );

  return rows[0];
}

/**
 * Generate a puzzle for a Puzzle Drop item.
 *
 * Sibling of generatePuzzleForWeek — same "generate once, reuse forever"
 * shape, same table, same engines. Keyed on (drop_room_id, item_number)
 * instead of (challenge_id, week_number); see the puzzle_drop_migration.sql
 * comments for why both column pairs can coexist safely on one table
 * (challenge_id/week_number are nullable now, this call never touches
 * them, so subscription rows and Drop rows never collide).
 *
 * Every buyer of the same Drop item gets the SAME instance — matches the
 * spec's design (§6): "generate the instance with a Drop-specific seed
 * ... store the resulting instance_id on the entitlement row." Called
 * once, at entitlement-confirmation time, from the purchase/confirm flow
 * — not on every puzzle GET the way the subscription's lazy week-unlock
 * pattern works, since a Drop item has no unlock gate to wait on.
 */
export async function generatePuzzleForDropItem({ dropRoomId, itemNumber, puzzleType, difficulty = 'medium', clubId }) {
  // Return existing instance if already generated for this drop+item
  const [existing] = await database.connection.execute(
    `SELECT id, puzzle_type, difficulty, seed, puzzle_data, solution_data, meta
     FROM fundraisely_puzzle_instances
     WHERE drop_room_id = ? AND item_number = ?
     LIMIT 1`,
    [dropRoomId, itemNumber]
  );

  if (existing?.length) return existing[0];

  // Generate fresh
  const engine     = getEngine(puzzleType);
  const seed       = `${dropRoomId}-item${itemNumber}-${puzzleType}`;
  const instance   = engine.generate({ difficulty, seed });
  const instanceId = uuidv4();

  await database.connection.execute(
    `INSERT INTO fundraisely_puzzle_instances
       (id, drop_room_id, club_id, item_number, puzzle_type, difficulty, seed, puzzle_data, solution_data, meta)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      instanceId,
      dropRoomId,
      clubId,
      itemNumber,
      instance.puzzleType,
      instance.difficulty,
      instance.seed,
      JSON.stringify(instance.puzzleData),
      JSON.stringify(instance.solutionData),
      JSON.stringify(instance.meta ?? {}),
    ]
  );

  const [rows] = await database.connection.execute(
    `SELECT id, puzzle_type, difficulty, seed, puzzle_data, solution_data, meta
     FROM fundraisely_puzzle_instances WHERE id = ? LIMIT 1`,
    [instanceId]
  );

  return rows[0];
}

/**
 * Strip solution_data before sending to client.
 * Call this on every GET response — never expose solutionData.
 */
export function getClientPuzzleData(instance) {
  return {
    id:         instance.id,
    puzzleType: instance.puzzle_type,
    difficulty: instance.difficulty,
    seed:       instance.seed,
    puzzleData: parseJsonField(instance.puzzle_data),
  };
}

/**
 * Safely parse a value that may be a JSON string, already-parsed object, or null.
 * MySQL JSON columns sometimes return strings depending on driver/version.
 */
function parseJsonField(value) {
  if (value === null || value === undefined) return {};
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return {}; }
  }
  if (typeof value === 'object') {
    const result = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = typeof v === 'string' && (v.startsWith('[') || v.startsWith('{'))
        ? (() => { try { return JSON.parse(v); } catch { return v; } })()
        : v;
    }
    return result;
  }
  return value;
}