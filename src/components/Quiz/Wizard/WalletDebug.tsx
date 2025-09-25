// src/components/WalletDebugPanel.tsx

import { useStellarWalletContext } from '../../../chains/stellar/StellarWalletProvider';
import { getStellarWalletsKitSingleton, stellarStorageKeys } from '../../../chains/stellar/config';
import { useWalletStore } from '../../../stores/walletStore';
// src/components/WalletDebugPanel.tsx
import React, { useEffect, useMemo, useState } from 'react';

// Room-driven, chain-agnostic read interface
import useQuizChainIntegration from '../../../hooks/useQuizChainIntegration';


type Jsonish = unknown;

const Box: React.FC<{ title: string; color?: string; children: React.ReactNode }> = ({
  title,
  color = '#1f2937',
  children,
}) => (
  <div style={{ marginBottom: 12 }}>
    <h4 style={{ margin: '0 0 6px 0', color, fontSize: 12, fontWeight: 700 }}>{title}</h4>
    <div style={{ background: '#f9fafb', padding: 8, borderRadius: 6, border: '1px solid #e5e7eb' }}>
      {children}
    </div>
  </div>
);

const Row: React.FC<{ k: string; v: React.ReactNode }> = ({ k, v }) => (
  <div style={{ display: 'flex', gap: 8, fontFamily: 'monospace', fontSize: 11 }}>
    <div style={{ minWidth: 160, opacity: 0.75 }}>{k}</div>
    <div style={{ wordBreak: 'break-word' }}>{typeof v === 'string' ? v : String(v)}</div>
  </div>
);

const safeJson = (o: Jsonish) => {
  try {
    return JSON.stringify(o, null, 2);
  } catch {
    return String(o);
  }
};

const JsonView: React.FC<{ data: Jsonish }> = ({ data }) => (
  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11 }}>
    {safeJson(data)}
  </pre>
);

