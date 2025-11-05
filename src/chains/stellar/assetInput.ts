// src/chains/stellar/assetInput.ts
import { Asset, Operation, TransactionBuilder, Horizon } from '@stellar/stellar-sdk';

export const isContractId = (s: string) => /^C[A-Z2-7]{55}$/.test(s.trim());
export const isClassicAsset = (s: string) =>
  /^[A-Z0-9]{1,12}:G[A-Z2-7]{55}$/.test(s.trim());
export const isNative = (s: string) => s.trim().toUpperCase() === 'XLM';

export type NormalizedToken =
  | { kind: 'contract'; contractId: string }
  | { kind: 'classic'; code: string; issuer?: string; isNative: boolean };

export function parseAssetInput(input: string): NormalizedToken {
  const raw = input.trim();
  if (isContractId(raw)) return { kind: 'contract', contractId: raw };
  if (isNative(raw)) return { kind: 'classic', code: 'XLM', isNative: true };
  if (isClassicAsset(raw)) {
    const [code, issuer] = raw.split(':');
    return { kind: 'classic', code, issuer, isNative: false };
  }
  throw new Error('Enter a contract ID (C…), XLM, or CODE:G… (with issuer).');
}

/**
 * Ensure a Stellar Asset Contract (SAC) exists for a classic (or native) asset.
 * If missing, deploy (wrap) via createStellarAssetContract and return the C… id.
 *
 * You must pass:
 *  - horizon (or soroban) Server
 *  - networkPassphrase
 *  - sourceAccount (payer/public key)
 *  - signAndSubmit(txXdr) that uses your wallet to sign+submit
 *
 * NOTE: This helper leaves a TODO to extract the created contractId from the tx
 * effects/metadata after submission. That piece depends on how you fetch tx
 * results in your app (Horizon vs Soroban RPC).
 */
export async function ensureSacAndGetContractId(opts: {
  server: Horizon.Server;
  networkPassphrase: string;
  sourceAccount: string;
  signAndSubmit: (xdr: string) => Promise<string>; // returns tx hash
  asset: NormalizedToken; // must be classic/native
}): Promise<string> {
  const { server, networkPassphrase, sourceAccount, signAndSubmit, asset } = opts;
  if (asset.kind !== 'classic') throw new Error('Expected a classic/native asset');

  const stellAsset = asset.isNative
    ? Asset.native()
    : new Asset(asset.code, asset.issuer!);

  // 1) Build the wrap op
  const wrapOp = Operation.createStellarAssetContract({ asset: stellAsset });

  // 2) Build and submit tx
  const account = await server.loadAccount(sourceAccount);
  const fee = await server.fetchBaseFee();
  const tx = new TransactionBuilder(account, {
    networkPassphrase,
    fee: fee.toString(),
  })
    .addOperation(wrapOp)
    .setTimeout(180)
    .build();

  const txHash = await signAndSubmit(tx.toXDR());

  // 3) TODO: extract the newly created contractId (C…) from the tx result/effects
  //    - If you already keep a small cache mapping 'code:issuer' → 'C…', update & return here.
  //    - Otherwise, query your RPC / effects endpoint by txHash and pull the contractId.
  // For now, throw to make it visible during testing if not implemented:
  throw new Error(
    `SAC deployed (tx ${txHash}) but contractId extraction not implemented yet. ` +
      `Hook this up to your tx-result reader and cache code:issuer → C…`
  );
}

/**
 * High-level normalizer: return a C… regardless of input form.
 * - If input is C… return as-is
 * - If XLM or CODE:G… → ensure SAC, return C…
 *
 * If you already *know* the SAC addresses for testnet (cache/config),
 * pass a resolver to short-circuit network calls.
 */
export async function normalizeToContractId(params: {
  input: string;
  // optional fast resolver (e.g., your APPROVED_TOKENS map)
  knownResolver?: (codeOrXLM: string, issuer?: string) => string | undefined;
  // required for on-chain ensure step
  server: Horizon.Server;
  networkPassphrase: string;
  sourceAccount: string;
  signAndSubmit: (xdr: string) => Promise<string>;
}): Promise<string> {
  const { input, knownResolver, server, networkPassphrase, sourceAccount, signAndSubmit } =
    params;
  const parsed = parseAssetInput(input);

  if (parsed.kind === 'contract') return parsed.contractId;

  // Optional fast-path: check your known map (XLM or code+issuer)
  if (knownResolver) {
    const fast = parsed.isNative
      ? knownResolver('XLM')
      : knownResolver(parsed.code, parsed.issuer);
    if (fast) return fast;
  }

  // Fall back: ensure/deploy SAC and return its C… id
  return ensureSacAndGetContractId({
    server,
    networkPassphrase,
    sourceAccount,
    signAndSubmit,
    asset: parsed,
  });
}
