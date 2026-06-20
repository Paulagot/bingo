// src/components/puzzles/pages/ChallengeCreatePage.tsx

import { type FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  challengeService,
  type Currency,
  type ScheduleEntry,
} from '../services/ChallengeService';
import PuzzlePageShell from '../ui/PuzzlePageShell';
import PuzzlePrimaryButton from '../ui/PuzzlePrimaryButton';
import PuzzleStatPill from '../ui/PuzzleStatPill';

const PUZZLE_TYPES = [
  { value: 'anagram', label: 'Anagram', emoji: '🔤' },
  { value: 'sequenceOrdering', label: 'Sequence Ordering', emoji: '🔢' },
  { value: 'matchPairs', label: 'Match Pairs', emoji: '🧩' },
  { value: 'wordSearch', label: 'Word Search', emoji: '🔎' },
  { value: 'slidingTile', label: 'Sliding Tile', emoji: '🧱' },
  { value: 'sudoku', label: 'Sudoku', emoji: '9️⃣' },
  { value: 'patternCompletion', label: 'Pattern Completion', emoji: '◼️' },
  { value: 'wordLadder', label: 'Word Ladder', emoji: '🪜' },
  { value: 'cryptogram', label: 'Cryptogram', emoji: '🔐' },
  { value: 'numberPath', label: 'Number Path', emoji: '〰️' },
  { value: 'towersOfHanoi', label: 'Towers of Hanoi', emoji: '🗼' },
  { value: 'nonogram', label: 'Nonogram', emoji: '⬛' },
  { value: 'memoryPairs', label: 'Memory Pairs', emoji: '🎴' },
] as const;

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

const CURRENCIES: { value: Currency; label: string; symbol: string }[] = [
  { value: 'eur', label: 'Euro', symbol: '€' },
  { value: 'gbp', label: 'Sterling', symbol: '£' },
  { value: 'usd', label: 'US Dollar', symbol: '$' },
];

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function getPuzzleLabel(value: string) {
  return PUZZLE_TYPES.find(type => type.value === value)?.label ?? value;
}

function getPuzzleEmoji(value: string) {
  return PUZZLE_TYPES.find(type => type.value === value)?.emoji ?? '🧩';
}

