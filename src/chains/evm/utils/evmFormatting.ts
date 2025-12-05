/**
 * EVM Formatting Utilities
 * Handles BigInt <-> decimal conversions for token amounts
 */

export function bigintToDecimalString(value: bigint, decimals: number): string {
  const s = value.toString().padStart(decimals + 1, '0');
  const i = s.length - decimals;
  const whole = s.slice(0, i);
  const frac = s.slice(i).replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole;
}

export function decimalToBigint(value: string | number, decimals: number): bigint {
  const n = Number(value || 0);
  if (isNaN(n)) {
    throw new Error(`Invalid number: ${value}`);
  }
  const multiplier = Math.pow(10, decimals);
  return BigInt(Math.floor(n * multiplier));
}

export function percentToBps16(pct: number | undefined): number {
  const n = Number.isFinite(pct as any) ? Number(pct) : 0;
  const clamped = Math.max(0, Math.min(100, n));
  const bps = Math.round(clamped * 100);
  return Math.min(65535, bps);
}