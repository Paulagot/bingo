// src/components/puzzles/pages/ChallengeCreatePage.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { challengeService, type ScheduleEntry, type Currency } from '../services/ChallengeService';

const PUZZLE_TYPES = [
  { value: 'anagram',           label: 'Anagram' },
  { value: 'sequenceOrdering',  label: 'Sequence Ordering' },
  { value: 'matchPairs',        label: 'Match Pairs' },
  { value: 'wordSearch',        label: 'Word Search' },
  { value: 'slidingTile',       label: 'Sliding Tile' },
  { value: 'sudoku',            label: 'Sudoku' },
  { value: 'patternCompletion', label: 'Pattern Completion' },
  { value: 'wordLadder',        label: 'Word Ladder' },
  { value: 'cryptogram',        label: 'Cryptogram' },
  { value: 'numberPath',        label: 'Number Path' },
  { value: 'towersOfHanoi',     label: 'Towers of Hanoi' },
  { value: 'nonogram',          label: 'Nonogram' },
  { value: 'memoryPairs',       label: 'Memory Pairs' },
];

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

const CURRENCIES: { value: Currency; label: string; symbol: string }[] = [
  { value: 'eur', label: 'Euro',            symbol: '€' },
  { value: 'gbp', label: 'Sterling',        symbol: '£' },
  { value: 'usd', label: 'US Dollar',       symbol: '$' },
];

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export default function ChallengeCreatePage() {
  const navigate = useNavigate();

  // Details
  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [totalWeeks, setTotalWeeks]   = useState(4);
  const [startsAt, setStartsAt]       = useState(todayInputValue());

  // Pricing
  const [isFree, setIsFree]               = useState(false);
  const [priceInput, setPriceInput]       = useState('');   // human-readable e.g. "3.00"
  const [currency, setCurrency]           = useState<Currency>('eur');

  // Schedule
  const [schedule, setSchedule] = useState<ScheduleEntry[]>(
    Array.from({ length: 4 }, (_, i) => ({
      week:       i + 1,
      puzzleType: 'anagram',
      difficulty: 'medium',
    }))
  );

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const currencySymbol = CURRENCIES.find(c => c.value === currency)?.symbol ?? '€';

  function handleTotalWeeksChange(n: number) {
    const clamped = Math.max(1, Math.min(52, n));
    setTotalWeeks(clamped);
    setSchedule(prev => {
      const next = [...prev];
      while (next.length < clamped) {
        next.push({ week: next.length + 1, puzzleType: 'anagram', difficulty: 'medium' });
      }
      return next.slice(0, clamped);
    });
  }

  function updateWeek(index: number, field: keyof ScheduleEntry, value: string) {
    setSchedule(prev =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Convert price string to cents/pence
    const parsedPrice = parseFloat(priceInput);
    if (!isFree && (isNaN(parsedPrice) || parsedPrice <= 0)) {
      setError('Please enter a valid price.');
      return;
    }
    const weeklyPrice = isFree ? undefined : Math.round(parsedPrice * 100);

    setSaving(true);
    try {
      const challenge = await challengeService.createChallenge({
        title,
        description: description || undefined,
        totalWeeks,
        startsAt: new Date(startsAt).toISOString(),
        puzzleSchedule: schedule,
        isFree,
        weeklyPrice,
        currency: isFree ? undefined : currency,
      });
      navigate(`/challenges/${challenge.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/challenges')}
        className="text-sm text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1"
      >
        ← Back to challenges
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Puzzle Challenge</h1>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Details ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              placeholder="e.g. Summer Brain Teaser Challenge"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional description shown to players"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input type="datetime-local"
                value={startsAt}
                onChange={e => setStartsAt(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Weeks *</label>
              <input
                type="number"
                min={1}
                max={52}
                value={totalWeeks}
                onChange={e => handleTotalWeeksChange(parseInt(e.target.value, 10) || 1)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* ── Pricing ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Pricing</h2>

       {/* Free toggle */}
<label className="flex items-center gap-3 cursor-pointer select-none">
  <input
    type="checkbox"
    checked={isFree}
    onChange={e => setIsFree(e.target.checked)}
    className="sr-only"
  />
  <div className={`relative w-10 h-6 rounded-full transition-colors ${isFree ? 'bg-indigo-600' : 'bg-gray-300'}`}>
    <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isFree ? 'translate-x-4' : 'translate-x-0'}`} />
  </div>
  <span className="text-sm font-medium text-gray-700">
    {isFree ? 'Free challenge — no payment required' : 'Paid challenge'}
  </span>
</label>

          {/* Price + currency — only shown when not free */}
          {!isFree && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weekly Price *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    min="0.50"
                    step="0.50"
                    value={priceInput}
                    onChange={e => setPriceInput(e.target.value)}
                    required={!isFree}
                    placeholder="3.00"
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency *</label>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value as Currency)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {CURRENCIES.map(c => (
                    <option key={c.value} value={c.value}>
                      {c.symbol} {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Summary line */}
          {!isFree && priceInput && !isNaN(parseFloat(priceInput)) && (
            <p className="text-xs text-gray-400">
              Players will be charged{' '}
              <span className="font-medium text-gray-600">
                {currencySymbol}{parseFloat(priceInput).toFixed(2)}/week
              </span>{' '}
              for {totalWeeks} week{totalWeeks !== 1 ? 's' : ''} —{' '}
              <span className="font-medium text-gray-600">
                {currencySymbol}{(parseFloat(priceInput) * totalWeeks).toFixed(2)} total
              </span>
            </p>
          )}
        </div>

        {/* ── Week schedule ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Week Schedule</h2>
          <div className="space-y-2">
            {schedule.map((row, i) => (
              <div key={row.week} className="grid grid-cols-[48px_1fr_1fr] gap-3 items-center">
                <span className="text-sm font-medium text-gray-500 text-right">W{row.week}</span>
                <select
                  value={row.puzzleType}
                  onChange={e => updateWeek(i, 'puzzleType', e.target.value)}
                  className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {PUZZLE_TYPES.map(pt => (
                    <option key={pt.value} value={pt.value}>{pt.label}</option>
                  ))}
                </select>
                <select
                  value={row.difficulty}
                  onChange={e => updateWeek(i, 'difficulty', e.target.value)}
                  className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {DIFFICULTIES.map(d => (
                    <option key={d} value={d}>
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create Challenge'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/challenges')}
            className="px-4 py-2.5 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}