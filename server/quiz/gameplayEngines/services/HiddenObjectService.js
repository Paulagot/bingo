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

  static pickPuzzle({ category = null, difficulty = null }, dbg = false) {
    const all = this.loadPuzzles(dbg);
    if (!all.length) return null;

    const cat = category ? norm(category) : null;
    const diff = difficulty ? norm(difficulty) : null;

    // strict
    let strict = all.filter((p) => {
      const pc = norm(p.category);
      const pd = norm(p.difficulty);
      return (cat ? pc === cat : true) && (diff ? pd === diff : true);
    });

    // fallback: difficulty only
    if (strict.length === 0 && diff) {
      strict = all.filter((p) => norm(p.difficulty) === diff);
      if (dbg) console.warn('[HiddenObjectService] fallback difficulty-only hit', strict.length);
    }

    // fallback: anything
    if (strict.length === 0) {
      strict = all;
      if (dbg) console.warn('[HiddenObjectService] fallback unfiltered hit', strict.length);
    }

    const picked = strict[Math.floor(Math.random() * strict.length)];
    return picked || null;
  }
}
