import React, { useState} from 'react';
import { Web3Provider } from '../Web3Provider';

import { CHARITIES, getCharityById } from '../../chains/evm/config/gbcharities';
import { SOLANA_TOKEN_LIST, SOLANA_TOKENS } from '../../chains/solana/config/solanaTokenConfig';
import { useEliminationWeb3Launch } from './hooks/useEliminationWeb3Launch';
import type { EliminationWeb3Config } from './hooks/useEliminationWeb3Launch';

// ── Config ────────────────────────────────────────────────────────────────────
// For now Solana devnet only — add more chains as you enable them
const CLUSTER = 'devnet' as const;
const CHAIN = 'solana' as const;


// ── Inner component (inside Web3Provider) ─────────────────────────────────────
const EliminationWeb3Inner: React.FC = () => {
  const [hostName, setHostName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('USDC');
  const [entryFeeDisplay, setEntryFeeDisplay] = useState('');
  const [charityId, setCharityId] = useState<string>('');

  const selectedToken = SOLANA_TOKENS[tokenSymbol as keyof typeof SOLANA_TOKENS];
  const charity = charityId ? getCharityById(Number(charityId)) : null;

  // Convert display amount to base units
  const entryFeeBase = selectedToken && entryFeeDisplay
    ? Math.round(parseFloat(entryFeeDisplay) * Math.pow(10, selectedToken.decimals))
    : 0;

    const WSOL_MINT = 'So11111111111111111111111111111111111111112';

  const config: EliminationWeb3Config = {
    hostName,
    web3Chain: CHAIN,
    solanaCluster: CLUSTER,
    feeMint: selectedToken?.isNative
    ? WSOL_MINT
    : (selectedToken?.mint ?? ''), 
    entryFee: entryFeeBase,
    entryFeeDisplay,
    tokenSymbol,
    charityOrgId: charityId ? Number(charityId) : null,
    charityName: charity?.name ?? null,
  };

  const {
    walletAddress,
    isConnected,
    networkInfo,
    handleConnect,
    handleDisconnect,
    launchState,
    error,
    canLaunch,
    isLaunching,
    handleLaunch,
  } = useEliminationWeb3Launch(config);

  const isReady =
    hostName.trim().length >= 2 &&
    !!entryFeeDisplay &&
    parseFloat(entryFeeDisplay) > 0 &&
    !!charityId;

  return (
    
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: '#0a0a0f', fontFamily: "'Barlow Condensed', sans-serif" }}
    >
        <style>{`
  .elim-select option {
    background: #1a1a2e;
    color: #ffffff;
  }
`}</style>
      {/* Header */}
      <div className="mb-10 text-center">
        <div style={{ fontSize: '11px', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '8px' }}>
          FundRaisely · Web3
        </div>
        <h1 style={{ fontSize: '48px', fontWeight: 800, color: '#ffffff', lineHeight: 1, marginBottom: '8px' }}>
          ELIMINATION
        </h1>
        <div style={{ fontSize: '13px', color: 'rgba(0,229,255,0.7)', letterSpacing: '0.1em' }}>
          On-chain prize pool · Solana devnet
        </div>
      </div>

      <div className="w-full max-w-sm space-y-4">

        {/* Host name */}
        <div>
          <label style={labelStyle}>Your name</label>
          <input
            value={hostName}
            onChange={e => setHostName(e.target.value)}
            placeholder="Host display name"
            maxLength={30}
            style={inputStyle}
          />
        </div>

        {/* Token */}
        <div>
          <label style={labelStyle}>Entry fee token</label>
          <select className="elim-select"
            value={tokenSymbol}
            onChange={e => setTokenSymbol(e.target.value)}
            style={inputStyle}
          >
            {SOLANA_TOKEN_LIST.map(code => (
              <option key={code} value={code}>
                {code} — {SOLANA_TOKENS[code as keyof typeof SOLANA_TOKENS].name}
              </option>
            ))}
          </select>
        </div>

        {/* Entry fee */}
        <div>
          <label style={labelStyle}>Entry fee ({tokenSymbol})</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={entryFeeDisplay}
            onChange={e => setEntryFeeDisplay(e.target.value)}
            placeholder="e.g. 1.00"
            style={inputStyle}
          />
          {selectedToken?.minEntryFee && (
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
              Min: {selectedToken.minEntryFee} {tokenSymbol}
            </p>
          )}
        </div>

        {/* Charity */}
        <div>
          <label style={labelStyle}>Charity</label>
          <select className="elim-select"
            value={charityId}
            onChange={e => setCharityId(e.target.value)}
            style={inputStyle}
          >
            <option value="">Select a charity...</option>
            {CHARITIES.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Wallet connection */}
      
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
            {!isConnected ? (
              <button onClick={handleConnect} style={btnPrimaryStyle}>
                Connect Solana Wallet
              </button>
            ) : (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: 'rgba(0,229,255,0.7)', marginBottom: '4px' }}>
                  ✓ Connected · {networkInfo.expectedNetwork}
                </div>
                <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)' }}>
                  {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                </div>
                <button
                  onClick={handleDisconnect}
                  style={{ marginTop: '6px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '11px', cursor: 'pointer' }}
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
       

        {/* Error */}
        {error && (
          <p style={{ color: '#ff3b5c', fontSize: '12px', fontFamily: 'monospace' }}>
            {error}
          </p>
        )}

        {/* Launch button */}
        <button
          onClick={handleLaunch}
          disabled={!canLaunch}
          style={{
            ...btnPrimaryStyle,
            opacity: canLaunch ? 1 : 0.4,
            cursor: canLaunch ? 'pointer' : 'not-allowed',
          }}
        >
          {isLaunching
            ? launchState === 'deploying'
              ? 'Deploying contract...'
              : 'Creating room...'
            : launchState === 'success'
            ? '✓ Launching...'
            : 'Deploy & Launch Game'}
        </button>

        {/* Summary */}
        {isReady && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', lineHeight: 1.6 }}>
              Players pay {entryFeeDisplay || '—'} {tokenSymbol} on-chain to join.
              Prize pool distributed to winner, host, platform, and {charity?.name ?? 'charity'} automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Outer wrapper — mounts Web3Provider ───────────────────────────────────────
// EliminationWeb3Page.tsx — fix the wrapper
export const EliminationWeb3Page: React.FC = () => (
  <Web3Provider force={true}>
    <EliminationWeb3Inner />
  </Web3Provider>
);

// ── Styles ────────────────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  letterSpacing: '0.15em',
  color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase',
  marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '15px',
  outline: 'none',
  fontFamily: "'Barlow Condensed', sans-serif",
  // ── ADD THESE TWO ──
  colorScheme: 'dark',          // tells browser to render option dropdowns in dark mode
} as React.CSSProperties;

const btnPrimaryStyle: React.CSSProperties = {
  width: '100%',
  padding: '16px',
  background: 'rgba(0,229,255,0.15)',
  border: '1px solid rgba(0,229,255,0.6)',
  borderRadius: '8px',
  color: '#00e5ff',
  fontSize: '14px',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  fontFamily: "'Barlow Condensed', sans-serif",
};