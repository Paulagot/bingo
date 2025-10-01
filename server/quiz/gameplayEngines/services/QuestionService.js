// server/quiz/gameplayEngines/services/QuestionService.js
// Extended to support true_false.json for speed_round while preserving combined logic.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadQuestionsFromCombinedFile, getQuizRoom } from '../../quizRoomManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class QuestionService {
  /**
   * Load and filter questions with global de-dupe.
   * @param {string} roomId
   * @param {string} roundType
   * @param {string|null} category
   * @param {string|null} difficulty
   * @param {number} requiredCount
   * @param {boolean} dbg
   * @param {'combined'|'true_false'} source
   */
 static loadAndFilterQuestions(
  roomId,
  roundType,
  category,
  difficulty,
  requiredCount,
  dbg = false,
  source = 'combined'
) {
  const room = getQuizRoom(roomId);
  const roundIdx = (room?.currentRound ?? 1) - 1;
  const rd = room?.config?.roundDefinitions?.[roundIdx];

  // 🔁 If roundDef exists, it is the source of truth
  const effCategory    = rd?.category ?? (category ?? null);
  const effDifficulty  = rd?.difficulty ?? (difficulty ?? null);
  const effRequired    = rd?.config?.questionsPerRound ?? requiredCount ?? 6;

  if (dbg) {
    console.log('\n========== [QuestionService] loadAndFilterQuestions ==========');
    console.log('• Inputs (raw call):',
      { roomId, roundType, category, difficulty, requiredCount, source });
    console.log('• RoundDef (resolved):', {
      roundType: rd?.roundType,
      category: rd?.category ?? null,
      difficulty: rd?.difficulty ?? null,
      questionsPerRound: rd?.config?.questionsPerRound ?? null,
      pointsPerDifficulty: rd?.config?.pointsPerDifficulty ?? null,
    });
    console.log('• Effective filters:', {
      category: effCategory,
      difficulty: effDifficulty,
      requiredCount: effRequired,
    });
    console.log('• usedQuestionIds type/size:',
      room?.usedQuestionIds instanceof Set ? 'Set' : typeof room?.usedQuestionIds,
      room?.usedQuestionIds?.size ?? (Array.isArray(room?.usedQuestionIds) ? room.usedQuestionIds.length : 0)
    );
    console.log('• CurrentRound:', room?.currentRound, 'TotalRounds:', room?.config?.roundCount);
  }

  let availableQuestions =
    source === 'true_false'
      ? this.loadFromTrueFalseFile(roomId, effCategory, effDifficulty, effRequired, dbg)
      : loadQuestionsFromCombinedFile(roomId, effCategory, effDifficulty, effRequired);

  if (dbg) {
    console.log(`[QS] After initial load (${source}) → count=${availableQuestions.length}`);
    this._logSample(availableQuestions, dbg, 'initial');
  }

  // Fallback 1: relax category
  if (availableQuestions.length < effRequired && effCategory) {
    if (dbg) {
      console.warn(`[QS] Fallback #1 → not enough with category="${effCategory}". Trying difficulty-only…`);
    }
    availableQuestions =
      source === 'true_false'
        ? this.loadFromTrueFalseFile(roomId, null, effDifficulty, effRequired, dbg)
        : loadQuestionsFromCombinedFile(roomId, null, effDifficulty, effRequired);

    if (dbg) {
      console.log(`[QS] After fallback #1 → count=${availableQuestions.length}`);
      this._logSample(availableQuestions, dbg, 'fallback1');
    }
  }

  // Fallback 2: relax difficulty too
  if (availableQuestions.length < effRequired) {
    if (dbg) {
      console.warn('[QS] Fallback #2 → still short. Using unfiltered (no category/difficulty).');
    }
    availableQuestions =
      source === 'true_false'
        ? this.loadFromTrueFalseFile(roomId, null, null, effRequired, dbg)
        : loadQuestionsFromCombinedFile(roomId, null, null, effRequired);

    if (dbg) {
      console.log(`[QS] After fallback #2 → count=${availableQuestions.length}`);
      this._logSample(availableQuestions, dbg, 'fallback2');
    }
  }

  const selected = this.shuffleArray(availableQuestions).slice(0, effRequired);

  if (dbg) {
    console.log(`[QS] ✅ Selected ${selected.length} (requested ${effRequired})`);
    console.log('[QS] Selected IDs (first 10):', selected.slice(0, 10).map(q => q.id));
    console.log('===============================================================\n');
  }
  return selected;
}


  // true_false.json loader with global de-dupe using room.usedQuestionIds
  static loadFromTrueFalseFile(roomId, category = null, difficulty = null, requiredCount = null, dbg = false) {
    const filePath = path.join(__dirname, '../../../data/questions', 'true_false.json');
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) return [];

      const room = getQuizRoom(roomId);
      // Normalize used set
      let used = room?.usedQuestionIds;
      if (Array.isArray(used)) used = new Set(used);
      if (!(used instanceof Set)) used = new Set();

      // Pre-stats
      if (dbg) {
        const cats = new Set(parsed.map(q => (q.category || '').toLowerCase()));
        const diffs = new Set(parsed.map(q => (q.difficulty || '').toLowerCase()));
        console.log(`[QS:true_false] Source file: ${filePath}`);
        console.log(`[QS:true_false] Parsed total=${parsed.length} | categories=${[...cats].filter(Boolean)} | difficulties=${[...diffs].filter(Boolean)}`);
        console.log(`[QS:true_false] De-dupe: usedQuestionIds.size=${used.size}`);
        console.log(`[QS:true_false] Filters requested:`, { category, difficulty, requiredCount });
      }

      // De-dupe
      let list = parsed.filter(q => !used.has(q.id));
      if (dbg) console.log(`[QS:true_false] After de-dupe → ${list.length}`);

      // Filter by category/difficulty (case-insensitive)
      const norm = (s) => (s ?? '').toString().trim().toLowerCase();
      if (category) {
        const before = list.length;
        list = list.filter(q => norm(q.category) === norm(category));
        if (dbg) console.log(`[QS:true_false] Category filter "${category}" → ${before} → ${list.length}`);
      }
      if (difficulty) {
        const before = list.length;
        list = list.filter(q => norm(q.difficulty) === norm(difficulty));
        if (dbg) console.log(`[QS:true_false] Difficulty filter "${difficulty}" → ${before} → ${list.length}`);
      }

      if (dbg) {
        console.log(`[QS:true_false] Final filtered=${list.length} (required=${requiredCount ?? 'n/a'})`);
        QuestionService._logSample(list, dbg, 'true_false.filtered');
      }
      return list;
    } catch (e) {
      console.error(`[QuestionService] ❌ Failed to read true_false.json`, e.message);
      return [];
    }
  }

  static shuffleArray(array) {
    return array
      .map(value => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value);
  }
    static buildEmittableOptions(question) {
     const opts = Array.isArray(question.options) ? [...question.options] : [];
// ensure correct answer is present for MCQ questions
  const correct = question?.correctAnswer ?? question?.answer ?? question?.solution;
  if (correct != null && opts.length > 0 && !opts.includes(String(correct))) {
    opts.push(String(correct));
  }
    return QuestionService.shuffleArray(opts);
  }

  static validateQuestionData(questions) {
    if (!Array.isArray(questions)) return { valid: false, error: 'Questions must be an array' };
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.id) return { valid: false, error: `Question at index ${i} missing id` };
      if (!q.text) return { valid: false, error: `Question ${q.id} missing text` };
      if (q.correctAnswer == null) return { valid: false, error: `Question ${q.id} missing correctAnswer` };
    }
    return { valid: true };
  }

  

  static getRoundQuestionConfig(room, roundIndex) {
    const roundDef = room.config.roundDefinitions?.[roundIndex];
    if (!roundDef) {
      return { roundType: 'general_trivia', questionsPerRound: 6, category: null, difficulty: null };
    }
    return {
      roundType: roundDef.roundType,
      questionsPerRound: roundDef.config?.questionsPerRound || 6,
      category: roundDef.category || null,
      difficulty: roundDef.difficulty || null
    };
  }

  

  // --- helpers (debug only) ---
  static _logSample(list, dbg, label) {
    if (!dbg || !list?.length) return;
    const sample = list.slice(0, 5).map(q => ({
      id: q.id,
      cat: q.category ?? null,
      diff: q.difficulty ?? null,
    }));
    console.log(`[QS] Sample (${label}):`, sample);
  }
}

