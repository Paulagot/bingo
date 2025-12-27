// server/quiz/gameplayEngines/services/HiddenObjectService.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const norm = (s) => (s ?? '').toString().trim().toLowerCase();

export class HiddenObjectService {
  static loadPuzzles(dbg = false) {
    const filePath = path.join(__dirname, '../../../data/questions', 'hidden_object_puzzles.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      if (dbg) console.warn('[HiddenObjectService] puzzles json not an array');
      return [];
    }
    return parsed;
  }

  /**
   * ✅ UPDATED: Pick puzzle by CATEGORY only
   * Difficulty filtering happens at the ITEM level in hiddenObjectEngine
   */
  static pickPuzzle({ category = null, difficulty = null }, dbg = false) {
    const all = this.loadPuzzles(dbg);
    if (!all.length) return null;

    const cat = category ? norm(category) : null;

    // ✅ Filter by category only (ignore difficulty parameter)
    let filtered = cat 
      ? all.filter((p) => norm(p.category) === cat)
      : all;

    // Fallback: if no category matches, use all puzzles
    if (filtered.length === 0) {
      filtered = all;
      if (dbg) console.warn('[HiddenObjectService] No category match, using all puzzles');
    }

    // ✅ Random selection from filtered puzzles
    const picked = filtered[Math.floor(Math.random() * filtered.length)];
    
    if (dbg && picked) {
      // Count items by difficulty for logging
      const easyCount = (picked.items || []).filter(i => norm(i.difficulty) === 'easy').length;
      const medCount = (picked.items || []).filter(i => norm(i.difficulty) === 'medium').length;
      const hardCount = (picked.items || []).filter(i => norm(i.difficulty) === 'hard').length;
      
      console.log(`[HiddenObjectService] Picked puzzle ${picked.id} (${picked.category}):`, {
        totalItems: picked.items?.length || 0,
        easy: easyCount,
        medium: medCount,
        hard: hardCount
      });
    }
    
    return picked || null;
  }
}
