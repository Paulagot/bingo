
// ==========================================
// File: src/pages/quiz/use-cases/UsecaseClubsPage.tsx
// Purpose: SEO-differentiated Clubs page (equipment, travel, facilities, camaraderie)
// ==========================================
import React from 'react';
import { SEO } from '../../components/SEO';
import { Header } from '../../components/GeneralSite/Header';
import SiteFooter from '../../components/GeneralSite2/SiteFooter';
import OutcomePreview from '../../components/GeneralSite2/OutcomePreview';
import {  formatMoney } from '../../services/currency';
import {
  Sparkles, Trophy, Users, Zap, Target, TrendingUp, Check, PlayCircle,
 Gift, Heart, DollarSign, BarChart
} from 'lucide-react';

/** Absolute URL helpers */
function getOrigin2(): string {
  const env = (import.meta as any)?.env?.VITE_SITE_ORIGIN as string | undefined;
  if (env) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin.replace(/\/$/, '');
  return 'https://fundraisely.ie';
}
function abs2(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${getOrigin2()}${p}`;
}

const Bullet2: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-3">
    <Check className="mt-1 h-5 w-5 flex-shrink-0 text-green-600" />
    <span className="text-indigo-900/80">{children}</span>
  </li>
);

const FeatureCard2: React.FC<{ icon: React.ReactNode; title: string; desc: string; }> = ({ icon, title, desc }) => (
  <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-md">
      {icon}
    </div>
    <h3 className="text-indigo-900 text-lg font-semibold mb-2">{title}</h3>
    <p className="text-indigo-900/70 text-sm leading-relaxed">{desc}</p>
  </div>
);

const StepCard2: React.FC<{ number: string; icon: React.ReactNode; title: string; points: string[]; }> = ({ number, icon, title, points }) => (
  <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
    <div className="flex items-center gap-3 mb-4">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg text-lg font-bold">
        {number}
      </div>
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-700">
        {icon}
      </div>
    </div>
    <h3 className="text-indigo-900 text-lg font-semibold mb-3">{title}</h3>
    <ul className="space-y-2">
      {points.map((point, idx) => (
        <Bullet2 key={idx}>{point}</Bullet2>
      ))}
    </ul>
  </div>
);

const FAQItem2: React.FC<{ question: string; answer: string; }> = ({ question, answer }) => (
  <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm">
    <h3 className="text-indigo-900 text-lg font-semibold mb-3">{question}</h3>
    <p className="text-indigo-900/70 leading-relaxed">{answer}</p>
  </div>
);

const UsecaseClubsPage: React.FC = () => {
  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: abs2('/') },
      { '@type': 'ListItem', position: 2, name: 'Use Cases', item: abs2('/quiz/use-cases') },
      { '@type': 'ListItem', position: 3, name: 'Clubs', item: abs2('/quiz/use-cases/clubs') },
    ],
  };

  const webPageJsonLd = {
    '@context': 'https://schema.org', '@type': 'WebPage',
    name: 'Sports & Social Club Fundraising Quizzes | Easy Events | FundRaisely',
    url: abs2('/quiz/use-cases/clubs'),
    description: 'Raise more for your club with engaging quiz nights. Simple setup, gamified extras, reconciliation, and sponsor visibility—built for busy volunteers.'
  };

  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'How can FundRaisely help our club raise funds?', acceptedAnswer: { '@type': 'Answer', text: 'Run engaging quizzes with ticketing, extras, and sponsor visibility, maximising revenue without adding volunteer burden.' } },
      { '@type': 'Question', name: 'Is it easy for volunteers to manage?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. The 4‑step wizard, clear roles, and automated scoring/reconciliation make it straightforward for anyone.' } },
      { '@type': 'Question', name: 'Can we customise the content?', acceptedAnswer: { '@type': 'Answer', text: 'Choose from ready round types and add club‑specific themes to boost relevance and fun.' } },
      { '@type': 'Question', name: 'Can we accept Revolut or cash and still reconcile?', acceptedAnswer: { '@type': 'Answer', text: 'Admins mark payments as received by method; the reconciliation panel compares expected vs. received across entry fees and extras.' } },
      { '@type': 'Question', name: 'What if Wi‑Fi is weak?', acceptedAnswer: { '@type': 'Answer', text: 'Optimised for mobile data and variable venue connectivity. We share venue setup tips and hotspot fallbacks.' } },
      { '@type': 'Question', name: 'What reporting will the committee get?', acceptedAnswer: { '@type': 'Answer', text: 'Income reconciliation, prize logs with sponsors, participation stats, and CSV/PDF exports for clear, audit‑ready records.' } },
    ],
  };

  const structuredData = [webPageJsonLd, breadcrumbsJsonLd, faqJsonLd];

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <SEO
        title="Sports & Social Club Fundraising Quizzes | Easy Events | FundRaisely"
        description="Raise more for your club with engaging quiz nights. Simple setup, gamified extras, clear reconciliation, and sponsor visibility—built for busy volunteers."
        keywords="sports club fundraising quiz, club trivia night fundraiser, community club quiz night, fundraising for sports teams, social club quiz event, easy club fundraiser, virtual club quiz, team fundraising ideas, club event planning, fundraising quiz platform"
        ukKeywords="club quiz fundraiser UK, sports club quiz night, fundraising quiz platform"
        ieKeywords="club quiz fundraiser Ireland, sports club quiz night, fundraising quiz platform"
        image={abs2('/og/og-usecase-clubs.jpg')}
        domainStrategy="geographic"
        structuredData={structuredData}
      />

      <Header />

      {/* Hero Section */}
      <section className="relative px-4 pt-12 pb-8">
        <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-green-300/30 blur-2xl" />
        <div className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-emerald-300/30 blur-2xl" />
        <div className="container relative z-10 mx-auto max-w-6xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-indigo-700 text-sm font-medium">
            <Trophy className="h-4 w-4" /> Sports & Social Clubs
          </span>
          <h1 className="mt-6 mb-6 bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-600 bg-clip-text text-transparent text-4xl md:text-6xl font-bold leading-tight pb-2">
            Transform Your Club’s Fundraising with High‑Energy Quiz Nights
          </h1>
          <p className="mx-auto mt-4 max-w-4xl text-indigo-900/80 text-lg md:text-xl leading-relaxed">
            Built for busy volunteers <strong>simple</strong> to run, <strong>fun</strong> to play, and <strong>transparent</strong> for committees. Bring your club together and raise more for kit, travel, and facilities.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a href="/free-trial" className="rounded-xl bg-indigo-700 px-6 py-3 text-white font-semibold shadow-md hover:bg-indigo-800 transition-colors">
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
              href="/quiz/demo"
              className="rounded-xl bg-white px-6 py-3 text-indigo-700 font-semibold shadow-md hover:bg-indigo-50 inline-flex items-center gap-2 transition-colors border border-indigo-200"
            >
              <PlayCircle className="h-5 w-5" /> Watch the Demo
            </a>
          </div>
        </div>
      </section>

      {/* Why Clubs Choose FundRaisely */}
      <section className="px-4 pt-6 pb-10">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl border border-indigo-100 bg-white p-8 shadow-sm">
            <h2 className="text-indigo-900 text-2xl md:text-3xl font-bold mb-6">Why Clubs Choose FundRaisely</h2>
            <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <Bullet2>Effortless setup (4‑step wizard) for busy volunteers</Bullet2>
              <Bullet2>Maximise donations with gamified extras + sponsor visibility</Bullet2>
              <Bullet2>Mobile play with live scoring and leaderboards</Bullet2>
              <Bullet2>Streamlined payment tracking and audit‑ready reconciliation</Bullet2>
              <Bullet2>Strengthen bonds across teams and age groups</Bullet2>
              <Bullet2>SOON: Customise content to reflect club identity</Bullet2>
            </ul>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="px-4 py-12 bg-gradient-to-r from-green-50 to-emerald-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-indigo-900 text-3xl md:text-4xl font-bold mb-4">Your Club Quiz in 4 Simple Steps</h2>
            <p className="text-indigo-900/70 text-lg max-w-3xl mx-auto leading-relaxed">
              From setup to celebration, FundRaisely guides you every step of the way.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StepCard2
              number="1"
              icon={<Sparkles className="h-5 w-5" />}
              title="Create Your Quiz Event"
              points={['Quick 4‑step setup', 'Choose templates or customise rounds', 'Add extras & prizes with sponsor recognition']}
            />
            <StepCard2
              number="2"
              icon={<Users className="h-5 w-5" />}
              title="Invite & Engage Members"
              points={['Share join links / QR codes', 'Players join on mobiles', 'Clear roles for Hosts & Admins']}
            />
            <StepCard2
              number="3"
              icon={<DollarSign className="h-5 w-5" />}
              title="Collect Funds Seamlessly"
              points={['Cash, Revolut, and other methods', 'Admins mark payments received', 'Extras encourage additional giving']}
            />
            <StepCard2
              number="4"
              icon={<BarChart className="h-5 w-5" />}
              title="Report & Celebrate"
              points={['Live scores & leaderboards', 'Reconciliation + CSV/PDF exports', 'Celebrate funds raised & impact']}
            />
          </div>
        </div>
      </section>

      {/* Micro Case Study (club) */}
      <OutcomePreview
  eyebrow="Illustrative outcomes"
  title="What success could look like for clubs using FundRaisely"
  intro="For squads and social sections, the combo of gamified extras and sponsor visibility often lifts totals without adding volunteer workload."
  bullets={[
    <>Event revenue of <strong>{formatMoney(1200)}–{formatMoney(2000)}</strong> in ~90 minutes</>,
    <><strong>+15–30%</strong> vs. previous quiz nights through extras</>,
    <>Sponsor mentions and logos shown <strong>between rounds</strong> and in reports</>,
  ]}
  note="Ranges assume ~50–90 players, modest entry pricing, and at least one sponsor prize."
/>


      {/* Key Benefits Grid */}
      <section className="px-4 py-12 bg-gradient-to-r from-emerald-50 to-green-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-indigo-900 text-3xl md:text-4xl font-bold mb-4">Tailored Benefits for Every Club</h2>
            <p className="text-indigo-900/70 text-lg max-w-3xl mx-auto leading-relaxed">
              Designed to help teams raise more while keeping things friendly for volunteers.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard2 icon={<Trophy className="h-5 w-5" />} title="Boost Team & Club Funds" desc="Fund kit, travel, and facilities with engaging, profitable events." />
            <FeatureCard2 icon={<Users className="h-5 w-5" />} title="Strengthen Community Bonds" desc="Bring squads and age groups together; attract new members with memorable nights." />
            <FeatureCard2 icon={<Zap className="h-5 w-5" />} title="Simplify Volunteer Management" desc="Intuitive setup, automated scoring, and easy payment tracking reduce workload." />
            <FeatureCard2 icon={<Target className="h-5 w-5" />} title="Engaging Interactive Experience" desc="Timers, leaderboards, and extras keep energy high and donations flowing." />
            <FeatureCard2 icon={<TrendingUp className="h-5 w-5" />} title="Transparent Reporting" desc="Reconciliation and CSV/PDF exports keep committees confident and informed." />
            <FeatureCard2 icon={<Heart className="h-5 w-5" />} title="Customisable for Your Club" desc=" Sponsor shout‑outs available now and soon you can use club‑themed rounds to make it truly yours." />
          </div>
        </div>
      </section>

      <section className="px-4 py-12 bg-gradient-to-r from-indigo-50 to-green-50">
  <div className="container mx-auto max-w-6xl">
    <div className="text-center mb-12">
      <h2 className="text-indigo-900 text-3xl md:text-4xl font-bold mb-4">Make the Most of Your Sponsors</h2>
      <p className="text-indigo-900/70 text-lg max-w-3xl mx-auto leading-relaxed">
        Sponsors love visibility. FundRaisely helps clubs showcase local businesses and give them a night to remember.
      </p>
    </div>
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <FeatureCard2 icon={<Sparkles className="h-5 w-5" />} title="On-Screen Shout-Outs" desc="Display sponsor logos between rounds or alongside the leaderboard." />
      <FeatureCard2 icon={<Gift className="h-5 w-5" />} title="Prize Sponsorship" desc="Let local businesses sponsor prizes, creating goodwill and reducing club costs." />
      <FeatureCard2 icon={<Users className="h-5 w-5" />} title="Community Connection" desc="Show your sponsors they’re part of the team with thank-yous in your reports." />
    </div>
  </div>
</section>


      {/* FAQ */}
      <section className="px-4 py-12">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-indigo-900 text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-indigo-900/70 text-lg max-w-3xl mx-auto leading-relaxed">
              Everything you need to know to run a great club quiz night.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <FAQItem2 question="How can FundRaisely help our club raise funds?" answer="Run engaging quizzes with ticketing, extras, and sponsor visibility, maximising revenue without adding volunteer burden." />
            <FAQItem2 question="Is it easy for volunteers to manage?" answer="Yes. The 4‑step wizard, clear roles, and automated scoring/reconciliation make it straightforward for anyone." />
            <FAQItem2 question="Can we customise the content?" answer="Choose from ready round types and add club‑specific themes to boost relevance and fun." />
            <FAQItem2 question="Can we accept Revolut or cash and still reconcile?" answer="Admins mark payments as received by method; the reconciliation panel compares expected vs. received across entry fees and extras." />
            <FAQItem2 question="What if Wi‑Fi is weak?" answer="We’re optimised for mobile data and variable venue connectivity. We share venue setup tips and hotspot fallbacks." />
            <FAQItem2 question="What reporting will the committee get?" answer="Income reconciliation, prize logs with sponsors, participation stats, and CSV/PDF exports for clear, audit‑ready records." />
          </div>
        </div>
      </section>

      {/* Related internal links */}
      <section className="px-4 pt-4">
        <div className="container mx-auto max-w-6xl text-sm text-indigo-900/80">
          <p>
            Related: <a href="/quiz/how-it-works" className="underline">How it works</a> ·{' '}
            <a href="/quiz/features" className="underline">Features</a> ·{' '}
            <a href="/quiz/use-cases/charities" className="underline">Charities</a> ·{' '}
            <a href="/quiz/use-cases/schools" className="underline">Schools</a>
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-12">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-700 to-purple-600 p-8 shadow-lg text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Energise Your Club’s Fundraising?</h2>
            <p className="text-lg max-w-3xl mx-auto leading-relaxed mb-8 text-indigo-100">
              Run a quiz that’s fun for members and easy for volunteers, then export audit‑ready reports in minutes.  Try it once and your club will be hooked.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="/free-trial" className="rounded-xl bg-white px-8 py-4 text-indigo-700 font-semibold shadow-md hover:bg-indigo-50 transition-colors text-lg">
                Run a Free Trial Quiz
              </a>
                  {/* New: Founding Partner CTA */}
              <a
                href="/founding-partners"
                className="rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-8 py-4 text-white font-bold shadow-lg hover:scale-105 hover:shadow-xl transition"
              >
                Become a Founding Partner
              </a>
              <a href="/pricing" className="rounded-xl bg-indigo-800 px-8 py-4 text-white font-semibold shadow-md hover:bg-indigo-900 border border-indigo-600 transition-colors text-lg">
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

export default UsecaseClubsPage;





