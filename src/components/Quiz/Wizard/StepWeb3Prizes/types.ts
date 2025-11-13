/**
 * StepWeb3Prizes Type Definitions
 */

export type PrizeSource = 'pool' | 'assets';

export const PRIZE_PLACES = [1, 2, 3] as const;

export const placeLabel = (n: number) => (n === 1 ? '1st' : n === 2 ? '2nd' : '3rd');