export default function WalletDebugPanel() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [kitInfo, setKitInfo] = useState<any | null>(null);
  const [kitLoading, setKitLoading] = useState(false);

  const chain = useQuizChainIntegration();

  // store slices (so you can see underlying state per chain)
  const { activeChain, stellar, evm, solana } = useWalletStore((s) => ({
    activeChain: s.activeChain,
    stellar: s.stellar,
    evm: s.evm,
    solana: s.solana,
  }));

  // try context; if no provider, keep null (no crash)
  let stellarCtx: ReturnType<typeof useStellarWalletContext> | null = null;
  try {
    stellarCtx = useStellarWalletContext();
  } catch {
    stellarCtx = null;
  }

  // WalletsKit (only if stellar provider is mounted)
  const walletsKit = useMemo(() => {
    const net = (stellarCtx?.currentNetwork as any) ?? 'testnet';
    try {
      return getStellarWalletsKitSingleton(net);
    } catch {
      return null;
    }
  }, [stellarCtx?.currentNetwork]);

  const log = (m: string) =>
    setLogs((prev) => [...prev.slice(-200), `${new Date().toLocaleTimeString()}  ${m}`]);

  const refreshKitInfo = async () => {
    if (!walletsKit) {
      setKitInfo({ exists: false });
      return;
    }
    setKitLoading(true);
    try {
      const [addr, net, supported] = await Promise.allSettled([
        walletsKit.getAddress(),
        walletsKit.getNetwork(),
        walletsKit.getSupportedWallets(),
      ]);
      setKitInfo({
        exists: true,
        address: addr.status === 'fulfilled' ? addr.value : { error: String(addr.reason) },
        network: net.status === 'fulfilled' ? net.value : { error: String(net.reason) },
        supportedWallets:
          supported.status === 'fulfilled' ? supported.value : { error: String(supported.reason) },
      });
      log('Stellar Wallets Kit refreshed');
    } catch (e) {
      setKitInfo({ exists: true, error: String(e) });
      log('Stellar Wallets Kit error: ' + String(e));
    } finally {
      setKitLoading(false);
    }
  };

  useEffect(() => {
    if (open && walletsKit) refreshKitInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, walletsKit]);

  const fmtAddr = (a?: string | null) =>
    !a ? '—' : a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-6)}` : a;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          width: 48,
          height: 48,
          borderRadius: '50%',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          fontSize: 20,
          cursor: 'pointer',
          zIndex: 1000,
          boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
        }}
        title="Open Wallet Debug"
      >
        🐛
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 10,
        left: 10,
        right: 10,
        bottom: 10,
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        zIndex: 1000,
        boxShadow: '0 10px 24px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: '#111827',
          color: 'white',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 13,
        }}
      >
        <div style={{ fontWeight: 700 }}>Wallet Debug (Multichain)</div>
        <button
          onClick={() => setOpen(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: 20,
            cursor: 'pointer',
            lineHeight: 1,
          }}
          title="Close"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 12, overflow: 'auto' }}>
        {/* Left column */}
        <div>
          <Box title="Chain View (room-driven)" color="#7c3aed">
            <Row k="selectedChain" v={String(chain.selectedChain ?? 'null')} />
            <Row k="activeChain (store)" v={String(chain.activeChain ?? 'null')} />
            <Row k="isWalletConnected" v={chain.isWalletConnected ? 'YES' : 'NO'} />
            <Row k="isWalletConnecting" v={chain.isWalletConnecting ? 'YES' : 'NO'} />
            <Row k="needsWalletConnection" v={chain.needsWalletConnection ? 'YES' : 'NO'} />
            <Row
              k="walletReadiness"
              v={`${chain.walletReadiness.status} — ${chain.walletReadiness.message}`}
            />
            <Row k="address" v={fmtAddr(chain.currentWallet?.address)} />
            <Row k="source" v={(chain.debugInfo as any)?.chainSource ?? 'unknown'} />
            <Row k="config.web3Chain" v={(chain.debugInfo as any)?.configWeb3Chain ?? '—'} />
            <Row k="setup.web3Chain" v={(chain.debugInfo as any)?.setupWeb3Chain ?? '—'} />
            <Row k="hasEntryFee" v={(chain.debugInfo as any)?.hasEntryFee ? 'YES' : 'NO'} />
          </Box>

          <Box title="Store: Active + Slices">
            <Row k="store.activeChain" v={String(activeChain ?? 'null')} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>stellar</div>
                <JsonView
                  data={{
                    isConnected: !!stellar?.isConnected,
                    isConnecting: !!stellar?.isConnecting,
                    address: stellar?.address,
                    balance: stellar?.balance,
                  }}
                />
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>evm</div>
                <JsonView
                  data={{
                    isConnected: !!evm?.isConnected,
                    isConnecting: !!evm?.isConnecting,
                    address: evm?.address,
                    balance: (evm as any)?.balance,
                  }}
                />
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>solana</div>
                <JsonView
                  data={{
                    isConnected: !!solana?.isConnected,
                    isConnecting: !!solana?.isConnecting,
                    address: solana?.address,
                    balance: (solana as any)?.balance,
                  }}
                />
              </div>
            </div>
          </Box>

          <Box title="Local Storage (Stellar)">
            <Row k={stellarStorageKeys.WALLET_ID} v={localStorage.getItem(stellarStorageKeys.WALLET_ID) ?? '—'} />
            <Row
              k={stellarStorageKeys.LAST_ADDRESS}
              v={fmtAddr(localStorage.getItem(stellarStorageKeys.LAST_ADDRESS))}
            />
            <Row k={stellarStorageKeys.AUTO_CONNECT} v={localStorage.getItem(stellarStorageKeys.AUTO_CONNECT) ?? '—'} />
          </Box>
        </div>

        {/* Right column */}
        <div>
          <Box title="Stellar Context (if provider mounted)" color="#059669">
            {stellarCtx ? (
              <>
                <Row k="isInitialized" v={stellarCtx.isInitialized ? 'YES' : 'NO'} />
                <Row k="currentNetwork" v={String(stellarCtx.currentNetwork)} />
                <Row k="ctx.wallet.isConnected" v={stellarCtx.wallet.isConnected ? 'YES' : 'NO'} />
                <Row k="ctx.wallet.address" v={fmtAddr(stellarCtx.wallet.address)} />
                <Row k="ctx.wallet.balance" v={stellarCtx.wallet.balance ?? '—'} />
                <Row k="ctx.wallet.error" v={stellarCtx.wallet.error?.message ?? '—'} />
                <div style={{ marginTop: 6 }}>
                  <button
                    onClick={refreshKitInfo}
                    disabled={kitLoading}
                    style={{
                      padding: '6px 10px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    {kitLoading ? 'Loading…' : 'Refresh WalletsKit'}
                  </button>
                </div>
                {kitInfo && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>StellarWalletsKit</div>
                    <JsonView data={kitInfo} />
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 12, color: '#065f46' }}>
                ⚠️ No Stellar provider mounted here. (Panel still shows store state on the left.)
              </div>
            )}
          </Box>

          <Box title="Logs">
            <div
              style={{
                background: '#111827',
                color: '#e5e7eb',
                borderRadius: 6,
                padding: 8,
                maxHeight: 220,
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: 11,
              }}
            >
              {logs.length === 0 ? (
                <div style={{ opacity: 0.7 }}>No logs yet…</div>
              ) : (
                logs.map((l, i) => <div key={i}>{l}</div>)
              )}
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <button
                onClick={() => {
                  // @ts-ignore
                  if (typeof window !== 'undefined' && window.__walletStore) {
                    // @ts-ignore
                    const s = window.__walletStore.getState();
                    log(
                      'Dump store: ' +
                        safeJson({
                          activeChain: s.activeChain,
                          stellar: s.stellar,
                          evm: s.evm,
                          solana: s.solana,
                        })
                    );
                  } else {
                    log('window.__walletStore is not set (optional dev helper)');
                  }
                }}
                style={{
                  padding: '6px 10px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                Dump Store
              </button>
              <button
                onClick={() => setLogs([])}
                style={{
                  padding: '6px 10px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                Clear Logs
              </button>
            </div>
          </Box>
        </div>
      </div>
    </div>
  );
}
