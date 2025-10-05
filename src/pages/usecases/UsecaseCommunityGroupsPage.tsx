import type React from 'react';
import { SEO } from '../../components/SEO';
import { Header } from '../../components/GeneralSite/Header';
import SiteFooter from '../../components/GeneralSite2/SiteFooter';
import {
  Sparkles,
  
  QrCode,
  Users,
  BarChart,
  Gift,
  Heart,
  Handshake,
  BookOpen,
  Dumbbell,
  Palette,
  Calendar,
  Megaphone,
  MapPin,
} from 'lucide-react';
import OutcomePreview from '../../components/GeneralSite2/OutcomePreview';
import { formatMoney } from '../../services/currency';

// -----------------------------
// Helpers
// -----------------------------
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

// -----------------------------
// UI bits
// -----------------------------
// const Bullet: React.FC<{ children: React.ReactNode }> = ({ children }) => (
//   <li className="flex items-start gap-3">
//     <Check className="mt-1 h-5 w-5 flex-shrink-0 text-green-600" />
//     <span className="text-indigo-900/80">{children}</span>
//   </li>
// );

const FeatureCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  gradient?: string; // optional multi-colour icon background to match other pages
}> = ({ icon, title, children, gradient }) => (
  <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm hover:shadow-md transition">
    <div className="flex items-center gap-4">
      <div
        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow ${gradient ?? 'from-indigo-600 to-purple-600'}`}
      >
        {icon}
      </div>
      <h3 className="text-indigo-900 text-xl font-bold">{title}</h3>
    </div>
    <p className="mt-2 text-indigo-900/70">{children}</p>
  </div>
);

const Chip: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3 py-1 text-indigo-900/80 text-sm shadow-sm">
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-indigo-700">{icon}</span>
    {label}
  </span>
);

// -----------------------------
// Page
// -----------------------------
const UsecaseCommunityGroupsPage: React.FC = () => {
  // ---------- Structured Data ----------
  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
      { '@type': 'ListItem', position: 2, name: 'Use Cases', item: abs('/quiz/use-cases') },
      { '@type': 'ListItem', position: 3, name: 'Community Groups', item: abs('/quiz/use-cases/community-groups') },
    ],
  };

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Community Group Fundraising Quizzes | Easy & Engaging Events | FundRaisely',
    description:
      'Run powerful fundraising quiz nights for community & interest groups: religious communities, hobby clubs, Men’s Sheds, social clubs, meetup groups, cultural associations, youth groups, and more.',
    url: abs('/quiz/use-cases/community-groups'),
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Is this just for neighbourhood associations?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'No — it’s for all community & interest groups: religious communities, Men’s Sheds, hobby clubs, social clubs, meetup groups, cultural associations, residents’ associations, youth groups, and more.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can non-technical volunteers run it?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'Yes. A 4-step setup wizard, clear host controls, QR joins, and automatic scoring make it volunteer-friendly. Collect cash or instant payments and mark participants as paid, with auto-reconciliation.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do we add our own questions or themes?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'Use our templates or create custom rounds — add local history, scripture or study themes, club trivia, cultural festivals, or anything that fits your community.',
        },
      },
      {
        '@type': 'Question',
        name: 'Do you support sponsors and prizes?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'Yes — add sponsors to prizes, track prize winners, and export audit-ready summaries to thank supporters and report to your committee.',
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <SEO
        title="Community Group Fundraising Quizzes | Easy & Engaging Events | FundRaisely"
        description="Fundraising quizzes built for community & interest groups: religious communities, hobby clubs, Men’s Sheds, social clubs, meetup groups, cultural associations, youth groups & more. Easy setup, engaging extras, audit-ready reports."
        keywords="community fundraising quiz, religious community fundraiser, men’s sheds fundraising, hobby club quiz night, social club fundraiser, meetup group quiz, cultural association fundraising, youth group quiz, community event fundraising software"
        structuredData={[breadcrumbsJsonLd, webPageJsonLd, faqJsonLd]}
        domainStrategy="geographic"
      />

      <Header />

      {/* Hero */}
    <section className="relative px-4 pt-12 pb-8">
  <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-purple-300/30 blur-2xl" />
  <div className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-indigo-300/30 blur-2xl" />
  <div className="container relative z-10 mx-auto max-w-6xl text-center">
    <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-indigo-700 text-sm font-medium">
      <Sparkles className="h-4 w-4" /> For Community & Interest Groups
    </span>
    <h1 className="mt-4 bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent text-4xl md:text-6xl font-bold">
      Bring People Together — and Fund What Matters
    </h1>
    <p className="mt-4 mx-auto max-w-3xl text-indigo-900/70 text-lg md:text-xl">
      Whether you’re a <strong>religious community, Men’s Shed, hobby club, social or meetup group, cultural
      association, youth group</strong> or residents’ association — FundRaisely makes it easy to run magical quiz
      nights with transparent finances and audit-ready reports.
    </p>

    <div className="mt-7 flex flex-wrap justify-center gap-3">
      <a
        href="/free-trial"
        className="rounded-xl bg-indigo-700 px-6 py-3 text-white font-semibold shadow-md hover:bg-indigo-800"
      >
        Run a Free Trial Quiz
      </a>
      <a
        href="/founding-partners"
        className="rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-3 text-white font-semibold shadow-md hover:scale-105 hover:shadow-lg"
      >
        Become a Founding Partner
      </a>
      <a
        href="/pricing"
        className="rounded-xl bg-white px-6 py-3 text-indigo-700 font-semibold shadow-md hover:bg-indigo-50"
      >
        See Pricing
      </a>
    </div>

          {/* Who we support */}
          <div className="mt-8 flex flex-wrap gap-2 justify-center">
            <Chip icon={<Heart className="h-4 w-4" />} label="Religious communities" />
            <Chip icon={<Handshake className="h-4 w-4" />} label="Men’s Sheds" />
            <Chip icon={<BookOpen className="h-4 w-4" />} label="Study & book groups" />
            <Chip icon={<Dumbbell className="h-4 w-4" />} label="Sports & fitness clubs" />
            <Chip icon={<Palette className="h-4 w-4" />} label="Arts & hobby clubs" />
            <Chip icon={<Users className="h-4 w-4" />} label="Social & meetup groups" />
            <Chip icon={<MapPin className="h-4 w-4" />} label="Residents’ associations" />
            <Chip icon={<Calendar className="h-4 w-4" />} label="Youth & after-school groups" />
            <Chip icon={<Megaphone className="h-4 w-4" />} label="Cultural associations" />
          </div>
        </div>
      </section>

      {/* Why it works for community & interest groups */}
      <section className="px-4 pt-6 pb-12">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold text-indigo-900">Made for Real Volunteers & Real Events</h2>
          <p className="text-center mt-2 max-w-2xl mx-auto text-lg text-indigo-900/70">
            Volunteer-friendly setup, flexible payments, engaging extras, and crystal-clear reporting, so your group can
            focus on people, not paperwork.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Users className="h-5 w-5" />}
              title="Effortless for Volunteers"
              gradient="from-emerald-500 to-green-600"
            >
              A simple 4-step wizard and clear host controls mean anyone can run a professional quiz night in minutes, no
              tech skills required.
            </FeatureCard>

            <FeatureCard
              icon={<BarChart className="h-5 w-5" />}
              title="Maximise Your Fundraising"
              gradient="from-amber-500 to-orange-600"
            >
              Combine entry fees with interactive extras like <em>Freeze</em>, <em>Clue</em>, <em>Robin Hood</em> and{' '}
              <em>Restore</em>. Auto-reconciliation keeps everything audit-ready.
            </FeatureCard>

            <FeatureCard icon={<Gift className="h-5 w-5" />} title="Sponsors & Prizes" gradient="from-rose-500 to-pink-600">
              Showcase local businesses, attach sponsors to prizes, track winners, and export thank-you summaries for your
              committee and supporters.
            </FeatureCard>

            <FeatureCard icon={<QrCode className="h-5 w-5" />} title="QR Joins — No App" gradient="from-sky-500 to-indigo-500">
              Players join with a link or QR on their phones. Live scoring and leaderboards keep the room buzzing.
            </FeatureCard>

            <FeatureCard icon={<Calendar className="h-5 w-5" />} title="Event-Night Flow" gradient="from-purple-500 to-fuchsia-600">
              Optimised for in-person events: collect cash or instant payments, mark attendees paid, and go live.
            </FeatureCard>

            <FeatureCard icon={<Megaphone className="h-5 w-5" />} title="Community-First Design" gradient="from-teal-500 to-cyan-600">
              Build relationships that last beyond one night, convert guests into ongoing supporters for your mission.
            </FeatureCard>
          </div>
        </div>
      </section>

      {/* “Designed for every kind of group” examples */}
      <section className="bg-white px-4 py-12">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold text-indigo-900">Designed for Every Kind of Group</h2>
          <p className="text-center mt-2 max-w-2xl mx-auto text-lg text-indigo-900/70">
            Customise themes and rounds to fit your identity — from parish nights to language clubs, Men’s Sheds to maker
            meetups.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard icon={<Heart className="h-5 w-5" />} title="Religious Communities" gradient="from-violet-600 to-indigo-700">
              Scripture rounds, community history, and family-friendly extras. Perfect for parish halls and congregational socials.
            </FeatureCard>

            <FeatureCard icon={<Dumbbell className="h-5 w-5" />} title="Sports & Fitness Clubs" gradient="from-lime-500 to-green-600">
              Club trivia, local legends, and team-based play that turns friendly rivalry into funds for kits and facilities.
            </FeatureCard>

            <FeatureCard icon={<Palette className="h-5 w-5" />} title="Arts & Hobby Clubs" gradient="from-pink-500 to-rose-600">
              Themed rounds (music, film, crafts) and sponsor spotlights from local studios, shops, and cafés.
            </FeatureCard>

            <FeatureCard icon={<Handshake className="h-5 w-5" />} title="Men’s Sheds & Social Clubs" gradient="from-amber-600 to-orange-700">
              Low-lift setup for regular get-togethers; build funds for tools, outings, and community projects.
            </FeatureCard>

            <FeatureCard icon={<BookOpen className="h-5 w-5" />} title="Study, Youth & After-School" gradient="from-sky-600 to-cyan-600">
              Curriculum-friendly rounds, safe competition, and transparent finances for parents and boards.
            </FeatureCard>

            <FeatureCard icon={<MapPin className="h-5 w-5" />} title="Residents’ & Cultural Associations" gradient="from-emerald-600 to-teal-600">
              Local history, cultural festivals, and sponsor-backed prizes that celebrate identity and place.
            </FeatureCard>
          </div>
        </div>
      </section>

      {/* Outcome preview (kept) */}
      <OutcomePreview
        eyebrow="Illustrative outcomes"
        title="What success could look like for community groups"
        intro="Small to mid-sized quiz nights can create big moments — especially with on-the-night extras and sponsor-backed prizes."
        bullets={[
          <>Funds raised in the range of <strong>{formatMoney(600)}–{formatMoney(1200)}</strong> for smaller gatherings</>,
          <>Attendance of <strong>25–60</strong> with <strong>1–2</strong> local sponsors</>,
          <>Reconciliation and thank-you summary <strong>shared the same evening</strong></>,
        ]}
        note="Actuals vary by venue size, ticket price, extras pricing, and community support."
      />

      {/* How it works (simple flow) */}
      <section className="px-4 pt-6 pb-12">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold text-indigo-900">How It Works</h2>
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-indigo-100 p-6 shadow-sm">
              <h3 className="text-xl font-bold text-indigo-900">1. Simple Setup</h3>
              <p className="mt-2 text-indigo-900/70">
                Use the 4-step wizard to choose templates or create custom rounds, set entry fees and extras, and add sponsors to
                prizes.
              </p>
            </div>
            <div className="rounded-2xl border border-indigo-100 p-6 shadow-sm">
              <h3 className="text-xl font-bold text-indigo-900">2. Easy Player Onboarding</h3>
              <p className="mt-2 text-indigo-900/70">
                Players join via link or QR on their phones. Collect cash or instant payments; admins mark people as paid and
                reconciliation updates automatically.
              </p>
            </div>
            <div className="rounded-2xl border border-indigo-100 p-6 shadow-sm">
              <h3 className="text-xl font-bold text-indigo-900">3. Engaging Gameplay</h3>
              <p className="mt-2 text-indigo-900/70">
                Live scoring, leaderboards, and extras like <em>Freeze</em> and <em>Clue</em> keep the room buzzing, and boost
                funds.
              </p>
            </div>
            <div className="rounded-2xl border border-indigo-100 p-6 shadow-sm">
              <h3 className="text-xl font-bold text-indigo-900">4. Transparent Reporting</h3>
              <p className="mt-2 text-indigo-900/70">
                Export audit-ready summaries for your committee, sponsors, and supporters, all on the same night.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 inline-flex items-start gap-3 text-sm max-w-4xl mx-auto">
            <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              <strong>No scheduling on the free trial:</strong> set up your quiz about <strong>30 minutes before doors open</strong>,
              invite teams, and you’re ready to go.
            </span>
          </div>
        </div>
      </section>

      {/* FAQ (kept, expanded above via JSON-LD) */}
      <section className="px-4 pt-6 pb-12">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-bold text-indigo-900">Frequently Asked Questions</h2>
          <div className="mt-8 space-y-4">
            <div className="rounded-lg border border-indigo-100 bg-white p-4">
              <h3 className="font-semibold text-indigo-900">Is this just for neighbourhood associations?</h3>
              <p className="mt-1 text-indigo-900/80">
                Not at all. FundRaisely is built for religious communities, Men’s Sheds, hobby clubs, social clubs, meetup groups,
                cultural associations, youth groups, and more.
              </p>
            </div>
            <div className="rounded-lg border border-indigo-100 bg-white p-4">
              <h3 className="font-semibold text-indigo-900">Can non-technical volunteers run it?</h3>
              <p className="mt-1 text-indigo-900/80">
                Yes, a 4-step wizard, QR joins, and automatic scoring keep everything simple. Mark payments as received and your
                reconciliation updates automatically.
              </p>
            </div>
            <div className="rounded-lg border border-indigo-100 bg-white p-4">
              <h3 className="font-semibold text-indigo-900">Can we customise questions and themes?</h3>
              <p className="mt-1 text-indigo-900/80">
                Absolutely. Start with templates or build your own rounds — from scripture or club lore to local history and
                cultural festivals.
              </p>
            </div>
            <div className="rounded-lg border border-indigo-100 bg-white p-4">
              <h3 className="font-semibold text-indigo-900">Do you support sponsors and prizes?</h3>
              <p className="mt-1 text-indigo-900/80">
                Yes. Attach sponsors to prizes, track winners, export thank-you summaries, and keep your committee happy with
                audit-ready reports.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-14">
        <div className="container mx-auto max-w-6xl text-center">
          <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white shadow-lg">
            <h3 className="text-3xl font-bold mb-3">Ready to bring your community together?</h3>
            <p className="text-white/90 mb-6 text-lg max-w-3xl mx-auto">
              Run a real fundraising quiz night with live scoring, engaging extras, and audit-ready reporting — built for community
              & interest groups of every kind.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="/free-trial"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-indigo-700 font-bold shadow-lg hover:bg-indigo-50 transition"
              >
                Start Free Trial
              </a>
              <a
                href="/founding-partners"
                className="rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-8 py-4 text-white font-bold shadow-lg hover:scale-105 hover:shadow-xl transition"
              >
                Become a Founding Partner
              </a>
              <a
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-8 py-4 text-white font-bold border border-white/30 hover:bg-white/20 transition"
              >
                See Pricing
              </a>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default UsecaseCommunityGroupsPage;

