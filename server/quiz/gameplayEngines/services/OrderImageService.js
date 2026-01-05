// server/quiz/gameplayEngines/services/OrderImageService.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getQuizRoom } from '../../quizRoomManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const debug = false;

export class OrderImageService {
  /**
   * Load and filter order_image questions from JSON file
   * SMART FALLBACK: Never allows duplicates - instead broadens search to other categories/difficulties
   * @param {string} roomId - Room ID for de-duplication
   * @param {string|null} category - Category filter (will be relaxed if needed)
   * @param {string|null} difficulty - Difficulty filter (will be relaxed if needed)
   * @param {number} requiredCount - Number of questions needed
   * @returns {Array} Filtered and shuffled questions
   */
  static loadQuestions(roomId, category = null, difficulty = null, requiredCount = 6) {
    const filePath = path.join(__dirname, '../../../data/questions', 'order_image.json');
    
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      
      if (!Array.isArray(parsed) || parsed.length === 0) {
        console.error('[OrderImageService] ❌ No questions found in order_image.json');
        return [];
      }

      const room = getQuizRoom(roomId);
      let used = room?.usedQuestionIds;
      if (Array.isArray(used)) used = new Set(used);
      if (!(used instanceof Set)) used = new Set();

      if (debug) {
        console.log(`[OrderImageService] 📊 Loaded ${parsed.length} total questions`);
        console.log(`[OrderImageService] 🔍 Filters: category="${category}", difficulty="${difficulty}"`);
        console.log(`[OrderImageService] 🔒 De-dupe: ${used.size} used question IDs`);
      }

      // ✅ STEP 1: De-duplicate - NEVER allow reuse
      let availableQuestions = parsed.filter(q => !used.has(q.id));
      
      if (debug) {
        console.log(`[OrderImageService] ✅ After de-dupe: ${availableQuestions.length} unused questions`);
      }

      // ✅ CRITICAL: Validate all questions have exactly 4 images BEFORE filtering
      availableQuestions = availableQuestions.filter(q => {
        if (!Array.isArray(q.images) || q.images.length !== 4) {
          console.warn(`[OrderImageService] ⚠️ Question ${q.id} has ${q.images?.length || 0} images (expected 4), skipping`);
          return false;
        }
        return true;
      });

      if (availableQuestions.length === 0) {
        throw new Error('No valid unused order_image questions available. All questions have been used in this quiz.');
      }

      const norm = (s) => (s ?? '').toString().trim().toLowerCase();
      
      // ✅ STEP 2: Try with BOTH category AND difficulty filters
      let filteredQuestions = availableQuestions;
      
      if (category && difficulty) {
        filteredQuestions = availableQuestions.filter(q => 
          norm(q.category) === norm(category) && 
          norm(q.difficulty) === norm(difficulty)
        );
        
        if (debug) {
          console.log(`[OrderImageService] 🎯 Both filters (${category}, ${difficulty}): ${filteredQuestions.length} questions`);
        }
        
        if (filteredQuestions.length >= requiredCount) {
          // Success! We have enough with both filters
          const shuffled = this.shuffleArray(filteredQuestions);
          const selected = shuffled.slice(0, requiredCount);
          
          if (debug) {
            console.log(`[OrderImageService] ✅ Selected ${selected.length} questions with both filters`);
          }
          
          return selected;
        }
      }
      
      // ✅ STEP 3: Try with ONLY category filter (relax difficulty)
      if (category) {
        const categoryOnly = availableQuestions.filter(q => norm(q.category) === norm(category));
        
        if (debug) {
          console.log(`[OrderImageService] 📁 Category only (${category}): ${categoryOnly.length} questions`);
        }
        
        if (categoryOnly.length >= requiredCount) {
          console.warn(`[OrderImageService] ⚠️ Relaxed difficulty filter to get enough questions from category "${category}"`);
          const shuffled = this.shuffleArray(categoryOnly);
          const selected = shuffled.slice(0, requiredCount);
          
          if (debug) {
            console.log(`[OrderImageService] ✅ Selected ${selected.length} questions from category "${category}" (mixed difficulties)`);
          }
          
          return selected;
        }
        
        // Not enough even with category only - we'll need to pull from other categories
        if (categoryOnly.length > 0) {
          filteredQuestions = categoryOnly; // Start with what we have from this category
          console.warn(`[OrderImageService] ⚠️ Only ${categoryOnly.length} questions in category "${category}", will supplement from other categories`);
        }
      }
      
      // ✅ STEP 4: Try with ONLY difficulty filter (relax category)
      if (difficulty) {
        const difficultyOnly = availableQuestions.filter(q => norm(q.difficulty) === norm(difficulty));
        
        if (debug) {
          console.log(`[OrderImageService] 🎯 Difficulty only (${difficulty}): ${difficultyOnly.length} questions`);
        }
        
        if (difficultyOnly.length >= requiredCount) {
          console.warn(`[OrderImageService] ⚠️ Relaxed category filter to get enough questions at "${difficulty}" difficulty`);
          const shuffled = this.shuffleArray(difficultyOnly);
          const selected = shuffled.slice(0, requiredCount);
          
          if (debug) {
            console.log(`[OrderImageService] ✅ Selected ${selected.length} questions at "${difficulty}" difficulty (mixed categories)`);
          }
          
          return selected;
        }
      }
      
      // ✅ STEP 5: Use ALL available questions (no filters)
      console.warn(`[OrderImageService] ⚠️ Filters too restrictive. Using all ${availableQuestions.length} available questions (mixed categories and difficulties)`);
      
      if (availableQuestions.length < requiredCount) {
        console.warn(
          `[OrderImageService] ⚠️ Only ${availableQuestions.length} unused questions available (requested ${requiredCount}). ` +
          `Using all ${availableQuestions.length} available questions. NO DUPLICATES ALLOWED.`
        );
      }
      
      const shuffled = this.shuffleArray(availableQuestions);
      const selected = shuffled.slice(0, Math.min(requiredCount, shuffled.length));

      if (debug) {
        console.log(`[OrderImageService] ✅ Final selection: ${selected.length} questions`);
        selected.forEach((q, i) => {
          console.log(`  ${i + 1}. ${q.id} (${q.category}, ${q.difficulty}) - ${q.prompt}`);
        });
      }

      return selected;
    } catch (error) {
      console.error('[OrderImageService] ❌ Failed to load order_image.json:', error.message);
      return [];
    }
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  static shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Build emittable question (shuffle images so they're not in correct order)
   * @param {Object} question - Original question with images in any order
   * @returns {Object} Question with shuffled images
   */
  static buildEmittableQuestion(question) {
    if (!question || !Array.isArray(question.images)) {
      console.error('[OrderImageService] ❌ Invalid question structure');
      return null;
    }

    // Shuffle the images array
    const shuffledImages = this.shuffleArray(question.images);

    if (debug) {
      console.log('🔍 BEFORE shuffle:', question.images.map(i => `${i.label}(order:${i.order})`));
      console.log('🔀 AFTER shuffle:', shuffledImages.map(i => `${i.label}(order:${i.order})`));
    }

    return {
      id: question.id,
      prompt: question.prompt,
      difficulty: question.difficulty,
      category: question.category,
      images: shuffledImages.map(img => ({
        id: img.id,
        label: img.label,
        imageUrl: img.imageUrl
        // ⚠️ Do NOT send 'order' field to client - that's the answer!
      }))
    };
  }

  /**
   * Validate player's answer
   * @param {Object} question - Original question with correct order
   * @param {Array<string>} playerOrder - Array of image IDs in player's submitted order
   * @returns {boolean} True if order is exactly correct
   */
  static validateAnswer(question, playerOrder) {
    if (!question || !Array.isArray(question.images) || !Array.isArray(playerOrder)) {
      console.error('[OrderImageService] ❌ Invalid validation inputs');
      return false;
    }

    if (playerOrder.length !== question.images.length) {
      if (debug) {
        console.log(`[OrderImageService] ❌ Length mismatch: ${playerOrder.length} vs ${question.images.length}`);
      }
      return false;
    }

    // Create a map of imageId → correct order position
    const correctOrderMap = {};
    question.images.forEach(img => {
      correctOrderMap[img.id] = img.order;
    });

    // Check if player's order matches correct order
    for (let i = 0; i < playerOrder.length; i++) {
      const imageId = playerOrder[i];
      const correctPosition = correctOrderMap[imageId];
      
      // Position should be i+1 (since order is 1-indexed)
      if (correctPosition !== i + 1) {
        if (debug) {
          console.log(`[OrderImageService] ❌ Image ${imageId} at position ${i + 1}, should be at ${correctPosition}`);
        }
        return false;
      }
    }

    if (debug) {
      console.log('[OrderImageService] ✅ Order is correct!');
    }
    return true;
  }

  /**
   * Get the correct order for a question (for review phase)
   * @param {Object} question - Original question
   * @returns {Array} Images sorted by correct order
   */
  static getCorrectOrder(question) {
    if (!question || !Array.isArray(question.images)) {
      return [];
    }

    return [...question.images].sort((a, b) => a.order - b.order);
  }
}