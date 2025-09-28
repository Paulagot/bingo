import type React from 'react';
import { SEO } from '../components/SEO';
import { Header } from '../components/GeneralSite/Header';
import SiteFooter from '../components/GeneralSite2/SiteFooter';
import {
  Check,
  Sparkles,
  Users,
  Shield,
  QrCode,
  CreditCard,
  Smartphone,
  FileText,
  BarChart,
  Timer,
  Settings,
  PlayCircle,
} from 'lucide-react';

/** Simple absolute-URL helpers (safe even if env not set) */
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

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; desc: string }> = ({ icon, title, desc }) => (
  <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm hover:shadow-md transition">
    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-700">
      {icon}
    </div>
    <h3 className="text-indigo-900 text-lg font-semibold">{title}</h3>
    <p className="text-indigo-900/70 mt-1">{desc}</p>
  </div>
);

const Bullet: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-3">
    <Check className="mt-1 h-5 w-5 flex-shrink-0 text-green-600" />
    <span className="text-indigo-900/80">{children}</span>
  </li>
);

const QuizFeaturesPage: React.FC = () => {
  // -------- JSON-LD --------
  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
      { '@type': 'ListItem', position: 2, name: 'Fundraising Quiz', item: abs('/fundraising-quiz') },
      { '@type': 'ListItem', position: 3, name: 'Features', item: abs('/quiz/features') },
    ],
  };

  const softwareJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'FundRaisely — Fundraising Quiz',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: abs('/quiz/features'),
  };

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Fundraising Quiz Features',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '4-step setup wizard' },
      { '@type': 'ListItem', position: 2, name: 'Templates or fully custom rounds' },
      { '@type': 'ListItem', position: 3, name: 'Round types: General, Wipeout, Speed + tiebreakers' },
      { '@type': 'ListItem', position: 4, name: 'Fundraising extras: Clue, Freeze, RobinHood (RobPoints), Restore' },
      { '@type': 'ListItem', position: 5, name: 'Admins & player management' },
      { '@type': 'ListItem', position: 6, name: 'In-person payments with automatic reconciliation once marked paid' },
      { '@type': 'ListItem', position: 7, name: 'Gameplay & payment reports (audit-ready export)' },
      { '@type': 'ListItem', position: 8, name: 'Up to 20 connected player devices on trial' },
    ],
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Is FundRaisely for in-person, virtual, or hybrid events?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'Today it’s optimised for in-person quiz nights. Hosts collect payments in person (cash or instant link); admins mark paid and choose the method, and reconciliation updates automatically. Virtual/hybrid with integrated online payments is on the roadmap.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do payments and reconciliation work?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'Collect cash or share an instant payment link (e.g., Revolut). Inside the dashboard, an admin marks each player as paid and selects the method. From there, reconciliation updates automatically and you can export an audit-ready report.',
        },
      },
      {
        '@type': 'Question',
        name: 'What round types and extras are available?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'General Trivia, Wipeout, and Speed rounds with built-in tiebreakers. Extras include Clue, Freeze, RobinHood (RobPoints), and Restore to boost engagement and fundraising.',
        },
      },
      {
        '@type': 'Question',
        name: 'How many admins and players can we support?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'You can add admins (2 on trial, 4 on premium). The free trial supports up to 20 connected player devices; upgrade options will expand capacity.',
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <SEO
        title="Fundraising Quiz — Features | FundRaisely"
        description="Explore features of FundRaisely’s fundraising quiz: 4-step setup, templates or custom rounds, fundraising extras, in-person payments with automatic reconciliation once marked paid, and audit-ready reporting."
        keywords="fundraising quiz features, quiz fundraiser software, charity quiz app features, in-person quiz fundraising"
        domainStrategy="geographic"
      />

      {/* Structured data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <Header />

      {/* Hero */}
      <section className="relative px-4 pt-12 pb-8">
        <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-purple-300/30 blur-2xl" />
        <div className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-indigo-300/30 blur-2xl" />

        <div className="container relative z-10 mx-auto max-w-6xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-indigo-700 text-sm font-medium">
            <Sparkles className="h-4 w-4" /> Feature Overview
          </span>

          <h1 className="mt-4 bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent text-4xl md:text-6xl font-bold">
            Fundraising Quiz — Features
          </h1>

          <p className="mx-auto mt-4 max-w-3xl text-indigo-900/70 text-lg md:text-xl">
            Set up a complete in-person quiz fundraiser in minutes. Enable extras, collect payments, and export audit-ready reports.
            Once admins mark paid and choose the method, reconciliation updates automatically.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a href="/free-trial" className="rounded-xl bg-indigo-700 px-6 py-3 text-white font-semibold shadow-md hover:bg-indigo-800">
              Start Free Trial
            </a>
            <a
              href="/quiz/demo"
              className="rounded-xl bg-white px-6 py-3 text-indigo-700 font-semibold shadow-md hover:bg-indigo-50 inline-flex items-center gap-2"
            >
              <PlayCircle className="h-5 w-5" /> Watch the Demo
            </a>
          </div>
        </div>
      </section>

      {/* Setup & Creation */}
      <section className="px-4 pt-6">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
            <h2 className="text-indigo-900 text-2xl font-bold">Setup & creation</h2>
            <p className="text-indigo-900/70 mt-1">From zero to quiz night without the admin headache.</p>

            <div className="mt-5 grid gap-6 md:grid-cols-3">
              <FeatureCard
                icon={<Settings className="h-5 w-5" />}
                title="4-step setup wizard"
                desc="Create your event fast — ticketing, extras, capacity, and room link/QR all in one guided flow."
              />
              <FeatureCard
                icon={<Sparkles className="h-5 w-5" />}
                title="Templates or custom"
                desc="Start with prebuilt quiz templates or customise your own rounds and questions."
              />
              <FeatureCard
                icon={<Timer className="h-5 w-5" />}
                title="Round types + tiebreakers"
                desc="Run General, Wipeout, and Speed rounds with built-in tiebreakers, ready to go."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Gameplay & Engagement */}
      <section className="px-4 pt-8">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
            <h2 className="text-indigo-900 text-2xl font-bold">Gameplay & engagement</h2>
            <p className="text-indigo-900/70 mt-1">Keep the room buzzing and scores flowing.</p>

            <div className="mt-5 grid gap-6 md:grid-cols-3">
              <FeatureCard
                icon={<Smartphone className="h-5 w-5" />}
                title="Play on mobile"
                desc="Players join via link or QR and answer on their phones. Live scoring and leaderboards keep it lively."
              />
              <FeatureCard
                icon={<Sparkles className="h-5 w-5" />}
                title="Fundraising extras"
                desc="Clue, Freeze, RobinHood (RobPoints), Restore — add twists that drive engagement and donations."
              />
              <FeatureCard
                icon={<Users className="h-5 w-5" />}
                title="Admins & player management"
                desc="Add admins (2 on trial, 4 on premium). Manage attendance and teams from a central dashboard."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Payments & Reconciliation */}
      <section className="px-4 pt-8">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
            <h2 className="text-indigo-900 text-2xl font-bold">Payments & reconciliation</h2>
            <p className="text-indigo-900/70 mt-1">In-person collection with automatic reconciliation once marked paid.</p>

            <div className="mt-5 grid gap-6 md:grid-cols-3">
              <FeatureCard
                icon={<CreditCard className="h-5 w-5" />}
                title="Cash or instant link"
                desc="Collect cash or share an instant payment link (e.g., Revolut). Keep your preferred method — we keep the records straight."
              />
              <FeatureCard
                icon={<QrCode className="h-5 w-5" />}
                title="Mark paid + method"
                desc="Admins record payment status and method for each player or team — quick, accurate, controlled."
              />
              <FeatureCard
                icon={<FileText className="h-5 w-5" />}
                title="Auto reconciliation & audit"
                desc="Once marked paid, reconciliation updates automatically. Export audit-ready payment reports anytime."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Reporting & Compliance */}
      <section className="px-4 pt-8">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
            <h2 className="text-indigo-900 text-2xl font-bold">Reporting & compliance</h2>
            <p className="text-indigo-900/70 mt-1">Clarity for committees, treasurers, and auditors.</p>

            <div className="mt-5 grid gap-6 md:grid-cols-3">
              <FeatureCard
                icon={<BarChart className="h-5 w-5" />}
                title="Gameplay report"
                desc="Winner logs, round scores, and summaries for the minutes."
              />
              <FeatureCard
                icon={<FileText className="h-5 w-5" />}
                title="Payment reconciliation report"
                desc="Transparent, exportable reports showing amounts, methods, and status."
              />
              <FeatureCard
                icon={<Shield className="h-5 w-5" />}
                title="Best-practice guidance"
                desc="Quizzes are games of skill — we provide tips and defaults aligned to fundraising best practice."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Capacity & Limits */}
      <section className="px-4 pt-8">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
            <h2 className="text-indigo-900 text-2xl font-bold">Capacity & limits</h2>
            <p className="text-indigo-900/70 mt-1">Built for real events out of the box.</p>

            <div className="mt-5 grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-indigo-100 bg-white p-5 shadow-sm">
                <h3 className="text-indigo-900 text-lg font-semibold mb-1">Event-ready on trial</h3>
                <ul className="mt-2 space-y-2">
                  <Bullet>Up to 20 connected player devices</Bullet>
                  <Bullet>2 admin seats (upgrade for more)</Bullet>
                  <Bullet>All core features enabled</Bullet>
                </ul>
              </div>
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5 shadow-sm">
                <h3 className="text-indigo-900 text-lg font-semibold mb-1">Roadmap</h3>
                <ul className="mt-2 space-y-2">
                  <Bullet>Integrated online payments</Bullet>
                  <Bullet>Virtual and hybrid flows</Bullet>
                  <Bullet>Expanded capacity & roles</Bullet>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pt-10 pb-14">
        <div className="container mx-auto max-w-6xl text-center">
          <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white shadow-md">
            <h3 className="text-2xl font-bold mb-2">Ready to try these features?</h3>
            <p className="text-white/90 mb-6">
              Start free for in-person events — payments recorded on the night, automatic reconciliation once marked paid.
            </p>
            <a
              href="/free-trial"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-indigo-700 font-bold shadow-lg hover:bg-indigo-50"
            >
              Start Free Trial
            </a>
            <a
              href="/quiz/demo"
              className="ml-3 inline-flex items-center gap-2 rounded-xl bg-white/10 px-8 py-4 text-white font-bold border border-white/30 hover:bg-white/20"
            >
              Watch the Demo
            </a>
          </div>
        </div>
      </section>

      {/* FAQ visual (mirrors JSON-LD) */}
      <section className="px-4 pb-12">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-indigo-900 mb-4 text-3xl font-bold text-center">Features — FAQs</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-indigo-100/60">
              <h3 className="text-indigo-900 mb-2 text-lg font-semibold">In-person, virtual, or hybrid?</h3>
              <p className="text-indigo-900/70">
                Optimised for in-person right now. Virtual/hybrid with integrated payments is on the roadmap.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-indigo-100/60">
              <h3 className="text-indigo-900 mb-2 text-lg font-semibold">How does reconciliation work?</h3>
              <p className="text-indigo-900/70">
                Collect cash or share an instant payment link. Admins mark paid + method, and reconciliation updates automatically with
                an audit-ready export.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-indigo-100/60">
              <h3 className="text-indigo-900 mb-2 text-lg font-semibold">What extras are included?</h3>
              <p className="text-indigo-900/70">Clue, Freeze, RobinHood (RobPoints), and Restore to boost engagement and funds.</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-indigo-100/60">
              <h3 className="text-indigo-900 mb-2 text-lg font-semibold">Capacity & admin seats?</h3>
              <p className="text-indigo-900/70">Trial supports up to 20 devices and 2 admins. Premium expands capacity and seats.</p>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default QuizFeaturesPage;
