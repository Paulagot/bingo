import type React from 'react';
import { SEO } from '../../components/SEO';
import { Header } from '../../components/GeneralSite2/Header';
import SiteFooter from '../../components/GeneralSite2/SiteFooter';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, ExternalLink } from 'lucide-react';

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

/** Respect Vite's base for assets served from /public */
const BASE_URL = (import.meta as any)?.env?.BASE_URL ?? '/';
const withBase = (p: string) => `${BASE_URL}${p.replace(/^\/+/, '')}`;

type Partner = {
  name: string;
  href?: string;
  imgSrc: string; // path relative to /public (e.g., 'partners/glo.svg')
  imgAlt?: string;
  tagline?: string;
};

function LogoGrid({
  title,
  blurb,
  partners,
}: {
  title: string;
  blurb?: string;
  partners: Partner[];
}) {
  return (
    <section className="mt-12">
      <h2 className="text-indigo-900 text-3xl font-bold mb-4">{title}</h2>
      {blurb && <p className="text-indigo-900/70 text-lg mb-6 max-w-3xl">{blurb}</p>}

      <div
        className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        aria-label={`${title} logos`}
      >
        {partners.map((p) => {
          const card = (
            <div className="group relative rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-lg transition-all duration-300 h-full flex flex-col items-center justify-center">
              <img
                src={withBase(p.imgSrc)}
                alt={p.imgAlt || p.name}
                loading="lazy"
                width={220}
                height={100}
                className="h-16 w-auto object-contain mb-4"
                onError={(e) => {
                  // Quick visual hint if path/case is wrong
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                  const fallback = document.createElement('div');
                  fallback.textContent = '⚠️ image not found';
                  fallback.style.fontSize = '12px';
                  fallback.style.color = '#b91c1c';
                  e.currentTarget.parentElement?.appendChild(fallback);
                }}
              />
              <div className="text-center">
                <div className="text-indigo-900 font-bold mb-1">{p.name}</div>
                {p.tagline && <div className="text-indigo-800/70 text-sm leading-relaxed">{p.tagline}</div>}
              </div>
              {p.href && (
                <ExternalLink className="absolute top-3 right-3 h-4 w-4 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          );

          return (
            <div key={p.name}>
              {p.href ? (
                <a href={p.href} target="_blank" rel="noreferrer" aria-label={`${p.name} partner link`} className="block h-full">
                  {card}
                </a>
              ) : (
                card
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

const Web3Partners: React.FC = () => {
  const infra: Partner[] = [
    { name: 'Glo Dollar (GLO)', href: 'https://www.glodollar.org/', imgSrc: 'partner/glo.svg', tagline: 'Impact-aligned stablecoin' },
    { name: 'The Giving Block', href: 'https://www.thegivingblock.com/', imgSrc: 'partner/thegivingblock.webp', tagline: 'Direct-to-charity routing' },
    { name: 'Solana', href: 'https://solana.com/', imgSrc: 'partner/Solana-Logo.png', tagline: 'Quiz fundraising contract, Low-fee, high-throughput events' },
    { name: 'Base (EVM)', href: 'https://base.org/', imgSrc: 'partner/Base_square_blue.svg', tagline: 'Quiz fundraising contract on Base and building Base Mini-app' },
     { name: 'Stellar (Soroban)', href: 'https://soroban.stellar.org/', imgSrc: 'partner/stellar-xlm-logo.svg', tagline: 'Quiz fundraising contract on stellar' },
    
    // { name: 'Reown AppKit', href: 'https://reown.com/', imgSrc: 'partner/reown-appkit.svg', tagline: 'Wallet & chain orchestration' },
    // { name: 'SimpleSigner', href: '#', imgSrc: 'partners/simplesigner.svg', tagline: 'Wallet auth for clubs' },
   
    // { name: 'Polygon (EVM)', href: 'https://polygon.technology/', imgSrc: 'partner/polygon.svg', tagline: 'EVM with broad wallet coverage' },
    // { name: 'AllBridge', href: 'https://allbridge.io/', imgSrc: 'partner/allbridge.svg', tagline: 'Bridge to charity payout rails' },
    
    // { name: 'USDT', href: 'https://tether.to/', imgSrc: 'partner/usdt.svg', tagline: 'Widely supported stablecoin' },
    // { name: 'USDC', href: 'https://www.circle.com/', imgSrc: 'partners/usdc.svg', tagline: 'Stablecoin for Solana & EVM' },
  ];

  const media: Partner[] = [
    { name: 'Blockleaders', href: 'https://blockleaders.io/', imgSrc: 'partner/blockleaders_logo.jpeg', tagline: 'Coverage & awareness' },
     { name: 'Superteam Ireland', href: 'https://www.linkedin.com/company/superteam-ireland/', imgSrc: 'partner/superteam_ireland_logo.jpeg', tagline: 'Demos & amplification' },
    { name: 'Base Ireland', href: 'https://base-community.notion.site/ireland', imgSrc: 'partner/base_irelands.jpg', tagline: 'Ecosystem amplification' },   
    { name: 'Stellar EU', href: '#', imgSrc: 'partner/stellareu.webp', tagline: 'Demos & amplification' },
     { name: 'WiBT Women in Blockchain Talks', href: 'https://womeninblockchaintalks.com/', imgSrc: 'partner/wibt.jpg', tagline: 'Ecosystem amplification' },
      { name: 'Glo Dollar (GLO)', href: 'https://www.glodollar.org/', imgSrc: 'partner/glo.svg', tagline: 'Amplification' },
    { name: 'The Giving Block', href: 'https://www.thegivingblock.com/', imgSrc: 'partner/thegivingblock.webp', tagline: 'Coverage & awareness' },
   { name: 'Eth Dublin', href: 'https://www.ethdublin.io/', imgSrc: 'partner/ethdublin.jpeg', tagline: 'Believes in the mission ' },
  ];

  const earlyBackers: Partner[] = [
    { name: 'Superteam Ireland', href: 'https://www.linkedin.com/company/superteam-ireland/', imgSrc: 'partner/superteam_ireland_logo.jpeg', tagline: 'Powering product velocity' },
    { name: 'Stellar EU', href: 'https://linktr.ee/Stellarireland', imgSrc: 'partner/stellareu.webp', tagline: 'Supporting impact' },
   
  ];

  // JSON-LD Structured Data
  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
      { '@type': 'ListItem', position: 2, name: 'Web3 Fundraising', item: abs('/web3') },
      { '@type': 'ListItem', position: 3, name: 'Partners', item: abs('/web3/partners') },
    ],
  };

  const collectionPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Web3 Fundraising Partners — Wallets, Chains, Bridges & Charity Rails | FundRaisely',
    description:
      'Meet the infrastructure partners powering FundRaisely: Reown AppKit for wallets, Stellar Soroban for smart contracts, The Giving Block for charity routing, and stablecoin support across multiple blockchains.',
    url: abs('/web3/partners'),
    hasPart: [
      {
        '@type': 'ItemList',
        name: 'Infrastructure Partners',
        itemListElement: infra.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: { '@type': 'Organization', name: p.name, url: p.href || undefined },
        })),
      },
      {
        '@type': 'ItemList',
        name: 'Media & Community Partners',
        itemListElement: media.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: { '@type': 'Organization', name: p.name, url: p.href || undefined },
        })),
      },
      {
        '@type': 'ItemList',
        name: 'Early Backers',
        itemListElement: earlyBackers.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: { '@type': 'Organization', name: p.name, url: p.href || undefined },
        })),
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <SEO
        title="Web3 Fundraising Partners — Wallets, Chains, Bridges & Charity Rails | FundRaisely"
        description="Meet the infrastructure partners powering FundRaisely: Reown AppKit for wallets, Stellar Soroban for smart contracts, The Giving Block for charity routing, and stablecoin support across multiple blockchains."
        keywords="web3 partners, crypto fundraising infrastructure, blockchain charity partners, stellar soroban, solana, reown appkit, the giving block, allbridge, glo dollar, usdc, usdt"
        structuredData={[breadcrumbsJsonLd, collectionPageJsonLd]}
        domainStrategy="geographic"
      />

      <Header />

      {/* Hero Section */}
      <section className="relative px-4 pt-12 pb-8">
        <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-purple-300/30 blur-2xl" />
        <div className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-indigo-300/30 blur-2xl" />

        <div className="container relative z-10 mx-auto max-w-6xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-purple-700 text-sm font-medium">
            <Sparkles className="h-4 w-4" /> Ecosystem Partners
          </span>

          <h1 className="mt-4 bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent text-4xl md:text-6xl font-bold">
            Web3 Fundraising Partners
          </h1>
          <p className="mt-2 text-2xl md:text-3xl font-semibold text-indigo-900">
            Wallets, Chains, Bridges & Charity Rails
          </p>

          <p className="mx-auto mt-4 max-w-3xl text-indigo-900/70 text-lg md:text-xl">
            FundRaisely is powered by best-in-class Web3 infrastructure partners. From multi-chain wallet connections to direct-to-charity routing, these integrations make transparent, on-chain fundraising possible.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              to="/web3/features"
              className="rounded-xl bg-indigo-700 px-6 py-3 text-white font-semibold shadow-md hover:bg-indigo-800 inline-flex items-center gap-2 transition"
            >
              Explore Features <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/contact"
              className="rounded-xl bg-white px-6 py-3 text-indigo-700 font-semibold shadow-md hover:bg-indigo-50 inline-flex items-center gap-2 border border-indigo-200 transition"
            >
              Become a Partner
            </Link>
          </div>
        </div>
      </section>

      {/* Partner Grids */}
      <section className="px-4 pt-8 pb-12">
        <div className="container mx-auto max-w-6xl">
          <LogoGrid
            title="Infrastructure Partners"
            blurb="Wallets, smart contract platforms, bridges, and stablecoins that power FundRaisely's multi-chain fundraising architecture "
            partners={infra}
          />

          <LogoGrid
            title="Media & Community Partners"
            blurb="Publications, developer communities, and event platforms helping us reach clubs, charities, and on-chain ecosystems."
            partners={media}
          />

          <LogoGrid
            title="Early Backers"
            blurb="Supporters and advisors who believed in transparent impact early and continue to help us scale."
            partners={earlyBackers}
          />
        </div>
      </section>

  {/* What Our Partners Enable */}
<section className="px-4 pb-12">
  <div className="container mx-auto max-w-6xl">
    <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-indigo-50 to-purple-50 p-8 shadow-sm">
      <h2 className="text-indigo-900 text-3xl font-bold mb-4">What Our Partners Enable</h2>
      <div className="space-y-4 text-indigo-800/80 leading-relaxed">
        <p>
          FundRaisely is powered by a growing ecosystem of infrastructure, media, and community partners, all
          committed to making transparent, high-impact fundraising accessible to everyone.
        </p>

        <p>
          <strong className="text-indigo-900">Multi-Chain Infrastructure:</strong> Solana, Base, and Stellar (Soroban)
          provide the rails for FundRaisely’s quiz fundraising smart contracts, delivering low-fee, high-throughput,
          and transparent event flows across Web3 ecosystems.
        </p>

        <p>
          <strong className="text-indigo-900">Stablecoins for Good:</strong> Through Glo Dollar (GLO) clubs and players can fundraise using
          impact-aligned digital currencies. These ensure stable value and global accessibility without middlemen.          
        </p>

        <p>
          <strong className="text-indigo-900">Direct-to-Charity Routing:</strong> The Giving Block powers seamless
          on-chain donations to verified charities, so every fundraiser can route proceeds transparently and verifiably,
          with no custodial holding.
        </p>

        <p>
          <strong className="text-indigo-900">Community & Ecosystem Amplification:</strong> Media and community partners
          like Blockleaders, Superteam Ireland, Base Ireland, Stellar EU, and Women in Blockchain Talks help us reach new
          audiences, host demo events, and spotlight clubs making a difference.
        </p>

        <p>
          <strong className="text-indigo-900">Early Backers & Builders:</strong> Support from partners such as Superteam
          Ireland and Stellar EU fuels our product development and early impact initiatives - helping FundRaisely scale
          faster and empower more fundraisers worldwide.
        </p>
      </div>
    </div>
  </div>
</section>


      {/* CTA Section */}
      <section className="px-4 pb-14">
        <div className="container mx-auto max-w-6xl text-center">
          <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white shadow-lg">
            <h3 className="text-3xl font-bold mb-3">Ready to Build on Web3 for Good?</h3>
            <p className="text-white/90 mb-6 text-lg max-w-3xl mx-auto">
              Join the growing ecosystem of clubs, charities, and communities leveraging blockchain technology for transparent, automated fundraising.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/web3/host"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-indigo-700 font-bold shadow-lg hover:bg-indigo-50 transition"
              >
                Host an Event <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/web3"
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-8 py-4 text-white font-bold border border-white/30 hover:bg-white/20 transition"
              >
                Web3 Overview
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default Web3Partners;



