import type React from 'react';
import { SEO } from '../../components/SEO';
import { Header } from '../../components/GeneralSite2/Header';
import SiteFooter from '../../components/GeneralSite2/SiteFooter';
import { Link } from 'react-router-dom';
import {
  Wallet,
  Network,
  Coins,
  ShieldCheck,
  Receipt,
  Zap,
  ArrowRight,
  Globe2,
  HeartHandshake,
  Factory as FactoryIcon,
  Building2,
  GitPullRequest,
  ChevronRight,
  Clock,
  Sparkles,
  Target,
  Check,
} from 'lucide-react';

/** Absolute URL helpers */
function getOrigin(): string {
  const env = (import.meta as any)?.env?.VITE_SITE_ORIGIN as string | undefined;
  if (env) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin.replace(/\/$/, '');
  return 'https://fundraisely.ie';
}
function abs(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${getOrigin()}${p}`;
}

/** Feature Card Component */
const FeatureCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  desc: string;
  gradient?: string;
}> = ({ icon, title, desc, gradient }) => (
  <div className="group relative rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-lg transition-all duration-300">
    <div
      className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg group-hover:shadow-xl transition-all duration-300 ${
        gradient ?? 'from-indigo-600 to-purple-600'
      }`}
    >
      <div className="text-white">{icon}</div>
    </div>
    <h3 className="text-indigo-900 text-lg font-bold mb-2">{title}</h3>
    <p className="text-indigo-800/70 leading-relaxed">{desc}</p>

    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
  </div>
);

/** Bullet Component */
const Bullet: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-3">
    <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
    <span className="text-indigo-800/80 leading-relaxed">{children}</span>
  </li>
);

/** Contract Architecture Diagram */
function ContractArchitectureDiagram() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <GitPullRequest className="h-6 w-6 text-indigo-600" />
        <h2 className="text-indigo-900 text-2xl font-bold">Contract Architecture Overview</h2>
      </div>
      <p className="mb-6 text-indigo-800/70 leading-relaxed">
        Each fundraiser is a <strong>Room Contract</strong> deployed via the <strong>Factory</strong>. Players pay
        into the room; on completion, payouts are executed on-chain to the chosen <strong>Charity</strong> (and, if
        configured, <strong>Prizes</strong> and <strong>Host</strong>), with receipts emitted for transparent
        auditing.
      </p>

      <div className="overflow-x-auto">
        <svg
          role="img"
          aria-label="Contract Architecture Diagram"
          viewBox="0 0 1200 320"
          className="mx-auto h-64 w-[1100px] min-w-[800px]"
        >
          {/* Nodes */}
          {/* Factory */}
          <g transform="translate(40,120)">
            <rect rx="16" width="220" height="80" fill="#EEF2FF" stroke="#6366F1" strokeWidth="2" />
            <foreignObject x="0" y="0" width="220" height="80">
              <div className="flex h-full w-full items-center justify-center gap-2">
                <FactoryIcon className="h-5 w-5 text-indigo-600" />
                <span className="text-sm font-semibold text-indigo-900">FundRaisely Factory</span>
              </div>
            </foreignObject>
          </g>

          {/* Room Contract */}
          <g transform="translate(380,120)">
            <rect rx="16" width="240" height="80" fill="#ECFEFF" stroke="#06B6D4" strokeWidth="2" />
            <foreignObject x="0" y="0" width="240" height="80">
              <div className="flex h-full w-full items-center justify-center gap-2">
                <Building2 className="h-5 w-5 text-cyan-600" />
                <span className="text-sm font-semibold text-cyan-900">Room Contract (Per Event)</span>
              </div>
            </foreignObject>
          </g>

          {/* Charity */}
          <g transform="translate(760,40)">
            <rect rx="16" width="200" height="70" fill="#ECFDF5" stroke="#10B981" strokeWidth="2" />
            <foreignObject x="0" y="0" width="200" height="70">
              <div className="flex h-full w-full items-center justify-center gap-2">
                <HeartHandshake className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-900">Charity</span>
              </div>
            </foreignObject>
          </g>

          {/* Prizes */}
          <g transform="translate(760,125)">
            <rect rx="16" width="200" height="70" fill="#F5F3FF" stroke="#8B5CF6" strokeWidth="2" />
            <foreignObject x="0" y="0" width="200" height="70">
              <div className="flex h-full w-full items-center justify-center gap-2">
                <Zap className="h-5 w-5 text-violet-600" />
                <span className="text-sm font-semibold text-violet-900">Prize Payouts</span>
              </div>
            </foreignObject>
          </g>

          {/* Host */}
          <g transform="translate(760,210)">
            <rect rx="16" width="200" height="70" fill="#FFF7ED" stroke="#F59E0B" strokeWidth="2" />
            <foreignObject x="0" y="0" width="200" height="70">
              <div className="flex h-full w-full items-center justify-center gap-2">
                <Globe2 className="h-5 w-5 text-amber-600" />
                <span className="text-sm font-semibold text-amber-900">Host Share</span>
              </div>
            </foreignObject>
          </g>

          {/* Arrows */}
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
              <path d="M0,0 L10,4 L0,8 z" fill="#64748B" />
            </marker>
          </defs>

          <line x1="260" y1="160" x2="380" y2="160" stroke="#64748B" strokeWidth="2.5" markerEnd="url(#arrow)" />
          <line x1="620" y1="160" x2="760" y2="75" stroke="#10B981" strokeWidth="2.5" markerEnd="url(#arrow)" />
          <line x1="620" y1="160" x2="760" y2="160" stroke="#8B5CF6" strokeWidth="2.5" markerEnd="url(#arrow)" />
          <line x1="620" y1="160" x2="760" y2="245" stroke="#F59E0B" strokeWidth="2.5" markerEnd="url(#arrow)" />

          {/* Labels */}
          <text x="300" y="150" fontSize="12" fill="#475569">
            deploy
          </text>
          <text x="690" y="120" fontSize="11" fill="#047857">
            min 40–50%+
          </text>
          <text x="690" y="165" fontSize="11" fill="#6D28D9">
            0–40% prizes
          </text>
          <text x="690" y="230" fontSize="11" fill="#92400E">
            0–5% host
          </text>
        </svg>
      </div>

      <p className="mt-6 text-sm text-indigo-800/60 leading-relaxed">
        Platform fee is 20% in campaign mode; year-round hub allows configurable splits with guardrails. Exact limits
        depend on the selected mode and jurisdictional compliance settings.
      </p>
    </div>
  );
}

