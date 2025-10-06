import type React from 'react';
import { SEO } from '../../components/SEO';
import { Header } from '../../components/GeneralSite2/Header';
import SiteFooter from '../../components/GeneralSite2/SiteFooter';
import { currencyISO as iso } from '../../services/currency';
import {
  Heart,
  Shield,
  Coins,
  Sparkles,
  ArrowRight,
  Users,
  Globe,
  Zap,

  Lock,
  TrendingUp,
  Target,
  Wallet,
  FileCheck,
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

/** Benefit Card Component */
const BenefitCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  desc: string;
  highlight?: boolean;
  iconGradient?: string;
}> = ({ icon, title, desc, highlight = false, iconGradient }) => {
  const defaultGrad = highlight ? 'from-purple-500 to-pink-500' : 'from-indigo-600 to-purple-600';
  return (
    <div
      className={`group relative rounded-2xl border p-6 shadow-sm hover:shadow-lg transition-all duration-300 ${
        highlight ? 'border-gray-100 bg-gradient-to-br from-purple-50 to-indigo-50' : 'border-gray-100 bg-white'
      }`}
    >
      <div
        className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg group-hover:shadow-xl transition-all duration-300 ${
          iconGradient ?? defaultGrad
        }`}
      >
        <div className="text-white">{icon}</div>
      </div>
      <h3 className="text-indigo-900 text-lg font-bold mb-2">{title}</h3>
      <p className="text-indigo-800/70 leading-relaxed">{desc}</p>

      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
};

const Web3MainIndex: React.FC = () => {
  // -------- JSON-LD Structured Data --------
  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
      { '@type': 'ListItem', position: 2, name: 'Web3 Fundraising', item: abs('/web3') },
    ],
  };

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Web3 Fundraising — Transparent On-Chain Fundraisers for Real-World Impact | FundRaisely',
    description:
      'Host or join on-chain fundraising events with FundRaisely. Transparent smart contracts, verified charities, instant payouts, and audit-ready reports — powered by Web3 on Stellar, EVM, and Solana blockchains.',
    url: abs('/web3'),
    mainEntity: {
      '@type': 'SoftwareApplication',
      name: 'FundRaisely Web3 Fundraising Platform',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: 'Blockchain-powered fundraising platform for transparent charity events with multi-chain support',
      featureList: [
        'On-chain smart contracts',
        'Multi-chain support (Stellar, EVM, Solana)',
        'Instant charity payouts',
        'Verifiable impact receipts',
        'Transparent fee structure',
        '100% auditable transactions',
      ],
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: iso,
        description: 'Free to start hosting Web3 fundraising events',
      },
    },
  };

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Web3 Fundraising Features',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Transparent smart contract fundraising' },
      { '@type': 'ListItem', position: 2, name: 'Multi-chain support: Stellar, EVM, Solana' },
      { '@type': 'ListItem', position: 3, name: 'Instant automated charity payouts' },
      { '@type': 'ListItem', position: 4, name: 'Verifiable on-chain impact receipts' },
      { '@type': 'ListItem', position: 5, name: '100% auditable transaction history' },
      { '@type': 'ListItem', position: 6, name: 'Community-driven fundraising events' },
      { '@type': 'ListItem', position: 7, name: 'Minimum 40% guaranteed to charity' },
    ],
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Can I host a Web3 fundraiser any time?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. The Impact Campaign runs seasonally, but you can host your own on-chain fundraiser any time of the year using the same technology. Our platform is available year-round for charities and communities.',
        },
      },
      {
        '@type': 'Question',
        name: 'Do I need to be a crypto expert to use Web3 fundraising?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Not at all, our event wizard handles wallet connections, contract deployment, and payout setup automatically. You just focus on hosting your game or event. The technology works behind the scenes.',
        },
      },
      {
        '@type': 'Question',
        name: 'Where do the funds go in Web3 fundraising?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'All donations flow through our transparent smart contract, ensuring minimum allocations to charities (40%+), optional prizes for participants, and minimal platform fees to support ongoing development. Every transaction is publicly verifiable on the blockchain.',
        },
      },
      {
        '@type': 'Question',
        name: 'What makes Web3 fundraising transparent?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Every transaction and payout is publicly viewable on the blockchain, creating an immutable record. Each completed event is verifiable on-chain proof with of all funds raised and distributed.',
        },
      },
      {
        '@type': 'Question',
        name: 'Which blockchains does FundRaisely support?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'FundRaisely supports multiple blockchain networks including Stellar (Soroban smart contracts), EVM-compatible chains (Ethereum, Polygon, etc.), and Solana. This multi-chain approach ensures accessibility for diverse crypto communities.',
        },
      },
          {
        '@type': 'Question',
        name: 'Do I need experience in running quizzes or charity events?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. We have made our event wizard as simple as possible.  You can be up and running in minutes.  All you have to do is host, we provide the questions, answers, autoscroing, leaderboard and tiebreaker.',
        },
      },
                {
        '@type': 'Questio to find sponsors or prizes?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. This is optional.  You can run a simple charity quiz night and use a portion of the entry fees for prizes. But you can also upload NFTs or other tokens to be used as prizes leaving more for the charity',
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <SEO
        title="Web3 Fundraising — Transparent On-Chain Fundraisers for Real-World Impact | FundRaisely"
        description="Host or join on-chain fundraising events with FundRaisely. Transparent smart contracts, verified charities, instant payouts, and audit-ready reports — powered by Web3 on Stellar, EVM, and Solana blockchains."
        keywords="web3 fundraising, blockchain charity, on-chain donations, transparent fundraising, crypto charity events, smart contract fundraising, Stellar fundraising, Soroban fundraising, EVM charity, Solana fundraising, DAO fundraising, decentralized charity"
        structuredData={[breadcrumbsJsonLd, webPageJsonLd, itemListJsonLd, faqJsonLd]}
        domainStrategy="geographic"
      />

      <Header />

      {/* Hero Section */}
      <section className="relative px-4 pt-12 pb-8">
        <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-purple-300/30 blur-2xl" />
        <div className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-indigo-300/30 blur-2xl" />

        <div className="container relative z-10 mx-auto max-w-6xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1 text-teal-700 text-sm font-medium">
            <Globe className="h-4 w-4" /> Web3 Fundraising Platform
          </span>

          <h1 className="mt-4 bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent text-4xl md:text-6xl font-bold">
            Web3 Fundraising
          </h1>
          <p className="mt-2 text-2xl md:text-3xl font-semibold text-indigo-900">
            Transparent On-Chain Fundraisers for Real-World Impact
          </p>

          <p className="mx-auto mt-4 max-w-3xl text-indigo-900/70 text-lg md:text-xl">
            FundRaisely brings the power of Web3 transparency to community fundraising. Anyone with a wallet can create or join quiz nights,
            that automatically route proceeds to verified charities with
            verifiable receipts and zero middlemen. Built on Solana, Base and Stellar blockchains.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a
              href="/web3/impact-campaign/join"
              className="rounded-xl bg-indigo-700 px-6 py-3 text-white font-semibold shadow-md hover:bg-indigo-800 inline-flex items-center gap-2"
            >
              <Zap className="h-5 w-5" /> Host an On-Chain Event
            </a>
                 <a
              href="/web3/partners"
              className="rounded-xl bg-white px-6 py-3 text-indigo-700 font-semibold shadow-md hover:bg-indigo-50 inline-flex items-center gap-2 border border-indigo-200"
            >
              <Target className="h-5 w-5" /> Web3 Partners
            </a>
            <a
              href="/web3/impact-campaign"
              className="rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-3 text-white font-semibold shadow-md hover:scale-105 hover:shadow-lg"
            >
              Explore Impact Campaign
            </a>
            <a
              href="/web3/features"
              className="rounded-xl bg-white px-6 py-3 text-indigo-700 font-semibold shadow-md hover:bg-indigo-50 inline-flex items-center gap-2 border border-indigo-200"
            >
              <Target className="h-5 w-5" /> Web3 Features
            </a>
         
          </div>
        </div>
      </section>

      {/* Why Web3 Fundraising Works */}
      <section className="px-4 pt-8">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8">
            <h2 className="text-indigo-900 text-3xl font-bold mb-4">Why Web3 Transforms Charitable Fundraising</h2>
            <p className="text-indigo-900/70 text-lg max-w-3xl mx-auto">
              Blockchain technology eliminates trust barriers in fundraising, creating unprecedented transparency and
              accountability while reducing costs and increasing donor confidence.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <BenefitCard
              icon={<Shield className="h-5 w-5" />}
              title="100% Transparent by Design"
              desc="Every entry fee, donation, and payout happens on-chain through verified smart contracts. No hidden fees, no intermediaries, no trust required — only verifiable code."
              iconGradient="from-emerald-500 to-green-600"
            />
            <BenefitCard
              icon={<Coins className="h-5 w-5" />}
              title="Instant, Automated Payouts"
              desc="Funds flow directly to charities, prize winners, and hosts based on pre-set contract logic. No manual transfers, no delays, no possibility of funds being mishandled."
              highlight={true}
              iconGradient="from-amber-500 to-orange-600"
            />
            <BenefitCard
              icon={<Users className="h-5 w-5" />}
              title="Global Community Participation"
              desc="Engage Web3 communities, DAOs, and crypto enthusiasts worldwide. Fundraising transcends geographic boundaries, welcoming participants from any blockchain ecosystem."
              iconGradient="from-cyan-500 to-blue-600"
            />
          </div>
        </div>
      </section>

      {/* Core Web3 Features */}
      <section className="px-4 pt-12">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <h2 className="text-indigo-900 text-3xl font-bold mb-2">Smart Contract Fundraising Features</h2>
            <p className="text-indigo-900/70 text-lg mb-6">
              Leverage blockchain technology to create trustless, transparent fundraising events with guaranteed charitable
              allocations and verifiable impact.
            </p>

            <div className="grid gap-6 md:grid-cols-3">
              <FeatureCard
                icon={<Lock className="h-5 w-5" />}
                title="Multi-Chain Smart Contracts"
                desc="Play fundraising quizzes on Solana ,Base or Stellar (expanding to more soon). Choose the blockchain that best serves your community and minimizes fees."
                gradient="from-indigo-600 to-purple-700"
              />
              <FeatureCard
                icon={<Wallet className="h-5 w-5" />}
                title="Seamless Wallet Integration"
                desc="Connect with popular Web3 wallets across all supported chains. Participants can join events using their existing crypto wallets without creating new accounts or sharing personal data."
                gradient="from-blue-500 to-cyan-600"
              />
              <FeatureCard
                icon={<FileCheck className="h-5 w-5" />}
                title="Verifiable Impact Receipts"
                desc="Every completed event generates an on-chain receipt with cryptographic proof of all transactions. Perfect for grant applications, regulatory compliance, and donor transparency."
                gradient="from-green-500 to-emerald-600"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-4 pt-8">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <h2 className="text-indigo-900 text-3xl font-bold mb-2">How Web3 Fundraising Works</h2>
            <p className="text-indigo-900/70 text-lg mb-6">
              Our guided process makes blockchain fundraising accessible to everyone, handling all technical complexity
              behind the scenes.
            </p>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                    1
                  </span>
                  <div>
                    <h3 className="text-indigo-900 font-semibold mb-1">Set Up Your Event</h3>
                    <p className="text-indigo-800/70 text-sm">
                      Choose your event format in our 4 step set up wizard, select a verified charity from our registry, and
                      define entry fees, prize structures, and payout percentages.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                    2
                  </span>
                  <div>
                    <h3 className="text-indigo-900 font-semibold mb-1">Deploy Smart Contract</h3>
                    <p className="text-indigo-800/70 text-sm">
                      Our wizard automatically deploys your fundraising smart contract to your chosen blockchain. All
                      payout logic is encoded and immutable once deployed.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                    3
                  </span>
                  <div>
                    <h3 className="text-indigo-900 font-semibold mb-1">Host and Play</h3>
                    <p className="text-indigo-800/70 text-sm">
                      Run your live event with real-time leaderboards and engagement. All participant payments are
                      automatically collected through the smart contract.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                    4
                  </span>
                  <div>
                    <h3 className="text-indigo-900 font-semibold mb-1">Automatic Distribution</h3>
                    <p className="text-indigo-800/70 text-sm">
                      When your event concludes, funds are instantly distributed according to the contract: charity
                      receives their guaranteed minimum, winners receive prizes, and hosts receive any applicable fees.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Impact Stats */}
      <section className="px-4 pt-8">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8">
            <h2 className="text-indigo-900 text-3xl font-bold mb-4">Platform Guarantees</h2>
            <p className="text-indigo-900/70 text-lg max-w-3xl mx-auto">
              Our smart contracts enforce transparent rules that protect charities, participants, and hosts alike.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-yellow-100 bg-gradient-to-br from-yellow-50 to-amber-50 p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 shadow-lg">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h3 className="mb-2 text-3xl font-bold text-indigo-900">40%+</h3>
              <p className="text-sm font-medium text-yellow-700">Minimum to Charity</p>
              <p className="mt-2 text-xs text-indigo-800/60">Guaranteed by smart contract logic</p>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <h3 className="mb-2 text-3xl font-bold text-indigo-900">100%</h3>
              <p className="text-sm font-medium text-blue-700">Auditable Transactions</p>
              <p className="mt-2 text-xs text-indigo-800/60">Every event verifiable on-chain</p>
            </div>

            <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-pink-50 p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h3 className="mb-2 text-3xl font-bold text-indigo-900">Multi-Chain</h3>
              <p className="text-sm font-medium text-purple-700">Solana • Base • Stellar</p>
              <p className="mt-2 text-xs text-indigo-800/60">Choose your preferred blockchain</p>
            </div>
          </div>
        </div>
      </section>

      {/* Annual Impact Campaign Banner */}
      <section className="px-4 pt-12">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 p-8 text-white shadow-lg">
            <div className="text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm font-medium mb-4">
                <TrendingUp className="h-4 w-4" /> Annual Campaign
              </span>
              <h2 className="text-3xl font-bold mb-3">The Web3 Annual Impact Campaign</h2>
              <p className="text-white/90 mb-6 text-lg max-w-3xl mx-auto">
                Every year, FundRaisely brings the Web3 community together for a three-month fundraising challenge —
                pooling impact across hundreds of communities with a shared goal of raising over $100,000 for verified
                charities. Join DAOs, crypto communities, and blockchain projects making real-world impact.  This s our first year.  Join us.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a
                  href="/web3/impact-campaign"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-teal-700 font-bold shadow-lg hover:bg-teal-50 transition"
                >
                  Learn About the Campaign <ArrowRight className="h-5 w-5" />
                </a>
                <a
                  href="/web3/impact-campaign/leaderboard"
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-8 py-4 text-white font-bold border border-white/30 hover:bg-white/20 transition"
                >
                  View Campaign Leaderboard
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-4 pt-12 pb-8">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-indigo-900 mb-8 text-3xl font-bold text-center">
            Web3 Fundraising — Frequently Asked Questions
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-indigo-900 mb-3 text-lg font-semibold">
                Can I host a Web3 fundraiser any time?
              </h3>
              <p className="text-indigo-900/70">
                Yes. The Impact Campaign runs seasonally, but you can host your own on-chain fundraiser any time of the
                year using the same technology. Our platform is available year-round for charities and communities.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-indigo-900 mb-3 text-lg font-semibold">
                Do I need to be a crypto expert to use Web3 fundraising?
              </h3>
              <p className="text-indigo-900/70">
                Not at all, our event wizard handles wallet connections, contract deployment, and payout setup
                automatically. You just focus on hosting your game or event. The technology works behind the scenes.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-indigo-900 mb-3 text-lg font-semibold">
                Where do the funds go in Web3 fundraising?
              </h3>
              <p className="text-indigo-900/70">
                All donations flow through our transparent smart contract, ensuring minimum allocations to charities
                (40%+), optional prizes for participants, and minimal platform fees to support ongoing development. Every
                transaction is publicly verifiable on the blockchain.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-indigo-900 mb-3 text-lg font-semibold">What makes Web3 fundraising transparent?</h3>
              <p className="text-indigo-900/70">
                Every transaction and payout is publicly viewable on the blockchain, creating an immutable record. Every transaction and payout is publicly viewable on the blockchain, creating an immutable record. Each completed event is verifiable on-chain proof with of all funds raised and distributed.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-indigo-900 mb-3 text-lg font-semibold">
                Which blockchains does FundRaisely support?
              </h3>
              <p className="text-indigo-900/70">
                FundRaisely supports multiple blockchain networks including Stellar (Soroban smart contracts),
                Base, and Solana. This multi-chain approach ensures
                accessibility for diverse crypto communities.  Soon we will be supporting more.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-indigo-900 mb-3 text-lg font-semibold">
                How do I verify that funds reached the charity?
              </h3>
              <p className="text-indigo-900/70">
                After each event, you receive a blockchain transaction hash that you can verify on the public blockchain
                explorer. This shows the exact amount sent to the charity's verified wallet address, with timestamp and
                full transaction details.
              </p>
            </div>
             <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-indigo-900 mb-3 text-lg font-semibold">
                Do I need experience in running quizzes or charity events?
              </h3>
              <p className="text-indigo-900/70">
                No. We have made our event wizard as simple as possible.  You can be up and running in minutes.  All you have to do is host, we provide the questions, answers, autoscroing, leaderboard and tiebreaker.
              </p>
            </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-indigo-900 mb-3 text-lg font-semibold">
                Do I need to find sponsors or prizes?
              </h3>
              <p className="text-indigo-900/70">
                No. This is optional.  You can run a simple charity quiz night and use a portion of the entry fees for prizes. But you can also upload NFTs or other tokens to be used as prizes leaving more for the charity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 pt-8 pb-14">
        <div className="container mx-auto max-w-6xl text-center">
          <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white shadow-lg">
            <h3 className="text-3xl font-bold mb-3">Ready to Transform Charitable Giving with Web3?</h3>
            <p className="text-white/90 mb-6 text-lg max-w-3xl mx-auto">
              Experience the full power of blockchain-powered fundraising with transparent smart contracts, instant
              payouts, and verifiable impact. Start hosting events that build trust and maximize charitable impact today.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="/web3/host"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-indigo-700 font-bold shadow-lg hover:bg-indigo-50 transition"
              >
                <Zap className="h-5 w-5" />
                Host an On-Chain Event
              </a>
              <a
                href="/web3/partners"
                className="rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-8 py-4 text-white font-bold shadow-lg hover:scale-105 hover:shadow-xl transition"
              >
                Web3 Partners
              </a>
              <a
                href="/web3/features"
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-8 py-4 text-white font-bold border border-white/30 hover:bg-white/20 transition"
              >
                <Target className="h-5 w-5" />
                Web3 Features
              </a>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default Web3MainIndex;


