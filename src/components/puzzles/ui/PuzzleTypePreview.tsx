// src/components/puzzles/ui/PuzzleTypePreview.tsx
//
// Shared visual preview component for puzzle types.
// Use this everywhere instead of duplicating mini artwork logic.

import type { CSSProperties } from 'react';

export type PuzzlePreviewSize = 'hero' | 'card' | 'compact';

export const PUZZLE_TYPE_LABELS: Record<string, string> = {
  anagram: 'Anagram',
  sequenceOrdering: 'Sequence Ordering',
  matchPairs: 'Match Pairs',
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

export function getPuzzleTypeLabel(puzzleType: string): string {
  return PUZZLE_TYPE_LABELS[puzzleType] ?? puzzleType;
}

export default function PuzzleTypePreview({
  puzzleType,
  size = 'card',
  className = '',
}: {
  puzzleType: string;
  size?: PuzzlePreviewSize;
  className?: string;
}) {
  const scale =
    size === 'hero' ? 'hero' : size === 'compact' ? 'compact' : 'card';

  const wrapperClass =
    scale === 'hero'
      ? 'mx-auto flex min-h-[240px] w-full max-w-[360px] items-center justify-center'
      : scale === 'compact'
        ? 'mx-auto flex min-h-[72px] w-full max-w-[132px] items-center justify-center'
        : 'mx-auto flex min-h-[150px] w-full max-w-[220px] items-center justify-center';

  const cardPad =
    scale === 'hero' ? 'p-4' : scale === 'compact' ? 'p-1.5' : 'p-3';

  const textClass =
    scale === 'hero' ? 'text-base' : scale === 'compact' ? 'text-[8px]' : 'text-xs';

  const tileTextClass =
    scale === 'hero' ? 'text-lg' : scale === 'compact' ? 'text-[9px]' : 'text-sm';

  const largeEmoji = scale === 'hero' ? 'text-3xl' : scale === 'compact' ? 'text-sm' : 'text-xl';

    if (puzzleType === 'matchPairs') {
    const left = ['★', '♥'];
    const right = ['♥', '★'];

    return (
      <div className={`${wrapperClass} ${className}`}>
        <div className={`relative w-full max-w-[230px] ${cardPad}`}>
          <svg
            viewBox="0 0 220 120"
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            <path
              d="M72 35 C108 35, 112 35, 148 85"
              fill="none"
              stroke="#D9CDD0"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M72 85 C108 85, 112 85, 148 35"
              fill="none"
              stroke="#D9CDD0"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>

          <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="space-y-3">
              {left.map((item, index) => (
                <div
                  key={index}
                  className={`grid h-12 place-items-center rounded-[16px] border border-[#D7C6F1] bg-[#F5EFFF] font-black text-[#7B57C4] ${tileTextClass}`}
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="w-6" />

            <div className="space-y-3">
              {right.map((item, index) => (
                <div
                  key={index}
                  className={`grid h-12 place-items-center rounded-[16px] border border-[#FFD6E3] bg-[#FFF2F7] font-black text-[#C25A8A] ${tileTextClass}`}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (puzzleType === 'memoryPairs') {
    const cards = [
      { label: '?', state: 'hidden' },
      { label: '?', state: 'hidden' },
      { label: '★', state: 'revealed' },
      { label: '★', state: 'matched' },
    ] as const;

    return (
      <div className={`${wrapperClass} ${className}`}>
        <div className={`grid w-full max-w-[210px] grid-cols-2 gap-3 ${cardPad}`}>
          {cards.map((card, index) => (
            <div
              key={index}
              className={`grid aspect-[1.05/1] place-items-center rounded-[18px] border font-black shadow-sm ${
                card.state === 'hidden'
                  ? 'border-[#D8D1C4] bg-[#F3EFE8] text-[#B7AEA2]'
                  : card.state === 'revealed'
                    ? 'border-[#D7C6F1] bg-[#F5EFFF] text-[#7B57C4]'
                    : 'border-[#A8CDBA] bg-[#EFF8F1] text-[#2E6A46]'
              } ${largeEmoji}`}
            >
              {card.label}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (puzzleType === 'wordLadder') {
    const rows = ['COLD', '', '', '', 'WARM'];
    return (
      <div className={`${wrapperClass} ${className}`}>
        <div className={`w-full max-w-[230px] space-y-2 ${cardPad}`}>
          {rows.map((row, index) => (
            <div key={index} className="flex items-center justify-center gap-2">
              <div
                className={`flex h-10 w-full items-center justify-center rounded-xl border font-black tracking-[0.2em] ${textClass} ${
                  row
                    ? 'border-[#9FC8AF] bg-[#EFF8F1] text-[#2A6A49]'
                    : 'border-[#D8D1C4] bg-white text-[#8B8379]'
                }`}
              >
                {row || '— — — —'}
              </div>
              {index < rows.length - 1 ? <span className="text-[#8B8379]">↓</span> : null}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (puzzleType === 'anagram') {
    return (
      <div className={`${wrapperClass} ${className}`}>
        <div className={`w-full max-w-[230px] ${cardPad}`}>
          <div className="rounded-xl border border-[#D8D1C4] bg-white p-3 text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#8B8379]">Unscramble</p>
            <div className={`mt-2 flex items-center justify-center gap-2 font-black tracking-[0.18em] text-[#071A44] ${tileTextClass}`}>
              {['D', 'A', 'R', 'E'].map(letter => (
                <span key={letter} className="grid h-9 w-9 place-items-center rounded-lg border border-[#D8D1C4] bg-[#FBF8F3]">
                  {letter}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[#8B8379]">→</p>
            <div className={`mt-2 rounded-xl border border-[#9FC8AF] bg-[#EFF8F1] px-3 py-2 font-black tracking-[0.18em] text-[#2A6A49] ${textClass}`}>
              READ
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (puzzleType === 'cryptogram') {
    return (
      <div className={`${wrapperClass} ${className}`}>
        <div className={`w-full max-w-[240px] space-y-2 ${cardPad}`}>
          <div className="rounded-xl border border-[#D8D1C4] bg-white px-3 py-2">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#8B8379]">Decode</p>
            <p className={`mt-1 font-black tracking-[0.18em] text-[#071A44] ${textClass}`}>KHOOR</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              ['K', 'H'],
              ['H', 'E'],
              ['O', 'L'],
            ].map(([from, to]) => (
              <div key={from} className="rounded-xl border border-[#D8D1C4] bg-white px-2 py-2 text-center">
                <p className="text-[8px] font-black text-[#8B8379]">{from} → {to}</p>
              </div>
            ))}
          </div>
          <div className={`rounded-xl border border-[#9FC8AF] bg-[#EFF8F1] px-3 py-2 text-center font-black tracking-[0.18em] text-[#2A6A49] ${textClass}`}>
            HELLO
          </div>
        </div>
      </div>
    );
  }

  if (puzzleType === 'wordSearch') {
    const grid = [
      ['P', 'L', 'A', 'Y'],
      ['U', 'W', 'O', 'R'],
      ['Z', 'O', 'R', 'D'],
      ['Z', 'G', 'A', 'M'],
    ];

    return (
      <div className={`${wrapperClass} ${className}`}>
        <div className={`w-full max-w-[210px] ${cardPad}`}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-[0.14em] text-[#8B8379]">
              Find the word
            </span>
            <span className="rounded-full bg-[#EFF8F1] px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-[#2E6A46]">
              PLAY
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {grid.flatMap((row, rowIndex) =>
              row.map((letter, colIndex) => {
                const isHighlight = rowIndex === 0; // highlights PLAY
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`grid aspect-square place-items-center rounded-md border font-black ${tileTextClass} ${
                      isHighlight
                        ? 'border-[#A8CDBA] bg-[#EFF8F1] text-[#286048]'
                        : 'border-[#D8D1C4] bg-white text-[#071A44]'
                    }`}
                  >
                    {letter}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  if (puzzleType === 'sudoku') {
    const values = ['5', '', '8', '', '3', '', '2', '', '9'];
    return (
      <GridPreview
        className={className}
        wrapperClass={wrapperClass}
        cardPad={cardPad}
        values={values}
        tileTextClass={tileTextClass}
        borderClass="border-[#89A4CC]"
        cellClass="border-[#D3DEEE] bg-white text-[#355C92]"
      />
    );
  }

   if (puzzleType === 'numberPath') {
    const values = ['1', '2', '3', '8', '7', '4', '9', '6', '5'];

    return (
      <div className={`${wrapperClass} ${className}`}>
        <div className={`relative w-full max-w-[220px] ${cardPad}`}>
          <svg
            viewBox="0 0 210 210"
            className="absolute inset-0 h-full w-full px-4 py-4"
            aria-hidden="true"
          >
            <path
              d="M38 38 L105 38 L172 38 L172 105 L105 105 L105 172 L172 172"
              fill="none"
              stroke="#E2B06E"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.9"
            />
          </svg>

          <div className="relative grid grid-cols-3 overflow-hidden rounded-[22px] border-2 border-[#8FA7CF] bg-white shadow-sm">
            {values.map((value, index) => {
              const isOnPath = [0, 1, 2, 5, 4, 7, 8].includes(index);

              return (
                <div
                  key={index}
                  className={`grid aspect-square place-items-center border font-black ${tileTextClass} ${
                    isOnPath
                      ? 'border-[#D7E0F0] bg-[#FFF9EF] text-[#355C92]'
                      : 'border-[#D7E0F0] bg-white text-[#355C92]'
                  }`}
                >
                  {value}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

   if (puzzleType === 'nonogram') {
    const topClues = ['1', '3', '1', '1', '1'];
    const sideClues = ['1', '3', '1 1', '3', '1'];

    const filled = new Set([
      '0-2',
      '1-1', '1-2', '1-3',
      '2-0', '2-2',
      '3-1', '3-2', '3-3',
      '4-2',
    ]);

    return (
      <div className={`${wrapperClass} ${className}`}>
        <div className={`w-full max-w-[230px] ${cardPad}`}>
          <div className="mb-2 text-[9px] font-black uppercase tracking-[0.14em] text-[#8B8379]">
            Fill the picture
          </div>

          <div className="grid grid-cols-[30px_repeat(5,minmax(0,1fr))] gap-1">
            <div />
            {topClues.map((clue, index) => (
              <div
                key={index}
                className="grid place-items-center text-[8px] font-black text-[#8B8379]"
              >
                {clue}
              </div>
            ))}

            {sideClues.map((clue, row) => (
              <div key={row} className="contents">
                <div className="grid place-items-center text-[8px] font-black text-[#8B8379]">
                  {clue}
                </div>

                {[0, 1, 2, 3, 4].map(col => {
                  const isFilled = filled.has(`${row}-${col}`);
                  return (
                    <div
                      key={`${row}-${col}`}
                      className={`grid aspect-square place-items-center rounded-[4px] border border-[#D7E0F0] ${
                        isFilled ? 'bg-[#355C92]' : 'bg-white'
                      }`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (puzzleType === 'towersOfHanoi') {
    const disks = [96, 74, 54, 34];
    const diskH = scale === 'hero' ? 18 : scale === 'compact' ? 8 : 12;
    return (
      <div className={`${wrapperClass} ${className}`}>
        <div className={`relative w-full max-w-[230px] ${cardPad}`} style={{ minHeight: scale === 'hero' ? '180px' : scale === 'compact' ? '90px' : '130px' } as CSSProperties}>
          <div className="absolute inset-x-4 bottom-3 h-3 rounded-full bg-[#C8BCAA]" />
          <div className="absolute bottom-3 left-1/2 h-[110px] w-1.5 -translate-x-1/2 rounded-full bg-[#9B8E7D]" />
          {disks.map((width, index) => (
            <div
              key={width}
              className="absolute left-1/2 -translate-x-1/2 rounded-full border border-[#E4AD72] bg-[#FFF0D7]"
              style={{
                width,
                height: diskH,
                bottom: 14 + index * (diskH + 6),
                maxWidth: '90%',
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (puzzleType === 'patternCompletion') {
    const items = ['●', '■', '▲', '●'];
    return (
      <div className={`${wrapperClass} ${className}`}>
        <div className={`flex w-full max-w-[220px] items-center justify-center gap-2 ${cardPad}`}>
          {items.map((item, index) => (
            <div key={index} className={`grid aspect-square w-10 place-items-center rounded-xl border border-[#D7C6F1] bg-[#F5EFFF] font-black text-[#7B57C4] ${tileTextClass}`}>
              {item}
            </div>
          ))}
          <div className={`grid aspect-square w-10 place-items-center rounded-xl border border-dashed border-[#D7C6F1] bg-white font-black text-[#7B57C4] ${tileTextClass}`}>
            ?
          </div>
        </div>
      </div>
    );
  }

  if (puzzleType === 'sequenceOrdering') {
    return (
      <div className={`${wrapperClass} ${className}`}>
        <div className={`w-full max-w-[220px] ${cardPad}`}>
          <div className="flex items-center justify-center gap-2">
            {['3', '1', '4', '2'].map((value, index) => (
              <div key={index} className={`grid aspect-square w-10 place-items-center rounded-xl border border-[#A8CDBA] bg-[#EFF8F1] font-black text-[#286048] ${tileTextClass}`}>
                {value}
              </div>
            ))}
          </div>
          <div className="mt-2 text-center text-[#8B8379]">↓</div>
          <div className="mt-2 flex items-center justify-center gap-2">
            {['1', '2', '3', '4'].map((value, index) => (
              <div key={index} className={`grid aspect-square w-10 place-items-center rounded-xl border border-[#D8D1C4] bg-white font-black text-[#071A44] ${tileTextClass}`}>
                {value}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (puzzleType === 'slidingTile') {
    return (
      <div className={`${wrapperClass} ${className}`}>
        <div className={`grid w-full max-w-[210px] grid-cols-3 overflow-hidden rounded-2xl border-2 border-[#E4AD72] bg-[#FFF7EC] ${cardPad}`}>
          {[1, 2, 3, 4, 5, 6, 7, 8, ''].map((value, index) => (
            <div
              key={index}
              className={`grid aspect-square place-items-center border border-[#EBC99F] font-black ${tileTextClass} ${
                value === ''
                  ? 'bg-[#E1D4C4] text-transparent'
                  : 'bg-[#FFF9F1] text-[#7B4A22]'
              }`}
            >
              {value === '' ? '' : value}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`${wrapperClass} ${className}`}>
      <div className="grid h-24 w-24 place-items-center rounded-[24px] border border-[#E8E0D3] bg-[var(--puzzle-bg-accent)] text-[var(--puzzle-primary)]">
        <PuzzleIcon className="h-10 w-10" />
      </div>
    </div>
  );
}

function GridPreview({
  wrapperClass,
  cardPad,
  values,
  tileTextClass,
  borderClass,
  cellClass,
  className = '',
}: {
  wrapperClass: string;
  cardPad: string;
  values: string[];
  tileTextClass: string;
  borderClass: string;
  cellClass: string;
  className?: string;
}) {
  return (
    <div className={`${wrapperClass} ${className}`}>
      <div className={`grid w-full max-w-[210px] grid-cols-3 overflow-hidden rounded-2xl border-2 bg-white shadow-sm ${borderClass} ${cardPad}`}>
        {values.map((value, index) => (
          <div key={index} className={`grid aspect-square place-items-center border font-black ${tileTextClass} ${cellClass}`}>
            {value}
          </div>
        ))}
      </div>
    </div>
  );
}

function PuzzleIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M9.2 4.5h3.1a2.7 2.7 0 1 1 5.2 0H20v5.1a2.7 2.7 0 1 0 0 5.2V20h-5.2a2.7 2.7 0 1 0-5.2 0H4.5v-5.2a2.7 2.7 0 1 1 0-5.2V4.5h4.7Z"
        fill="currentColor"
      />
    </svg>
  );
}
