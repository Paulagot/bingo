// src/pages/dev/WalletIframeTestPage.tsx
//
// ONE PURPOSE: answer "does AppKit's connect modal work when this page
// is loaded inside an <iframe> on a foreign origin?" — nothing else.
//
// Deliberately has NO donation logic, no amount picker, no checkout
// call. If this page can't connect a wallet and read an address/chain
// back, nothing built on top of it can either — so isolate the
// question here first.
//
// Wire this in as its own route, e.g.:
//   const WalletIframeTestPage = lazy(() => import('./pages/dev/WalletIframeTestPage'));
//   <Route path="/dev/wallet-iframe-test" element={
//     <Suspense fallback={null}><WalletIframeTestPage /></Suspense>
//   } />
//
// Test it TWO ways, in this order:
//   1. Visit the route directly (no iframe) — confirms AppKit works at
//      all in this app. This should already work; it's not the real test.
//   2. Open standalone-test-harness.html (a plain local file, opened via
//      file:// or a totally separate dev server on a different port) —
//      THIS is the real test, because that file's origin is genuinely
//      different from your app's origin, same as a club's site would be.
//
// Log everything visibly on-page (not just console) because you'll often
// be testing this on a phone with a real wallet app installed, where
// devtools aren't an option.

import { useCallback, useEffect, useState } from 'react';

type Log = { t: string; msg: string };

export default function WalletIframeTestPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [providers, setProviders] = useState<any>(null);
  const [initError, setInitError] = useState<string | null>(null);

  // useCallback with an empty dependency array gives a STABLE function
  // reference across renders. Without this, `log` was a brand-new
  // function every render; any effect listing `log` in its deps would
  // see it as "changed" on every call, re-running itself, calling log()
  // again, triggering another render — an infinite loop. This is what
  // caused the runaway "useAppKit hook module loaded: true" spam.
  const log = useCallback((msg: string) => {
    const t = new Date().toLocaleTimeString();
    // eslint-disable-next-line no-console
    console.log(`[wallet-iframe-test] ${msg}`);
    setLogs((prev) => [...prev, { t, msg }]);
  }, []);

  useEffect(() => {
    log(`Page loaded. window === window.parent: ${window === window.parent} (false means we're in an iframe)`);
    log(`document.location.origin: ${window.location.origin}`);
    try {
      // This will throw if the parent is cross-origin and the browser
      // blocks reading it — which is expected and fine, just logging it.
      log(`Attempting to read window.parent.location.origin (expected to throw if cross-origin)…`);
    
      log(`parent origin readable: ${window.parent.location.origin}`);
    } catch (e: any) {
      log(`Could not read parent origin (expected/normal if cross-origin): ${e?.message}`);
    }

    (async () => {
      try {
        log('Calling initAppKit()…');
        const { initAppKit } = await import('../web3Init');
        await initAppKit();
        log('initAppKit() resolved OK.');

        const [wagmiModule, queryModule, appKitModule] = await Promise.all([
          import('wagmi'),
          import('@tanstack/react-query'),
          import('@reown/appkit/react'),
        ]);
        const { wagmiConfig } = await import('../config/index');

        setProviders({
          WagmiProvider: wagmiModule.WagmiProvider,
          QueryClientProvider: queryModule.QueryClientProvider,
          queryClient: new queryModule.QueryClient(),
          AppKitProvider: appKitModule.AppKitProvider,
          wagmiConfig,
        });
        log('Provider tree ready.');
      } catch (e: any) {
        log(`initAppKit() FAILED: ${e?.message || e}`);
        setInitError(e?.message || String(e));
      }
    })();
    // Empty deps: this must run exactly once on mount. `log` is stable
    // (see useCallback above) so it's safe to omit without missing
    // updates — including it would be a lint-rule nicety, not a
    // correctness requirement, and previously masked the real bug.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (initError) {
    return <TestShell logs={logs}><p style={{ color: 'red' }}>Init failed: {initError}</p></TestShell>;
  }

  if (!providers) {
    return <TestShell logs={logs}><p>Loading AppKit…</p></TestShell>;
  }

  const { AppKitProvider, WagmiProvider, QueryClientProvider, queryClient, wagmiConfig } = providers;

  return (
    <AppKitProvider>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <TestShell logs={logs}>
            <ConnectProbe log={log} />
          </TestShell>
        </WagmiProvider>
      </QueryClientProvider>
    </AppKitProvider>
  );
}

function ConnectProbe({ log }: { log: (msg: string) => void }) {
  const [appKitReady, setAppKitReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { useAppKit } = await import('@reown/appkit/react');
        // Just confirming the hook module loads in this context.
        log(`useAppKit hook module loaded: ${typeof useAppKit === 'function'}`);
        setAppKitReady(true);
      } catch (e: any) {
        log(`Could not load useAppKit: ${e?.message}`);
      }
    })();
    // Run exactly once on mount. `log` is now a stable reference (see
    // useCallback in the parent), so this is safe to leave out of deps
    // — but even if it weren't stable, this effect has no business
    // re-running every time the logging function identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p>AppKit hooks ready: {String(appKitReady)}</p>
      {/* 
        Using the web component directly rather than the React hook's
        .open() call, because the web component is what actually renders
        the modal — this isolates "does the modal element mount and
        render visibly inside this iframe" from any React-specific
        wiring issues. If you can see and click this and a QR/wallet
        list appears, the modal itself works in-iframe.
      */}
      {/* @ts-ignore - appkit-button is a registered custom element from createAppKit() */}
      <appkit-button />
      <p style={{ fontSize: 12, color: '#666' }}>
        Click the button above. Record: (1) did a modal appear at all,
        (2) was a QR code visible/scannable or did extensions list
        correctly, (3) after connecting, does the button update to show
        a connected address?
      </p>
    </div>
  );
}

function TestShell({ children, logs }: { children: React.ReactNode; logs: Log[] }) {
  return (
    <div style={{ fontFamily: 'monospace', padding: 16, fontSize: 14 }}>
      <h2 style={{ fontSize: 16 }}>Wallet-in-iframe test</h2>
      {children}
      <hr style={{ margin: '16px 0' }} />
      <div style={{ background: '#111', color: '#0f0', padding: 8, maxHeight: 240, overflow: 'auto' }}>
        {logs.map((l, i) => (
          <div key={i}>[{l.t}] {l.msg}</div>
        ))}
      </div>
    </div>
  );
}