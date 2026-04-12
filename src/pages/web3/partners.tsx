import React from 'react';
import { SEO } from '../../components/SEO';
import { Web3Header } from '../../components/GeneralSite2/Web3Header';
import {
  ExternalLink,
  Globe,
  Users,
  Zap,
  BadgeCheck,
  MessageCircle,
  Trophy,
  Crosshair,
  Target,
  Rocket,
  ShieldCheck,
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
  <span className="inline-flex items-center gap-2 rounded-full border border-[#a3f542]/30 bg-[#a3f542]/10 px-4 py-1.5 font-mono text-sm font-semibold uppercase tracking-widest text-[#a3f542]">
    {children}
  </span>
);

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */
type Partner = {
  name: string;
  href?: string;
  imgSrc: string;
  imgAlt?: string;
  tagline?: string;
};

/* -------------------------------------------------------------------------- */
/* Partner card                                                               */
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
          <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-white/40">
            {partner.tagline}
          </p>
        )}
      </div>

      {partner.href && (
        <ExternalLink className="absolute right-3 top-3 h-3.5 w-3.5 text-[#a3f542]/40 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </div>
  );

  if (partner.href) {
    return (
      <a
        href={partner.href}
        target="_blank"
        rel="noreferrer"
        aria-label={`${partner.name} partner link`}
        className="block h-full"
      >
        {inner}
      </a>
    );
  }

  return <div className="h-full">{inner}</div>;
};

