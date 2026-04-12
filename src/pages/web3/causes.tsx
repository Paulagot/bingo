import React, { useMemo } from 'react';
import { SEO } from '../../components/SEO';
import { Web3Header } from '../../components/GeneralSite2/Web3Header';
import {
  ExternalLink,
  HeartHandshake,
  Globe,
  BadgeCheck,
  MessageCircle,
  Coins,
  Shield,
  Zap,
  Target,
  CheckCircle2,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* URL helpers                                                                */
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
/* Shared UI                                                                  */
/* -------------------------------------------------------------------------- */
const W3Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`rounded-2xl border border-[#1e2d42] bg-[#0f1520] p-6 ${className}`}>{children}</div>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center gap-2 rounded-full border border-[#6ef0d4]/30 bg-[#6ef0d4]/10 px-4 py-1.5 font-mono text-sm font-semibold uppercase tracking-widest text-[#6ef0d4]">
    {children}
  </span>
);

type Cause = {
  name: string;
  href?: string;
  imgSrc: string;
  imgAlt?: string;
  tagline?: string;
};

const CauseCard: React.FC<{ cause: Cause }> = ({ cause }) => {
  const inner = (
    <div className="group relative flex h-full flex-col items-center justify-center rounded-2xl border border-[#1e2d42] bg-[#0f1520] p-6 transition-all duration-300 hover:border-[#6ef0d4]/30 hover:bg-[#141c2b]">
      <div className="mb-4 flex min-h-[120px] w-full items-center justify-center">
        <img
          src={withBase(cause.imgSrc)}
          alt={cause.imgAlt ?? cause.name}
          loading="lazy"
          width={220}
          height={100}
          className="max-h-28 max-w-[320px] w-auto object-contain"
          onError={e => {
            (e.currentTarget as HTMLImageElement).style.opacity = '0.3';
          }}
        />
      </div>
      <div className="text-center">
        <p className="font-mono text-sm font-bold text-white">{cause.name}</p>
        {cause.tagline && (
          <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-white/40">{cause.tagline}</p>
        )}
      </div>
      {cause.href && (
        <ExternalLink className="absolute right-3 top-3 h-3.5 w-3.5 text-[#6ef0d4]/40 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </div>
  );

  if (cause.href) {
    return (
      <a href={cause.href} target="_blank" rel="noreferrer" className="block h-full" aria-label={`${cause.name} link`}>
        {inner}
      </a>
    );
  }
  return <div className="h-full">{inner}</div>;
};

const FAQCard: React.FC<{ q: string; a: string }> = ({ q, a }) => (
  <W3Card className="h-full">
    <h3 className="font-mono text-base font-bold text-white">{q}</h3>
    <p className="mt-3 text-sm leading-relaxed text-white/60">{a}</p>
  </W3Card>
);

const Web3Causes: React.FC = () => {
  const verifiedCharities: Cause[] = [
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

  const faqItems = [
    {
      q: 'How are charities verified on FundRaisely?',
      a: 'FundRaisely prioritises organisations verified through The Giving Block. That verification process helps ensure the charity and wallet details are legitimate before they can be used in live fundraising events.',
    },
    {
      q: 'Why does crypto verification matter for non-profits?',
      a: 'When donations are sent on-chain, wallet accuracy and recipient verification matter. Using verified crypto donation recipients reduces risk and gives hosts and players more confidence in where funds go.',
    },
    {
      q: 'Can a non-profit join FundRaisely if it already accepts crypto donations?',
      a: 'Yes. If your organisation can receive crypto donations, you may be able to become a recipient on the platform. Giving Block verified organisations are prioritised, but qualifying non-profits can get in touch to discuss onboarding.',
    },
    {
      q: 'Do funds go directly to the charity?',
      a: 'FundRaisely is designed around direct, transparent on-chain transfers to verified recipients. The exact transfer flow depends on the event and chain, but the principle is that charity funds should go to the intended recipient without manual redirection.',
    },
    {
      q: 'Where can I learn more about crypto donations for my non-profit?',
      a: 'You can review The Giving Block for more on crypto donation infrastructure and contact FundRaisely if you want to discuss becoming a verified recipient for Web3 fundraising events.',
    },
    {
      q: 'Can anyone host an event for a listed cause?',
      a: 'That is the goal of the marketplace model. Once a cause is an approved recipient, hosts can choose it when launching fundraising events, allowing people beyond the charity’s own audience to raise funds for it.',
    },
  ];

  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
      { '@type': 'ListItem', position: 2, name: 'Web3 Fundraising Marketplace', item: abs('/web3') },
      { '@type': 'ListItem', position: 3, name: 'Causes', item: abs('/web3/causes') },
    ],
  };

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Verified Causes for Crypto Donations and Web3 Fundraising | FundRaisely',
    description:
      'Browse verified charities and non-profit causes supported by FundRaisely. Learn how crypto donations, The Giving Block verification, and on-chain fundraising events connect donors, hosts and approved recipients.',
    url: abs('/web3/causes'),
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Verified causes',
    itemListElement: verifiedCharities.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: { '@type': 'Organization', name: p.name, url: p.href },
    })),
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#0a0e14]">
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
        title="Verified Causes for Crypto Donations and Web3 Fundraising | FundRaisely"
        description="Browse verified charities and non-profit causes supported by FundRaisely. Learn how crypto donations, The Giving Block verification, and on-chain fundraising events connect donors, hosts and approved recipients."
        keywords="crypto donations for nonprofits, verified charities crypto, the giving block charities, web3 fundraising causes, nonprofit crypto donations, blockchain charity recipients, approved crypto charities"
        domainStrategy="geographic"
        structuredData={[breadcrumbsJsonLd, webPageJsonLd, faqJsonLd, itemListJsonLd]}
      />

      <Web3Header />

      <section className="relative z-10 pb-12 pt-28 sm:pt-32">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <SectionLabel><HeartHandshake className="h-4 w-4" /> Verified causes</SectionLabel>

            <h1 className="mt-6 font-mono text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
              Verified charities for
              <br />
              <span className="text-[#6ef0d4]">crypto donations and Web3 fundraising</span>
            </h1>

            <p className="mt-6 max-w-3xl text-xl leading-relaxed text-white/70">
              FundRaisely works with verified charities and approved non-profit recipients so hosts can run Web3 fundraising events with confidence. We highlight organisations verified through The Giving Block and build the marketplace around transparent crypto donation flows and trusted recipients.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href="https://www.thegivingblock.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-[#6ef0d4]/40 bg-[#6ef0d4]/10 px-6 py-3 font-mono font-semibold text-[#6ef0d4] transition hover:border-[#6ef0d4]/80 hover:bg-[#6ef0d4]/20"
              >
                <BadgeCheck className="h-4 w-4" /> The Giving Block
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <a
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-6 py-3 font-mono font-semibold text-white/60 transition hover:border-white/30 hover:text-white"
              >
                <MessageCircle className="h-4 w-4" /> Become a recipient
              </a>
              <a
                href="/web3/features"
                className="inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-6 py-3 font-mono font-semibold text-white/60 transition hover:border-white/30 hover:text-white"
              >
                <Target className="h-4 w-4" /> How it works
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel><BadgeCheck className="h-4 w-4" /> Approved recipients</SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              The causes your events can support
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-white/50">
              Every listed organisation is presented as part of a trust-first approach to crypto fundraising. Verified causes matter because they reduce uncertainty for hosts, players, and non-profits alike.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
            {verifiedCharities.map(cause => (
              <CauseCard key={cause.name} cause={cause} />
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <W3Card className="border-[#6ef0d4]/20 p-8">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
              <div>
                <SectionLabel><Coins className="h-4 w-4" /> For non-profits</SectionLabel>
                <h2 className="mt-4 font-mono text-3xl font-bold text-white">
                  Become a verified
                  <span className="text-[#6ef0d4]"> crypto donation recipient</span>
                </h2>
                <p className="mt-4 leading-relaxed text-white/50">
                  If your organisation can receive crypto donations, it can potentially be selected by hosts across the platform as the beneficiary of their events. That means fundraising can happen beyond your own direct audience.
                </p>
                <p className="mt-3 leading-relaxed text-white/50">
                  FundRaisely gives priority to organisations already verified with The Giving Block, but qualifying non-profits that accept crypto can still get in touch to discuss becoming an approved recipient on the marketplace.
                </p>
                <p className="mt-3 leading-relaxed text-white/50">
                  The goal is simple: make crypto donations more usable for non-profits by connecting verified recipients with hosts and communities that want to fund meaningful causes through live events.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href="/contact"
                    className="inline-flex items-center gap-2 rounded-xl border border-[#6ef0d4]/40 bg-[#6ef0d4]/10 px-5 py-3 font-mono font-semibold text-[#6ef0d4] transition hover:border-[#6ef0d4]/80 hover:bg-[#6ef0d4]/20"
                  >
                    <MessageCircle className="h-4 w-4" /> Get in touch
                  </a>
                  <a
                    href="https://www.thegivingblock.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-5 py-3 font-mono font-semibold text-white/60 transition hover:border-white/30 hover:text-white"
                  >
                    <BadgeCheck className="h-4 w-4" /> Learn about The Giving Block
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              <div className="grid gap-3">
                {[
                  {
                    icon: <BadgeCheck className="h-5 w-5 text-[#6ef0d4]" />,
                    title: 'Priority for Giving Block verified orgs',
                    body: 'Organisations already verified with The Giving Block are fast-tracked for recipient onboarding.',
                  },
                  {
                    icon: <Coins className="h-5 w-5 text-[#6ef0d4]" />,
                    title: 'Built for crypto donation readiness',
                    body: 'This page is aimed at non-profits that want to be discoverable as approved recipients for crypto-enabled fundraising.',
                  },
                  {
                    icon: <Zap className="h-5 w-5 text-[#6ef0d4]" />,
                    title: 'Transparent on-chain transfers',
                    body: 'FundRaisely is built around direct, trackable blockchain transfers rather than unclear manual routing.',
                  },
                  {
                    icon: <Shield className="h-5 w-5 text-[#6ef0d4]" />,
                    title: 'Trust layer for hosts and players',
                    body: 'Verified causes help reduce doubt and make fundraising events easier for communities to back with confidence.',
                  },
                ].map(({ icon, title, body }) => (
                  <div key={title} className="flex items-start gap-3 rounded-xl border border-[#1e2d42] bg-[#0a0e14] p-4">
                    <div className="mt-0.5 shrink-0">{icon}</div>
                    <div>
                      <p className="mb-1 font-mono text-sm font-bold text-white">{title}</p>
                      <p className="text-sm leading-relaxed text-white/50">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </W3Card>
        </div>
      </section>

      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <W3Card className="border-[#6ef0d4]/20 p-8">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <div>
                <SectionLabel><Globe className="h-4 w-4" /> Verification and routing</SectionLabel>
                <h2 className="mt-4 font-mono text-3xl font-bold text-white">
                  Why verified charity infrastructure matters
                </h2>
                <p className="mt-4 text-base leading-relaxed text-white/60">
                  FundRaisely uses The Giving Block as the key trust signal around charity verification. That matters because crypto donations are only as trustworthy as the recipient information behind them. Verification helps hosts choose causes confidently and helps players understand that their entry fees are supporting legitimate recipients.
                </p>
                <p className="mt-3 text-base leading-relaxed text-white/60">
                  The marketplace model depends on trust. A host may be fundraising for a cause they do not personally run. A player may be joining because they like the format, not because they already know the non-profit. Verification closes that trust gap.
                </p>
              </div>

              <div className="grid gap-3">
                {[
                  'Verified recipient identity matters for crypto donations',
                  'Hosts can fundraise for approved causes they care about',
                  'Players get more confidence around beneficiary legitimacy',
                  'On-chain transfers are easier to understand when the recipient is trusted',
                ].map(t => (
                  <div key={t} className="flex items-start gap-2 text-sm text-white/55">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#6ef0d4]" />
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </W3Card>
        </div>
      </section>

      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel><MessageCircle className="h-4 w-4" /> FAQ</SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">Questions from charities and hosts</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {faqItems.map(item => (
              <FAQCard key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Web3Causes;