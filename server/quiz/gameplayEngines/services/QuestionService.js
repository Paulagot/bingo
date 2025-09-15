// server/quiz/gameplayEngines/services/QuestionService.js
// Updated to use combined_questions.json and prevent duplicate questions across entire quiz

import { loadQuestionsFromCombinedFile } from '../../quizRoomManager.js';
const debug = false;

export class QuestionService {
  /**
   * Load and filter questions for a round with fallback logic AND global duplicate prevention
   * Now uses combined_questions.json and tracks used questions globally
   */
  static loadAndFilterQuestions(roomId, roundType, category, difficulty, requiredCount, debug = false) {
    if (debug) {
      console.log(`[QuestionService] 🔍 Loading questions for round`);
      console.log(`[QuestionService] 📋 RoomId: ${roomId}, Type: ${roundType}, Category: ${category}, Difficulty: ${difficulty}`);
      console.log(`[QuestionService] 🎯 Need: ${requiredCount} questions`);
    }

    // Get all available questions (already filtered by used questions in room)
    let availableQuestions = loadQuestionsFromCombinedFile(roomId, category, difficulty, requiredCount);

    if (debug) {
      console.log(`[QuestionService] 📚 Available questions after global filter: ${availableQuestions.length}`);
    }

    // Fallback 1: Remove category filter if not enough questions
    if (availableQuestions.length < requiredCount && category) {
      if (debug) {
        console.warn(`[QuestionService] ⚠️ Only found ${availableQuestions.length} with category+difficulty; trying difficulty-only.`);
      }
      availableQuestions = loadQuestionsFromCombinedFile(roomId, null, difficulty, requiredCount);
    }

    // Fallback 2: Remove all filters if still not enough
    if (availableQuestions.length < requiredCount) {
      if (debug) {
        console.warn(`[QuestionService] ⚠️ Still not enough (${availableQuestions.length}). Using unfiltered questions.`);
      }
      availableQuestions = loadQuestionsFromCombinedFile(roomId, null, null, requiredCount);
    }

    // Shuffle and slice to required count
    const selectedQuestions = this.shuffleArray(availableQuestions).slice(0, requiredCount);

    if (debug) {
      console.log(`[QuestionService] ✅ Selected ${selectedQuestions.length} questions`);
      const actualBreakdown = selectedQuestions.reduce((acc, q) => {
        const cat = q.category || 'unknown';
        const diff = q.difficulty || 'unknown';
        const key = `${cat}/${diff}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      console.log(`[QuestionService] 📊 Selected question breakdown:`, actualBreakdown);
    }

    return selectedQuestions;
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   * Extracted from both engines (identical implementation)
   */
  static shuffleArray(array) {
    return array
      .map(value => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value);
  }

  /**
   * Validate question data structure
   * Ensures questions have required fields
   */
  static validateQuestionData(questions) {
    if (!Array.isArray(questions)) {
      return { valid: false, error: 'Questions must be an array' };
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.id) {
        return { valid: false, error: `Question at index ${i} missing id` };
      }
      if (!q.text) {
        return { valid: false, error: `Question ${q.id} missing text` };
      }
      if (q.correctAnswer === undefined || q.correctAnswer === null) {
        return { valid: false, error: `Question ${q.id} missing correctAnswer` };
      }
    }

    return { valid: true };
  }

  /**
   * Get round configuration for question loading
   * Extracts configuration logic used in both engines
   * Provides safe defaults when round definitions are missing or incomplete
   * 
   * @param {Object} room - The quiz room object
   * @param {number} roundIndex - Zero-based round index
   * @returns {Object} Configuration object with roundType, questionsPerRound, category, difficulty
   */
  static getRoundQuestionConfig(room, roundIndex) {
    if (debug) {
      console.log(`[QuestionService] 🔧 Getting config for round index ${roundIndex}`);
    }

    const roundDef = room.config.roundDefinitions?.[roundIndex];
    
    if (!roundDef) {
      if (debug) {
        console.warn(`[QuestionService] ⚠️ No round definition found at index ${roundIndex}, using defaults`);
      }
      return {
        roundType: 'general_trivia',
        questionsPerRound: 6,
        category: null,
        difficulty: null
      };
    }

    const config = {
      roundType: roundDef.roundType,
      questionsPerRound: roundDef.config?.questionsPerRound || 6,
      category: roundDef.category || null,
      difficulty: roundDef.difficulty || null
    };

    if (debug) {
      console.log(`[QuestionService] ✅ Round config extracted:`, config);
    }

    return config;
  }
}