/* -------------------------------------------------------------------------- */
/* Grid section                                                               */
/* -------------------------------------------------------------------------- */
const PartnerGrid: React.FC<{
  label: React.ReactNode;
  title: string;
  blurb?: string;
  partners: Partner[];
  cols?: string;
  large?: boolean;
}> = ({
  label,
  title,
  blurb,
  partners,
  cols = 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  large = false,
}) => (
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
const Web3Partners: React.FC = () => {
  const infra: Partner[] = [
    {
      name: 'The Giving Block',
      href: 'https://www.thegivingblock.com/',
      imgSrc: 'partner/thegivingblock.webp',
      tagline: 'Charity verification and donation infrastructure',
    },
    {
      name: 'Solana',
      href: 'https://solana.com/',
      imgSrc: 'partner/Solana-Logo.png',
      tagline: 'Smart contract infrastructure for fundraising experiences',
    },
    {
      name: 'Base (EVM)',
      href: 'https://base.org/',
      imgSrc: 'partner/Base_square_blue.svg',
      tagline: 'EVM ecosystem support and mini app distribution',
    },
  ];

  const media: Partner[] = [
    {
      name: 'Blockleaders',
      href: 'https://blockleaders.io/',
      imgSrc: 'partner/blockleaders_logo.jpeg',
      tagline: 'Coverage and awareness',
    },
    {
      name: 'Superteam Ireland',
      href: 'https://www.linkedin.com/company/superteam-ireland/',
      imgSrc: 'partner/superteam_ireland_logo.jpeg',
      tagline: 'Demos and amplification',
    },
    {
      name: 'Base Ireland',
      href: 'https://x.com/base_ireland',
      imgSrc: 'partner/base_irelands.jpg',
      tagline: 'Ecosystem amplification',
    },
    {
      name: 'WiBT Women in Blockchain Talks',
      href: 'https://womeninblockchaintalks.com/',
      imgSrc: 'partner/wibt.jpg',
      tagline: 'Community support and visibility',
    },
    {
      name: 'Eth Dublin',
      href: 'https://www.ethdublin.io/',
      imgSrc: 'partner/ethdublin.jpeg',
      tagline: 'Believes in the mission',
    },
  ];

  const earlyBackers: Partner[] = [
    {
      name: 'Superteam Ireland',
      href: 'https://www.linkedin.com/company/superteam-ireland/',
      imgSrc: 'partner/superteam_ireland_logo.jpeg',
      tagline: 'Powering product velocity',
    },
  ];

  const faqItems = [
    {
      q: 'What kind of partners does FundRaisely work with?',
      a: 'FundRaisely works with infrastructure, ecosystem, media, and community partners that help make Web3 fundraising experiences possible, trusted, and more visible.',
    },
    {
      q: 'Are charity recipients listed on this partners page?',
      a: 'No. Charity and non-profit recipients now have their own dedicated causes page so the partners page can stay focused on ecosystem, infrastructure, and growth partners.',
    },
    {
      q: 'Why are infrastructure partners important for Web3 fundraising?',
      a: 'Infrastructure partners support verification, blockchain transactions, scalability, and user trust. They help FundRaisely build fundraising experiences that are transparent and usable.',
    },
    {
      q: 'Can my organisation become a FundRaisely partner?',
      a: 'Yes. If your organisation can support FundRaisely through infrastructure, ecosystem reach, media, events, or strategic collaboration, you can get in touch to discuss partnership opportunities.',
    },
    {
      q: 'Does FundRaisely work with both blockchain and community partners?',
      a: 'Yes. The platform depends on both technical infrastructure and community distribution. Smart contract platforms, ecosystem supporters, and media networks all play different roles.',
    },
    {
      q: 'Where can I learn how the platform works?',
      a: 'You can visit the features page to understand the product model, supported event formats, and how FundRaisely connects hosts, players, and causes through Web3 fundraising.',
    },
  ];

  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
      { '@type': 'ListItem', position: 2, name: 'Web3 Fundraising Marketplace', item: abs('/web3') },
      { '@type': 'ListItem', position: 3, name: 'Partners', item: abs('/web3/partners') },
    ],
  };

  const collectionPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Web3 Fundraising Partners and Ecosystem Supporters | FundRaisely',
    description:
      'Meet the infrastructure, ecosystem, media, and community partners supporting FundRaisely. Explore the Web3 fundraising network behind our quiz, elimination, and event experiences.',
    url: abs('/web3/partners'),
    hasPart: [
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
      {
        '@type': 'ItemList',
        name: 'Early Backers',
        itemListElement: earlyBackers.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: { '@type': 'Organization', name: p.name, url: p.href },
        })),
      },
    ],
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
        title="Web3 Fundraising Partners and Ecosystem Supporters | FundRaisely"
        description="Meet the infrastructure, ecosystem, media, and community partners supporting FundRaisely. Explore the Web3 fundraising network behind our quiz, elimination, and event experiences."
        keywords="web3 fundraising partners, crypto fundraising partners, blockchain fundraising ecosystem, fundraising infrastructure partners, solana fundraising, base ecosystem, the giving block, web3 community partners"
        structuredData={[breadcrumbsJsonLd, collectionPageJsonLd, faqJsonLd]}
        domainStrategy="geographic"
      />

      <Web3Header />

      <section className="relative z-10 pb-12 pt-28 sm:pt-32">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <SectionLabel>
              <Globe className="h-4 w-4" /> Ecosystem partners
            </SectionLabel>

            <h1 className="mt-6 font-mono text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
              The partners helping
              <br />
              <span className="text-[#a3f542]">FundRaisely grow</span>
            </h1>

            <p className="mt-6 max-w-3xl text-xl leading-relaxed text-white/70">
              FundRaisely is supported by infrastructure providers, ecosystem collaborators,
              media platforms, and community backers helping us build a stronger Web3
              fundraising marketplace. These partners help with trust, reach, visibility,
              and product momentum.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href="/web3/features"
                className="inline-flex items-center gap-2 rounded-xl border border-[#a3f542]/40 bg-[#a3f542]/10 px-6 py-3 font-mono font-semibold text-[#a3f542] transition hover:border-[#a3f542]/80 hover:bg-[#a3f542]/20"
              >
                <Zap className="h-4 w-4" /> Explore features
              </a>
              <a
                href="/web3/causes"
                className="inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-6 py-3 font-mono font-semibold text-white/60 transition hover:border-white/30 hover:text-white"
              >
                <ShieldCheck className="h-4 w-4" /> View causes
              </a>
              <a
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-6 py-3 font-mono font-semibold text-white/60 transition hover:border-white/30 hover:text-white"
              >
                <MessageCircle className="h-4 w-4" /> Become a partner
              </a>
            </div>

            <div className="mt-12 flex w-full flex-wrap justify-center gap-8 border-t border-[#1e2d42] pt-8 sm:justify-between">
              {[
                { value: '3', label: 'infrastructure partners' },
                { value: '5+', label: 'media & community partners' },
                { value: '2', label: 'supported chains/ecosystems' },
                { value: '1+', label: 'early backers' },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <p className="font-mono text-2xl font-bold text-white">{value}</p>
                  <p className="mt-0.5 font-mono text-xs uppercase tracking-widest text-white/30">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <PartnerGrid
        label={
          <>
            <Zap className="h-4 w-4" /> Infrastructure
          </>
        }
        title="The infrastructure behind the marketplace"
        blurb="These partners help provide the technical foundations, verification layer, and ecosystem support that make Web3 fundraising experiences more trustworthy and usable."
        partners={infra}
        cols="sm:grid-cols-2 md:grid-cols-3"
      />

      <PartnerGrid
        label={
          <>
            <Users className="h-4 w-4" /> Media and community
          </>
        }
        title="The communities helping us reach further"
        blurb="Community and media partners help FundRaisely reach builders, hosts, supporters, and Web3 audiences across Ireland and beyond."
        partners={media}
        cols="sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      />

      <PartnerGrid
        label={
          <>
            <Trophy className="h-4 w-4" /> Early backers
          </>
        }
        title="The people who backed the vision early"
        blurb="Early supporters helped FundRaisely gain momentum, validation, and visibility at a crucial stage of the build."
        partners={earlyBackers}
        cols="sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      />

      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel>
              <BadgeCheck className="h-4 w-4" /> What partners enable
            </SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              Why this ecosystem matters
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-white/50">
              FundRaisely is not just an app. It is a growing network of technical and
              community support that helps fundraising experiences become more trusted,
              more visible, and easier to launch.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <W3Card>
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1e2d42] bg-white/5">
                <Zap className="h-5 w-5 text-white/60" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">
                Stronger product foundations
              </h3>
              <p className="text-base leading-relaxed text-white/60">
                Infrastructure and ecosystem partners help FundRaisely build on trusted
                rails, reduce friction, and support low-cost fundraising experiences.
              </p>
            </W3Card>

            <W3Card className="border-[#a3f542]/20">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#a3f542]/20 bg-[#a3f542]/10">
                <Users className="h-5 w-5 text-[#a3f542]" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">
                More reach for hosts and events
              </h3>
              <p className="text-base leading-relaxed text-white/60">
                Community and media support helps more people discover the marketplace,
                the events on it, and the opportunity to host impact-driven experiences.
              </p>
            </W3Card>

            <W3Card className="border-[#6ef0d4]/20">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#6ef0d4]/20 bg-[#6ef0d4]/5">
                <Rocket className="h-5 w-5 text-[#6ef0d4]" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">
                Faster momentum for the mission
              </h3>
              <p className="text-base leading-relaxed text-white/60">
                Strategic backers and collaborators help FundRaisely move faster, test
                ideas in the real world, and grow the marketplace around real participation.
              </p>
            </W3Card>
          </div>
        </div>
      </section>

      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel>
              <MessageCircle className="h-4 w-4" /> FAQ
            </SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              Questions about partnerships
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {faqItems.map(item => (
              <FAQCard key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 pb-20 pt-4">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <W3Card className="border-[#a3f542]/20 p-10 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-[#a3f542]/60">
              Build with us
            </p>
            <h2 className="mt-3 font-mono text-4xl font-bold text-white">
              Help shape the Web3 fundraising marketplace
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/50">
              FundRaisely is building fundraising experiences that people want to join,
              with trusted causes, stronger host incentives, and a better participation
              model. If your organisation can help us grow the ecosystem, let’s talk.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <a
                href="/web3/features"
                className="inline-flex items-center gap-2 rounded-xl border border-[#a3f542]/40 bg-[#a3f542]/10 px-8 py-4 font-mono font-bold text-[#a3f542] transition hover:border-[#a3f542]/80 hover:bg-[#a3f542]/20"
              >
                <Target className="h-5 w-5" /> View Features
              </a>
              <a
                href="/web3/elimination"
                className="inline-flex items-center gap-2 rounded-xl border border-orange-400/40 bg-orange-400/10 px-8 py-4 font-mono font-bold text-orange-400 transition hover:border-orange-400/80 hover:bg-orange-400/20"
              >
                <Crosshair className="h-5 w-5" /> Explore Elimination
              </a>
              <a
                href="/web3/quiz"
                className="inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-8 py-4 font-mono font-bold text-white/60 transition hover:border-white/30 hover:text-white"
              >
                <Trophy className="h-5 w-5" /> Explore Quiz
              </a>
            </div>
          </W3Card>
        </div>
      </section>
    </div>
  );
};

export default Web3Partners;



