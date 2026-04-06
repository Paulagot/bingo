import React from 'react';
import { SEO } from '../../components/SEO';
import { Web3Header } from '../../components/GeneralSite2/Web3Header';

import {

  ExternalLink,
  HeartHandshake,
  Globe,
  Users,
  Zap,
  BadgeCheck,
  MessageCircle,
  Trophy,
  Crosshair,
  Target,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* URL helpers                                                                  */
/* -------------------------------------------------------------------------- */
function getOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin.replace(/\/$/, '');
  return 'https://fundraisely.ie';
}
function abs(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${getOrigin()}${p}`;
}

const BASE_URL = (import.meta as any)?.env?.BASE_URL ?? '/';
const withBase = (p: string) => `${BASE_URL}${p.replace(/^\/+/, '')}`;

/* -------------------------------------------------------------------------- */
/* Design tokens (identical to Web3 index and features)                        */
/* bg-[#0a0e14]   near-black base                                              */
/* bg-[#0f1520]   card surface                                                 */
/* border-[#1e2d42] subtle grid lines                                          */
/* text-[#a3f542]  acid green                                                  */
/* text-[#6ef0d4]  teal (charity)                                              */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* Shared components                                                            */
/* -------------------------------------------------------------------------- */
const W3Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`rounded-2xl border border-[#1e2d42] bg-[#0f1520] p-6 ${className}`}>{children}</div>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center gap-2 rounded-full border border-[#a3f542]/30 bg-[#a3f542]/10 px-4 py-1.5 font-mono text-sm font-semibold uppercase tracking-widest text-[#a3f542]">
    {children}
  </span>
);

/* -------------------------------------------------------------------------- */
/* Partner types                                                                */
/* -------------------------------------------------------------------------- */
type Partner = {
  name: string;
  href?: string;
  imgSrc: string;
  imgAlt?: string;
  tagline?: string;
};

/* -------------------------------------------------------------------------- */
/* Logo card                                                                    */
/* -------------------------------------------------------------------------- */
const PartnerCard: React.FC<{
  partner: Partner;
  large?: boolean;
}> = ({ partner, large = false }) => {
  const inner = (
    <div className="group relative flex h-full flex-col items-center justify-center rounded-2xl border border-[#1e2d42] bg-[#0f1520] p-6 transition-all duration-300 hover:border-[#a3f542]/30 hover:bg-[#141c2b]">
      <div className={`mb-4 flex w-full items-center justify-center ${large ? 'min-h-[120px]' : 'min-h-[72px]'}`}>
        <img
          src={withBase(partner.imgSrc)}
          alt={partner.imgAlt ?? partner.name}
          loading="lazy"
          width={220}
          height={100}
          className={`w-auto object-contain ${large ? 'max-h-28 max-w-[320px]' : 'max-h-16 max-w-[180px]'}`}
          onError={e => {
            (e.currentTarget as HTMLImageElement).style.opacity = '0.3';
          }}
        />
      </div>
      <div className="text-center">
        <p className="font-mono text-sm font-bold text-white">{partner.name}</p>
        {partner.tagline && (
          <p className="mt-1 text-xs leading-relaxed text-white/40 whitespace-pre-line">{partner.tagline}</p>
        )}
      </div>
      {partner.href && (
        <ExternalLink className="absolute right-3 top-3 h-3.5 w-3.5 text-[#a3f542]/40 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </div>
  );

  if (partner.href) {
    return (
      <a href={partner.href} target="_blank" rel="noreferrer" aria-label={`${partner.name} partner link`} className="block h-full">
        {inner}
      </a>
    );
  }
  return <div className="h-full">{inner}</div>;
};

/* -------------------------------------------------------------------------- */
/* Logo grid section                                                            */
/* -------------------------------------------------------------------------- */
const PartnerGrid: React.FC<{
  label: React.ReactNode;
  title: string;
  blurb?: string;
  partners: Partner[];
  cols?: string;
  large?: boolean;
}> = ({ label, title, blurb, partners, cols = 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4', large = false }) => (
  <section className="relative z-10 py-12">
    <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <SectionLabel>{label}</SectionLabel>
        <h2 className="mt-4 font-mono text-3xl font-bold text-white">{title}</h2>
        {blurb && <p className="mx-auto mt-3 max-w-2xl text-white/50">{blurb}</p>}
      </div>
      <div className={`grid gap-4 ${cols}`}>
        {partners.map(p => (
          <PartnerCard key={p.name} partner={p} large={large} />
        ))}
      </div>
    </div>
  </section>
);

/* -------------------------------------------------------------------------- */
/* Page                                                                         */
/* -------------------------------------------------------------------------- */
const Web3Partners: React.FC = () => {

  const verifiedCharities: Partner[] = [
    {
      name: 'Identity Theft Resource Center (ITRC)',
      href: 'https://www.idtheftcenter.org/',
      imgSrc: 'partner/ITRCLogo.jpg',
      tagline:
        'Your life, your identity.\nThe ITRC, a non-profit founded in 1999, supports victims of identity theft, fraud, and scams and offers identity protection education — free of charge.',
    },
    {
      name: 'CLEAN International',
      href: 'https://cleaninternational.org/',
      imgSrc: 'partner/Clean_international.png',
      tagline:
        'Protecting and providing water worldwide.\nFocused on water stressed regions and communities in need, CLEAN International is equipping communities worldwide with sustainable clean water infrastructure.',
    },
  ];

  const infra: Partner[] = [
    { name: 'Glo Dollar (GLO)', href: 'https://www.glodollar.org/', imgSrc: 'partner/glo.svg', tagline: 'Impact-aligned stablecoin' },
    { name: 'The Giving Block', href: 'https://www.thegivingblock.com/', imgSrc: 'partner/thegivingblock.webp', tagline: 'Charity verification and direct-to-charity routing' },
    { name: 'Solana', href: 'https://solana.com/', imgSrc: 'partner/Solana-Logo.png', tagline: 'Smart contract platform for quiz and elimination events' },
    { name: 'Base (EVM)', href: 'https://base.org/', imgSrc: 'partner/Base_square_blue.svg', tagline: 'Smart contract platform and Base Mini-app' },
  ];

  const media: Partner[] = [
    { name: 'Blockleaders', href: 'https://blockleaders.io/', imgSrc: 'partner/blockleaders_logo.jpeg', tagline: 'Coverage and awareness' },
    { name: 'Superteam Ireland', href: 'https://www.linkedin.com/company/superteam-ireland/', imgSrc: 'partner/superteam_ireland_logo.jpeg', tagline: 'Demos and amplification' },
    { name: 'Base Ireland', href: 'https://x.com/base_ireland', imgSrc: 'partner/base_irelands.jpg', tagline: 'Ecosystem amplification' },
    { name: 'WiBT Women in Blockchain Talks', href: 'https://womeninblockchaintalks.com/', imgSrc: 'partner/wibt.jpg', tagline: 'Ecosystem amplification' },
    { name: 'Glo Dollar (GLO)', href: 'https://www.glodollar.org/', imgSrc: 'partner/glo.svg', tagline: 'Amplification' },
    { name: 'The Giving Block', href: 'https://www.thegivingblock.com/', imgSrc: 'partner/thegivingblock.webp', tagline: 'Coverage and awareness' },
    { name: 'Eth Dublin', href: 'https://www.ethdublin.io/', imgSrc: 'partner/ethdublin.jpeg', tagline: 'Believes in the mission' },
  ];

  const earlyBackers: Partner[] = [
    { name: 'Superteam Ireland', href: 'https://www.linkedin.com/company/superteam-ireland/', imgSrc: 'partner/superteam_ireland_logo.jpeg', tagline: 'Powering product velocity' },
  ];

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
    name: 'Web3 Fundraising Partners: Verified Charities, Infrastructure and Community | FundRaisely',
    description:
      'Meet the partners behind FundRaisely: verified charities, blockchain infrastructure on Solana and Base, The Giving Block for charity verification, and media and community partners across the Web3 ecosystem.',
    url: abs('/web3/partners'),
    hasPart: [
      {
        '@type': 'ItemList',
        name: 'Verified Charity Partners',
        itemListElement: verifiedCharities.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: { '@type': 'Organization', name: p.name, url: p.href },
        })),
      },
      {
        '@type': 'ItemList',
        name: 'Infrastructure Partners',
        itemListElement: infra.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: { '@type': 'Organization', name: p.name, url: p.href },
        })),
      },
      {
        '@type': 'ItemList',
        name: 'Media and Community Partners',
        itemListElement: media.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: { '@type': 'Organization', name: p.name, url: p.href },
        })),
      },
    ],
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#0a0e14]">

      {/* Grid texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(163,245,66,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(163,245,66,0.03) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <SEO
        title="Web3 Fundraising Partners: Verified Charities, Infrastructure and Community | FundRaisely"
        description="Meet the partners behind FundRaisely: verified charities, blockchain infrastructure on Solana and Base, The Giving Block for charity verification, and media and community partners."
        keywords="web3 partners, crypto fundraising, blockchain charity, solana, base, the giving block, glo dollar, verified charities, web3 fundraising platform"
        structuredData={[breadcrumbsJsonLd, collectionPageJsonLd]}
        domainStrategy="geographic"
      />

      <Web3Header />

      {/* ================================================================== */}
      {/* Hero                                                                 */}
      {/* ================================================================== */}
      <section className="relative z-10 pb-12 pt-16">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <SectionLabel><Globe className="h-4 w-4" /> Ecosystem Partners</SectionLabel>

            <h1 className="mt-6 font-mono text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
              The partners that make <br />
              <span className="text-[#a3f542]">FundRaisely work.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-xl leading-relaxed text-white/70">
              From the charities that receive funds, to the blockchains that move them, to the communities that
              host events, FundRaisely is built on a network of partners who share the same goal: get more money
              to good causes, transparently.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href="/web3/features" className="inline-flex items-center gap-2 rounded-xl border border-[#a3f542]/40 bg-[#a3f542]/10 px-6 py-3 font-mono font-semibold text-[#a3f542] transition hover:border-[#a3f542]/80 hover:bg-[#a3f542]/20">
                <Zap className="h-4 w-4" /> How it works
              </a>
              <a href="/contact" className="inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-6 py-3 font-mono font-semibold text-white/60 transition hover:border-white/30 hover:text-white">
                <MessageCircle className="h-4 w-4" /> Become a partner
              </a>
              <a href="/web3" className="inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-6 py-3 font-mono font-semibold text-white/60 transition hover:border-white/30 hover:text-white">
                <Target className="h-4 w-4" /> Web3 overview
              </a>
            </div>

            {/* Stats */}
            <div className="mt-12 flex w-full flex-wrap justify-center gap-8 border-t border-[#1e2d42] pt-8 sm:justify-between">
              {[
                { value: '2', label: 'verified charities' },
                { value: 'SOL + BASE', label: 'chains' },
                { value: 'Giving Block', label: 'charity verification' },
                { value: '7+', label: 'community partners' },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <p className="font-mono text-2xl font-bold text-white">{value}</p>
                  <p className="mt-0.5 font-mono text-xs uppercase tracking-widest text-white/30">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Verified charities                                                   */}
      {/* ================================================================== */}
      <PartnerGrid
        label={<><HeartHandshake className="h-4 w-4" /> Verified charities</>}
        title="The causes your events support."
        blurb="Every charity on FundRaisely is verified through The Giving Block. When a host selects one of these organisations, the smart contract sends funds directly to their verified wallet the moment the event ends."
        partners={verifiedCharities}
        cols="sm:grid-cols-1 md:grid-cols-2"
        large
      />

      {/* Non-profit CTA */}
      <section className="relative z-10 pb-4">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <W3Card className="border-[#6ef0d4]/20 p-8">
            <div className="grid gap-6 md:grid-cols-2 md:items-center">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-[#6ef0d4]/60">For non-profits</p>
                <h3 className="mt-2 font-mono text-2xl font-bold text-white">
                  Is your organisation on the list?
                </h3>
                <p className="mt-3 text-base leading-relaxed text-white/60">
                  FundRaisely will work with any non-profit that accepts crypto payments. Priority is given to
                  organisations already verified with The Giving Block, but we welcome all qualifying non-profits.
                  Get in touch to find out how to become a verified recipient.
                </p>
              </div>
              <div className="flex flex-col gap-3 md:items-end">
                <a
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#6ef0d4]/40 bg-[#6ef0d4]/10 px-6 py-3 font-mono font-semibold text-[#6ef0d4] transition hover:border-[#6ef0d4]/80 hover:bg-[#6ef0d4]/20"
                >
                  <MessageCircle className="h-4 w-4" /> Get in touch
                </a>
                <a
                  href="https://www.thegivingblock.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-6 py-3 font-mono font-semibold text-white/50 transition hover:border-white/30 hover:text-white"
                >
                  <BadgeCheck className="h-4 w-4" /> The Giving Block
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </W3Card>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Infrastructure                                                       */}
      {/* ================================================================== */}
      <PartnerGrid
        label={<><Zap className="h-4 w-4" /> Infrastructure</>}
        title="The tech that runs every event."
        blurb="Solana and Base provide the smart contract infrastructure for FundRaisely events. The Giving Block handles charity verification and direct-to-wallet routing. Glo Dollar brings impact-aligned stablecoin support."
        partners={infra}
        cols="sm:grid-cols-2 md:grid-cols-4"
      />

      {/* ================================================================== */}
      {/* Media and community                                                  */}
      {/* ================================================================== */}
      <PartnerGrid
        label={<><Users className="h-4 w-4" /> Media and community</>}
        title="The communities spreading the word."
        blurb="Publications, developer communities, and event networks helping FundRaisely reach clubs, charities, and Web3 ecosystems across Ireland and beyond."
        partners={media}
        cols="sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      />

      {/* ================================================================== */}
      {/* Early backers                                                        */}
      {/* ================================================================== */}
      <PartnerGrid
        label={<><Trophy className="h-4 w-4" /> Early backers</>}
        title="The people who believed early."
        blurb="Supporters and advisors who backed FundRaisely from the start and continue to help us build and grow."
        partners={earlyBackers}
        cols="sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      />

      {/* ================================================================== */}
      {/* What our partners enable                                             */}
      {/* ================================================================== */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel><BadgeCheck className="h-4 w-4" /> What this means for hosts</SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              Every partner plays a role in every event.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-white/50">
              When you host an event on FundRaisely, this entire ecosystem is working behind the scenes.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <W3Card className="border-[#6ef0d4]/20">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#6ef0d4]/20 bg-[#6ef0d4]/5">
                <HeartHandshake className="h-5 w-5 text-[#6ef0d4]" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">Charities your community can trust</h3>
              <p className="text-base leading-relaxed text-white/60">
                Every organisation on the platform has been vetted by The Giving Block. Players know the charity
                is real before they pay their entry fee. There is no ambiguity and nothing to take on trust.
              </p>
            </W3Card>

            <W3Card>
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1e2d42] bg-white/5">
                <Zap className="h-5 w-5 text-white/60" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">Infrastructure that keeps costs down</h3>
              <p className="text-base leading-relaxed text-white/60">
                Solana and Base are chosen specifically because they are fast and cheap to transact on. Low
                gas fees mean more of every entry fee reaches the winner, the charity, and you as host.
              </p>
            </W3Card>

            <W3Card className="border-[#a3f542]/20">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#a3f542]/20 bg-[#a3f542]/10">
                <Users className="h-5 w-5 text-[#a3f542]" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">Community that grows every event</h3>
              <p className="text-base leading-relaxed text-white/60">
                Media and community partners help events reach further. Blockleaders, Superteam Ireland, Base
                Ireland, and others amplify what hosts are doing and bring new players into the ecosystem.
              </p>
            </W3Card>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* CTA                                                                  */}
      {/* ================================================================== */}
      <section className="relative z-10 pb-20 pt-4">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <W3Card className="border-[#a3f542]/20 p-10 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-[#a3f542]/60">Ready to host</p>
            <h2 className="mt-3 font-mono text-4xl font-bold text-white">
              Put the whole ecosystem to work.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/50">
              Every event you host on FundRaisely runs on this network of partners. Pick your game, choose your
              charity, and let the platform handle the rest.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <a href="/web3/elimination" className="inline-flex items-center gap-2 rounded-xl border border-orange-400/40 bg-orange-400/10 px-8 py-4 font-mono font-bold text-orange-400 transition hover:border-orange-400/80 hover:bg-orange-400/20">
                <Crosshair className="h-5 w-5" /> Explore Elimination
              </a>
              <a href="/web3/quiz" className="inline-flex items-center gap-2 rounded-xl border border-[#a3f542]/40 bg-[#a3f542]/10 px-8 py-4 font-mono font-bold text-[#a3f542] transition hover:border-[#a3f542]/80 hover:bg-[#a3f542]/20">
                <Trophy className="h-5 w-5" /> Explore Quiz
              </a>
              <a href="/contact" className="inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-8 py-4 font-mono font-bold text-white/50 transition hover:border-white/30 hover:text-white">
                <MessageCircle className="h-5 w-5" /> Become a partner
              </a>
            </div>
          </W3Card>
        </div>
      </section>

    </div>
  );
};

export default Web3Partners;



