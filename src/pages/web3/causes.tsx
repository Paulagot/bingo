import React from 'react';
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
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  return 'https://fundraisely.ie';
}

function abs(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${getOrigin()}${p}`;
}

const BASE_URL = (import.meta as any)?.env?.BASE_URL ?? '/';

const withBase = (p: string) => `${BASE_URL}${p.replace(/^\/+/, '')}`;

const imageSrc = (p: string) => {
  if (/^https?:\/\//i.test(p)) return p;
  return withBase(p);
};

/* -------------------------------------------------------------------------- */
/* Shared UI                                                                  */
/* -------------------------------------------------------------------------- */
const W3Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`rounded-2xl border border-[#1e2d42] bg-[#0f1520] p-6 ${className}`}>
    {children}
  </div>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center gap-2 rounded-full border border-[#6ef0d4]/30 bg-[#6ef0d4]/10 px-4 py-1.5 font-mono text-sm font-semibold uppercase tracking-widest text-[#6ef0d4]">
    {children}
  </span>
);

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */
type Cause = {
  name: string;
  href?: string;
  imgSrc: string;
  imgAlt?: string;
  tagline?: string;
};

type ImpactNetworkCharity = {
  name: string;
  imgSrc: string;
  imgAlt?: string;
};

/* -------------------------------------------------------------------------- */
/* Cause card                                                                 */
/* -------------------------------------------------------------------------- */
const CauseCard: React.FC<{ cause: Cause }> = ({ cause }) => {
  const inner = (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#1e2d42] bg-[#0f1520] transition-all duration-300 hover:border-[#6ef0d4]/35">
      <div className="h-1 w-full flex-shrink-0 bg-gradient-to-r from-[#6ef0d4] to-[#3bb8a0]" />

      <div className="flex min-h-[150px] w-full items-center justify-center border-b border-[#1e2d42] bg-[#141c2b] px-6 py-6">
        <img
          src={imageSrc(cause.imgSrc)}
          alt={cause.imgAlt ?? cause.name}
          loading="lazy"
          width={320}
          height={120}
          className="max-h-28 w-full max-w-[340px] object-contain"
          onError={e => {
            (e.currentTarget as HTMLImageElement).style.opacity = '0.25';
          }}
        />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="font-mono text-base font-bold leading-snug text-white">
          {cause.name}
        </p>

        {cause.tagline && (
          <p className="mt-2.5 flex-1 whitespace-pre-line text-base leading-relaxed text-white/70">
            {cause.tagline}
          </p>
        )}

        {cause.href && (
          <div className="mt-4 flex items-center gap-1.5 border-t border-[#1e2d42] pt-3.5">
            <span className="font-mono text-xs font-semibold text-[#6ef0d4]">
              {cause.href.replace(/^https?:\/\//, '')}
            </span>
            <ExternalLink className="h-3 w-3 text-[#6ef0d4]/60" />
          </div>
        )}
      </div>
    </div>
  );

  if (cause.href) {
    return (
      <a
        href={cause.href}
        target="_blank"
        rel="noreferrer"
        className="block h-full"
        aria-label={`${cause.name} link`}
      >
        {inner}
      </a>
    );
  }

  return <div className="h-full">{inner}</div>;
};

/* -------------------------------------------------------------------------- */
/* BFP supported charity logo card                                            */
/* -------------------------------------------------------------------------- */
const ImpactNetworkLogoCard: React.FC<{ charity: ImpactNetworkCharity }> = ({
  charity,
}) => (
  <div className="flex h-full min-h-[168px] flex-col rounded-2xl border border-[#1e2d42] bg-[#0f1520] p-4 transition hover:border-orange-400/30 hover:bg-[#141c2b]">
    <div className="flex min-h-[95px] items-center justify-center rounded-xl border border-white/10 bg-white px-4 py-4">
      <img
        src={imageSrc(charity.imgSrc)}
        alt={charity.imgAlt ?? charity.name}
        loading="lazy"
        width={180}
        height={80}
        className="max-h-14 w-auto max-w-[150px] object-contain"
        onError={e => {
          (e.currentTarget as HTMLImageElement).style.opacity = '0.3';
        }}
      />
    </div>

    <div className="flex flex-1 items-center justify-center">
      <p className="mt-4 text-center font-mono text-xs font-bold leading-snug text-white/80">
        {charity.name}
      </p>
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/* BFP impact network section                                                 */
/* -------------------------------------------------------------------------- */
const BfpImpactNetwork: React.FC<{
  charities: ImpactNetworkCharity[];
}> = ({ charities }) => (
  <section className="relative z-10 py-12">
    <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <SectionLabel>
          <HeartHandshake className="h-4 w-4" /> BFP impact network
        </SectionLabel>

        <h2 className="mt-4 font-mono text-3xl font-bold text-white">
          Animal welfare causes supported through Buddies for Paws
        </h2>

        <p className="mx-auto mt-3 max-w-3xl text-white/50">
          Buddies for Paws is an animal welfare fundraising initiative within the BONK ecosystem, supporting verified charity partners through community-powered giving. Eligible FundRaisely quiz and elimination events using BONK as the fee token can help increase the impact delivered to these causes.
        </p>
      </div>

      <W3Card className="border-orange-400/20 bg-[#101624] p-6 sm:p-8">
        <a
          href="https://www.buddiesforpaws.org/"
          target="_blank"
          rel="noreferrer"
          aria-label="Visit Buddies for Paws"
          className="group mb-6 block rounded-2xl border border-[#1e2d42] bg-[#0b111b] p-5 transition hover:border-orange-400/40 hover:bg-[#101827]"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-orange-400/20 bg-orange-400/10 p-3">
                <img
                  src={imageSrc('partner/BFP-master-orange.png')}
                  alt="Buddies for Paws logo"
                  loading="lazy"
                  width={90}
                  height={90}
                  className="max-h-14 w-auto object-contain"
                  onError={e => {
                    (e.currentTarget as HTMLImageElement).style.opacity = '0.3';
                  }}
                />
              </div>

              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-orange-300/70">
                  Partner-led impact network
                </p>

                <p className="mt-1 font-mono text-lg font-bold text-white">
                  BFP-supported global partners
                </p>

                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/50">
                 These organisations are BFP's verified charity partners, supported through community-powered giving. They are shown separately from direct FundRaisely verified causes
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 font-mono text-sm font-semibold text-orange-300 transition group-hover:text-orange-200">
              Visit Buddies for Paws
              <ExternalLink className="h-4 w-4" />
            </div>
          </div>
        </a>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6">
          {charities.map(charity => (
            <ImpactNetworkLogoCard key={charity.name} charity={charity} />
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-orange-400/20 bg-orange-400/10 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-orange-400/30 bg-[#0a0e14] p-2">
              <img
                src={imageSrc('partner/bonk.png')}
                alt="BONK logo"
                loading="lazy"
                width={56}
                height={56}
                className="max-h-10 w-auto object-contain"
                onError={e => {
                  (e.currentTarget as HTMLImageElement).style.opacity = '0.3';
                }}
              />
            </div>

            <div>
              <p className="font-mono text-sm font-bold text-white">
                BONK-powered matching support
              </p>

              <p className="mt-1 text-sm leading-relaxed text-white/60">
                When eligible FundRaisely events use BONK as the fee token, the charity
                portion can connect to BFP matching support, helping increase the total
                impact delivered through this wider animal welfare network.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
          <a
            href="https://www.buddiesforpaws.org/charities/global-partners"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-400/40 bg-orange-400/10 px-5 py-3 font-mono text-sm font-semibold text-orange-300 transition hover:border-orange-400/80 hover:bg-orange-400/20"
          >
            View all BFP global partners
            <ExternalLink className="h-4 w-4" />
          </a>

          <a
            href="https://www.buddiesforpaws.org/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#1e2d42] px-5 py-3 font-mono text-sm font-semibold text-white/70 transition hover:border-white/30 hover:text-white"
          >
            Visit Buddies for Paws
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </W3Card>
    </div>
  </section>
);

/* -------------------------------------------------------------------------- */
/* FAQ card                                                                   */
/* -------------------------------------------------------------------------- */
const FAQCard: React.FC<{ q: string; a: string }> = ({ q, a }) => (
  <W3Card className="h-full">
    <h3 className="font-mono text-base font-bold text-white">{q}</h3>
    <p className="mt-3 text-sm leading-relaxed text-white/60">{a}</p>
  </W3Card>
);

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */
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

  const bfpSupportedCharities: ImpactNetworkCharity[] = [
    {
      name: 'Save the Chimps',
      imgSrc:
        'https://cdn.sanity.io/images/ca39ehry/production/5f629f42ec4e8bbe3896f2aa5d14bef398169791-200x200.webp',
    },
    {
      name: 'Sea Turtle Conservancy',
      imgSrc:
        'https://cdn.sanity.io/images/ca39ehry/production/b25d2e5bc07444179ab1f4a02515434871038977-200x200.webp',
    },
    {
      name: 'Dogs for Better Lives',
      imgSrc:
        'https://cdn.sanity.io/images/ca39ehry/production/875afe067ae774532aba5669077bbd373acc956b-240x110.webp',
    },
    {
      name: 'Scottish SPCA',
      imgSrc:
        'https://cdn.sanity.io/images/ca39ehry/production/02f800ea8921b15084a1eb0799a8d84a7040000f-595x186.webp',
    },
    {
      name: 'Orangutan Outreach',
      imgSrc:
        'https://cdn.sanity.io/images/ca39ehry/production/e8a125b4f02ed69fcbb1de957bd7d9b265a16e84-321x194.webp',
    },
    {
      name: 'Wildlife SOS',
      imgSrc:
        'https://cdn.sanity.io/images/ca39ehry/production/bd4b5ebd948beff0a0545e2b06a35623da2d81a6-161x103.png',
    },
  ];

  const faqItems = [
    {
      q: 'How are charities verified on FundRaisely?',
      a: 'FundRaisely prioritises organisations verified through The Giving Block. That verification process helps ensure the charity and wallet details are legitimate before they can be used in live fundraising events.',
    },
    {
      q: 'Are all Buddies for Paws global partners direct FundRaisely causes?',
      a: 'No. FundRaisely distinguishes between direct verified causes listed on the platform and partner-led impact networks. Buddies for Paws supports a wider network of animal welfare charities and global partners, which can be explored through the BFP website.',
    },
    {
      q: 'How does BONK matching work with FundRaisely events?',
      a: 'For eligible quiz and elimination events using BONK as the fee token, the charity portion of the event can be matched through the Buddies for Paws matching pool. This helps increase the total impact delivered through the supported cause or impact network.',
    },
    {
      q: 'Why does crypto verification matter for non-profits?',
      a: 'When donations are sent on-chain, wallet accuracy and recipient verification matter. Using verified crypto donation recipients reduces risk and gives hosts and players more confidence in where funds go.',
    },
    {
      q: 'Can a non-profit join FundRaisely if it already accepts crypto donations?',
      a: 'Yes. If your organisation can receive crypto donations, it may be able to become a recipient on the platform. Giving Block verified organisations are prioritised, but qualifying non-profits can get in touch to discuss onboarding.',
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
    name: 'Verified Causes and Impact Networks for Web3 Fundraising | FundRaisely',
    description:
      'Browse direct FundRaisely verified causes and partner-led impact networks supported through Web3 fundraising, The Giving Block verification, and BONK-powered matching.',
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
    name: 'Direct FundRaisely verified causes',
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
        title="Verified Causes and Impact Networks for Web3 Fundraising | FundRaisely"
        description="Browse direct FundRaisely verified causes and partner-led impact networks supported through Web3 fundraising, The Giving Block verification, and BONK-powered matching."
        keywords="crypto donations for nonprofits, verified charities crypto, the giving block charities, web3 fundraising causes, buddies for paws, bonk matching, animal welfare crypto charity, nonprofit crypto donations, blockchain charity recipients"
        domainStrategy="geographic"
        structuredData={[breadcrumbsJsonLd, webPageJsonLd, faqJsonLd, itemListJsonLd]}
      />

      <Web3Header />

      {/* Hero */}
      <section className="relative z-10 pb-12 pt-28 sm:pt-32">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <SectionLabel>
              <HeartHandshake className="h-4 w-4" /> Verified causes
            </SectionLabel>

            <h1 className="mt-6 font-mono text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
              Verified causes and
              <br />
              <span className="text-[#6ef0d4]">impact networks</span>
            </h1>

            <p className="mt-6 max-w-3xl text-xl leading-relaxed text-white/70">
              FundRaisely connects Web3 fundraising events with verified charities and
              trusted impact networks. Some causes are direct FundRaisely recipients
              verified through The Giving Block, while partner-led impact networks like
              Buddies for Paws help extend support to wider communities of charitable
              organisations.
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
                href="https://www.buddiesforpaws.org/charities/global-partners"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-orange-400/40 bg-orange-400/10 px-6 py-3 font-mono font-semibold text-orange-300 transition hover:border-orange-400/80 hover:bg-orange-400/20"
              >
                <HeartHandshake className="h-4 w-4" /> BFP global partners
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

      {/* Direct causes */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel>
              <BadgeCheck className="h-4 w-4" /> Direct verified causes
            </SectionLabel>

            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              Direct FundRaisely verified causes
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-white/50">
              These organisations are direct FundRaisely cause partners and are presented as
              verified recipients through The Giving Block. Hosts can use approved causes like
              these when launching Web3 fundraising events.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
            {verifiedCharities.map(cause => (
              <CauseCard key={cause.name} cause={cause} />
            ))}
          </div>
        </div>
      </section>

      {/* BFP impact network */}
      <BfpImpactNetwork charities={bfpSupportedCharities} />

      {/* Cause pathways */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel>
              <Shield className="h-4 w-4" /> Cause pathways
            </SectionLabel>

            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              Two ways impact reaches verified causes
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-white/50">
              FundRaisely can support direct cause partners and partner-led impact
              networks. Both help build trust, but they work slightly differently.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <W3Card>
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#6ef0d4]/20 bg-[#6ef0d4]/10">
                <BadgeCheck className="h-5 w-5 text-[#6ef0d4]" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">
                Direct verified causes
              </h3>
              <p className="text-base leading-relaxed text-white/60">
                These are charities FundRaisely lists directly as approved recipients
                for Web3 fundraising events.
              </p>
            </W3Card>

            <W3Card>
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-orange-400/20 bg-orange-400/10">
                <HeartHandshake className="h-5 w-5 text-orange-300" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">
                Partner impact networks
              </h3>
              <p className="text-base leading-relaxed text-white/60">
                Impact partners like Buddies for Paws connect FundRaisely events to a
                wider network of mission-aligned charities and global partners.
              </p>
            </W3Card>

            <W3Card>
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#a3f542]/20 bg-[#a3f542]/10">
                <Zap className="h-5 w-5 text-[#a3f542]" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">
                Matching support
              </h3>
              <p className="text-base leading-relaxed text-white/60">
                When an eligible event uses a supported fee token such as BONK, the
                charity portion can unlock additional matching support.
              </p>
            </W3Card>
          </div>
        </div>
      </section>

      {/* For non-profits */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <W3Card className="border-[#6ef0d4]/20 p-8">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
              <div>
                <SectionLabel>
                  <Coins className="h-4 w-4" /> For non-profits
                </SectionLabel>

                <h2 className="mt-4 font-mono text-3xl font-bold text-white">
                  Become a verified
                  <span className="text-[#6ef0d4]"> crypto donation recipient</span>
                </h2>

                <p className="mt-4 leading-relaxed text-white/50">
                  If your organisation can receive crypto donations, it can potentially be
                  selected by hosts across the platform as the beneficiary of their events.
                  That means fundraising can happen beyond your own direct audience.
                </p>

                <p className="mt-3 leading-relaxed text-white/50">
                  FundRaisely gives priority to organisations already verified with The Giving
                  Block, but qualifying non-profits that accept crypto can still get in touch
                  to discuss becoming an approved recipient on the marketplace.
                </p>

                <p className="mt-3 leading-relaxed text-white/50">
                  The goal is simple: make crypto donations more usable for non-profits by
                  connecting verified recipients with hosts and communities that want to fund
                  meaningful causes through live events.
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
                  <div
                    key={title}
                    className="flex items-start gap-3 rounded-xl border border-[#1e2d42] bg-[#0a0e14] p-4"
                  >
                    <div className="mt-0.5 shrink-0">{icon}</div>
                    <div>
                      <p className="mb-1 font-mono text-sm font-bold text-white">
                        {title}
                      </p>
                      <p className="text-sm leading-relaxed text-white/50">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </W3Card>
        </div>
      </section>

      {/* Verification */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <W3Card className="border-[#6ef0d4]/20 p-8">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <div>
                <SectionLabel>
                  <Globe className="h-4 w-4" /> Verification and routing
                </SectionLabel>

                <h2 className="mt-4 font-mono text-3xl font-bold text-white">
                  Why verified charity infrastructure matters
                </h2>

                <p className="mt-4 text-base leading-relaxed text-white/60">
                  FundRaisely uses The Giving Block as the key trust signal around charity
                  verification. That matters because crypto donations are only as trustworthy
                  as the recipient information behind them. Verification helps hosts choose
                  causes confidently and helps players understand that their entry fees are
                  supporting legitimate recipients.
                </p>

                <p className="mt-3 text-base leading-relaxed text-white/60">
                  The marketplace model depends on trust. A host may be fundraising for a
                  cause they do not personally run. A player may be joining because they like
                  the format, not because they already know the non-profit. Verification
                  closes that trust gap.
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

      {/* FAQ */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel>
              <MessageCircle className="h-4 w-4" /> FAQ
            </SectionLabel>

            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              Questions from charities and hosts
            </h2>
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