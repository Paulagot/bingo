// src/test/basic.test.ts
import { describe, test, expect } from 'vitest';

describe('Basic Test Suite', () => {
  test('Vitest is working correctly', () => {
    expect(1 + 1).toBe(2);
  });

  test('TypeScript is working correctly', () => {
    const testObject: { name: string; score: number } = {
      name: 'Test Player',
      score: 10
    };

    expect(testObject.name).toBe('Test Player');
    expect(testObject.score).toBe(10);
  });

  test('Can create basic quiz types', () => {
    type RoundType = 'general_trivia' | 'speed_round' | 'wipeout';
    
    const roundType: RoundType = 'general_trivia';
    expect(roundType).toBe('general_trivia');
  });

  test('Can work with arrays and objects', () => {
    const players = [
      { id: '1', name: 'Alice', score: 15 },
      { id: '2', name: 'Bob', score: 12 }
    ];

    expect(players).toHaveLength(2);
    expect(players[0].name).toBe('Alice');
    expect(players.find(p => p.name === 'Bob')?.score).toBe(12);
  });
});
