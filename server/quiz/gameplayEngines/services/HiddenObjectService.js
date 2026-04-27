// server/quiz/gameplayEngines/services/HiddenObjectService.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const norm = (s) => (s ?? '').toString().trim().toLowerCase();

export class HiddenObjectService {
  static loadPuzzles(dbg = false) {
    const filePath = path.join(
      __dirname,
      '../../../data/questions',
      'hidden_object_puzzles.json'
    );

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        if (dbg) {
          console.warn('[HiddenObjectService] puzzles json is not an array');
        }
        return [];
      }

      return parsed;
    } catch (err) {
      console.error('[HiddenObjectService] Failed to load puzzles:', {
        filePath,
        error: err?.message || err,
      });
      return [];
    }
  }

  /**
   * Pick a hidden-object puzzle.
   *
   * Current gameplay rule:
   * - category "all", null, undefined, or empty string means use ALL puzzles.
   * - category-specific filtering is still supported for future use.
   * - difficulty is intentionally ignored here.
   *   Item difficulty is handled inside hiddenObjectEngine for scoring/UI.
   */
  static pickPuzzle({ category = null, difficulty = null } = {}, dbg = false) {
    const all = this.loadPuzzles(dbg);

    if (!all.length) {
      if (dbg) {
        console.warn('[HiddenObjectService] No puzzles loaded');
      }
      return null;
    }

    const cat = category ? norm(category) : null;

    let filtered;

    // ✅ Official support for "all"
    // This replaces the old accidental fallback behaviour where "all"
    // failed category matching and then fell back to every puzzle.
    if (!cat || cat === 'all') {
      filtered = all;

      if (dbg) {
        console.log('[HiddenObjectService] Using all puzzle categories:', {
          requestedCategory: category,
          totalPuzzles: filtered.length,
        });
      }
    } else {
      filtered = all.filter((p) => norm(p.category) === cat);

      if (filtered.length === 0) {
        filtered = all;

        if (dbg) {
          console.warn(
            '[HiddenObjectService] No category match, falling back to all puzzles:',
            {
              requestedCategory: category,
              normalizedCategory: cat,
              totalPuzzles: all.length,
            }
          );
        }
      }
    }

    const picked = filtered[Math.floor(Math.random() * filtered.length)] || null;

    if (dbg && picked) {
      const items = Array.isArray(picked.items) ? picked.items : [];

      const easyCount = items.filter(
        (item) => norm(item.difficulty || 'easy') === 'easy'
      ).length;

      const mediumCount = items.filter(
        (item) => norm(item.difficulty) === 'medium'
      ).length;

      const hardCount = items.filter(
        (item) => norm(item.difficulty) === 'hard'
      ).length;

      console.log(
        `[HiddenObjectService] Picked puzzle ${picked.id} (${picked.category}):`,
        {
          requestedCategory: category,
          effectiveCategoryMode: !cat || cat === 'all' ? 'all' : cat,
          difficultyIgnored: difficulty || null,
          totalItems: items.length,
          easy: easyCount,
          medium: mediumCount,
          hard: hardCount,
        }
      );
    }

    return picked;
  }
}
