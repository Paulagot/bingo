// src/pages/web3/impact-campaign/join.tsx
import React, { useMemo, useCallback, useState } from 'react';
import { SEO } from '../../../components/SEO';
import { Link } from 'react-router-dom';
import {
  Rocket,
  Users,
  PlusCircle,
  QrCode,
  Sparkles,
  Shield,
  Wallet,
  Trophy,
 
} from 'lucide-react';

import Web3QuizWizard from '../../../components/Quiz/Wizard/Web3QuizWizard';
import { JoinRoomFlow } from '../../../components/Quiz/joinroom/JoinRoomFlow';
import { QuizSocketProvider } from '../../../components/Quiz/sockets/QuizSocketProvider';
import type { SupportedChain } from '../../../chains/types';

/** Absolute URL helpers */
function getOrigin(): string {
  const env = (import.meta as any)?.env?.VITE_SITE_ORIGIN as string | undefined;
  if (env) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin.replace(/\/$/, '');
  return 'https://fundraisely.ie';
}
function abs(path: string): string { 
  const p = path.startsWith('/') ? path : `/${path}`; 
  return `${getOrigin()}${p}`; 
}

// Simple local chain config for UI; ids should match your SupportedChain type
const CHAINS: Array<{
  id: SupportedChain;
  name: string;
  blurb: string;
  badge: string;
  gradient: string;
}> = [
  // {
  //   id: 'solana' as SupportedChain,
  //   name: 'Solana',
  //   blurb: 'Fast, low fees — ideal for live events.',
  //   badge: 'SOL • USDC • PYUSD',
  //   gradient: 'from-purple-500 to-pink-500',
  // },
  {
    id: 'stellar' as SupportedChain,
    name: 'Stellar testnet',
    blurb: 'Direct-to-charity friendly rails.',
    badge: 'XLM • USDC • USDGLO',
    gradient: 'from-blue-500 to-cyan-500',
  },
  // {
  //   id: 'base' as SupportedChain,
  //   name: 'Base',
  //   blurb: 'L2 UX with native USDC.',
  //   badge: 'USDC • USDGLO',
  //   gradient: 'from-blue-600 to-indigo-600',
  // },
];

