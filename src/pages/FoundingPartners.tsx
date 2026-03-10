import React, { lazy, Suspense, useMemo } from 'react';
import { SEO } from '../components/SEO';
import { Header } from '../components/GeneralSite2/Header';
import {
  Check, Trophy, Users, Shield, Rocket, Sparkles, ChevronRight, HeartHandshake,
  Target, BarChart3, Award, Gamepad2, Search, FileText, Scale, Ticket, Coins, Blocks,
  MessageSquare, Clock, Zap,
} from 'lucide-react';

/** Footer */
const SiteFooter = lazy(() => import('../components/GeneralSite2/SiteFooter'));

/** Absolute URL helpers for JSON-LD */
function getOrigin(): string {
  const env = (import.meta as any)?.env?.VITE_SITE_ORIGIN as string | undefined;
  if (env) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin)
    return window.location.origin.replace(/\/$/, '');
  return 'https://fundraisely.ie';
}
function abs(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${getOrigin()}${p}`;
}

function getMarket() {
  if (typeof window !== 'undefined') {
    const host = window.location.host.toLowerCase();
    if (host.includes('co.uk')) {
      return { code: 'GBP', symbol: '£', monthly: 19 };
    }
  }
  return { code: 'EUR', symbol: '€', monthly: 19 };
}

/** UI bits */
const Bullet = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-start gap-3">
    <Check className="mt-1 h-5 w-5 flex-shrink-0 text-green-600" />
    <span className="text-indigo-900/80">{children}</span>
  </li>
);

const FeatureCard = ({
  icon, title, subtitle,
}: { icon: React.ReactNode; title: string; subtitle: string }) => (
  <div className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm hover:shadow-md transition-all duration-300">
    <div className="flex items-center gap-3">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-md">
        {icon}
      </div>
      <div>
        <div className="font-semibold text-indigo-900">{title}</div>
        <div className="text-sm text-indigo-900/60">{subtitle}</div>
      </div>
    </div>
  </div>
);

type RoadmapTileProps = {
  status: string;
  title: string;
  desc: string;
  icon?: React.ReactNode;
  gradient?: string;
};
const RoadmapTile: React.FC<RoadmapTileProps> = ({ status, title, desc, icon, gradient = 'bg-indigo-500' }) => {
  const statusLower = status.toLowerCase();
  const badgeColor =
    statusLower === 'live'
      ? 'bg-green-100 text-green-800'
      : statusLower.includes('build')
      ? 'bg-amber-100 text-amber-800'
      : statusLower.includes('regulated')
      ? 'bg-purple-100 text-purple-800'
      : 'bg-indigo-100 text-indigo-800';

  return (
    <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${gradient} text-white shadow-md`}>
          {icon}
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${badgeColor}`}>
          {status}
        </div>
      </div>
      <h4 className="text-lg font-bold text-indigo-900 mb-2">{title}</h4>
      <p className="text-indigo-900/70 text-sm leading-relaxed">{desc}</p>
    </div>
  );
};

const FaqItem = ({ q, a }: { q: string; a: string }) => (
  <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm">
    <div className="font-semibold text-indigo-900 text-lg mb-3">{q}</div>
    <div className="text-indigo-900/70 leading-relaxed">{a}</div>
  </div>
);

export default function FoundingPartnersPage() {
  const market = getMarket();

  /** JSON-LD (follow SEO doc: use structuredData, canonical/hreflang handled by SEO.tsx) */
  const structuredData = useMemo(() => {
    const price = `${market.monthly}.00`;

    const breadcrumbsJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
        { '@type': 'ListItem', position: 2, name: 'Founding Partners', item: abs('/founding-partners') },
      ],
    };

    const webPageJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'FundRaisely Founding Partners — Lifetime Pricing for Clubs & Charities',
      url: abs('/founding-partners'),
      description:
        'Join as a FundRaisely Founding Partner and lock in lifetime pricing. Start with the Quiz App and get early access to our full-stack fundraising platform: campaigns, CRM, games, AI sponsor/prize finder, impact and compliance.',
      isPartOf: { '@type': 'WebSite', url: getOrigin() },
    };

    const productJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'FundRaisely Founding Partner Plan',
      description:
        'Founding Partner subscription for clubs and charities. Lifetime locked pricing with early access to new fundraising modules.',
      brand: { '@type': 'Brand', name: 'FundRaisely' },
      offers: {
        '@type': 'Offer',
        url: abs('/founding-partners'),
        priceCurrency: market.code,
        price,
        availability: 'https://schema.org/InStock',
        category: 'https://schema.org/MembershipsOrSubscriptions',
        eligibleRegion: ['IE', 'GB'],
      },
    };

    const faqJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Do we need to use crypto or Web3?',
          acceptedAnswer: {
            '@type': 'Answer',
            text:
              'No. You can run FundRaisely quizzes with standard payments. Web3 features are optional and add transparent receipts and impact later.',
          },
        },
        {
          '@type': 'Question',
          name: 'What do we get right now?',
          acceptedAnswer: {
            '@type': 'Answer',
            text:
              "Immediate access to the Quiz App with host dashboard, reporting, QR joins and more. You'll also receive your Founding Partner badge and invite to our private feedback group.",
          },
        },
        {
          '@type': 'Question',
          name: 'Can we cancel anytime?',
          acceptedAnswer: {
            '@type': 'Answer',
            text:
              'Yes. You can cancel with one click. Your founding rate remains valid while the subscription is active.',
          },
        },
        {
          '@type': 'Question',
          name: 'How long is this offer available?',
          acceptedAnswer: {
            '@type': 'Answer',
            text:
              'Limited to the first 100 clubs and charities or until full platform launch, whichever comes first.',
          },
        },
      ],
    };

    return [breadcrumbsJsonLd, webPageJsonLd, productJsonLd, faqJsonLd];
  }, [market]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-teal-50 via-white to-white">
      <SEO
        title="Become a FundRaisely Founding Partner | Lifetime Pricing for Clubs & Charities"
        description="Join as a Founding Partner and lock in lifetime pricing. Start today with Quiz Fundraisers and get early access to upcoming tools like Bingo, Raffles, Sponsor Finder, Impact Reporting and Compliance."
        type="website"
        // Canonical + hreflang handled by SEO.tsx per strategy doc
        structuredData={structuredData}
        keywords="founding partner, fundraising platform, quiz fundraiser, charity CRM, raffle software, club lotto, sponsor finder, impact reporting, compliance"
        ukKeywords="founding partner UK, fundraising software UK, charity CRM UK, club lotto UK, quiz night software UK"
        ieKeywords="founding partner Ireland, fundraising software Ireland, charity CRM Ireland, club lotto Ireland, quiz night software Ireland"
        domainStrategy="geographic"
      />

      <Header />

      {/* HERO */}
      <section className="relative px-4 pt-12 pb-8">
        <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-teal-300/30 blur-2xl" />
        <div className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-cyan-300/30 blur-2xl" />
        <div className="container relative z-10 mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-teal-100 text-teal-900 px-3 py-1 text-sm font-medium shadow-sm">
                <Sparkles className="h-4 w-4" /> Early Launch Program
              </div>
              <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight text-indigo-900">
                Become a <span className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">Founding Partner</span>
              </h1>
              <p className="mt-4 text-lg text-indigo-900/70 leading-relaxed">
                Join the movement to modernize fundraising for clubs, schools, and charities. Get
                <strong> lifetime access at our lowest-ever rate</strong> and help shape the future of FundRaisely.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <a
                  href={abs('/signup?plan=founding_partner')}
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-3 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  Join Waiting List and Lock in Founding Partner Rates — {market.symbol}
                  {market.monthly}/month for life
                  <ChevronRight className="ml-2 h-5 w-5" />
                </a>
              </div>
              <p className="mt-3 text-sm text-indigo-900/60">Limited to the first 100 clubs & charities • Cancel anytime</p>
            </div>
            <div className="relative">
              <div className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-xl">
                <div className="grid grid-cols-2 gap-4">
                  <FeatureCard icon={<Trophy className="h-6 w-6" />} title="Full Premium Access" subtitle="Start fundraising today" />
                  <FeatureCard icon={<Shield className="h-6 w-6" />} title="Locked Pricing" subtitle="Your rate never increases" />
                  <FeatureCard icon={<Rocket className="h-6 w-6" />} title="Early Access" subtitle="New tools as they launch" />
                  <FeatureCard icon={<Users className="h-6 w-6" />} title="Community" subtitle="Direct feedback loop" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className="px-4 py-12">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-indigo-900">Why Founding Partners?</h2>
          <p className="mt-4 text-indigo-900/70 text-lg leading-relaxed">
            FundRaisely is building the future of community fundraising — transparent, engaging and digital-first. We're
            starting with <strong>interactive quiz fundraisers</strong>, and expanding fast. As a Founding Partner you
            get permanent access to new features as they ship, at the same locked-in rate.
          </p>
          <ul className="mt-6 grid sm:grid-cols-2 gap-3">
            {[
              'Run unlimited quiz fundraisers',
              'Lifetime locked pricing — never increases',
              'Early access to new event types',
              'Private feedback group & roadmap updates',
              'Founding Partner badge on your profile',
            ].map((item) => (
              <Bullet key={item}>{item}</Bullet>
            ))}
          </ul>
        </div>
      </section>

      {/* ROADMAP */}
      <section className="px-4 py-12 bg-gradient-to-r from-teal-50 to-cyan-50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-indigo-900">What's Coming Next</h2>
        <p className="mt-3 text-indigo-900/70 text-lg leading-relaxed max-w-4xl">
            FundRaisely is a <strong>full-stack fundraising platform</strong>: events & campaigns, games engine, CRM, reporting, and compliance. Here's our amazing roadmap. All included with your Founding Partner plan. 
          </p>

          <div className="mt-8 grid md:grid-cols-3 gap-6">
            <RoadmapTile
              // status="Live"
              status="live"
              title="Quiz App"
              desc="Host, play, report- online or in-person. Same user limits as Pro."
              icon={<Gamepad2 className="h-5 w-5" />}
              gradient="bg-gradient-to-br from-green-500 to-emerald-500"
            />
              <RoadmapTile
              status="In build"
              title="Campaign & Event Manager"
              desc="Plan campaigns, schedule events, and reconcile income & costs with financial reporting."
              icon={<Target className="h-5 w-5" />}
              gradient="bg-gradient-to-br from-amber-500 to-orange-500"
            />
            <RoadmapTile
              status="Next"
              title="Club Dashboard"
              desc="All your fundraising events, people and results in one place."
              icon={<BarChart3 className="h-5 w-5" />}
              gradient="bg-gradient-to-br from-blue-500 to-cyan-500"
            />
          

            <RoadmapTile
              status="Planned"
              title="Sponsor & Donor CRM"
              desc="Contacts, segments, pipelines and activity timelines for clubs & charities."
              icon={<Users className="h-5 w-5" />}
              gradient="bg-gradient-to-br from-purple-500 to-pink-500"
            />
            <RoadmapTile
              status="Planned"
              title="Other Games of Skill"
              desc="Treasure hunts, auctions, spot-the-ball - built for fundraising."
              icon={<Trophy className="h-5 w-5" />}
              gradient="bg-gradient-to-br from-indigo-500 to-purple-500"
            />
            <RoadmapTile
              status="Planned"
              title="AI Sponsor & Prize Finder"
              desc="Find local sponsors and prizes in minutes with AI-assisted outreach."
              icon={<Search className="h-5 w-5" />}
              gradient="bg-gradient-to-br from-teal-500 to-cyan-500"
            />

            <RoadmapTile
              status="Planned"
              title="Comms Hub (Email/SMS & Text-to-Donate)"
              desc="Broadcast email & SMS, event reminders, and text-to-donate flows tied to campaigns."
              icon={<MessageSquare className="h-5 w-5" />}
              gradient="bg-gradient-to-br from-sky-500 to-indigo-500"
            />
            <RoadmapTile
              status="Planned"
              title="Volunteer Scheduling & Check-in"
              desc="Assign roles, manage shifts, and record volunteer hours right from the event timeline."
              icon={<Clock className="h-5 w-5" />}
              gradient="bg-gradient-to-br from-lime-500 to-green-500"
            />
            <RoadmapTile
              status="Planned"
              title="Challenges (Strava/Fitbit/Garmin)"
              desc="Run fitness challenges with team leaderboards and activity sync for engagement between events."
              icon={<Zap className="h-5 w-5" />}
              gradient="bg-gradient-to-br from-fuchsia-500 to-pink-600"
            />

            <RoadmapTile
              status="Planned"
              title="Impact Statements & Reporting"
              desc="Auto-compile impact summaries, receipts and PDFs for stakeholders."
              icon={<FileText className="h-5 w-5" />}
              gradient="bg-gradient-to-br from-rose-500 to-pink-500"
            />
               <RoadmapTile
              status="Planned"
              title="Crypto Donations"
              desc="Accept Crypto (Bitcoin, stablecoins and other crypto) donations from donors and supporters "
              icon={<Coins className="h-5 w-5" />}
             gradient="bg-gradient-to-br from-blue-500 to-cyan-500"
            />
                  <RoadmapTile
              status="Planned"
              title="Immutable, verifiable records"
              desc="Improve donor confidence with event and impact transparency store on blockchain (Solana)"
              icon={<Blocks className="h-5 w-5" />}
              gradient="bg-gradient-to-br from-slate-500 to-blue-600"
            />
            <RoadmapTile
              status="Planned"
              title="Prize Manager & Reporting"
              desc="Track prize inventory, winners, fulfilment and sponsor exposure."
              icon={<Award className="h-5 w-5" />}
              gradient="bg-gradient-to-br from-yellow-500 to-orange-500"
            />
            <RoadmapTile
              status="Planned (regulated)"
              title="Compliance Engine"
              desc="Licences, limits and audit trails for regulated activities."
              icon={<Scale className="h-5 w-5" />}
              gradient="bg-gradient-to-br from-slate-500 to-gray-600"
            />

            <RoadmapTile
              status="Planned (regulated)"
              title="Games of Chance"
              desc="Lotto, bingo, raffles and other regulated events with built-in guardrails."
              icon={<Ticket className="h-5 w-5" />}
              gradient="bg-gradient-to-br from-violet-500 to-purple-600"
            />
          </div>

          <div className="mt-6 rounded-xl border border-indigo-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-indigo-900/70">
              <strong className="text-indigo-900">Note:</strong> Regulated games require appropriate local licences. Founding Partners get early access as modules roll out — no upsells.
            </p>
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="px-4 py-12">
        <div className="container mx-auto max-w-7xl">
          <h2 className="text-3xl font-bold text-indigo-900">How FundRaisely compares</h2>
          <p className="mt-3 text-indigo-900/70 leading-relaxed">
            Representative tools for clubs & charities across the UK & Ireland. Feature availability and pricing vary by plan/region. Data checked Oct 2025. We will be the only Full Stack platform for fundraising with games, AI, CRM, reporting and compliance built in.
          </p>

          <div className="mt-6 overflow-x-auto rounded-xl border border-indigo-100 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-900">
                  <th className="p-4 font-semibold min-w-[160px]">Platform</th>
                  <th className="p-4 font-semibold min-w-[140px]">Pricing</th>
                  <th className="p-4 font-semibold min-w-[100px]">Quizzes</th>
                  <th className="p-4 font-semibold min-w-[140px]">Campaign / Event Manager</th>
                  <th className="p-4 font-semibold min-w-[140px]">Auctions / Games of Skill</th>
                  <th className="p-4 font-semibold min-w-[140px]">Raffles / Lotto</th>
                  <th className="p-4 font-semibold min-w-[120px]">Donor & Sponsor CRM</th>
                  <th className="p-4 font-semibold min-w-[140px]">AI Sponsor Finder</th>
                  <th className="p-4 font-semibold min-w-[140px]">Impact Reporting</th>
                  <th className="p-4 font-semibold min-w-[120px]">Compliance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-50">
                <tr className="hover:bg-teal-50/30 transition-colors">
                  <td className="p-4 font-semibold text-indigo-900">FundRaisely</td>
                  <td className="p-4 font-medium text-teal-700">Lifetime lock</td>
                  <td className="p-4"><span className="inline-flex items-center gap-1 text-green-700 font-medium"><Check className="h-4 w-4"/> Live</span></td>
                  <td className="p-4 text-indigo-900/70">In build</td>
                  <td className="p-4 text-indigo-900/70">Planned</td>
                  <td className="p-4 text-indigo-900/70">Planned</td>
                  <td className="p-4 text-indigo-900/70">Planned</td>
                  <td className="p-4 text-indigo-900/70">Planned</td>
                  <td className="p-4 text-indigo-900/70">Planned</td>
                  <td className="p-4 text-indigo-900/70">Planned</td>
                </tr>

                <tr className="hover:bg-indigo-50/30 transition-colors">
                  <td className="p-4 font-semibold text-indigo-900">Salesforce Nonprofit</td>
                  <td className="p-4 text-indigo-900/70">~£48–80/user/mo</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4"><Check className="h-4 w-4 text-green-600"/></td>
                  <td className="p-4 text-indigo-900/70">Via partners</td>
                  <td className="p-4 text-indigo-900/70"><Check className="h-4 w-4 text-green-600"/></td>
                  <td className="p-4 text-indigo-900/70">Partial</td>
                  <td className="p-4 text-indigo-900/70"><Check className="h-4 w-4 text-green-600"/></td>
                  <td className="p-4 text-indigo-900/70">—</td>
                </tr>

                <tr className="hover:bg-indigo-50/30 transition-colors">
                  <td className="p-4 font-semibold text-indigo-900">Enthuse</td>
                  <td className="p-4 text-indigo-900/70">£24.99–39.99/mo</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">Events</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">Data ownership</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">Dashboards</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                </tr>

                <tr className="hover:bg-indigo-50/30 transition-colors">
                  <td className="p-4 font-semibold text-indigo-900">Clubforce</td>
                  <td className="p-4 text-indigo-900/70">€25–35/mo</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">Membership</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4"><Check className="h-4 w-4 text-green-600"/></td>
                  <td className="p-4 text-indigo-900/70">Member CRM</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">Reports</td>
                  <td className="p-4"><Check className="h-4 w-4 text-green-600"/></td>
                </tr>

                <tr className="hover:bg-indigo-50/30 transition-colors">
                  <td className="p-4 font-semibold text-indigo-900">JustGiving</td>
                  <td className="p-4 text-indigo-900/70">£15–39/mo</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">Pages & events</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">Basic</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">Reports</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                </tr>

                <tr className="hover:bg-indigo-50/30 transition-colors">
                  <td className="p-4 font-semibold text-indigo-900">KwizzBit</td>
                  <td className="p-4 text-indigo-900/70">£9.99–79.99/mo</td>
                  <td className="p-4"><Check className="h-4 w-4 text-green-600"/></td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                </tr>

                <tr className="hover:bg-indigo-50/30 transition-colors">
                  <td className="p-4 font-semibold text-indigo-900">Raffall</td>
                  <td className="p-4 text-indigo-900/70">~9–10% commission</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4"><Check className="h-4 w-4 text-green-600"/></td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4"><Check className="h-4 w-4 text-green-600"/></td>
                </tr>

                <tr className="hover:bg-indigo-50/30 transition-colors">
                  <td className="p-4 font-semibold text-indigo-900">RallyUp</td>
                  <td className="p-4 text-indigo-900/70">2.9–6.9% + processing</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">Events</td>
                  <td className="p-4"><Check className="h-4 w-4 text-green-600"/></td>
                  <td className="p-4"><Check className="h-4 w-4 text-green-600"/></td>
                  <td className="p-4 text-indigo-900/70">Profiles</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">Reports</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                </tr>

                <tr className="hover:bg-indigo-50/30 transition-colors">
                  <td className="p-4 font-semibold text-indigo-900">Donorbox</td>
                  <td className="p-4 text-indigo-900/70">1.75–3.95% + processing</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4"><Check className="h-4 w-4 text-green-600"/></td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">Light CRM</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">Reports</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                </tr>

                <tr className="hover:bg-indigo-50/30 transition-colors">
                  <td className="p-4 font-semibold text-indigo-900">Givebutter</td>
                  <td className="p-4 text-indigo-900/70">£0 (donor tips)</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4"><Check className="h-4 w-4 text-green-600"/></td>
                  <td className="p-4"><Check className="h-4 w-4 text-green-600"/></td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4"><Check className="h-4 w-4 text-green-600"/></td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">Dashboards</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                </tr>

                <tr className="hover:bg-indigo-50/30 transition-colors">
                  <td className="p-4 font-semibold text-indigo-900">Zeffy</td>
                  <td className="p-4 text-indigo-900/70">0% (donor tips)</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4"><Check className="h-4 w-4 text-green-600"/></td>
                  <td className="p-4"><Check className="h-4 w-4 text-green-600"/></td>
                  <td className="p-4"><Check className="h-4 w-4 text-green-600"/></td>
                  <td className="p-4 text-indigo-900/70">Donor mgmt</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">Reports</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                </tr>

                <tr className="hover:bg-indigo-50/30 transition-colors">
                  <td className="p-4 font-semibold text-indigo-900">Klubfunder</td>
                  <td className="p-4 text-indigo-900/70">£0 PAYG + fees</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">Events & shop</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4"><Check className="h-4 w-4 text-green-600"/></td>
                  <td className="p-4 text-indigo-900/70">Basic CRM</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">Reports</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                </tr>

                <tr className="hover:bg-indigo-50/30 transition-colors">
                  <td className="p-4 font-semibold text-indigo-900">Raisely</td>
                  <td className="p-4 text-indigo-900/70">Free or paid</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">Campaign pages</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">Light</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">Dashboards</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                </tr>

                <tr className="hover:bg-indigo-50/30 transition-colors">
                  <td className="p-4 font-semibold text-indigo-900">SpeedQuizzing</td>
                  <td className="p-4 text-indigo-900/70">Pay-per-use</td>
                  <td className="p-4"><Check className="h-4 w-4 text-green-600"/></td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                </tr>

                <tr className="hover:bg-indigo-50/30 transition-colors">
                  <td className="p-4 font-semibold text-indigo-900">Blackbaud Raiser's Edge</td>
                  <td className="p-4 text-indigo-900/70">On request</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4"><Check className="h-4 w-4 text-green-600"/></td>
                  <td className="p-4 text-indigo-900/70">Via partners</td>
                  <td className="p-4 text-indigo-900/70">Via partners</td>
                  <td className="p-4"><Check className="h-4 w-4 text-green-600"/></td>
                  <td className="p-4 text-indigo-900/70">Partial</td>
                  <td className="p-4"><Check className="h-4 w-4 text-green-600"/></td>
                  <td className="p-4 text-indigo-900/70">—</td>
                </tr>

                <tr className="hover:bg-indigo-50/30 transition-colors">
                  <td className="p-4 font-semibold text-indigo-900">Funraisin</td>
                  <td className="p-4 text-indigo-900/70">On request</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4"><Check className="h-4 w-4 text-green-600"/></td>
                  <td className="p-4 text-indigo-900/70">Via partners</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4 text-indigo-900/70">Supporter mgmt</td>
                  <td className="p-4 text-indigo-900/70">—</td>
                  <td className="p-4"><Check className="h-4 w-4 text-green-600"/></td>
                  <td className="p-4 text-indigo-900/70">—</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-sm text-indigo-900/60 leading-relaxed">
            Category notes: "Campaign/Event Manager" = schedule + ticketing/registration + activity tracking. "AI Sponsor/Prize Finder" refers to automated prospecting for prizes/sponsors — uncommon today, part of our roadmap. Many platforms rely on app/partner integrations for specific functions.
          </p>
        </div>
      </section>

      {/* PRICING */}
      <section className="px-4 py-12 bg-gradient-to-r from-purple-50 to-indigo-50">
        <div className="container mx-auto max-w-4xl">
          <div className="rounded-3xl border border-indigo-100 bg-white p-8 md:p-10 shadow-xl">
            <div className="md:flex md:items-center md:justify-between gap-6">
              <div>
                <h3 className="text-3xl font-bold text-indigo-900">Founding Partner Plan</h3>
                <p className="mt-2 text-indigo-900/70 text-lg">Lifetime pricing for early supporters. Cancel anytime.</p>
              </div>
              <div className="mt-6 md:mt-0 text-right">
                <div className="text-5xl font-extrabold text-indigo-900">
                  {market.symbol}{market.monthly}
                  <span className="text-xl font-semibold text-indigo-900/60"> / month</span>
                </div>
                <div className="text-sm text-indigo-900/60 mt-1">Locked for life while subscription remains active.</div>
              </div>
            </div>
            <div className="mt-8 grid sm:grid-cols-2 gap-4">
              {[
                'Unlimited quizzes',
                'Host dashboard & reporting',
                'Custom QR joins & links',
                'Early access to new modules',
                'Founding Partner badge',
              ].map((f) => (
                <Bullet key={f}>{f}</Bullet>
              ))}
            </div>
            <a
              href={abs('/signup?plan=founding_partner')}
              className="mt-8 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-8 py-4 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-lg"
            >
              Join Waiting List and Lock in Founding Partner Rates
              <ChevronRight className="ml-2 h-5 w-5" />
            </a>
            <div className="mt-3 text-sm text-indigo-900/60">Limited to the first 100 clubs & charities</div>
          </div>
        </div>
      </section>

      {/* WHO & HOW */}
      <section className="px-4 py-12">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-10">
            <div className="rounded-xl border border-indigo-100 bg-white p-8 shadow-sm">
              <h3 className="text-2xl font-bold text-indigo-900 mb-6">Perfect for…</h3>
              <ul className="space-y-4">
                {[
                  'Local clubs and community groups',
                  'Charities and schools running events',
                  'Teams who want digital-first fundraising',
                  'Leaders who value transparency & impact',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 text-white flex-shrink-0">
                      <HeartHandshake className="h-4 w-4" />
                    </div>
                    <span className="text-indigo-900/80 text-lg">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-white p-8 shadow-sm">
              <h3 className="text-2xl font-bold text-indigo-900 mb-6">How it works</h3>
              <ol className="space-y-4">
                {[
                  'Subscribe to lock in your founding price',
                  'Start running quizzes immediately',
                  'Get early access as new tools launch',
                  'Shape the roadmap with your feedback',
                ].map((step, i) => (
                  <li key={step} className="flex items-start gap-3">
                    <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 text-white text-sm font-bold flex-shrink-0">
                      {i + 1}
                    </div>
                    <span className="text-indigo-900/80 text-lg">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-12 bg-gradient-to-r from-teal-50 to-cyan-50">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-indigo-900 mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <FaqItem q="Do we need to use crypto or Web3?" a="No. You can run FundRaisely quizzes with standard payments. Web3 features are optional and add transparent receipts and impact later." />
            <FaqItem q="What do we get right now?" a="Immediate access to the Quiz App with host dashboard, reporting, QR joins and more. You'll also receive your Founding Partner badge and invite to our private feedback group." />
            <FaqItem q="Can we cancel anytime?" a="Yes. You can cancel with one click. Your founding rate remains valid while the subscription is active." />
            <FaqItem q="How long is this offer available?" a="Limited to the first 100 clubs and charities or until full platform launch, whichever comes first." />
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-4 py-12">
        <div className="container mx-auto max-w-4xl text-center">
          <h3 className="text-4xl font-extrabold text-indigo-900">Fundraising is changing. Be there from day one.</h3>
          <p className="mt-4 text-indigo-900/70 text-lg leading-relaxed max-w-3xl mx-auto">
            Lock your price for life and help us build the future for community fundraisers.
          </p>
          <a
            href={abs('/signup?plan=founding_partner')}
            className="mt-8 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-8 py-4 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-lg"
          >
            Join Waiting List and Lock in Founding Partner Rates — {market.symbol}
            {market.monthly}/month
            <ChevronRight className="ml-2 h-5 w-5" />
          </a>
        </div>
      </section>

      <Suspense fallback={<div className="py-10 text-center text-sm text-indigo-900/40">Loading…</div>}>
        <SiteFooter />
      </Suspense>
    </div>
  );
}




