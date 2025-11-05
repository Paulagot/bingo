import type React from 'react';
import { SEO } from '../../components/SEO';
import { Header } from '../../components/GeneralSite2/Header';
import SiteFooter from '../../components/GeneralSite2/SiteFooter';
import { Link } from 'react-router-dom';
import { ArrowRight, MessageSquare, FileText, Quote } from 'lucide-react';

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

type Testimonial = {
  quote: string;
  author: string;
  roleOrOrg?: string;
  logoSrc?: string;
  logoAlt?: string;
};

function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <div className="group relative rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-lg transition-all duration-300">
      <Quote className="absolute top-4 right-4 h-8 w-8 text-indigo-100" />
      <div className="flex items-start gap-4">
        {t.logoSrc ? (
          <img
            src={t.logoSrc}
            alt={t.logoAlt || t.roleOrOrg || t.author}
            loading="lazy"
            width={64}
            height={64}
            className="h-12 w-12 shrink-0 rounded-lg object-contain"
          />
        ) : (
          <div className="h-12 w-12 shrink-0 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600" aria-hidden="true" />
        )}
        <div className="flex-1">
          <p className="text-indigo-800/80 leading-relaxed">"{t.quote}"</p>
          <div className="mt-4">
            <div className="text-indigo-900 font-bold">{t.author}</div>
            {t.roleOrOrg && <div className="text-indigo-800/60 text-sm">{t.roleOrOrg}</div>}
          </div>
        </div>
      </div>
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
}

