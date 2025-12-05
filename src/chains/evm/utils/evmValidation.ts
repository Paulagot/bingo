/**
 * EVM Validation Utilities
 */

export function isEvmAddress(value?: string | null): value is `0x${string}` {
  return !!value && /^0x[0-9a-fA-F]{40}$/.test(value);
}

export function isEvmTxHash(value?: string | null): value is `0x${string}` {
  return !!value && /^0x[0-9a-fA-F]{64}$/.test(value);
}

export function assertEvmAddress(value: unknown, fieldName: string): asserts value is `0x${string}` {
  if (!isEvmAddress(value as string)) {
    throw new Error(`${fieldName} is not a valid EVM address: ${value}`);
  }
}