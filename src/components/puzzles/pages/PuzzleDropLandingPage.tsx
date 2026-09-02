// src/components/puzzles/pages/PuzzleDropLandingPage.tsx
//
// Buyer-facing storefront for a Puzzle Drop.
//
// UX goals:
// - Visually distinct from Puzzle Subscription: Drop is browse → pick → buy → compete.
// - Club branded throughout.
// - Puzzle-type artwork makes the actual puzzles feel like products, not checkboxes.
// - Low-friction purchase flow with desktop sticky purchase panel + mobile sticky CTA.
// - Live leaderboard / bragging-rights messaging is part of the sales experience.
// - Share uses the native share sheet where available and falls back to copying the URL.
//
// Existing payment behaviour is preserved:
// - Stripe redirects to Checkout.
// - instant_payment uses PaymentInstructions.
// - crypto uses CryptoFixedFeeStep.
// - recovery and success/access-link behaviour are unchanged in substance.

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { nanoid } from 'nanoid';

import {
  publicPuzzleDropService,
  type PublicDropInfo,
  type PublicDropItem,
  type PurchaseDropResult,
  type RecoveredEntitlement,
} from '../services/publicPuzzleDropService';

import PuzzlePageShell from '../ui/PuzzlePageShell';
import PuzzlePrimaryButton from '../ui/PuzzlePrimaryButton';
import { resolvePuzzleTheme } from '../ui/puzzleTheme';

import {
  PaymentMethodSelector,
  type ClubPaymentMethod,
} from '../../Quiz/shared/PaymentMethodSelector';
import { PaymentInstructions } from '../../Quiz/shared/PaymentInstructions';
import CryptoFixedFeeStep from '../../Quiz/joinroom/crypto/CryptoFixedFeeStep';

const PUZZLE_TYPE_LABELS: Record<string, string> = {
  anagram: 'Anagram',
  sequenceOrdering: 'Sequence Ordering',
  matchPairs: 'Matching Pairs',
  wordSearch: 'Word Search',
  slidingTile: 'Sliding Tiles',
  sudoku: 'Sudoku',
  patternCompletion: 'Pattern Completion',
  wordLadder: 'Word Ladder',
  cryptogram: 'Cryptogram',
  numberPath: 'Number Path',
  towersOfHanoi: 'Towers of Hanoi',
  nonogram: 'Nonogram',
  memoryPairs: 'Memory Pairs',
};

const PUZZLE_TYPE_DESCRIPTIONS: Record<string, string> = {
  anagram: 'Unscramble the letters and reveal the hidden word.',
  sequenceOrdering: 'Put every clue into the correct order.',
  matchPairs: 'Find all the matching pairs as quickly as you can.',
  wordSearch: 'Find the hidden words before time gets away.',
  slidingTile: 'Slide the tiles into the correct order.',
  sudoku: 'Fill every row, column and box with the right numbers.',
  patternCompletion: 'Spot the rule and complete the pattern.',
  wordLadder: 'Change one letter at a time to reach the final word.',
  cryptogram: 'Crack the code and reveal the hidden message.',
  numberPath: 'Connect the numbers by finding the right path.',
  towersOfHanoi: 'Move the tower while following the rules.',
  nonogram: 'Use the clues to reveal the hidden picture.',
  memoryPairs: 'Remember the cards and match every pair.',
};

type Step =
  | 'select'
  | 'payment-method'
  | 'payment-instructions'
  | 'crypto-payment'
  | 'success';

function currencyFmt(amount: number, symbol: string) {
  const decimals = Number.isInteger(amount) ? 0 : 2;
  return `${symbol}${amount.toFixed(decimals)}`;
}

function plural(value: number, singular: string, pluralValue = `${singular}s`) {
  return value === 1 ? singular : pluralValue;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M12 3v11m0-11 4 4m-4-4L8 7M5 10v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrophyIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M8 4h8v4.4c0 3-1.7 5.1-4 5.1s-4-2.1-4-5.1V4Zm0 2H5v1.5c0 2.1 1.2 3.6 3.2 4M16 6h3v1.5c0 2.1-1.2 3.6-3.2 4M12 13.5V18m-3 2h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path
        d="M13.2 2 5.8 13h5.4L10.8 22 18.2 11h-5.4L13.2 2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PuzzlePieceIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path
        d="M9.2 4.5h3.1a2.7 2.7 0 1 1 5.2 0H20v5.1a2.7 2.7 0 1 0 0 5.2V20h-5.2a2.7 2.7 0 1 0-5.2 0H4.5v-5.2a2.7 2.7 0 1 1 0-5.2V4.5h4.7Z"
        fill="currentColor"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="m6 12 4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M5 12h13m-4-4 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PuzzleDropHeroArtwork() {
  return (
    <div className="relative mx-auto h-[250px] w-full max-w-[360px] sm:h-[300px]">
      <div className="absolute left-1/2 top-[34px] h-40 w-40 -translate-x-1/2 rounded-full bg-[var(--puzzle-bg-accent)] opacity-70 blur-[1px]" />

      <div className="absolute left-[18%] top-[48px] rotate-[-10deg] rounded-[22px] bg-[#DDECDD] p-4 shadow-sm">
        <PuzzlePieceIcon />
      </div>
      <div className="absolute right-[18%] top-[78px] rotate-[12deg] rounded-[22px] bg-[#E9E0FB] p-4 text-[#6E4DA4] shadow-sm">
        <PuzzlePieceIcon />
      </div>
      <div className="absolute left-[46%] top-[18px] rotate-[8deg] rounded-[24px] bg-[#FFF0CB] p-5 text-[#B87600] shadow-sm">
        <PuzzlePieceIcon />
      </div>

      <svg
        viewBox="0 0 360 220"
        className="absolute bottom-0 left-1/2 w-[340px] max-w-[96%] -translate-x-1/2"
        aria-label="Puzzle pieces bursting from a box"
      >
        <path d="M96 113 180 78l84 35-84 42-84-42Z" fill="var(--puzzle-primary)" opacity=".9" />
        <path d="M96 113v57l84 38v-53l-84-42Z" fill="var(--puzzle-primary)" opacity=".78" />
        <path d="M264 113v57l-84 38v-53l84-42Z" fill="var(--puzzle-primary)" opacity=".96" />
        <path d="m96 113-38 27 84 33 38-18-84-42Z" fill="var(--puzzle-primary)" opacity=".64" />
        <path d="m264 113 38 27-84 33-38-18 84-42Z" fill="var(--puzzle-primary)" opacity=".72" />

        <g transform="translate(148 44) rotate(-8)">
          <path
            d="M15 0h18c1 9 12 9 13 0h17v17c-9 1-9 12 0 13v18H46c-1-9-12-9-13 0H15V30c9-1 9-12 0-13V0Z"
            fill="#F0B13D"
          />
        </g>
        <g transform="translate(205 52) rotate(13)">
          <path
            d="M15 0h18c1 9 12 9 13 0h17v17c-9 1-9 12 0 13v18H46c-1-9-12-9-13 0H15V30c9-1 9-12 0-13V0Z"
            fill="#8B6BC0"
          />
        </g>
      </svg>

      <span className="absolute left-[10%] top-[105px] h-2 w-2 rounded-full bg-[#E36B2C]" />
      <span className="absolute right-[9%] top-[125px] h-2.5 w-2.5 rounded-full bg-[#8B6BC0]" />
      <span className="absolute right-[28%] top-[24px] h-2 w-5 rotate-[55deg] rounded-full bg-[#F0B13D]" />
      <span className="absolute left-[28%] top-[22px] h-2 w-5 rotate-[-45deg] rounded-full bg-[#E36B2C]" />
    </div>
  );
}

