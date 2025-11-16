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
  const effCategory   = rd?.category ?? (category ?? null);
  const effDifficulty = rd?.difficulty ?? (difficulty ?? null);
  const effRequired   = rd?.config?.questionsPerRound ?? requiredCount ?? 6;

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

  // Helper to call the right loader for each filter combo
  const loader = (cat, diff) =>
    source === 'true_false'
      ? this.loadFromTrueFalseFile(roomId, cat, diff, effRequired, dbg)
      : loadQuestionsFromCombinedFile(roomId, cat, diff, effRequired);

  const selected = [];
  const selectedIds = new Set();

  // 1) STRICT: category + difficulty
  let strict = loader(effCategory, effDifficulty);

  if (dbg) {
    console.log(`[QS] Initial strict load (${source}) → count=${strict.length}`, {
      category: effCategory,
      difficulty: effDifficulty,
    });
    this._logSample(strict, dbg, 'strict');
  }

  if (strict.length >= effRequired) {
    // We have enough with full criteria: randomly pick from those and return.
    const picked = this.shuffleArray(strict).slice(0, effRequired);
    if (dbg) {
      console.log(`[QS] ✅ Enough strict matches. Returning ${picked.length} without using fallbacks.`);
      console.log('===============================================================\n');
    }
    return picked;
  }

  // Use ALL strict matches
  strict.forEach(q => {
    selected.push(q);
    if (q?.id != null) selectedIds.add(q.id);
  });

  let remaining = effRequired - selected.length;

  // 2) FALLBACK #1: difficulty-only (category relaxed)
  if (remaining > 0 && effCategory) {
    if (dbg) {
      console.warn(`[QS] Fallback #1 → not enough with category="${effCategory}". Topping up with difficulty-only…`);
    }
    let fb1 = loader(null, effDifficulty);

    // Remove any that are already selected in this round
    fb1 = fb1.filter(q => !selectedIds.has(q.id));

    if (dbg) {
      console.log(`[QS] Fallback #1 pool size before shuffle=${fb1.length}`);
      this._logSample(fb1, dbg, 'fallback1.pool');
    }

    if (fb1.length > 0) {
      const shuffledFb1 = this.shuffleArray(fb1);
      const toTake = shuffledFb1.slice(0, remaining);
      toTake.forEach(q => {
        selected.push(q);
        if (q?.id != null) selectedIds.add(q.id);
      });
      remaining = effRequired - selected.length;

      if (dbg) {
        console.log(`[QS] After fallback #1 top-up → selected=${selected.length}, remaining=${remaining}`);
      }
    }
  }

  // 3) FALLBACK #2: no category or difficulty (completely unfiltered)
  if (remaining > 0) {
    if (dbg) {
      console.warn('[QS] Fallback #2 → still short. Topping up from unfiltered set (no category/difficulty).');
    }
    let fb2 = loader(null, null);

    // Remove any already selected this round
    fb2 = fb2.filter(q => !selectedIds.has(q.id));

    if (dbg) {
      console.log(`[QS] Fallback #2 pool size before shuffle=${fb2.length}`);
      this._logSample(fb2, dbg, 'fallback2.pool');
    }

    if (fb2.length > 0) {
      const shuffledFb2 = this.shuffleArray(fb2);
      const toTake = shuffledFb2.slice(0, remaining);
      toTake.forEach(q => {
        selected.push(q);
        if (q?.id != null) selectedIds.add(q.id);
      });
      remaining = effRequired - selected.length;

      if (dbg) {
        console.log(`[QS] After fallback #2 top-up → selected=${selected.length}, remaining=${remaining}`);
      }
    }
  }

  // 4) Final sanity + shuffle
  if (dbg) {
    if (selected.length < effRequired) {
      console.warn(
        `[QS] ⚠️ Only ${selected.length} questions available after all fallbacks (requested ${effRequired}).`
      );
    }
    console.log(`[QS] ✅ Final selected count=${selected.length} (requested ${effRequired})`);
    console.log('[QS] Selected IDs (first 10):', selected.slice(0, 10).map(q => q.id));
    console.log('===============================================================\n');
  }

  // We can shuffle the final list so strict vs fallback ordering is random in the UI
  return this.shuffleArray(selected);
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