type FeedItem = {
  id: string;
  roomId: string;
  chain: 'Stellar' | 'Solana' | 'EVM';
  token: string;
  charityName: string;
  amount: string;
  timestamp: string;
  status: 'completed' | 'in-progress' | 'pending';
  explorerUrl?: string;
};

function LiveContractFeed({ loading = false, items = [] as FeedItem[] }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-6 w-6 text-indigo-600" />
          <h2 className="text-indigo-900 text-2xl font-bold">Live Contract Feed</h2>
        </div>
        <Link
          to="/web3/impact-campaign/leaderboard"
          className="text-sm font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1 transition"
        >
          View Leaderboard <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      )}

      {!loading && (
        <div className="space-y-3">
          {items.map((it) => (
            <div
              key={it.id}
              className="rounded-xl border border-gray-100 p-4 hover:border-indigo-200 hover:shadow-sm transition-all"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-indigo-900 font-semibold mb-1">
                    {it.amount} → {it.charityName}
                  </div>
                  <div className="text-xs text-indigo-800/60">
                    Room <span className="font-mono font-medium">{it.roomId}</span> • {it.chain} • {it.token} •{' '}
                    {it.timestamp}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={
                      'rounded-full px-3 py-1 text-xs font-semibold ' +
                      (it.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : it.status === 'in-progress'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-gray-100 text-gray-700')
                    }
                  >
                    {it.status}
                  </span>
                  {it.explorerUrl && (
                    <a
                      href={it.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-indigo-600 hover:underline transition"
                    >
                      Explorer →
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}

          {!items.length && (
            <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
              <p className="text-indigo-800/60 leading-relaxed">
                No verified events yet. Host a fundraiser to see live on-chain activity here.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const Web3Features: React.FC = () => {
  // Mock data - replace with real data when ready
  const loading = false;
  const mockItems: FeedItem[] = [
    {
      id: 'evt_01',
      roomId: 'ROOM-8K3F',
      chain: 'Stellar',
      token: 'Glo USD',
      charityName: 'Test Charity 1',
      amount: '320 GLO',
      timestamp: '2025-10-06 13:42',
      status: 'completed',
      explorerUrl: '#',
    },
    {
      id: 'evt_02',
      roomId: 'ROOM-X91A',
      chain: 'EVM',
      token: 'USDT',
      charityName: 'Test Charity 2',
      amount: '640 USDT',
      timestamp: '2025-10-06 13:21',
      status: 'completed',
      explorerUrl: '#',
    },
    {
      id: 'evt_03',
      roomId: 'ROOM-M2Q7',
      chain: 'Solana',
      token: 'USDC',
      charityName: 'Test Charity 1',
      amount: '210 USDC',
      timestamp: '2025-10-06 12:58',
      status: 'in-progress',
      explorerUrl: '#',
    },
  ];

  // JSON-LD Structured Data
  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
      { '@type': 'ListItem', position: 2, name: 'Web3 Fundraising', item: abs('/web3') },
      { '@type': 'ListItem', position: 3, name: 'Features', item: abs('/web3/features') },
    ],
  };

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Web3 Fundraising Features — Transparent Smart Contracts & Multi-Chain Support | FundRaisely',
    description:
      'Explore the Web3 infrastructure that powers FundRaisely: wallet connections, multi-chain smart contracts, verifiable on-chain receipts, and transparent impact tracking across Stellar, Solana, and EVM networks.',
    url: abs('/web3/features'),
  };

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Web3 Technical Features',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Multi-wallet connections via Reown AppKit' },
      { '@type': 'ListItem', position: 2, name: 'Multi-chain support: Stellar, Solana, EVM' },
      { '@type': 'ListItem', position: 3, name: 'Supported tokens: Glo USD, USDT, USDC' },
      { '@type': 'ListItem', position: 4, name: 'Smart contract transparency and enforcement' },
      { '@type': 'ListItem', position: 5, name: 'On-chain receipts and audit trail' },
      { '@type': 'ListItem', position: 6, name: 'Real-time impact tracking' },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <SEO
        title="Web3 Fundraising Features — Transparent Smart Contracts & Multi-Chain Support | FundRaisely"
        description="Explore the Web3 infrastructure that powers FundRaisely: wallet connections, multi-chain smart contracts, verifiable on-chain receipts, and transparent impact tracking across Stellar, Solana, and EVM networks."
        keywords="web3 fundraising features, smart contract transparency, stellar soroban, on-chain receipts, multi-chain fundraising, crypto fundraising, blockchain charity infrastructure"
        structuredData={[breadcrumbsJsonLd, webPageJsonLd, itemListJsonLd]}
        domainStrategy="geographic"
      />

      <Header />

      {/* Hero Section */}
      <section className="relative px-4 pt-12 pb-8">
        <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-cyan-300/30 blur-2xl" />
        <div className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-indigo-300/30 blur-2xl" />

        <div className="container relative z-10 mx-auto max-w-6xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-cyan-700 text-sm font-medium">
            <Sparkles className="h-4 w-4" /> Technical Infrastructure
          </span>

          <h1 className="mt-4 bg-gradient-to-r from-indigo-700 to-cyan-600 bg-clip-text text-transparent text-4xl md:text-6xl font-bold">
            Web3 Fundraising Features
          </h1>
          <p className="mt-2 text-2xl md:text-3xl font-semibold text-indigo-900">
            Transparent Smart Contracts & Multi-Chain Support
          </p>

          <p className="mx-auto mt-4 max-w-3xl text-indigo-900/70 text-lg md:text-xl">
            FundRaisely's Web3 layer powers transparent, automated fundraising across multiple blockchains. Every entry
            fee and payout is secured by smart contracts — so hosts, players, and charities can trust the flow of funds
            from wallet to impact.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              to="/web3/host"
              className="rounded-xl bg-indigo-700 px-6 py-3 text-white font-semibold shadow-md hover:bg-indigo-800 inline-flex items-center gap-2 transition"
            >
              <Zap className="h-5 w-5" /> Host an Event
            </Link>
            <Link
              to="/web3/impact-campaign"
              className="rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-3 text-white font-semibold shadow-md hover:scale-105 hover:shadow-lg transition"
            >
              Join Impact Campaign
            </Link>
            <Link
              to="/web3"
              className="rounded-xl bg-white px-6 py-3 text-indigo-700 font-semibold shadow-md hover:bg-indigo-50 inline-flex items-center gap-2 border border-indigo-200 transition"
            >
              <Target className="h-5 w-5" /> Web3 Overview
            </Link>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="px-4 pt-8">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8">
            <h2 className="text-indigo-900 text-3xl font-bold mb-4">Core Web3 Infrastructure</h2>
            <p className="text-indigo-900/70 text-lg max-w-3xl mx-auto">
              Built on battle-tested blockchain technology with seamless wallet integration and multi-chain support for
              maximum accessibility.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <FeatureCard
              icon={<Wallet className="h-5 w-5" />}
              title="Universal Wallet Connections"
              desc="Seamless integration via Reown AppKit and SimpleSigner. Connect MetaMask, Phantom, or Stellar-compatible wallets. No custodial accounts required — your keys, your crypto."
              gradient="from-blue-500 to-cyan-600"
            />
            <FeatureCard
              icon={<Network className="h-5 w-5" />}
              title="Multi-Chain Support"
              desc="Run events on Stellar (Soroban), Solana, or EVM chains (Base, Polygon). Contracts enforce payout logic consistently across all supported blockchains."
              gradient="from-purple-500 to-indigo-600"
            />
            <FeatureCard
              icon={<Coins className="h-5 w-5" />}
              title="Supported Tokens"
              desc="Accept Glo USD, USDT, and USDC where supported. Optional bridging and swaps via AllBridge for charity payout routes and cross-chain compatibility."
              gradient="from-emerald-500 to-green-600"
            />
            <FeatureCard
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Smart Contract Transparency"
              desc="Per-event Room Contracts enforce minimum charity allocations, cap host and prize shares, and prevent double payouts — with no platform custody of funds."
              gradient="from-indigo-600 to-purple-700"
            />
            <FeatureCard
              icon={<Receipt className="h-5 w-5" />}
              title="On-Chain Receipts & Audit Trail"
              desc="Every event emits a verifiable receipt with transaction hash. Auditors can confirm files originated from FundRaisely and match contract events for complete transparency."
              gradient="from-amber-500 to-orange-600"
            />
            <FeatureCard
              icon={<HeartHandshake className="h-5 w-5" />}
              title="Impact Tracking"
              desc="Track totals per charity, monitor splits, and generate proof-of-impact reports. Export CSV/PDF and link to chain explorers for full transparency."
              gradient="from-rose-500 to-pink-600"
            />
          </div>
        </div>
      </section>

      {/* Contract Architecture */}
      <section className="px-4 pt-12">
        <div className="container mx-auto max-w-6xl">
          <ContractArchitectureDiagram />
        </div>
      </section>

      {/* Supported Networks */}
      <section className="px-4 pt-8">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <h2 className="text-indigo-900 text-3xl font-bold mb-2">Supported Networks & Tokens</h2>
            <p className="text-indigo-900/70 text-lg mb-6">
              Choose the network your community prefers. Guardrails ensure fair, compliant splits in each mode.
            </p>
            <ul className="space-y-4">
                <Bullet>
                <strong>Solana:</strong> Low-fee, high-throughput events with support for USDC and NFT prize assets.
                Ideal for gaming communities and high-frequency fundraising events. Charity payouts via The Giving Block pathways.
              </Bullet>

               <Bullet>
                <strong>Base</strong> Broad wallet coverage with ERC-20 compatibility for USDT
                and USDC. Maximum interoperability with existing DeFi infrastructure. Charity payouts via The Giving Block pathways.
              </Bullet>
              <Bullet>
                <strong>Stellar (Soroban):</strong> Core smart contract platform with native support for Glo USD.
                charity payouts via AllBridge and The Giving Block pathways.
              </Bullet>
            
             
            </ul>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-4 pt-8">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-indigo-50 to-purple-50 p-8 shadow-sm">
            <h2 className="text-indigo-900 text-3xl font-bold mb-2">How the Web3 Layer Works</h2>
            <p className="text-indigo-800/70 text-lg mb-6">
              Our blockchain infrastructure handles all complexity automatically while maintaining complete transparency.
            </p>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                    1
                  </span>
                  <div>
                    <h3 className="text-indigo-900 font-semibold mb-1">Wallet Connect</h3>
                    <p className="text-indigo-800/70 text-sm leading-relaxed">
                      Hosts and players connect wallet. No account creation, no email
                      required — just your Web3 wallet.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                    2
                  </span>
                  <div>
                    <h3 className="text-indigo-900 font-semibold mb-1">Deploy Room Contract</h3>
                    <p className="text-indigo-800/70 text-sm leading-relaxed">
                      Factory automatically deploys a per-event Room Contract on your chosen chain with immutable payout
                      logic encoded.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                    3
                  </span>
                  <div>
                    <h3 className="text-indigo-900 font-semibold mb-1">Collect Entry Fees</h3>
                    <p className="text-indigo-800/70 text-sm leading-relaxed">
                      Tokens are escrowed by the smart contract during gameplay. All funds remain in the contract until
                      event completion — no platform custody.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                    4
                  </span>
                  <div>
                    <h3 className="text-indigo-900 font-semibold mb-1">Automatic Distribution</h3>
                    <p className="text-indigo-800/70 text-sm leading-relaxed">
                      On completion, contract enforces splits: charity receives guaranteed minimum (40-50%+), platform
                      fee (20% in campaign mode), with optional prizes and host share.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Contract Feed */}
      <section className="px-4 pt-8">
        <div className="container mx-auto max-w-6xl">
          <LiveContractFeed loading={loading} items={mockItems} />
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 pt-12 pb-14">
        <div className="container mx-auto max-w-6xl text-center">
          <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white shadow-lg">
            <h3 className="text-3xl font-bold mb-3">Ready to Leverage Web3 for Good?</h3>
            <p className="text-white/90 mb-6 text-lg max-w-3xl mx-auto">
              Experience transparent, automated fundraising powered by blockchain technology. Join the Impact Campaign or
              start hosting your own on-chain events today.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/web3/impact-campaign"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-indigo-700 font-bold shadow-lg hover:bg-indigo-50 transition"
              >
                Join Impact Campaign <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/web3/how-it-works"
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-8 py-4 text-white font-bold border border-white/30 hover:bg-white/20 transition"
              >
                Learn How It Works
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default Web3Features;



