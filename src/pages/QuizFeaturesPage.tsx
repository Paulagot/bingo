import type React from 'react';
import { SEO } from '../components/SEO';
import { Header } from '../components/GeneralSite/Header';
import SiteFooter from '../components/GeneralSite2/SiteFooter';
import { currencyISO as iso } from '../services/currency';
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
  Trophy,
  Heart,
  Zap,
  Target,
  TrendingUp,
  Globe,
  Lock,
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

/** Cards */
const FeatureCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  desc: string;
  /** optional custom gradient for the icon background */
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

const Bullet: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-3">
    <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
    <span className="text-indigo-800/80 leading-relaxed">{children}</span>
  </li>
);

const BenefitCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  desc: string;
  highlight?: boolean;
  /** optional custom gradient for the icon background */
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

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Fundraising Quiz Features — Transform Your Community Events | FundRaisely',
    description:
      'Discover comprehensive fundraising quiz features designed for charities and non-profits. Interactive extras, payment management, real-time scoring, and professional reporting tools.',
    url: abs('/quiz/features'),
    mainEntity: {
      '@type': 'SoftwareApplication',
      name: 'FundRaisely Fundraising Quiz Platform',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: iso,
        description: 'Free trial with up to 20 participants',
      },
    },
  };

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Fundraising Quiz Features',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '4-step setup wizard for easy event creation' },
      { '@type': 'ListItem', position: 2, name: 'Professional quiz templates and customization options' },
      { '@type': 'ListItem', position: 3, name: 'Interactive fundraising extras: Freeze, Clue, Robin Hood, Restore' },
      { '@type': 'ListItem', position: 4, name: 'Real-time scoring and dynamic leaderboards' },
      { '@type': 'ListItem', position: 5, name: 'Mobile-first player experience with QR code access' },
      { '@type': 'ListItem', position: 6, name: 'Flexible payment collection and automated reconciliation' },
      { '@type': 'ListItem', position: 7, name: 'Comprehensive reporting and audit-ready documentation' },
      { '@type': 'ListItem', position: 8, name: 'Sponsor recognition and community building tools' },
    ],
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What makes FundRaisely different from other quiz platforms?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'FundRaisely is specifically designed for charity and non-profit fundraising with features like interactive fundraising extras, automated payment reconciliation, sponsor recognition, and audit-ready reporting that traditional quiz platforms lack.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do the interactive fundraising extras work?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Interactive extras like Freeze, Clue, Robin Hood, and Restore create additional revenue streams while maintaining engagement. Players can purchase these one-time-use items during gameplay to gain advantages or recover from mistakes, boosting both fun and fundraising.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can we collect both cash and digital payments?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, FundRaisely supports flexible payment collection including cash, Revolut, and other instant payment methods. Admins can mark payments as received and specify the collection method, with automatic reconciliation updating in real-time.',
        },
      },
      {
        '@type': 'Question',
        name: 'What reporting features are available for charity compliance?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'FundRaisely provides comprehensive, audit-ready reports including financial reconciliation, gameplay statistics, and sponsor recognition documentation. All reports can be exported for committee meetings, grant applications, and regulatory compliance.',
        },
      },
      {
        '@type': 'Question',
        name: 'How many participants can join a fundraising quiz?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The free trial supports up to 20 connected player devices with 2 admin seats. Premium options expand capacity and admin roles to accommodate larger fundraising events and more complex organizational structures.',
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <SEO
        title="Fundraising Quiz Features — Transform Your Community Events | FundRaisely"
        description="Discover comprehensive fundraising quiz features designed for charities and non-profits. Interactive extras, payment management, real-time scoring, and professional reporting tools."
        keywords="fundraising quiz features, charity quiz app features, fundraising quiz app features, interactive fundraising quiz, community fundraising platform, non-profit quiz night features"
        structuredData={[breadcrumbsJsonLd, webPageJsonLd, itemListJsonLd, faqJsonLd]}
        domainStrategy="geographic"
      />

      <Header />

      {/* Hero */}
      <section className="relative px-4 pt-12 pb-8">
        <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-purple-300/30 blur-2xl" />
        <div className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-indigo-300/30 blur-2xl" />

        <div className="container relative z-10 mx-auto max-w-6xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-indigo-700 text-sm font-medium">
            <Sparkles className="h-4 w-4" /> Comprehensive Feature Overview
          </span>

          <h1 className="mt-4 bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent text-4xl md:text-6xl font-bold">
            Fundraising Quiz Features
          </h1>
          <p className="mt-2 text-2xl md:text-3xl font-semibold text-indigo-900">Transform Your Community Events</p>

          <p className="mx-auto mt-4 max-w-3xl text-indigo-900/70 text-lg md:text-xl">
            Discover how FundRaisely's comprehensive fundraising quiz platform revolutionizes community fundraising through
            innovative technology and proven engagement strategies. Our features are specifically designed to empower charities and
            non-profit organizations across Ireland and the UK to maximize their fundraising potential.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a
              href="/free-trial"
              className="rounded-xl bg-indigo-700 px-6 py-3 text-white font-semibold shadow-md hover:bg-indigo-800 inline-flex items-center gap-2"
            >
              <Zap className="h-5 w-5" /> Run a Free Trial Quiz
            </a>
            {/* New: Founding Partner CTA */}
            <a
              href="/founding-partners"
              className="rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-3 text-white font-semibold shadow-md hover:scale-105 hover:shadow-lg"
            >
              Become a Founding Partner
            </a>
            <a
              href="/pricing"
              className="rounded-xl bg-white px-6 py-3 text-indigo-700 font-semibold shadow-md hover:bg-indigo-50 inline-flex items-center gap-2 border border-indigo-200"
            >
              <Target className="h-5 w-5" /> See Pricing
            </a>
          </div>
        </div>
      </section>

      {/* Why Fundraising Quizzes Work */}
      <section className="px-4 pt-8">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8">
            <h2 className="text-indigo-900 text-3xl font-bold mb-4">Why Fundraising Quizzes Transform Community Fundraising</h2>
            <p className="text-indigo-900/70 text-lg max-w-3xl mx-auto">
              Research shows that interactive fundraising events like quiz nights create stronger community bonds while generating
              significantly more revenue than traditional fundraising approaches.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <BenefitCard
              icon={<Heart className="h-5 w-5" />}
              title="Builds Lasting Community"
              desc="Brings people together for fun and engaging events, fostering a sense of community among supporters and strengthening relationships with your cause."
              iconGradient="from-rose-500 to-pink-500"
            />
            <BenefitCard
              icon={<TrendingUp className="h-5 w-5" />}
              title="Cost-Effective Revenue"
              desc="Generate significant fundraising returns with minimal upfront investment. Quiz nights consistently outperform traditional fundraising events in cost-to-revenue ratios."
              highlight={true}
              iconGradient="from-amber-500 to-orange-600"
            />
            <BenefitCard
              icon={<Globe className="h-5 w-5" />}
              title="Inclusive & Accessible"
              desc="Welcome participants of all ages and backgrounds. Quiz nights celebrate knowledge and wit across diverse groups, creating truly inclusive fundraising experiences."
              iconGradient="from-teal-500 to-cyan-500"
            />
          </div>
        </div>
      </section>

      {/* Event Setup & Creation */}
      <section className="px-4 pt-12">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <h2 className="text-indigo-900 text-3xl font-bold mb-2">Event Setup & Creation Features</h2>
            <p className="text-indigo-900/70 text-lg mb-6">
              Transform your fundraising vision into reality with our intuitive setup wizard that eliminates technical barriers for
              volunteers.
            </p>

            <div className="grid gap-6 md:grid-cols-3">
              <FeatureCard
                icon={<Settings className="h-5 w-5" />}
                title="4-Step Setup Wizard"
                desc="Create professional fundraising quiz events in minutes with guided setup for entry fees, quiz templates, fundraising extras, and prize management with sponsor recognition."
                gradient="from-teal-500 to-cyan-500"
              />
              <FeatureCard
                icon={<Sparkles className="h-5 w-5" />}
                title="Professional Quiz Templates"
                desc="Choose from expertly crafted quiz templates or create fully customized rounds tailored to your community's interests and knowledge base."
                gradient="from-rose-500 to-pink-500"
              />
              <FeatureCard
                icon={<Timer className="h-5 w-5" />}
                title="Diverse Round Types"
                desc="Engage participants with General Trivia, Wipeout challenges, and Speed rounds, each designed to maintain high energy and competitive excitement."
                gradient="from-amber-500 to-orange-600"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Engagement Features */}
      <section className="px-4 pt-8">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <h2 className="text-indigo-900 text-3xl font-bold mb-2">Interactive Engagement Features</h2>
            <p className="text-indigo-900/70 text-lg mb-6">
              Keep participants engaged and boost fundraising potential with innovative interactive features that create memorable
              experiences.
            </p>

            <div className="grid gap-6 md:grid-cols-3">
              <FeatureCard
                icon={<Zap className="h-5 w-5" />}
                title="Interactive Fundraising Extras"
                desc="Boost revenue with Freeze (block competitors), Clue (unlock hints), Robin Hood (steal points), and Restore Points. These create additional fundraising opportunities while maintaining competitive excitement."
                gradient="from-fuchsia-600 to-purple-600"
              />
              <FeatureCard
                icon={<BarChart className="h-5 w-5" />}
                title="Real-Time Scoring & Leaderboards"
                desc="Maintain excitement with live scoring updates and dynamic leaderboards that showcase team performance, eliminating manual errors while building competitive energy."
                gradient="from-emerald-500 to-green-600"
              />
              <FeatureCard
                icon={<Smartphone className="h-5 w-5" />}
                title="Mobile-First Player Experience"
                desc="Ensure seamless participation with mobile-optimized platform. Players join via QR codes or links without app downloads, accommodating all device preferences."
                gradient="from-sky-500 to-indigo-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Payment & Financial Management */}
      <section className="px-4 pt-8">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <h2 className="text-indigo-900 text-3xl font-bold mb-2">Payment & Financial Management</h2>
            <p className="text-indigo-900/70 text-lg mb-6">
              Support your community's preferred payment methods with comprehensive financial tracking and automated reconciliation.
            </p>

            <div className="grid gap-6 md:grid-cols-3">
              <FeatureCard
                icon={<CreditCard className="h-5 w-5" />}
                title="Flexible Payment Collection"
                desc="Support cash collection and instant digital payments through platforms like Revolut. This flexibility ensures no community member is excluded due to payment preferences."
                gradient="from-violet-600 to-indigo-700"
              />
              <FeatureCard
                icon={<Users className="h-5 w-5" />}
                title="Administrative Payment Tracking"
                desc="Empower volunteer teams with tools allowing multiple admins to mark payments received and specify collection methods, distributing administrative burden effectively."
                gradient="from-lime-500 to-green-600"
              />
              <FeatureCard
                icon={<FileText className="h-5 w-5" />}
                title="Automated Reconciliation"
                desc="Eliminate manual reconciliation with real-time financial updates. Generate comprehensive, audit-ready reports for transparency and regulatory compliance."
                gradient="from-slate-600 to-gray-700"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Community & Sponsor Features */}
      <section className="px-4 pt-8">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <h2 className="text-indigo-900 text-3xl font-bold mb-2">Community & Sponsor Features</h2>
            <p className="text-indigo-900/70 text-lg mb-6">
              Build stronger community partnerships and create lasting connections that extend beyond individual fundraising events.
            </p>

            <div className="grid gap-6 md:grid-cols-3">
              <FeatureCard
                icon={<Trophy className="h-5 w-5" />}
                title="Sponsor Recognition & Integration"
                desc="Maximize sponsor value through integrated recognition features that showcase local business support, building sustainable funding relationships with meaningful community exposure."
                gradient="from-yellow-500 to-orange-600"
              />
              <FeatureCard
                icon={<QrCode className="h-5 w-5" />}
                title="Prize Management & Distribution"
                desc="Streamline prize administration with comprehensive tools for managing up to 10 prizes per event, including sponsor attribution, value tracking, and winner documentation."
                gradient="from-cyan-500 to-sky-600"
              />
              <FeatureCard
                icon={<Heart className="h-5 w-5" />}
                title="Community Building Tools"
                desc="Foster lasting connections through features designed to build relationships beyond individual events, transforming one-time participants into ongoing supporters."
                gradient="from-pink-500 to-rose-600"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Reporting & Compliance Features */}
      <section className="px-4 pt-8">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <h2 className="text-indigo-900 text-3xl font-bold mb-2">Reporting & Compliance Features</h2>
            <p className="text-indigo-900/70 text-lg mb-6">
              Maintain the highest standards of financial transparency with comprehensive reporting tools that support charity
              governance requirements.
            </p>

            <div className="grid gap-6 md:grid-cols-3">
              <FeatureCard
                icon={<BarChart className="h-5 w-5" />}
                title="Comprehensive Event Analytics"
                desc="Gain valuable insights into participant behavior, question difficulty, and engagement patterns that inform future event planning and optimization strategies."
                gradient="from-blue-600 to-cyan-600"
              />
              <FeatureCard
                icon={<Shield className="h-5 w-5" />}
                title="Financial Transparency & Audit Support"
                desc="Generate detailed financial reports that break down revenue sources, track refunds, and provide documentation for board meetings and regulatory filings."
                gradient="from-slate-700 to-indigo-800"
              />
              <FeatureCard
                icon={<TrendingUp className="h-5 w-5" />}
                title="Post-Event Engagement Tracking"
                desc="Measure long-term impact through tools that track participant engagement, repeat attendance, and community growth, supporting strategic planning and grant applications."
                gradient="from-emerald-500 to-green-600"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Technical & Accessibility Features */}
      <section className="px-4 pt-8">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <h2 className="text-indigo-900 text-3xl font-bold mb-2">Technical & Accessibility Features</h2>
            <p className="text-indigo-900/70 text-lg mb-6">
              Ensure universal accessibility and reliable performance with our robust technical infrastructure designed for community
              organizations.
            </p>

            <div className="grid gap-6 md:grid-cols-3">
              <FeatureCard
                icon={<Globe className="h-5 w-5" />}
                title="Multi-Device Compatibility"
                desc="Ensure universal accessibility with seamless performance across smartphones, tablets, and computers, accommodating diverse technology preferences within your community."
                gradient="from-indigo-500 to-cyan-500"
              />
              <FeatureCard
                icon={<Users className="h-5 w-5" />}
                title="Scalable Capacity Management"
                desc="Support events of various sizes with flexible capacity management. Trial supports 20 devices with upgrade paths for larger fundraising events."
                gradient="from-purple-500 to-fuchsia-600"
              />
              <FeatureCard
                icon={<Lock className="h-5 w-5" />}
                title="Reliable Performance & Security"
                desc="Trust in robust technical infrastructure ensuring consistent performance and data protection, providing the reliability community organizations need."
                gradient="from-gray-700 to-slate-800"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Capacity & Limits */}
      <section className="px-4 pt-8">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <h2 className="text-indigo-900 text-3xl font-bold mb-2">Capacity & Limits</h2>
            <p className="text-indigo-900/70 text-lg mb-6">
              Built for real fundraising events with capacity that scales with your organization's growth and ambitions.
            </p>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="text-indigo-900 text-xl font-semibold mb-3 flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  Event-Ready on Trial
                </h3>
                <ul className="space-y-3">
                  <Bullet>Up to 20 connected player devices</Bullet>
                  <Bullet>2 admin seats with full management capabilities</Bullet>
                  <Bullet>All core fundraising features enabled</Bullet>
                  <Bullet>Complete payment tracking and reconciliation</Bullet>
                  <Bullet>Professional reporting and analytics</Bullet>
                </ul>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-purple-50 to-indigo-50 p-6 shadow-sm">
                <h3 className="text-indigo-900 text-xl font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  Growth & Expansion
                </h3>
                <ul className="space-y-3">
                  <Bullet>Expanded capacity for larger fundraising events</Bullet>
                  <Bullet>Additional admin roles for complex organizations</Bullet>
                  <Bullet>Advanced analytics and reporting features</Bullet>
                  <Bullet>Priority support and training resources</Bullet>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-4 pt-12 pb-8">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-indigo-900 mb-8 text-3xl font-bold text-center">
            Fundraising Quiz Features — Frequently Asked Questions
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-indigo-900 mb-3 text-lg font-semibold">
                What makes FundRaisely different from other quiz platforms?
              </h3>
              <p className="text-indigo-900/70">
                FundRaisely is specifically designed for charity and non-profit fundraising with features like interactive
                fundraising extras, automated payment reconciliation, sponsor recognition, and audit-ready reporting that traditional
                quiz platforms lack.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-indigo-900 mb-3 text-lg font-semibold">How do the interactive fundraising extras work?</h3>
              <p className="text-indigo-900/70">
                Interactive extras like Freeze, Clue, Robin Hood, and Restore create additional revenue streams while maintaining
                engagement. Players can purchase these one-time-use items during gameplay to gain advantages or recover from
                mistakes.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-indigo-900 mb-3 text-lg font-semibold">Can we collect both cash and digital payments?</h3>
              <p className="text-indigo-900/70">
                Yes, FundRaisely supports flexible payment collection including cash, Revolut, and other instant payment methods.
                Admins can mark payments as received and specify the collection method, with automatic reconciliation updating in
                real-time.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-indigo-900 mb-3 text-lg font-semibold">
                What reporting features are available for charity compliance?
              </h3>
              <p className="text-indigo-900/70">
                FundRaisely provides comprehensive, audit-ready reports including financial reconciliation, gameplay statistics,
                sponsor recognition documentation. All reports can be exported for committee meetings and regulatory compliance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pt-8 pb-14">
        <div className="container mx-auto max-w-6xl text-center">
          <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white shadow-lg">
            <h3 className="text-3xl font-bold mb-3">Ready to Transform Your Fundraising?</h3>
            <p className="text-white/90 mb-6 text-lg max-w-3xl mx-auto">
              Experience the full power of FundRaisely's fundraising quiz platform with our comprehensive free trial. Start building
              stronger community connections while maximizing your fundraising potential today.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="/free-trial"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-indigo-700 font-bold shadow-lg hover:bg-indigo-50 transition"
              >
                <Zap className="h-5 w-5" />
                Run a Free Trial Quiz
              </a>
              {/* New: Founding Partner CTA */}
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
                <Target className="h-5 w-5" />
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

export default QuizFeaturesPage;

