import React from 'react';

const fnv1a = (str: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
};

const setCell = (grid: boolean[][], r: number, c: number, val: boolean): void => {
  const row = grid[r];
  if (row && c >= 0 && c < row.length) row[c] = val;
};

export const generateQRGrid = (data: string, size = 25): boolean[][] => {
  const grid: boolean[][] = Array.from({ length: size }, () =>
    new Array<boolean>(size).fill(false),
  );

  let seed = fnv1a(data);
  const rand = (): number => {
    seed ^= seed << 13;
    seed ^= seed >> 17;
    seed ^= seed << 5;
    seed = seed >>> 0;
    return (seed % 100) / 100;
  };

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      setCell(grid, r, c, rand() > 0.5);
    }
  }

  const finderPattern = [
    [1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1],
  ];

  const drawFinder = (startRow: number, startCol: number): void => {
    finderPattern.forEach((patRow, dr) => {
      patRow.forEach((v, dc) => {
        setCell(grid, startRow + dr, startCol + dc, v === 1);
      });
    });
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  for (let i = 8; i < size - 8; i++) {
    setCell(grid, 6, i, i % 2 === 0);
    setCell(grid, i, 6, i % 2 === 0);
  }

  return grid;
};

interface QRCodeSVGProps {
  value: string;
  size?: number;
  cellSize?: number;
  fgColor?: string;
  bgColor?: string;
}

export const QRCodeSVG: React.FC<QRCodeSVGProps> = ({
  value,
  size = 25,
  cellSize = 8,
  fgColor = '#00e5ff',
  bgColor = 'transparent',
}) => {
  const grid = generateQRGrid(value, size);
  const px = size * cellSize;

  const cells: React.ReactElement[] = [];
  grid.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell) {
        cells.push(
          <rect
            key={`${r}-${c}`}
            x={c * cellSize}
            y={r * cellSize}
            width={cellSize}
            height={cellSize}
            fill={fgColor}
          />,
        );
      }
    });
  });

  return (
    <svg
      width={px}
      height={px}
      viewBox={`0 0 ${px} ${px}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      {bgColor !== 'transparent' && (
        <rect width={px} height={px} fill={bgColor} />
      )}
      {cells}
    </svg>
  );
};