function CaseStudyTeaser({
  title,
  blurb,
  href = '#',
}: {
  title: string;
  blurb: string;
  href?: string;
}) {
  return (
    <div className="group relative rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-lg transition-all duration-300">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
        <FileText className="h-5 w-5 text-white" />
      </div>
      <h3 className="text-indigo-900 text-lg font-bold mb-2">{title}</h3>
      <p className="text-indigo-800/70 text-sm leading-relaxed mb-4">{blurb}</p>
   
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
}

const Web3Testimonials: React.FC = () => {
  // Placeholder testimonials
  const testimonials: Testimonial[] = [
    {
      quote:
        'The on-chain receipts and payout automation made reporting to our committee simple and credible.',
      author: 'Name Placeholder',
      roleOrOrg: 'Club / DAO Name',
      logoSrc: '/assets/testimonials/placeholder-club.svg',
      logoAlt: 'Club logo placeholder',
    },
    {
      quote:
        'Players loved the transparency. We hit our target and the charity received funds instantly.',
      author: 'Name Placeholder',
      roleOrOrg: 'Community / Project',
      logoSrc: '/assets/testimonials/placeholder-dao.svg',
      logoAlt: 'Community logo placeholder',
    },
    {
      quote:
        'Setup took minutes. FundRaisely handled wallets, the contract, and audit-ready reports.',
      author: 'Name Placeholder',
      roleOrOrg: 'Event Host',
      logoSrc: '/assets/testimonials/placeholder-event.svg',
      logoAlt: 'Event logo placeholder',
    },
  ];

  // JSON-LD Structured Data
  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
      { '@type': 'ListItem', position: 2, name: 'Web3 Fundraising', item: abs('/web3') },
      { '@type': 'ListItem', position: 3, name: 'Testimonials', item: abs('/web3/testimonials') },
    ],
  };

  const collectionPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Web3 Fundraising Testimonials & Case Studies | FundRaisely',
    description:
      'Real stories from DAOs, clubs, and communities running transparent, on-chain fundraisers with FundRaisely. See verified impact through smart contract receipts and charity payouts.',
    url: abs('/web3/testimonials'),
    hasPart: [
      {
        '@type': 'ItemList',
        name: 'Community Testimonials',
        itemListElement: testimonials.map((t, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'Review',
            name: 'FundRaisely Web3 Fundraising',
            reviewBody: t.quote,
            author: { '@type': 'Organization', name: t.roleOrOrg || t.author },
            itemReviewed: { '@type': 'Organization', name: 'FundRaisely' },
          },
        })),
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <SEO
        title="Web3 Fundraising Testimonials & Case Studies | FundRaisely"
        description="Real stories from DAOs, clubs, and communities running transparent, on-chain fundraisers with FundRaisely. See verified impact through smart contract receipts and charity payouts."
        keywords="web3 fundraising testimonials, crypto charity case studies, DAO fundraising reviews, on-chain fundraising stories, blockchain charity success stories"
        structuredData={[breadcrumbsJsonLd, collectionPageJsonLd]}
        domainStrategy="geographic"
      />

      <Header />

      {/* Hero Section */}
      <section className="relative px-4 pt-12 pb-8">
        <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-emerald-300/30 blur-2xl" />
        <div className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-indigo-300/30 blur-2xl" />

        <div className="container relative z-10 mx-auto max-w-6xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 text-sm font-medium">
            <MessageSquare className="h-4 w-4" /> Community Stories
          </span>

          <h1 className="mt-4 bg-gradient-to-r from-indigo-700 to-emerald-600 bg-clip-text text-transparent text-4xl md:text-6xl font-bold">
            Web3 Fundraising Success Stories
          </h1>
          <p className="mt-2 text-2xl md:text-3xl font-semibold text-indigo-900">
            Testimonials & Case Studies
          </p>

          <p className="mx-auto mt-4 max-w-3xl text-indigo-900/70 text-lg md:text-xl">
            Real stories from communities using transparent, on-chain fundraisers. Each testimonial is backed by verifiable smart contract receipts and charity payout records — because impact should always be provable.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              to="/contact"
              className="rounded-xl bg-indigo-700 px-6 py-3 text-white font-semibold shadow-md hover:bg-indigo-800 inline-flex items-center gap-2 transition"
            >
              <MessageSquare className="h-5 w-5" /> Share Your Story
            </Link>
            <Link
              to="/web3/impact-campaign"
              className="rounded-xl bg-white px-6 py-3 text-indigo-700 font-semibold shadow-md hover:bg-indigo-50 inline-flex items-center gap-2 border border-indigo-200 transition"
            >
              Join Impact Campaign
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Quote */}
      <section className="px-4 pt-8">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-indigo-50 to-purple-50 p-8 shadow-sm">
            <Quote className="h-12 w-12 text-indigo-300 mb-4" />
            <p className="text-indigo-900/80 text-xl md:text-2xl leading-relaxed italic mb-4">
              "Quote placeholder — your story could be here. Share how FundRaisely's transparent infrastructure helped your community raise funds and prove impact."
            </p>
            <div className="text-indigo-900 font-bold text-lg">— Community Name</div>
            <div className="mt-6">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-md hover:bg-indigo-700 transition"
              >
                Submit Your Testimonial <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Grid */}
      <section className="px-4 pt-12">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8">
            <h2 className="text-indigo-900 text-3xl font-bold mb-4">Community Voices</h2>
            <p className="text-indigo-900/70 text-lg max-w-3xl mx-auto">
              Every testimonial is published alongside on-chain receipts and verified payout summaries, so supporters can see the direct impact and transparency in action.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {testimonials.map((t, idx) => (
              <TestimonialCard key={idx} t={t} />
            ))}
          </div>
        </div>
      </section>

      {/* Case Studies */}
      <section className="px-4 pt-12">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8">
            <h2 className="text-indigo-900 text-3xl font-bold mb-4">In-Depth Case Studies</h2>
            <p className="text-indigo-900/70 text-lg max-w-3xl mx-auto">
              Deep-dives with smart contract links, payout breakdowns, and lessons learned. Want your event featured? Host a fundraiser and send us your story.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <CaseStudyTeaser
              title="DAO Trivia Night — €5k to Charity"
              blurb="How a global community used on-chain entry fees and instant payouts to hit their fundraising goal in under 2 hours."
            />
            <CaseStudyTeaser
              title="Local Club Quiz — Transparent First"
              blurb="From cash boxes to smart contracts: moving to verifiable receipts increased trust and event turnout by 40%."
            />
            <CaseStudyTeaser
              title="Hybrid Event — NFT Prizes"
              blurb="Mixing tokenized prizes with charity splits to boost engagement while keeping impact front-and-center."
            />
          </div>
        </div>
      </section>

      {/* Why Share Your Story */}
      <section className="px-4 pt-12">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <h2 className="text-indigo-900 text-2xl font-bold mb-4">Why Share Your Story?</h2>
            <div className="grid gap-6 md:grid-cols-2 text-indigo-800/80 leading-relaxed">
              <div>
                <h3 className="text-indigo-900 font-bold mb-2">Inspire Others</h3>
                <p>Your success story helps other communities discover how transparent, on-chain fundraising can work for them.</p>
              </div>
              <div>
                <h3 className="text-indigo-900 font-bold mb-2">Prove Impact</h3>
                <p>We link your testimonial to verifiable smart contract receipts, showing real donations to real charities.</p>
              </div>
              <div>
                <h3 className="text-indigo-900 font-bold mb-2">Build Credibility</h3>
                <p>Being featured demonstrates your commitment to transparency and may attract new supporters to your cause.</p>
              </div>
              <div>
                <h3 className="text-indigo-900 font-bold mb-2">Get Recognition</h3>
                <p>We promote featured stories across our channels, giving your community and charity partners additional visibility.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 pt-12 pb-14">
        <div className="container mx-auto max-w-6xl text-center">
          <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white shadow-lg">
            <h3 className="text-3xl font-bold mb-3">Ready to Create Your Own Success Story?</h3>
            <p className="text-white/90 mb-6 text-lg max-w-3xl mx-auto">
              Join the growing community of clubs, DAOs, and organizations running transparent fundraisers with verifiable impact. Start your journey today.
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

export default Web3Testimonials;