function WordLadderArtwork() {
  return (
    <div className="flex h-32 items-center justify-center">
      <div className="w-28 space-y-1.5 text-center text-[10px] font-bold tracking-[0.22em] text-[#2E4C3A]">
        <div className="rounded-md border border-[#7EAF8B] bg-[#F1F8EF] py-1">COLD</div>
        <div className="mx-auto h-3 w-px bg-[#A7A095]" />
        <div className="rounded-md border border-[#D5D0C6] bg-white py-1 text-[#A09A90]">_ _ _ _</div>
        <div className="mx-auto h-3 w-px bg-[#A7A095]" />
        <div className="rounded-md border border-[#D5D0C6] bg-white py-1 text-[#A09A90]">_ _ _ _</div>
        <div className="mx-auto h-3 w-px bg-[#A7A095]" />
        <div className="rounded-md border border-[#7EAF8B] bg-[#F1F8EF] py-1">WARM</div>
      </div>
    </div>
  );
}

function SudokuArtwork() {
  const values = ['5', '', '8', '1', '3', '7', '2', '', '9'];
  return (
    <div className="flex h-32 items-center justify-center">
      <div className="grid h-24 w-24 grid-cols-3 overflow-hidden rounded-md border-2 border-[#253149] bg-white">
        {values.map((value, index) => (
          <div
            key={index}
            className="flex items-center justify-center border border-[#BFC5CF] text-sm font-semibold text-[#253149]"
          >
            {value}
          </div>
        ))}
      </div>
    </div>
  );
}