export default function ChallengeCreatePage() {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [totalWeeks, setTotalWeeks] = useState(4);
  const [startsAt, setStartsAt] = useState(todayInputValue());

  const [isFree, setIsFree] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [currency, setCurrency] = useState<Currency>('eur');

  const [schedule, setSchedule] = useState<ScheduleEntry[]>(
    Array.from({ length: 4 }, (_, i) => ({
      week: i + 1,
      puzzleType: 'anagram',
      difficulty: 'medium',
    }))
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

 const currencySymbol =
  CURRENCIES.find(c => c.value === currency)?.symbol ?? '€';


  const parsedPrice = parseFloat(priceInput);

  const totalPriceLabel = useMemo(() => {
    if (isFree) return 'Free';
    if (!priceInput || isNaN(parsedPrice)) return 'Set price';

    return `${currencySymbol}${(parsedPrice * totalWeeks).toFixed(2)} total`;
  }, [currencySymbol, isFree, parsedPrice, priceInput, totalWeeks]);

  const weeklyPriceLabel = useMemo(() => {
    if (isFree) return 'Free access';
    if (!priceInput || isNaN(parsedPrice)) return 'Not set';

    return `${currencySymbol}${parsedPrice.toFixed(2)}/week`;
  }, [currencySymbol, isFree, parsedPrice, priceInput]);

  function handleTotalWeeksChange(n: number) {
    const clamped = Math.max(1, Math.min(52, n));

    setTotalWeeks(clamped);

    setSchedule(prev => {
      const next = [...prev];

      while (next.length < clamped) {
        next.push({
          week: next.length + 1,
          puzzleType: 'anagram',
          difficulty: 'medium',
        });
      }

      return next.slice(0, clamped);
    });
  }

  function updateWeek(index: number, field: keyof ScheduleEntry, value: string) {
    setSchedule(prev =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const nextParsedPrice = parseFloat(priceInput);

    if (!isFree && (isNaN(nextParsedPrice) || nextParsedPrice <= 0)) {
      setError('Please enter a valid weekly price.');
      return;
    }

    const weeklyPrice = isFree ? undefined : Math.round(nextParsedPrice * 100);

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
    <PuzzlePageShell
      rightHeaderContent={
        <button
          type="button"
          onClick={() => navigate('/challenges')}
          className="inline-flex items-center justify-center rounded-full border border-[#D8D1C4] bg-white px-5 py-2.5 text-sm font-semibold text-[#071A44] shadow-sm transition hover:bg-[#F8F5EF]"
        >
          ← Back to challenges
        </button>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-[36px] border border-[#E8E0D3] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#E36B2C]">
                Create challenge
              </p>

              <h1 className="font-serif text-4xl leading-tight text-[#071A44] sm:text-5xl">
                Build a weekly puzzle fundraiser
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#5F5A54]">
                Set the challenge details, choose the weekly puzzle mix, and
                decide whether this is free or paid for supporters.
              </p>
            </div>

            <div className="rounded-[28px] border border-[#E8E0D3] bg-[#FBF8F3] p-5">
              <p className="text-sm font-semibold text-[#071A44]">
                Challenge preview
              </p>

              <p className="mt-1 max-w-xs text-sm text-[#6E6A63]">
                {title || 'Your challenge title will appear here.'}
              </p>

              <PuzzlePrimaryButton
                type="submit"
                disabled={saving}
                className="mt-4"
              >
                {saving ? 'Creating…' : 'Create challenge →'}
              </PuzzlePrimaryButton>
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PuzzleStatPill
              icon={<span>🗓️</span>}
              label="Weeks"
              value={`${totalWeeks}`}
            />

            <PuzzleStatPill
              icon={<span>⭐</span>}
              label="Access"
              value={isFree ? 'Free' : 'Paid'}
            />

            <PuzzleStatPill
              icon={<span>💳</span>}
              label="Weekly price"
              value={weeklyPriceLabel}
            />

            <PuzzleStatPill
              icon={<span>🧾</span>}
              label="Total supporter cost"
              value={totalPriceLabel}
            />
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <main className="space-y-6">
            <section className="rounded-[36px] border border-[#E8E0D3] bg-white p-6 shadow-sm sm:p-8">
              <SectionHeader
                eyebrow="Step 1"
                title="Challenge details"
                text="These details are shown to players when they join the puzzle challenge."
              />

              <div className="mt-6 space-y-5">
                <div>
                  <label
                    htmlFor="challenge-title"
                    className="mb-1.5 block text-sm font-semibold text-[#071A44]"
                  >
                    Title *
                  </label>

                  <input
                    id="challenge-title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                    placeholder="e.g. Summer Brain Teaser Challenge"
                    className="w-full rounded-2xl border border-[#D8D1C4] bg-[#FBF8F3] px-4 py-3 text-sm text-[#071A44] outline-none transition placeholder:text-[#A39C91] focus:border-[#157F85] focus:bg-white focus:ring-4 focus:ring-[#157F85]/10"
                  />
                </div>

                <div>
                  <label
                    htmlFor="challenge-description"
                    className="mb-1.5 block text-sm font-semibold text-[#071A44]"
                  >
                    Description
                  </label>

                  <textarea
                    id="challenge-description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Optional description shown to players"
                    className="w-full resize-none rounded-2xl border border-[#D8D1C4] bg-[#FBF8F3] px-4 py-3 text-sm text-[#071A44] outline-none transition placeholder:text-[#A39C91] focus:border-[#157F85] focus:bg-white focus:ring-4 focus:ring-[#157F85]/10"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="challenge-start"
                      className="mb-1.5 block text-sm font-semibold text-[#071A44]"
                    >
                      Start date *
                    </label>

                    <input
                      id="challenge-start"
                      type="datetime-local"
                      value={startsAt}
                      onChange={e => setStartsAt(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-[#D8D1C4] bg-[#FBF8F3] px-4 py-3 text-sm text-[#071A44] outline-none transition focus:border-[#157F85] focus:bg-white focus:ring-4 focus:ring-[#157F85]/10"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="challenge-weeks"
                      className="mb-1.5 block text-sm font-semibold text-[#071A44]"
                    >
                      Total weeks *
                    </label>

                    <input
                      id="challenge-weeks"
                      type="number"
                      min={1}
                      max={52}
                      value={totalWeeks}
                      onChange={e =>
                        handleTotalWeeksChange(parseInt(e.target.value, 10) || 1)
                      }
                      required
                      className="w-full rounded-2xl border border-[#D8D1C4] bg-[#FBF8F3] px-4 py-3 text-sm text-[#071A44] outline-none transition focus:border-[#157F85] focus:bg-white focus:ring-4 focus:ring-[#157F85]/10"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[36px] border border-[#E8E0D3] bg-white p-6 shadow-sm sm:p-8">
              <SectionHeader
                eyebrow="Step 2"
                title="Pricing"
                text="Choose whether supporters join for free or pay a weekly challenge fee."
              />

              <div className="mt-6 space-y-5">
                <label className="flex cursor-pointer items-center justify-between gap-4 rounded-[24px] border border-[#E8E0D3] bg-[#FBF8F3] p-5">
                  <div>
                    <p className="text-sm font-semibold text-[#071A44]">
                      {isFree ? 'Free challenge' : 'Paid challenge'}
                    </p>

                    <p className="mt-1 text-sm text-[#6E6A63]">
                      {isFree
                        ? 'Players can join without payment.'
                        : 'Players are charged a weekly price.'}
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={isFree}
                    onChange={e => setIsFree(e.target.checked)}
                    className="sr-only"
                  />

                  <div
                    className={`relative h-7 w-12 rounded-full transition ${
                      isFree ? 'bg-[#157F85]' : 'bg-[#D8D1C4]'
                    }`}
                  >
                    <span
                      className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                        isFree ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </label>

                {!isFree && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="weekly-price"
                        className="mb-1.5 block text-sm font-semibold text-[#071A44]"
                      >
                        Weekly price *
                      </label>

                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#6E6A63]">
                          {currencySymbol}
                        </span>

                        <input
                          id="weekly-price"
                          type="number"
                          min="0.50"
                          step="0.50"
                          value={priceInput}
                          onChange={e => setPriceInput(e.target.value)}
                          required={!isFree}
                          placeholder="3.00"
                          className="w-full rounded-2xl border border-[#D8D1C4] bg-[#FBF8F3] py-3 pl-9 pr-4 text-sm text-[#071A44] outline-none transition placeholder:text-[#A39C91] focus:border-[#157F85] focus:bg-white focus:ring-4 focus:ring-[#157F85]/10"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="challenge-currency"
                        className="mb-1.5 block text-sm font-semibold text-[#071A44]"
                      >
                        Currency *
                      </label>

                      <select
                        id="challenge-currency"
                        value={currency}
                        onChange={e => setCurrency(e.target.value as Currency)}
                        className="w-full rounded-2xl border border-[#D8D1C4] bg-[#FBF8F3] px-4 py-3 text-sm text-[#071A44] outline-none transition focus:border-[#157F85] focus:bg-white focus:ring-4 focus:ring-[#157F85]/10"
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

                {!isFree && priceInput && !isNaN(parsedPrice) ? (
                  <div className="rounded-2xl border border-[#E8E0D3] bg-[#FBF8F3] px-4 py-3">
                    <p className="text-sm text-[#6E6A63]">
                      Players will be charged{' '}
                      <span className="font-semibold text-[#071A44]">
                        {currencySymbol}
                        {parsedPrice.toFixed(2)}/week
                      </span>{' '}
                      for {totalWeeks} week{totalWeeks !== 1 ? 's' : ''} —{' '}
                      <span className="font-semibold text-[#071A44]">
                        {currencySymbol}
                        {(parsedPrice * totalWeeks).toFixed(2)} total
                      </span>
                      .
                    </p>
                  </div>
                ) : null}
              </div>
            </section>
          </main>

          <aside className="space-y-6">
            <section className="rounded-[36px] border border-[#E8E0D3] bg-white p-6 shadow-sm sm:p-8">
              <SectionHeader
                eyebrow="Step 3"
                title="Week schedule"
                text="Pick the puzzle type and difficulty for each week."
              />

              <div className="mt-6 max-h-[720px] space-y-3 overflow-y-auto pr-1">
                {schedule.map((row, i) => (
                  <WeekScheduleRow
                    key={row.week}
                    row={row}
                    index={i}
                    onUpdate={updateWeek}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-[36px] border border-[#E8E0D3] bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[#071A44]">
                Challenge summary
              </h3>

              <div className="mt-4 space-y-3 text-sm">
                <SummaryRow label="Title" value={title || 'Not set'} />
                <SummaryRow label="Weeks" value={`${totalWeeks}`} />
                <SummaryRow label="Starts" value={startsAt || 'Not set'} />
                <SummaryRow
                  label="Pricing"
                  value={isFree ? 'Free' : weeklyPriceLabel}
                />
              </div>

              {error ? (
                <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                  <p className="text-sm font-medium text-rose-700">
                    {error}
                  </p>
                </div>
              ) : null}

              <div className="mt-6 flex flex-col gap-3">
                <PuzzlePrimaryButton
                  type="submit"
                  fullWidth
                  disabled={saving}
                >
                  {saving ? 'Creating…' : 'Create challenge →'}
                </PuzzlePrimaryButton>

                <button
                  type="button"
                  onClick={() => navigate('/challenges')}
                  className="inline-flex w-full items-center justify-center rounded-full border border-[#D8D1C4] bg-white px-5 py-3 text-sm font-semibold text-[#071A44] transition hover:bg-[#F8F5EF]"
                >
                  Cancel
                </button>
              </div>
            </section>
          </aside>
        </div>
      </form>
    </PuzzlePageShell>
  );
}

function SectionHeader({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#E36B2C]">
        {eyebrow}
      </p>

      <h2 className="text-2xl font-semibold text-[#071A44]">
        {title}
      </h2>

      <p className="mt-2 text-sm leading-relaxed text-[#6E6A63]">
        {text}
      </p>
    </div>
  );
}

function WeekScheduleRow({
  row,
  index,
  onUpdate,
}: {
  row: ScheduleEntry;
  index: number;
  onUpdate: (index: number, field: keyof ScheduleEntry, value: string) => void;
}) {
  return (
    <div className="rounded-[24px] border border-[#E8E0D3] bg-[#FBF8F3] p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
          {getPuzzleEmoji(row.puzzleType)}
        </div>

        <div>
          <p className="text-sm font-semibold text-[#071A44]">
            Week {row.week}
          </p>

          <p className="text-xs text-[#6E6A63]">
            {getPuzzleLabel(row.puzzleType)}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`week-${row.week}-type`}
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#6E6A63]"
          >
            Puzzle
          </label>

          <select
            id={`week-${row.week}-type`}
            value={row.puzzleType}
            onChange={e => onUpdate(index, 'puzzleType', e.target.value)}
            className="w-full rounded-2xl border border-[#D8D1C4] bg-white px-3 py-2.5 text-sm text-[#071A44] outline-none transition focus:border-[#157F85] focus:ring-4 focus:ring-[#157F85]/10"
          >
            {PUZZLE_TYPES.map(pt => (
              <option key={pt.value} value={pt.value}>
                {pt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor={`week-${row.week}-difficulty`}
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#6E6A63]"
          >
            Difficulty
          </label>

          <select
            id={`week-${row.week}-difficulty`}
            value={row.difficulty}
            onChange={e => onUpdate(index, 'difficulty', e.target.value)}
            className="w-full rounded-2xl border border-[#D8D1C4] bg-white px-3 py-2.5 text-sm capitalize text-[#071A44] outline-none transition focus:border-[#157F85] focus:ring-4 focus:ring-[#157F85]/10"
          >
            {DIFFICULTIES.map(difficulty => (
              <option key={difficulty} value={difficulty}>
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#FBF8F3] px-4 py-3">
      <span className="text-[#6E6A63]">{label}</span>
      <span className="text-right font-semibold text-[#071A44]">{value}</span>
    </div>
  );
}