const JoinImpactCampaignPage: React.FC = () => {
  const [selectedChain, setSelectedChain] = useState<SupportedChain | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const onPickChain = useCallback((c: SupportedChain) => {
    setSelectedChain(c);
    setShowWizard(true);
  }, []);

  const onWizardComplete = useCallback(() => {
    setShowWizard(false);
    setSelectedChain(null);
  }, []);

  const isAnyModalOpen = showWizard || showJoinModal;

  const pageTitle = useMemo(
    () => 'Host or Join a Web3 Quiz — Impact Campaign (Nov–Jan) | FundRaisely',
    []
  );

  // Structured data following SEO strategy
  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
      { '@type': 'ListItem', position: 2, name: 'Web3', item: abs('/web3') },
      { '@type': 'ListItem', position: 3, name: 'Impact Campaign', item: abs('/web3/impact-campaign') },
      { '@type': 'ListItem', position: 4, name: 'Join', item: abs('/web3/impact-campaign/join') }
    ]
  };

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Host or Join a Web3 Quiz — Impact Campaign',
    description: 'Spin up a Web3 quiz or join an existing room for the Web3 Impact Campaign. Choose Solana, Stellar, or Base and raise on-chain for verified charities.',
    url: abs('/web3/impact-campaign/join'),
    isPartOf: {
      '@type': 'WebSite',
      url: abs('/')
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <SEO
        title={pageTitle}
        description="Spin up a Web3 quiz or join an existing room for the Web3 Impact Campaign. Choose Solana, Stellar, or Base and raise on-chain for verified charities."
        keywords="host web3 quiz, join crypto fundraiser, blockchain charity quiz, Solana fundraising, Stellar fundraising, Base fundraising, DAO quiz host"
        type="website"
        structuredData={[breadcrumbsJsonLd, webPageJsonLd]}
        domainStrategy="geographic"
      />

      {!isAnyModalOpen && (
        <>
          {/* Hero */}
{/* Hero */}
<section className="relative px-4 pt-12 pb-8">
  <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-purple-300/30 blur-2xl" />
  <div className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-indigo-300/30 blur-2xl" />
  
  <div className="container relative z-10 mx-auto max-w-6xl text-center">

    <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-indigo-700 text-sm font-medium">
      <Sparkles className="h-4 w-4" /> Web3 Impact Campaign · Nov–Jan
    </span>

    <h1 className="mt-4 bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent text-4xl md:text-6xl font-bold">
      Host or Join a Web3 Quiz
    </h1>

    <p className="mt-4 mx-auto max-w-3xl text-indigo-900/70 text-lg md:text-xl leading-relaxed">
      Create a quiz for your community or jump into an existing room. Smart-contract managed, no custody, audit-ready.
    </p>
  </div>
</section>

          {/* Two paths: Host / Join */}
          <section className="px-4 py-12">
            <div className="container mx-auto max-w-6xl">
              <div className="grid gap-8 lg:grid-cols-2">
                {/* Host a Quiz */}
                <div className="rounded-2xl border border-indigo-100 bg-white p-8 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                    <Rocket className="h-4 w-4" />
                    <span className="text-xs font-semibold">Host</span>
                  </div>
                  
                  <h2 className="text-indigo-900 mb-3 text-2xl font-bold">Create a Web3 Quiz</h2>
                  
                  <p className="text-indigo-900/80 mb-6 leading-relaxed">
                    Pick a chain, set your splits, add prizes, and go live. Your funds route on-chain with a minimum 40% to charity, up to 40% host-controlled (prizes + optional host take), and 20% platform for tools-for-good.
                  </p>

                  {/* Chain picker */}
                  <div className="mb-6">
                    <h3 className="text-indigo-900 mb-3 text-sm font-semibold">Choose Your Chain</h3>
                    <div className="grid gap-3">
                      {CHAINS.map((c) => (
                        <button
                          key={c.id as string}
                          onClick={() => onPickChain(c.id)}
                          className="group flex items-center gap-4 rounded-xl border border-indigo-100 bg-white p-4 text-left transition-all hover:border-indigo-300 hover:shadow-md"
                        >
                          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${c.gradient} shadow-md group-hover:shadow-lg transition-all`}>
                            <Wallet className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-indigo-900 mb-1">{c.name}</div>
                            <div className="text-xs text-indigo-900/60">{c.blurb}</div>
                            <div className="mt-2 inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                              {c.badge}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setShowWizard(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 shadow-md transition-colors"
                    >
                      <PlusCircle className="h-5 w-5" />
                      Launch Wizard
                    </button>
                    
                  </div>
                </div>

                {/* Join a Quiz */}
                <div className="rounded-2xl border border-indigo-100 bg-white p-8 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-indigo-700">
                    <Users className="h-4 w-4" />
                    <span className="text-xs font-semibold">Join</span>
                  </div>
                  
                  <h2 className="text-indigo-900 mb-3 text-2xl font-bold">Join an Existing Quiz</h2>
                  
                  <p className="text-indigo-900/80 mb-6 leading-relaxed">
                    Have a room code or link from a host? Open the join flow, connect a wallet, select in game extras ( you will need them!), pay the fee and you're in.
                  </p>

                  <div className="flex flex-wrap gap-3 mb-6">
                    <button
                      onClick={() => setShowJoinModal(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 shadow-md transition-colors"
                    >
                      <QrCode className="h-5 w-5" />
                      Join Room
                    </button>
                    <Link
                      to="/web3/impact-campaign/leaderboard"
                      className="inline-flex items-center gap-2 rounded-xl border-2 border-emerald-600 bg-white px-6 py-3 font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors"
                    >
                      <Trophy className="h-5 w-5" />
                      View Leaderboard
                    </Link>
                  </div>

                  {/* Trust strip */}
                  <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50 p-6">
                    <h3 className="text-indigo-900 mb-4 text-sm font-semibold">Why Join the Campaign?</h3>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-lg bg-white p-3 shadow-sm">
                        <Shield className="mx-auto mb-2 h-6 w-6 text-indigo-600" />
                        <div className="text-[11px] font-semibold text-indigo-900">No Custody</div>
                      </div>
                      <div className="rounded-lg bg-white p-3 shadow-sm">
                        <Wallet className="mx-auto mb-2 h-6 w-6 text-indigo-600" />
                        <div className="text-[11px] font-semibold text-indigo-900">On-Chain Receipts</div>
                      </div>
                      <div className="rounded-lg bg-white p-3 shadow-sm">
                        <Trophy className="mx-auto mb-2 h-6 w-6 text-indigo-600" />
                        <div className="text-[11px] font-semibold text-indigo-900">Campaign Points</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Supported chains & tokens (concise recap) */}
          <section className="px-4 py-12 bg-gradient-to-r from-purple-50 to-indigo-50">
            <div className="container mx-auto max-w-6xl">
              <div className="rounded-2xl border border-indigo-100 bg-white p-8 shadow-sm">
                <h2 className="text-indigo-900 mb-6 text-2xl font-bold">Supported Chains & Tokens (2025)</h2>
                <div className="grid gap-8 md:grid-cols-3 mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                        SOL
                      </div>
                      <h3 className="text-indigo-900 font-bold text-lg">Solana</h3>
                    </div>
                    <p className="text-sm text-indigo-900/70">SOL · USDC · PYUSD</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                        XLM
                      </div>
                      <h3 className="text-indigo-900 font-bold text-lg">Stellar</h3>
                    </div>
                    <p className="text-sm text-indigo-900/70">XLM · USDC · USDGLO</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                        BASE
                      </div>
                      <h3 className="text-indigo-900 font-bold text-lg">Base</h3>
                    </div>
                    <p className="text-sm text-indigo-900/70">USDC (native) · USDGLO</p>
                  </div>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-800">
                    <Trophy className="h-4 w-4" />
                    <span>Using <strong>Glo Dollar (USDGLO)</strong> doubles your quiz points on the campaign leaderboard</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="px-4 py-12">
            <div className="container mx-auto max-w-6xl">
              <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-12 shadow-lg text-center text-white">
                <h2 className="mb-4 text-3xl md:text-4xl font-bold">Ready to Make an Impact?</h2>
                <p className="mb-8 text-lg opacity-90 max-w-3xl mx-auto leading-relaxed">
                  Whether you're hosting or joining, every quiz contributes to transparent, on-chain fundraising for verified charities. Let's build something meaningful together.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <button
                    onClick={() => setShowWizard(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-bold text-indigo-600 hover:scale-105 hover:bg-indigo-50 shadow-lg transition-all"
                  >
                    <Rocket className="h-5 w-5" />
                    Host a Quiz
                  </button>
                  <button
                    onClick={() => setShowJoinModal(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 border-2 border-white px-8 py-4 text-lg font-bold text-white hover:bg-white/20 transition-all"
                  >
                    <Users className="h-5 w-5" />
                    Join a Quiz
                  </button>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Modals */}
      {showWizard && (
        <Web3QuizWizard
          key="impact-join-wizard"
          selectedChain={selectedChain}
          onComplete={onWizardComplete}
          onChainUpdate={setSelectedChain}
        />
      )}

      {showJoinModal && (
        <QuizSocketProvider>
          <JoinRoomFlow
            key="impact-join-flow"
            onClose={() => setShowJoinModal(false)}
            onChainDetected={() => {
              /* optional: hook chain detection to UX here */
            }}
          />
        </QuizSocketProvider>
      )}
    </div>
  );
};

export default JoinImpactCampaignPage;