function SlidingTileArtwork() {
  return (
    <div className="flex h-32 items-center justify-center">
      <div className="grid h-24 w-24 grid-cols-3 overflow-hidden rounded-md border-2 border-[#C8882E] bg-[#FFF6E8]">
        {[1, 2, 3, 4, 5, 6, 7, 8, ''].map((value, index) => (
          <div
            key={index}
            className={`flex items-center justify-center border border-[#D8A35C] text-sm font-semibold text-[#69471E] ${
              value === '' ? 'bg-[#D8C5A7]' : ''
            }`}
          >
            {value}
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchPairsArtwork() {
  return (
    <div className="flex h-32 items-center justify-center gap-2">
      <div className="-rotate-6 rounded-xl border-2 border-[#8B6BC0] bg-[#EEE7FA] px-5 py-7 text-2xl text-[#6E4DA4] shadow-sm">
        ★
      </div>
      <div className="rotate-6 rounded-xl border-2 border-[#BD6E98] bg-[#F8E7F0] px-5 py-7 text-2xl text-[#AA4E7D] shadow-sm">
        ♥
      </div>
    </div>
  );
}

function PatternArtwork() {
  return (
    <div className="flex h-32 items-center justify-center">
      <div className="flex overflow-hidden rounded-lg border border-[#80AA89] bg-white">
        <div className="flex h-12 w-12 items-center justify-center border-r border-[#AFC8B5]">
          <span className="h-5 w-5 rounded-full bg-[#62A06F]" />
        </div>
        <div className="flex h-12 w-12 items-center justify-center border-r border-[#AFC8B5]">
          <span className="h-5 w-5 bg-[#F0B13D]" />
        </div>
        <div className="flex h-12 w-12 items-center justify-center border-r border-[#AFC8B5]">
          <span className="h-5 w-5 rounded-full bg-[#62A06F]" />
        </div>
        <div className="flex h-12 w-12 items-center justify-center text-xl font-bold text-[#2E6A46]">?</div>
      </div>
    </div>
  );
}

function AnagramArtwork() {
  return (
    <div className="flex h-32 items-center justify-center">
      <div className="flex gap-1.5">
        {['A', 'R', 'B', 'I', 'N'].map((letter, index) => (
          <span
            key={index}
            className="flex h-10 w-10 rotate-[var(--r)] items-center justify-center rounded-lg border border-[#D8D1C4] bg-white text-lg font-bold text-[#071A44] shadow-sm"
            style={{ '--r': `${(index - 2) * 2}deg` } as CSSProperties}
          >
            {letter}
          </span>
        ))}
      </div>
    </div>
  );
}

function WordSearchArtwork() {
  const letters = ['P', 'L', 'A', 'Y', 'R', 'A', 'I', 'S', 'E', 'W', 'I', 'N', 'F', 'U', 'N', 'G'];
  return (
    <div className="flex h-32 items-center justify-center">
      <div className="grid grid-cols-4 rounded-lg border border-[#A9BEDD] bg-[#F4F7FB] p-1">
        {letters.map((letter, index) => (
          <span
            key={index}
            className={`flex h-7 w-7 items-center justify-center rounded text-xs font-bold ${
              [0, 1, 2, 3].includes(index) ? 'bg-[#DDE9F8] text-[#355C92]' : 'text-[#607086]'
            }`}
          >
            {letter}
          </span>
        ))}
      </div>
    </div>
  );
}

function CryptogramArtwork() {
  return (
    <div className="flex h-32 items-center justify-center">
      <div className="space-y-2 text-center">
        <div className="flex gap-1">
          {['△', '○', '□', '◇'].map((symbol, index) => (
            <span key={index} className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EEE7FA] text-lg text-[#6E4DA4]">
              {symbol}
            </span>
          ))}
        </div>
        <div className="text-[10px] font-semibold tracking-[0.2em] text-[#8A847B]">CRACK THE CODE</div>
      </div>
    </div>
  );
}

function NumberPathArtwork() {
  return (
    <div className="flex h-32 items-center justify-center">
      <svg viewBox="0 0 150 100" className="h-24 w-36" aria-hidden="true">
        <path d="M20 70 C45 25, 75 90, 125 30" fill="none" stroke="#A9BEDD" strokeWidth="5" strokeLinecap="round" />
        {[['1', 20, 70], ['2', 52, 42], ['3', 82, 72], ['4', 125, 30]].map(([n, x, y]) => (
          <g key={n as string}>
            <circle cx={x as number} cy={y as number} r="13" fill="white" stroke="#355C92" strokeWidth="2" />
            <text x={x as number} y={(y as number) + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill="#355C92">
              {n}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function HanoiArtwork() {
  return (
    <div className="flex h-32 items-center justify-center">
      <svg viewBox="0 0 160 100" className="h-24 w-36" aria-hidden="true">
        <path d="M20 85h120M40 85V25M80 85V25M120 85V25" stroke="#8A847B" strokeWidth="3" strokeLinecap="round" />
        <rect x="19" y="68" width="42" height="10" rx="5" fill="#8B6BC0" />
        <rect x="25" y="55" width="30" height="10" rx="5" fill="#F0B13D" />
        <rect x="31" y="42" width="18" height="10" rx="5" fill="#62A06F" />
      </svg>
    </div>
  );
}

function NonogramArtwork() {
  const filled = new Set([0, 2, 6, 7, 8, 12, 14, 16, 17, 18, 20, 22, 24]);
  return (
    <div className="flex h-32 items-center justify-center">
      <div className="grid grid-cols-5 overflow-hidden rounded-md border-2 border-[#253149]">
        {Array.from({ length: 25 }).map((_, index) => (
          <span key={index} className={`h-5 w-5 border border-[#C6CBD2] ${filled.has(index) ? 'bg-[#253149]' : 'bg-white'}`} />
        ))}
      </div>
    </div>
  );
}

function MemoryArtwork() {
  return (
    <div className="flex h-32 items-center justify-center gap-2">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={`flex h-20 w-14 items-center justify-center rounded-xl border-2 shadow-sm ${
            index === 1
              ? 'border-[#7EAF8B] bg-[#EEF7EF] text-[#2E6A46]'
              : 'border-[#8B6BC0] bg-[#EEE7FA] text-[#6E4DA4]'
          }`}
        >
          {index === 1 ? '●' : '✦'}
        </div>
      ))}
    </div>
  );
}

function SequenceArtwork() {
  return (
    <div className="flex h-32 items-center justify-center gap-2">
      {[3, 1, 4, 2].map((number, index) => (
        <span
          key={index}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#D8D1C4] bg-white text-base font-bold text-[#071A44] shadow-sm"
        >
          {number}
        </span>
      ))}
    </div>
  );
}

function PuzzleArtwork({ puzzleType }: { puzzleType: string }) {
  switch (puzzleType) {
    case 'wordLadder':
      return <WordLadderArtwork />;
    case 'sudoku':
      return <SudokuArtwork />;
    case 'slidingTile':
      return <SlidingTileArtwork />;
    case 'matchPairs':
      return <MatchPairsArtwork />;
    case 'patternCompletion':
      return <PatternArtwork />;
    case 'anagram':
      return <AnagramArtwork />;
    case 'wordSearch':
      return <WordSearchArtwork />;
    case 'cryptogram':
      return <CryptogramArtwork />;
    case 'numberPath':
      return <NumberPathArtwork />;
    case 'towersOfHanoi':
      return <HanoiArtwork />;
    case 'nonogram':
      return <NonogramArtwork />;
    case 'memoryPairs':
      return <MemoryArtwork />;
    case 'sequenceOrdering':
      return <SequenceArtwork />;
    default:
      return (
        <div className="flex h-32 items-center justify-center text-[var(--puzzle-primary)]">
          <div className="rounded-[28px] bg-[var(--puzzle-bg-accent)] p-7">
            <PuzzlePieceIcon />
          </div>
        </div>
      );
  }
}

function FeaturePill({
  icon,
  title,
  text,
  tone,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  tone: 'brand' | 'gold' | 'purple';
}) {
  const toneClass = {
    brand: 'bg-[var(--puzzle-bg-accent)] text-[var(--puzzle-primary)]',
    gold: 'bg-[#FFF2D9] text-[#9A6507]',
    purple: 'bg-[#EEE7FA] text-[#6E4DA4]',
  }[tone];

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-[22px] border border-[#E8E0D3] bg-white/90 px-4 py-3">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneClass}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-[#071A44]">{title}</p>
        <p className="mt-0.5 text-xs leading-snug text-[#6E6A63]">{text}</p>
      </div>
    </div>
  );
}

function DifficultyDot({ difficulty }: { difficulty: string }) {
  const normalized = difficulty.toLowerCase();
  const className =
    normalized === 'easy'
      ? 'bg-[#62A06F]'
      : normalized === 'hard'
        ? 'bg-[#D95D50]'
        : 'bg-[#F0A43B]';

  return <span className={`h-2 w-2 rounded-full ${className}`} />;
}

function PuzzleCard({
  item,
  checked,
  disabled,
  onToggle,
}: {
  item: PublicDropItem;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const title = PUZZLE_TYPE_LABELS[item.puzzleType] ?? item.puzzleType;
  const description =
    PUZZLE_TYPE_DESCRIPTIONS[item.puzzleType] ??
    'Take on the challenge and see where you land on the leaderboard.';

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={checked}
      className={`group relative min-w-0 rounded-[24px] border-2 bg-white p-4 text-left transition ${
        checked
          ? 'border-[var(--puzzle-primary)] shadow-[0_10px_30px_rgba(7,26,68,0.08)]'
          : 'border-[#E8E0D3] hover:border-[#CFC6B8]'
      } ${disabled ? 'cursor-not-allowed opacity-45' : ''}`}
    >
      <div
        className={`absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg border ${
          checked
            ? 'border-[var(--puzzle-primary)] bg-[var(--puzzle-primary)] text-[var(--puzzle-text-on-primary)]'
            : 'border-[#CFC6B8] bg-white text-transparent'
        }`}
      >
        <CheckIcon />
      </div>

      <PuzzleArtwork puzzleType={item.puzzleType} />

      <div className="mt-2 min-h-[104px]">
        <h3 className="font-serif text-xl leading-tight text-[#071A44]">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-[#5F5A54]">{description}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#EEE8DE] pt-3">
        <span className="inline-flex items-center gap-2 text-xs font-medium capitalize text-[#6E6A63]">
          <DifficultyDot difficulty={item.difficulty} />
          {item.difficulty}
        </span>
        <span className="text-xs font-semibold text-[#8A847B]">Puzzle {item.itemNumber}</span>
      </div>

      <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--puzzle-primary)]">
        <TrophyIcon className="h-4 w-4" />
        Own leaderboard
      </div>
    </button>
  );
}

function RecoverAccessPanel({
  recoverOpen,
  setRecoverOpen,
  recoverEmail,
  setRecoverEmail,
  recoverLoading,
  recoverError,
  recoveredEntitlements,
  onRecover,
}: {
  recoverOpen: boolean;
  setRecoverOpen: (value: boolean) => void;
  recoverEmail: string;
  setRecoverEmail: (value: string) => void;
  recoverLoading: boolean;
  recoverError: string | null;
  recoveredEntitlements: RecoveredEntitlement[] | null;
  onRecover: () => void;
}) {
  return (
    <section className="rounded-[24px] border border-[#E8E0D3] bg-[#FBF8F3] p-4 sm:p-5">
      {!recoverOpen ? (
        <button
          type="button"
          onClick={() => setRecoverOpen(true)}
          className="text-sm font-semibold text-[#071A44] underline underline-offset-4"
        >
          Already bought this Drop? Recover your puzzle links →
        </button>
      ) : (
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#071A44]">Find your purchased puzzles</p>
              <p className="mt-1 text-xs text-[#6E6A63]">Enter the email address you used to buy.</p>
            </div>
            <button
              type="button"
              onClick={() => setRecoverOpen(false)}
              className="rounded-full px-2 py-1 text-xs font-semibold text-[#8A847B] hover:bg-white"
            >
              Close
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              value={recoverEmail}
              onChange={e => setRecoverEmail(e.target.value)}
              placeholder="you@example.com"
              className="min-w-0 flex-1 rounded-2xl border border-[#D8D1C4] bg-white px-4 py-3 text-base text-[#071A44] outline-none focus:border-[var(--puzzle-primary)]"
            />
            <button
              type="button"
              onClick={onRecover}
              disabled={recoverLoading}
              className="rounded-2xl bg-[var(--puzzle-primary)] px-5 py-3 text-sm font-semibold text-[var(--puzzle-text-on-primary)] transition hover:opacity-95 disabled:opacity-50"
            >
              {recoverLoading ? 'Looking…' : 'Find my links'}
            </button>
          </div>

          {recoverError && <p className="mt-3 text-sm text-rose-700">{recoverError}</p>}

          {recoveredEntitlements && recoveredEntitlements.length > 0 && (
            <div className="mt-4 space-y-2">
              {recoveredEntitlements.map(ent => {
                const playUrl = `${window.location.origin}/puzzle-drop/play/${ent.entitlementId}?token=${ent.accessToken}`;
                return (
                  <div key={ent.entitlementId} className="rounded-2xl border border-[#D8D1C4] bg-white p-3">
                    <p className="mb-2 text-xs font-semibold text-[#071A44]">
                      Puzzle {ent.itemNumber ?? ''}
                      {ent.paymentStatus !== 'confirmed' && (
                        <span className="ml-2 rounded-full bg-[#FFF2D9] px-2 py-0.5 text-[10px] font-semibold text-[#8A5A00]">
                          payment pending
                        </span>
                      )}
                    </p>
                    <a
                      href={playUrl}
                      className="inline-flex rounded-xl bg-[var(--puzzle-primary)] px-3 py-2 text-xs font-semibold text-[var(--puzzle-text-on-primary)]"
                    >
                      Open puzzle →
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default function PuzzleDropLandingPage() {
  const { dropRoomId } = useParams<{ dropRoomId: string }>();

  const [info, setInfo] = useState<PublicDropInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const theme = useMemo(() => resolvePuzzleTheme(info), [info]);

  const [step, setStep] = useState<Step>('select');

  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [selectError, setSelectError] = useState<string | null>(null);

  const [paymentMethods, setPaymentMethods] = useState<ClubPaymentMethod[]>([]);
  const [methodsLoading, setMethodsLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<ClubPaymentMethod | null>(null);
  const [paymentReference] = useState(() => `DROP-${nanoid(8).toUpperCase()}`);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const [purchaseResult, setPurchaseResult] = useState<PurchaseDropResult | null>(null);

  const [recoverOpen, setRecoverOpen] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState('');
  const [recoverLoading, setRecoverLoading] = useState(false);
  const [recoverError, setRecoverError] = useState<string | null>(null);
  const [recoveredEntitlements, setRecoveredEntitlements] =
    useState<RecoveredEntitlement[] | null>(null);

  const [shareCopied, setShareCopied] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const puzzleGridRef = useRef<HTMLDivElement | null>(null);

  async function handleRecover() {
    setRecoverError(null);
    setRecoveredEntitlements(null);

    if (!recoverEmail.trim()) {
      setRecoverError('Enter the email you used to buy.');
      return;
    }
    if (!dropRoomId) return;

    setRecoverLoading(true);
    try {
      const result = await publicPuzzleDropService.recoverAccess(
        dropRoomId,
        recoverEmail.trim(),
      );

      if (result.entitlements.length === 0) {
        setRecoverError("We couldn't find any purchases for that email on this Drop.");
      } else {
        setRecoveredEntitlements(result.entitlements);
      }
    } catch (err) {
      setRecoverError(
        (err as Error).message ||
          'Could not look up your purchases. Please try again.',
      );
    } finally {
      setRecoverLoading(false);
    }
  }

  useEffect(() => {
    if (!dropRoomId) {
      setPageError('This Drop link is missing or invalid.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setPageError(null);

    publicPuzzleDropService
      .getInfo(dropRoomId)
      .then(result => {
        setInfo(result);

        // Low-friction default: choose the smallest bundle and preselect the
        // first matching number of puzzles. The buyer can immediately change
        // either choice, but a one-puzzle Drop is effectively ready to buy.
        const defaultTier = [...result.pricingTiers].sort(
          (a, b) => a.quantity - b.quantity || Number(a.price) - Number(b.price),
        )[0];

        if (defaultTier) {
          setSelectedTierId(defaultTier.id);
        }
        setSelectedItemIds([]);
      })
      .catch(() => setPageError('This Drop is not available right now.'))
      .finally(() => setLoading(false));
  }, [dropRoomId]);

  const selectedTier =
    info?.pricingTiers.find(t => t.id === selectedTierId) ?? null;

  const selectedItems = useMemo(
    () => info?.items.filter(item => selectedItemIds.includes(item.id)) ?? [],
    [info, selectedItemIds],
  );

  const selectedTotal = selectedTier ? Number(selectedTier.price) : 0;



  function toggleItem(itemId: string) {
    if (!info) return;

    setSelectedItemIds(current => {
      const alreadySelected = current.includes(itemId);
      const next = alreadySelected
        ? current.filter(id => id !== itemId)
        : [...current, itemId];

      if (next.length === 0) {
        setSelectedTierId(null);
        setSelectError(null);
        return next;
      }

      const exactTier = info.pricingTiers.find(
        tier => tier.quantity === next.length,
      );

      if (!exactTier) {
        setSelectError(
          `This Drop does not have a ${next.length}-${plural(
            next.length,
            'puzzle',
          )} price option.`,
        );
        return current;
      }

      setSelectedTierId(exactTier.id);
      setSelectError(null);

      if (exactTier.quantity >= info.items.length) {
        return info.items.map(item => item.id);
      }

      return next;
    });
  }

  async function handleShare() {
    if (!info) return;

    const url = window.location.href;
    const shareData = {
      title: info.title,
      text: `Pick a puzzle, support ${info.clubName ?? 'the organiser'} and compete for leaderboard bragging rights.`,
      url,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 2200);
    } catch (err) {
      // AbortError is expected when someone closes the native share sheet.
      if ((err as DOMException)?.name !== 'AbortError') {
        console.warn('[PuzzleDropLandingPage] Share failed:', err);
      }
    }
  }

  function scrollToPuzzles() {
    puzzleGridRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  function openCheckout() {
    setSelectError(null);
    setConfirmError(null);

    if (!info) return;

    if (selectedItemIds.length === 0) {
      setSelectError('Choose at least one puzzle first.');
      scrollToPuzzles();
      return;
    }

    const exactTier = info.pricingTiers.find(
      tier => tier.quantity === selectedItemIds.length,
    );

    if (!exactTier) {
      setSelectError(
        `There is no pricing option configured for ${selectedItemIds.length} ${plural(
          selectedItemIds.length,
          'puzzle',
        )}.`,
      );
      scrollToPuzzles();
      return;
    }

    setSelectedTierId(exactTier.id);
    setStep('select');
    setCheckoutOpen(true);
  }

  function closeCheckout() {
    if (confirming) return;
    setCheckoutOpen(false);
    setStep('select');
    setConfirmError(null);
  }

  async function handleContinueToPayment() {
    setSelectError(null);

    if (!selectedTier) {
      setSelectError('Choose a pricing option first.');
      return;
    }

    if (selectedItemIds.length !== selectedTier.quantity) {
      setSelectError(
        `Choose exactly ${selectedTier.quantity} ${plural(selectedTier.quantity, 'puzzle')}.`,
      );
      return;
    }

    if (!buyerName.trim()) {
      setSelectError('Your name is required.');
      return;
    }

    if (!buyerEmail.trim()) {
      setSelectError('Your email is required.');
      return;
    }

    if (!isValidEmail(buyerEmail)) {
      setSelectError('Please enter a valid email address.');
      return;
    }

    if (!dropRoomId) return;

    setMethodsLoading(true);
    setCheckoutOpen(true);
    setStep('payment-method');

    try {
      const methods = await publicPuzzleDropService.getPaymentMethods(dropRoomId);

      setPaymentMethods(
        methods.filter(method => {
          const category = method.methodCategory?.toLowerCase();
          return (
            category === 'instant_payment' ||
            category === 'stripe' ||
            category === 'crypto'
          );
        }),
      );

    } catch {
      setSelectError('Could not load payment methods. Please try again.');
      setStep('select');
    } finally {
      setMethodsLoading(false);
    }
  }

  async function handleSelectMethod(method: ClubPaymentMethod) {
    const category = method.methodCategory?.toLowerCase();

    if (category === 'stripe') {
      if (!dropRoomId) return;

      setConfirming(true);
      setConfirmError(null);

      try {
        const result = await publicPuzzleDropService.createStripeCheckout(
          dropRoomId,
          {
            itemIds: selectedItemIds,
            buyerName: buyerName.trim(),
            buyerEmail: buyerEmail.trim(),
            appOrigin: window.location.origin,
          },
        );

        window.location.href = result.url;
      } catch (err) {
        setConfirmError(
          (err as Error).message ||
            'Could not start checkout. Please try again.',
        );
        setConfirming(false);
      }

      return;
    }

    if (category === 'crypto') {
      setSelectedMethod(method);
      setConfirming(true);
      setConfirmError(null);

      try {
        const { initAppKit } = await import('../../../web3Init');
        await initAppKit();
        setStep('crypto-payment');
      } catch (err) {
        setConfirmError(
          (err as Error).message ||
            'Could not initialize wallet support. Please try again.',
        );
      } finally {
        setConfirming(false);
      }

      return;
    }

    setSelectedMethod(method);
    setStep('payment-instructions');
  }

  async function handleConfirmPaid() {
    if (!dropRoomId || !selectedMethod) return;

    setConfirming(true);
    setConfirmError(null);

    try {
      const result = await publicPuzzleDropService.purchase(dropRoomId, {
        itemIds: selectedItemIds,
        buyerName: buyerName.trim(),
        buyerEmail: buyerEmail.trim(),
        paymentReference,
        clubPaymentMethodId: selectedMethod.id,
      });

      setPurchaseResult(result);
      setStep('success');
    } catch (err) {
      setConfirmError(
        (err as Error).message ||
          'Could not record your purchase. Please try again.',
      );
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <PuzzlePageShell theme={theme}>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D8D1C4] border-t-[var(--puzzle-primary)]" />
        </div>
      </PuzzlePageShell>
    );
  }

  if (pageError || !info) {
    return (
      <PuzzlePageShell theme={theme}>
        <div className="mx-auto max-w-xl rounded-[28px] border border-[#E7C4C4] bg-white p-8 text-center shadow-sm">
          <p className="mb-2 text-3xl">😕</p>
          <h1 className="mb-2 text-xl font-bold text-[#071A44]">Drop unavailable</h1>
          <p className="text-sm text-[#6E6A63]">
            {pageError ?? 'This Drop could not be found.'}
          </p>
        </div>
      </PuzzlePageShell>
    );
  }

  if (info.status === 'completed') {
    return (
      <PuzzlePageShell theme={theme} clubName={info.clubName ?? undefined}>
        <div className="mx-auto max-w-4xl space-y-6">
          <section className="overflow-hidden rounded-[36px] border border-[#E8E0D3] bg-white shadow-sm">
            <div className="grid items-center gap-2 p-6 sm:p-8 lg:grid-cols-[1fr_0.65fr]">
              <div>
                <div className="mb-5 flex items-center gap-3">
                  {theme.logoUrl ? (
                    <img
                      src={theme.logoUrl}
                      alt=""
                      className="h-14 w-14 rounded-2xl object-contain"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--puzzle-bg-accent)] text-[var(--puzzle-primary)]">
                      <PuzzlePieceIcon />
                    </div>
                  )}
                  <p className="text-sm font-bold text-[var(--puzzle-primary)]">
                    {info.clubName ?? 'Puzzle Drop'}
                  </p>
                </div>

                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E36B2C]">
                  Puzzle Drop
                </p>
                <h1 className="mt-3 font-serif text-4xl leading-tight text-[#071A44] sm:text-5xl">
                  {info.title}
                </h1>

                {info.summary ? (
                  <p className="mt-4 text-lg font-semibold text-[var(--puzzle-primary)]">
                    {info.summary}
                  </p>
                ) : null}

                <p className="mt-5 max-w-xl text-sm leading-relaxed text-[#6E6A63]">
                  This Drop is no longer selling new puzzles. Already bought?
                  You can still recover your access links below.
                </p>
              </div>

              <PuzzleDropHeroArtwork />
            </div>
          </section>

          <RecoverAccessPanel
            recoverOpen={recoverOpen}
            setRecoverOpen={setRecoverOpen}
            recoverEmail={recoverEmail}
            setRecoverEmail={setRecoverEmail}
            recoverLoading={recoverLoading}
            recoverError={recoverError}
            recoveredEntitlements={recoveredEntitlements}
            onRecover={handleRecover}
          />

          {dropRoomId ? (
            <Link
              to={`/puzzle-drop/${dropRoomId}/leaderboard`}
              className="inline-flex items-center gap-2 rounded-full border border-[#D8D1C4] bg-white px-5 py-3 text-sm font-semibold text-[#071A44] shadow-sm"
            >
              <TrophyIcon className="h-5 w-5" />
              View the final leaderboards →
            </Link>
          ) : null}
        </div>
      </PuzzlePageShell>
    );
  }

  return (
    <PuzzlePageShell theme={theme} clubName={info.clubName ?? undefined}>
      <div className="mx-auto max-w-6xl pb-32">
        {/* ── HERO ──────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-[36px] border border-[#E8E0D3] bg-white shadow-sm">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-2"
            style={{ background: 'var(--puzzle-primary)' }}
          />

          <div className="grid items-center gap-2 p-6 pt-8 sm:p-9 sm:pt-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-12">
            <div className="min-w-0">
              {/* PuzzlePageShell already carries the club identity, so do not
                  repeat the club logo/name inside the hero. */}
              <div className="mb-6 flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E36B2C]">
                  Puzzle Drop
                </p>

                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--puzzle-primary)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--puzzle-primary)] transition hover:bg-[var(--puzzle-bg-accent)]"
                >
                  <ShareIcon />
                  {shareCopied ? 'Link copied!' : 'Share this Drop'}
                </button>
              </div>

              <h1 className="font-serif text-[2.65rem] leading-[0.98] text-[#071A44] sm:text-6xl lg:text-7xl">
                {info.title}
              </h1>

              <p className="mt-5 text-xl font-semibold leading-snug text-[var(--puzzle-primary)] sm:text-2xl">
                Pick a puzzle. Crack it. Claim your spot.
              </p>

              <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#5F5A54] sm:text-lg">
                {info.summary ||
                  'Choose your challenge, solve it and see where you land on the live leaderboard.'}
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <FeaturePill
                  icon={<PuzzlePieceIcon />}
                  title={`${info.items.length} ${plural(info.items.length, 'puzzle')}`}
                  text="Choose your favourites"
                  tone="brand"
                />
                <FeaturePill
                  icon={<BoltIcon />}
                  title="Play instantly"
                  text="Unlock after purchase"
                  tone="gold"
                />
                <FeaturePill
                  icon={<TrophyIcon />}
                  title="Own leaderboard"
                  text="Every puzzle ranks players"
                  tone="purple"
                />
              </div>
            </div>

            <div className="hidden lg:block">
              <PuzzleDropHeroArtwork />
            </div>
          </div>
        </section>

        {/* ── MOBILE ARTWORK ────────────────────────────────────────────────── */}
        <div className="mt-4 rounded-[30px] border border-[#E8E0D3] bg-white lg:hidden">
          <PuzzleDropHeroArtwork />
        </div>

        {/* ── ORGANISER STORY — deliberately high on the page ──────────────── */}
        {info.description ? (
          <section className="mt-6 rounded-[30px] border border-[#E8E0D3] bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E36B2C]">
              Why we're fundraising
            </p>
            <h2 className="mt-2 font-serif text-3xl text-[#071A44] sm:text-4xl">
              Support {info.clubName ?? 'the organiser'}
            </h2>
            <p className="mt-4 max-w-4xl whitespace-pre-line text-sm leading-7 text-[#5F5A54] sm:text-base">
              {info.description}
            </p>
          </section>
        ) : null}

        {/* ── PUZZLE STORE ──────────────────────────────────────────────────── */}
        <section
          ref={puzzleGridRef}
          className="mt-6 scroll-mt-24 rounded-[34px] border border-[#E8E0D3] bg-white p-5 shadow-sm sm:p-7"
        >
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E36B2C]">
                Choose your challenge
              </p>
              <h2 className="mt-2 font-serif text-3xl leading-tight text-[#071A44] sm:text-4xl">
                Which one will you crack?
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#6E6A63]">
                Every puzzle has its own live leaderboard. Solve it, claim your
                position and challenge someone to beat you.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {[...info.pricingTiers]
                  .sort((a, b) => a.quantity - b.quantity || Number(a.price) - Number(b.price))
                  .map(tier => {
                    const coversAll = tier.quantity >= info.items.length;
                    const label =
                      tier.label ||
                      (coversAll
                        ? `All ${info.items.length}`
                        : `${tier.quantity} ${plural(tier.quantity, 'puzzle')}`);

                    return (
                      <span
                        key={tier.id}
                        className="inline-flex items-center rounded-full border border-[#E2DBD0] bg-[#FBF8F3] px-3 py-1.5 text-xs font-bold text-[#071A44]"
                      >
                        {label}
                        <span className="mx-1.5 text-[#B4ADA2]">·</span>
                        <span className="text-[var(--puzzle-primary)]">
                          {currencyFmt(Number(tier.price), info.currencySymbol)}
                        </span>
                      </span>
                    );
                  })}
              </div>
            </div>

            {selectedTier ? (
              <span className="rounded-full bg-[var(--puzzle-bg-accent)] px-4 py-2 text-xs font-bold text-[var(--puzzle-primary)]">
                {selectedItemIds.length} of {selectedTier.quantity} selected
              </span>
            ) : null}
          </div>

          <div
            className={`grid gap-3 ${
              info.items.length >= 3
                ? 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                : 'sm:grid-cols-2'
            }`}
          >
            {info.items.map(item => (
              <PuzzleCard
                key={item.id}
                item={item}
                checked={selectedItemIds.includes(item.id)}
                disabled={false}
                onToggle={() => toggleItem(item.id)}
              />
            ))}
          </div>
        </section>

        {/* ── BRAGGING RIGHTS ──────────────────────────────────────────────── */}
        <section className="mt-6 flex flex-col gap-5 rounded-[28px] border border-[#DDE7DA] bg-[linear-gradient(135deg,#F5F9F2_0%,#FBF8F3_100%)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--puzzle-primary)] text-[var(--puzzle-text-on-primary)]">
              <TrophyIcon />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--puzzle-primary)]">
                Bragging rights included
              </h3>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#5F5A54]">
                Each puzzle has its own leaderboard. Crack yours, climb the
                ranks and send the Drop to a friend who thinks they can beat your score.
              </p>
            </div>
          </div>

          <Link
            to={`/puzzle-drop/${dropRoomId}/leaderboard`}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-[var(--puzzle-primary)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--puzzle-primary)] transition hover:bg-[var(--puzzle-bg-accent)]"
          >
            <TrophyIcon className="h-5 w-5" />
            View live leaderboards
          </Link>
        </section>

        <div className="mt-6">
          <RecoverAccessPanel
            recoverOpen={recoverOpen}
            setRecoverOpen={setRecoverOpen}
            recoverEmail={recoverEmail}
            setRecoverEmail={setRecoverEmail}
            recoverLoading={recoverLoading}
            recoverError={recoverError}
            recoveredEntitlements={recoveredEntitlements}
            onRecover={handleRecover}
          />
        </div>
      </div>

      {/* ── STICKY BUY BAR — same interaction model as peer support ────────── */}
      <div className="fixed inset-x-0 bottom-0 z-[9998] border-t border-[#DDD6CA] bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 shadow-[0_-8px_30px_rgba(7,26,68,0.10)] backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#8A847B]">
              {selectedItemIds.length > 0 ? 'Your selection' : 'Choose a puzzle'}
            </p>
            <p className="truncate text-sm font-bold text-[#071A44] sm:text-base">
              {selectedItems
                .map(item => PUZZLE_TYPE_LABELS[item.puzzleType] ?? item.puzzleType)
                .join(', ') || 'Pick your challenge'}
            </p>
            {selectedTier ? (
              <p className="mt-0.5 text-xs font-semibold text-[#6E6A63]">
                {selectedItemIds.length} {plural(selectedItemIds.length, 'puzzle')} ·{' '}
                {currencyFmt(selectedTotal, info.currencySymbol)}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={openCheckout}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[var(--puzzle-primary)] px-5 py-3 text-sm font-bold text-[var(--puzzle-text-on-primary)] shadow-sm sm:px-7 sm:text-base"
          >
            {selectedItemIds.length > 0 ? 'Continue' : 'Buy puzzles'}
            <ArrowRightIcon />
          </button>
        </div>
      </div>

      {/* ── CHECKOUT SHEET / MODAL ─────────────────────────────────────────── */}
      {checkoutOpen ? (
        <div
          className="fixed inset-0 z-[10000] flex items-end justify-center bg-slate-950/45 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={closeCheckout}
        >
          <section
            className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl sm:rounded-[2rem] sm:p-6"
            onClick={event => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />

            <div className="mb-5 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8A847B]">
                  Puzzle Drop
                </p>
                <h2 className="mt-1 font-serif text-3xl leading-tight text-[#071A44]">
                  {step === 'select'
                    ? 'Get your puzzles'
                    : step === 'payment-method'
                      ? 'Choose how to pay'
                      : step === 'payment-instructions'
                        ? 'Complete your payment'
                        : step === 'crypto-payment'
                          ? 'Pay with crypto'
                          : 'Your puzzles are ready'}
                </h2>
              </div>

              {!confirming ? (
                <button
                  type="button"
                  onClick={closeCheckout}
                  aria-label="Close checkout"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#F4F1EC] text-xl font-semibold text-[#6E6A63] transition hover:bg-[#ECE7DF]"
                >
                  ×
                </button>
              ) : null}
            </div>

            {step === 'select' ? (
              <PurchasePanel
                info={info}
                selectedTier={selectedTier}
                selectedItems={selectedItems}
                buyerName={buyerName}
                buyerEmail={buyerEmail}
                selectError={selectError}
                onBuyerName={setBuyerName}
                onBuyerEmail={setBuyerEmail}
                onContinue={handleContinueToPayment}
              />
            ) : null}

            {step === 'payment-method' ? (
              <div>
                <button
                  type="button"
                  onClick={() => setStep('select')}
                  disabled={confirming}
                  className="mb-5 text-sm font-semibold text-[#071A44] underline underline-offset-4 disabled:opacity-40"
                >
                  ← Back to details
                </button>

                <div className="mb-5 rounded-2xl bg-[#FBF8F3] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-[#6E6A63]">
                      Total
                    </span>
                    <span className="text-xl font-black text-[#071A44]">
                      {selectedTier
                        ? currencyFmt(Number(selectedTier.price), info.currencySymbol)
                        : ''}
                    </span>
                  </div>
                </div>

                {confirming ? (
                  <div className="flex items-center gap-3 py-6">
                    <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#D8D1C4] border-t-[var(--puzzle-primary)]" />
                    <p className="text-sm text-[#6E6A63]">
                      {selectedMethod?.methodCategory?.toLowerCase() === 'crypto'
                        ? 'Getting your wallet ready…'
                        : 'Redirecting to Stripe…'}
                    </p>
                  </div>
                ) : (
                  <>
                    <PaymentMethodSelector
                      paymentMethods={paymentMethods}
                      loading={methodsLoading}
                      onSelect={handleSelectMethod}
                      hideNoMethodsMessage={methodsLoading}
                    />

                    {!methodsLoading && paymentMethods.length === 0 ? (
                      <p className="mt-4 text-sm text-[#6E6A63]">
                        No payment methods are available for this Drop yet.
                        Please contact the organiser.
                      </p>
                    ) : null}

                    {confirmError ? (
                      <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                        <p className="text-sm font-medium text-rose-700">
                          {confirmError}
                        </p>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}

            {step === 'payment-instructions' && selectedMethod && selectedTier ? (
              <PaymentInstructions
                method={selectedMethod}
                paymentReference={paymentReference}
                totalAmount={Number(selectedTier.price)}
                currencySymbol={info.currencySymbol}
                onConfirmPaid={handleConfirmPaid}
                onBack={() => setStep('payment-method')}
                error={confirmError}
                confirming={confirming}
              />
            ) : null}

            {step === 'crypto-payment' &&
            selectedMethod &&
            selectedTier &&
            dropRoomId ? (
              <div>
                <button
                  type="button"
                  onClick={() => setStep('payment-method')}
                  className="mb-4 text-sm font-semibold text-[#071A44] underline underline-offset-4"
                >
                  ← Back
                </button>

                <CryptoFixedFeeStep
                  mode="ticket"
                  roomId={dropRoomId}
                  selectedMethod={selectedMethod}
                  totalFiatAmount={Number(selectedTier.price)}
                  entryFeeAmount={Number(selectedTier.price)}
                  extrasAmount={0}
                  selectedExtras={[]}
                  fiatCurrency={info.currency}
                  currencySymbol={info.currencySymbol}
                  purchaserName={buyerName.trim()}
                  purchaserEmail={buyerEmail.trim()}
                  playerName={buyerName.trim()}
                  confirmEndpoint={`/api/puzzle-drop/${dropRoomId}/crypto/confirm?itemIds=${encodeURIComponent(
                    JSON.stringify(selectedItemIds),
                  )}`}
                  onBack={() => setStep('payment-method')}
                  onSuccess={async result => {
                    try {
                      const session =
                        await publicPuzzleDropService.getStripeSession(
                          dropRoomId,
                          result.txHash,
                        );

                      setPurchaseResult({
                        ok: true,
                        ledgerId: Number(result.web3TransactionId) || 0,
                        totalAmount: result.ledgerAmount,
                        currency: result.ledgerCurrency,
                        entitlements: session.entitlements.map(entitlement => ({
                          entitlementId: entitlement.entitlementId,
                          itemNumber: entitlement.itemNumber ?? 0,
                          accessToken: entitlement.accessToken,
                        })),
                      });

                      setStep('success');
                    } catch {
                      setConfirmError(
                        'Payment verified, but we could not load your access links. Use "Already bought this?" on the Drop page with your email.',
                      );
                    }
                  }}
                />
              </div>
            ) : null}

            {step === 'success' && purchaseResult ? (
              <div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--puzzle-primary)] text-[var(--puzzle-text-on-primary)]">
                  <CheckIcon />
                </div>

                <p className="mt-5 text-sm leading-relaxed text-[#5F7D6A]">
                  Thanks for supporting{' '}
                  <strong>{info.clubName ?? 'the organiser'}</strong>. Your
                  puzzle links are below.
                </p>

                <div className="mt-6 space-y-3">
                  {purchaseResult.entitlements.map(entitlement => {
                    const playUrl = `${window.location.origin}/puzzle-drop/play/${entitlement.entitlementId}?token=${entitlement.accessToken}`;

                    return (
                      <div
                        key={entitlement.entitlementId}
                        className="rounded-2xl border border-[#D8D1C4] bg-white p-4"
                      >
                        <p className="text-sm font-semibold text-[#071A44]">
                          Puzzle {entitlement.itemNumber}
                        </p>
                        <a
                          href={playUrl}
                          className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--puzzle-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--puzzle-text-on-primary)]"
                        >
                          Play puzzle →
                        </a>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <Link
                    to={`/puzzle-drop/${dropRoomId}/leaderboard`}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--puzzle-primary)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--puzzle-primary)]"
                  >
                    <TrophyIcon className="h-5 w-5" />
                    Leaderboards
                  </Link>

                  <button
                    type="button"
                    onClick={handleShare}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#D8D1C4] bg-white px-4 py-2.5 text-sm font-semibold text-[#071A44]"
                  >
                    <ShareIcon />
                    Challenge a friend
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </PuzzlePageShell>
  );
}

function PurchasePanel({
  info,
  selectedTier,
  selectedItems,
  buyerName,
  buyerEmail,
  selectError,
  onBuyerName,
  onBuyerEmail,
  onContinue,
}: {
  info: PublicDropInfo;
  selectedTier: PublicDropInfo['pricingTiers'][number] | null;
  selectedItems: PublicDropItem[];
  buyerName: string;
  buyerEmail: string;
  selectError: string | null;
  onBuyerName: (value: string) => void;
  onBuyerEmail: (value: string) => void;
  onContinue: () => void;
}) {
  const selectedTotal = selectedTier ? Number(selectedTier.price) : 0;
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#E36B2C]">
            Your selection
          </p>
          <h2 className="mt-1 font-serif text-2xl text-[#071A44]">
            Ready to play?
          </h2>
        </div>

        {selectedTier ? (
          <span className="rounded-full bg-[var(--puzzle-bg-accent)] px-3 py-1.5 text-[11px] font-bold text-[var(--puzzle-primary)]">
            {selectedItems.length} selected
          </span>
        ) : null}
      </div>

      {selectedItems.length > 0 ? (
        <div className="mt-4 space-y-2">
          {selectedItems.map(item => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-[#E8E0D3] bg-[#FBF8F3] px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--puzzle-primary)] text-xs font-bold text-[var(--puzzle-text-on-primary)]">
                  {item.itemNumber}
                </span>
                <span className="truncate text-sm font-semibold text-[#071A44]">
                  {PUZZLE_TYPE_LABELS[item.puzzleType] ?? item.puzzleType}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-[#D8D1C4] bg-[#FBF8F3] p-4 text-sm text-[#6E6A63]">
          Choose your puzzles on the page, then they’ll appear here.
        </div>
      )}

      <div className="mt-4 flex items-end justify-between border-b border-[#E8E0D3] pb-4">
        <span className="text-sm font-semibold text-[#071A44]">Total</span>
        <span className="text-xl font-black text-[#071A44]">
          {selectedTier
            ? currencyFmt(selectedTotal, info.currencySymbol)
            : '—'}
        </span>
      </div>

      <div className="mt-5 rounded-2xl border border-[#E8E0D3] bg-[#FBF8F3] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8A847B]">
              Your order
            </p>
            <p className="mt-1 text-sm font-bold text-[#071A44]">
              {selectedItems.length} {plural(selectedItems.length, 'puzzle')}
            </p>
          </div>

          <div className="text-right">
            <p className="text-2xl font-black text-[var(--puzzle-primary)]">
              {selectedTier
                ? currencyFmt(Number(selectedTier.price), info.currencySymbol)
                : '—'}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A847B]">
              {info.currency}
            </p>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-[#6E6A63]">
          Want different puzzles? Close this window and change your selection on the page.
        </p>
      </div>

      <div className="mt-5 rounded-2xl bg-[#F4F7EF] p-4">
        <div className="flex gap-3">
          <div className="text-[var(--puzzle-primary)]">
            <TrophyIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--puzzle-primary)]">
              Bragging rights included
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#5F5A54]">
              Every puzzle has its own leaderboard. Climb the ranks and
              challenge your friends.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <p className="mb-3 text-sm font-bold text-[#071A44]">Your details</p>

        <div className="space-y-3">
          <div>
            <label
              htmlFor="drop-buyer-name"
              className="mb-1.5 block text-xs font-semibold text-[#071A44]"
            >
              Your name *
            </label>
            <input
              id="drop-buyer-name"
              type="text"
              value={buyerName}
              onChange={e => onBuyerName(e.target.value)}
              placeholder="First and last name"
              autoComplete="name"
              className="w-full rounded-2xl border border-[#D8D1C4] bg-[#FBF8F3] px-4 py-3 text-base text-[#071A44] outline-none transition placeholder:text-[#A39C91] focus:border-[var(--puzzle-primary)] focus:bg-white focus:ring-4 focus:ring-[var(--puzzle-primary)]/10"
            />
          </div>

          <div>
            <label
              htmlFor="drop-buyer-email"
              className="mb-1.5 block text-xs font-semibold text-[#071A44]"
            >
              Email address *
            </label>
            <input
              id="drop-buyer-email"
              type="email"
              value={buyerEmail}
              onChange={e => onBuyerEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full rounded-2xl border border-[#D8D1C4] bg-[#FBF8F3] px-4 py-3 text-base text-[#071A44] outline-none transition placeholder:text-[#A39C91] focus:border-[var(--puzzle-primary)] focus:bg-white focus:ring-4 focus:ring-[var(--puzzle-primary)]/10"
            />
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-[#E8E0D3] bg-[#FBF8F3] p-3">
            <div className="mt-0.5 shrink-0 text-[var(--puzzle-primary)]">
              <LockIcon />
            </div>
            <p className="text-[11px] leading-relaxed text-[#6E6A63]">
              We'll use your email to send your purchase confirmation and
              puzzle-access links. See our{' '}
              <a
                href="/legal/privacy"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-[#071A44] underline"
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </div>

      {selectError ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-sm font-medium text-rose-700">{selectError}</p>
        </div>
      ) : null}

      <PuzzlePrimaryButton
        type="button"
        fullWidth
        onClick={onContinue}
        className="mt-5"
      >
        Continue to payment →
      </PuzzlePrimaryButton>

      <div className="mt-3 flex items-center justify-center gap-2 text-[10px] font-medium text-[#8A847B]">
        <LockIcon />
        Secure checkout · Your puzzle links are emailed to you
      </div>
    </>
  );
}


