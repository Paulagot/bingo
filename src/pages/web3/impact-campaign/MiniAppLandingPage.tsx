// src/pages/web3/impact-campaign/MiniAppLandingPage.tsx
//
// Slim, mini-app-optimised entry point for Base mini app.
// Shown instead of the full /join page when isMiniApp === true,
// and also served at /web3/impact-campaign/baseapp (the new TARGET_PATH).
//
// No videos. No FAQs. Just: Host → earn → impact, Join → play → donate.

import React, { useCallback, useState } from 'react';
import { Rocket, Users, Heart, Trophy, Zap, Shield, ArrowRight, Sparkles } from 'lucide-react';

import Web3QuizWizard from '../../../components/Quiz/Wizard/Web3QuizWizard';
import { JoinRoomFlow } from '../../../components/Quiz/joinroom/JoinRoomFlow';
import { QuizSocketProvider } from '../../../components/Quiz/sockets/QuizSocketProvider';
import { MiniAppProvider, useMiniAppContext } from '../../../context/MiniAppContext';
import { MiniAppWeb3Provider } from '../../../components/MiniAppWeb3Provider';
import type { SupportedChain } from '../../../chains/types';

// ─── Inner page (needs MiniApp context) ──────────────────────────────────────

const MiniAppLandingInner: React.FC = () => {
  const {  user } = useMiniAppContext();

  const [showWizard, setShowWizard] = useState(false);
  const [showJoin, setShowJoin]     = useState(false);
  const [selectedChain, setSelectedChain] = useState<SupportedChain | null>(null);

  const onWizardComplete = useCallback(() => {
    setShowWizard(false);
    setSelectedChain(null);
  }, []);

  // ── Wizard overlay ──
  if (showWizard) {
    return (
      <Web3QuizWizard
        key="miniapp-wizard"
        selectedChain={selectedChain}
        onComplete={onWizardComplete}
        onChainUpdate={setSelectedChain}
      />
    );
  }

  // ── Join overlay ──
  if (showJoin) {
    return (
      <QuizSocketProvider>
        <JoinRoomFlow
          key="miniapp-join-flow"
          onClose={() => setShowJoin(false)}
          onChainDetected={() => {}}
        />
      </QuizSocketProvider>
    );
  }

  // ── Main landing ──
  return (
    <div className="min-h-screen bg-[#0d0d1a] text-white overflow-x-hidden">

      {/* ── Background glow ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute top-1/2 -right-24 h-72 w-72 rounded-full bg-purple-500/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-lg px-4 pb-12 pt-8">

        {/* ── Header ── */}
        <header className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
            <Sparkles className="h-3 w-3" />
            Web3 Makes an Impact
          </div>

          {/* Personalised greeting when Farcaster user is available */}
          {user && (
            <div className="mb-4 flex items-center justify-center gap-2">
              {user.pfpUrl ? (
                <img
                  src={user.pfpUrl}
                  alt={user.displayName ?? user.username ?? 'User'}
                  className="h-8 w-8 rounded-full border-2 border-indigo-500/50 object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-300">
                 {(user?.displayName ?? user?.username ?? '?').charAt(0).toUpperCase()}
                </div>
              )}
              <p className="text-sm text-slate-400">
                Hey{' '}
                <span className="font-semibold text-white">
                  {user.displayName ?? `@${user.username}`}
                </span>{' '}
                👋
              </p>
            </div>
          )}

          <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">           Host. Play. Raise.{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              Impact.
            </span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400 sm:text-base">
            Host a quiz with your web3 community. Entry fees flow{' '}
            <span className="text-white font-medium">directly to charity on-chain</span> -
            no middlemen, full transparency.
          </p>
        </header>

        {/* ── Charity badges ── */}
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {[
            { icon: '🌍', label: 'Verified Charities' },
            { icon: '⛓️', label: 'On-Chain' },
            { icon: '🔒', label: 'No Custody' },
          ].map(({ icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
            >
              {icon} {label}
            </span>
          ))}
        </div>

        {/* ── Split — % breakdown ── */}
        <div className="mb-8 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-xl font-black text-emerald-400">≥40%</p>
            <p className="mt-0.5 text-[11px] text-slate-400">To Charity</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-black text-indigo-400">~40%</p>
            <p className="mt-0.5 text-[11px] text-slate-400">Prizes</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-black text-purple-400">~5%</p>
            <p className="mt-0.5 text-[11px] text-slate-400">Host Earn</p>
          </div>
        </div>

        {/* ── HOST CARD ── */}
        <div className="mb-4 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-900/50 to-purple-900/30 p-6 backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20">
              <Rocket className="h-5 w-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="font-bold text-white">Host a Quiz</h2>
              <p className="text-xs text-indigo-300">For your DAO, NFT or meme community</p>
            </div>
          </div>

          <ul className="mb-5 space-y-2">
            {[
              { icon: Heart,   text: 'Choose a verified charity to support' },
              { icon: Zap,     text: 'Set entry fee in USDor USDGLO' },
              { icon: Trophy,  text: 'Earn up to 5% of the room as host' },
              { icon: Shield,  text: 'Smart contract splits funds on-chain' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-2.5 text-sm text-slate-300">
                <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-400" />
                {text}
              </li>
            ))}
          </ul>

          <button
            onClick={() => setShowWizard(true)}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white transition-all hover:bg-indigo-500 active:scale-[0.98]"
          >
            Launch Setup Wizard
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>

          <p className="mt-2.5 text-center text-[11px] text-slate-500">
            Live on Base · Setup takes ~2 minutes
          </p>
        </div>

        {/* ── JOIN CARD ── */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <Users className="h-5 w-5 text-slate-300" />
            </div>
            <div>
              <h2 className="font-bold text-white">Join a Quiz</h2>
              <p className="text-xs text-slate-400">Got a room code from your host?</p>
            </div>
          </div>

          <p className="mb-4 text-sm text-slate-400">
            Connect your wallet, pay the entry fee, pick your power-ups and compete -
            your entry goes straight to charity & prizes are automatically distributed on-chain.
          </p>

          <button
            onClick={() => setShowJoin(true)}
            className="group flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 py-3.5 text-sm font-bold text-white transition-all hover:bg-white/15 active:scale-[0.98]"
          >
            Enter Room Code
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* ── Leaderboard nudge ── */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
          <p className="text-xs text-amber-400/80">
            🏆 Every quiz earns campaign leaderboard points.
            Using <strong className="text-amber-300">Glo Dollar (USDGLO)</strong> doubles your score.
          </p>
        </div>

      </div>
    </div>
  );
};

// ─── Exported page — wrapped with mini app providers ─────────────────────────
// This is the default export used at /web3/impact-campaign/baseapp
// It wraps itself so it can be used as a standalone route.

const MiniAppLandingPage: React.FC = () => (
  <MiniAppProvider>
    <MiniAppWeb3Provider>
      <MiniAppLandingInner />
    </MiniAppWeb3Provider>
  </MiniAppProvider>
);

export default MiniAppLandingPage;

// Named export for use inside /join (already wrapped by its own providers)
export { MiniAppLandingInner };