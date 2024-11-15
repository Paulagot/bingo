import { BingoCell } from '../types/game';

const BINGO_COLUMNS = [
  { letter: 'B', range: [1, 15] },
  { letter: 'I', range: [16, 30] },
  { letter: 'N', range: [31, 45] },
  { letter: 'G', range: [46, 60] },
  { letter: 'O', range: [61, 75] }
] as const;

function getRandomNumberInRange(min: number, max: number, exclude: Set<number>): number {
  const available = Array.from(
    { length: max - min + 1 },
    (_, i) => min + i
  ).filter(num => !exclude.has(num));

  const randomIndex = Math.floor(Math.random() * available.length);
  return available[randomIndex];
}

export function generateBingoCard(): number[] {
  const usedNumbers = new Set<number>();
  const card: number[] = [];

  // Generate numbers for each column
  BINGO_COLUMNS.forEach(({ range }) => {
    const [min, max] = range;
    const columnNumbers: number[] = [];

    // Generate 5 unique numbers for this column
    while (columnNumbers.length < 5) {
      const num = getRandomNumberInRange(min, max, usedNumbers);
      usedNumbers.add(num);
      columnNumbers.push(num);
    }

    // Sort numbers within the column
    columnNumbers.sort((a, b) => a - b);
    card.push(...columnNumbers);
  });

  return card;
}

export function getLetterForNumber(num: number): string {
  const column = BINGO_COLUMNS.find(({ range }) => {
    const [min, max] = range;
    return num >= min && num <= max;
  });
  return column?.letter || '';
}

export function checkWin(card: BingoCell[]): boolean {
  const winningPatterns = [
    // Rows
    [0, 1, 2, 3, 4],
    [5, 6, 7, 8, 9],
    [10, 11, 12, 13, 14],
    [15, 16, 17, 18, 19],
    [20, 21, 22, 23, 24],
    // Columns
    [0, 5, 10, 15, 20],
    [1, 6, 11, 16, 21],
    [2, 7, 12, 17, 22],
    [3, 8, 13, 18, 23],
    [4, 9, 14, 19, 24],
    // Diagonals
    [0, 6, 12, 18, 24],
    [4, 8, 12, 16, 20]
  ];

  return winningPatterns.some(pattern =>
    pattern.every(index => card[index].marked)
  );
}

export function generateNumber(calledNumbers: number[]): number {
  const calledSet = new Set(calledNumbers);
  const availableNumbers = Array.from({ length: 75 }, (_, i) => i + 1)
    .filter(num => !calledSet.has(num));
  
  if (availableNumbers.length === 0) return 0;
  
  const randomIndex = Math.floor(Math.random() * availableNumbers.length);
  return availableNumbers[randomIndex];
}