// ==========================================
// File: src/pages/quiz/use-cases/UsecaseCharitiesPage.tsx
// Purpose: SEO-differentiated Charities page (donor trust, compliance, audit-ready)
// ==========================================
import type React from 'react';
import { SEO } from '../../components/SEO';
import { Header } from '../../components/GeneralSite/Header';
import SiteFooter from '../../components/GeneralSite2/SiteFooter';
import OutcomePreview from '../../components/GeneralSite2/OutcomePreview';
import {
  Sparkles,
  Check,
  PlayCircle,
  Heart,
  Users,
  Shield,
  TrendingUp,
  Target,
  Award,
  FileText,
  
  Clock,
  DollarSign,
  BarChart
} from 'lucide-react';

// -----------------------------
// Helpers
// -----------------------------
function getOrigin(): string {
  const env = (import.meta as any)?.env?.VITE_SITE_ORIGIN as string | undefined;
  if (env) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin)
    return window.location.origin.replace(/\/$/, '');
  return 'https://fundraisely.ie';
}

function abs(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${getOrigin()}${p}`;
}

const Bullet: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-3">
    <Check className="mt-1 h-5 w-5 flex-shrink-0 text-green-600" />
    <span className="text-indigo-900/80">{children}</span>
  </li>
);

const FeatureCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  desc: string;
}> = ({ icon, title, desc }) => (
  <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-md">
      {icon}
    </div>
    <h3 className="text-indigo-900 text-lg font-semibold mb-2">{title}</h3>
    <p className="text-indigo-900/70 text-sm leading-relaxed">{desc}</p>
  </div>
);

const StepCard: React.FC<{
  number: string;
  icon: React.ReactNode;
  title: string;
  points: string[];
}> = ({ number, icon, title, points }) => (
  <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
    <div className="flex items-center gap-3 mb-4">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-lg text-lg font-bold">
        {number}
      </div>
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-pink-50 text-pink-700">
        {icon}
      </div>
    </div>
    <h3 className="text-indigo-900 text-lg font-semibold mb-3">{title}</h3>
    <ul className="space-y-2">
      {points.map((point, idx) => (
        <Bullet key={idx}>{point}</Bullet>
      ))}
    </ul>
  </div>
);

const FAQItem: React.FC<{
  question: string;
  answer: string;
}> = ({ question, answer }) => (
  <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
    <h3 className="text-indigo-900 text-lg font-semibold mb-3">{question}</h3>
    <p className="text-indigo-900/70 leading-relaxed">{answer}</p>
  </div>
);

const UsecaseCharitiesPage: React.FC = () => {
  // JSON-LD via SEO (no manual scripts)
  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
      { '@type': 'ListItem', position: 2, name: 'Use Cases', item: abs('/quiz/use-cases') },
      { '@type': 'ListItem', position: 3, name: 'Charities & Nonprofits', item: abs('/quiz/use-cases/charities') }
    ]
  } as const;

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Is this compliant for fundraisers?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'Quizzes are games of skill. We provide best‑practice guidance and clear reporting to support compliance and audit needs. This is general guidance, not legal advice.'
        }
      },
      {
        '@type': 'Question',
        name: 'How are payments and donations tracked?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'Admins mark payments by method (cash & other instant payment options). The reconciliation panel compares expected vs. received across entry fees and extras, exportable to CSV/PDF.'
        }
      },
      {
        '@type': 'Question',
        name: 'Is donor data secure?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'We prioritise data protection with clear roles and audit trails; we minimise data collection in the event flow and provide exportable reports for governance.'
        }
      },
      {
        '@type': 'Question',
        name: 'Can we use the reports for grants or committee sign‑off?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'Yes, CSV/PDF exports summarise participation, income by method/purpose, and prize/sponsor logs—useful for committee reporting and grant applications.'
        }
      },
      {
        '@type': 'Question',
        name: 'Will it work with weak Wi‑Fi at the venue?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'Optimised for mobile data and variable connections. We share venue setup tips (e.g., hotspot fallback, pacing guidance) for smooth play.'
        }
      },
      {
        '@type': 'Question',
        name: 'Do you integrate with our donor CRM?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'Direct integrations are evolving. You can export CSV for reconciliation/import into your existing systems.'
        }
      }
    ]
  } as const;

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Charity Quiz Fundraisers | Easy & Effective for Non‑Profits | FundRaisely',
      description:
        'Raise more with engaging quiz nights. Simple setup, transparent, audit‑ready reporting, and donor‑friendly experiences for charities and nonprofits.',
      url: abs('/quiz/use-cases/charities')
    },
    breadcrumbsJsonLd,
    faqJsonLd
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <SEO
        title="Charity Quiz Fundraisers | Easy & Effective for Non‑Profits | FundRaisely"
        description="Raise more with engaging quiz nights. Simple setup, donor‑friendly experiences, and audit‑ready transparency for committees and grants."
        keywords="charity quiz fundraiser, non‑profit trivia night, compliance friendly fundraiser, donor reporting, audit ready reconciliation, grant application reporting"
        ukKeywords="charity quiz fundraiser UK, non‑profit fundraiser UK, donor reporting"
        ieKeywords="charity quiz fundraiser Ireland, non‑profit fundraiser Ireland, donor reporting"
        image={abs('/og/og-usecase-charities.jpg')}
        structuredData={structuredData}
        domainStrategy="geographic"
      />

      <Header />

      {/* Hero Section */}
      <section className="relative px-4 pt-12 pb-8">
        <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-pink-300/30 blur-2xl" />
        <div className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-rose-300/30 blur-2xl" />
        <div className="container relative z-10 mx-auto max-w-6xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-indigo-700 text-sm font-medium">
            <Heart className="h-4 w-4" /> Charities & Nonprofits
          </span>
          <h1 className="mt-6 mb-6 bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-600 bg-clip-text text-transparent text-4xl md:text-6xl font-bold leading-tight pb-2">
            Host Donor‑Trusted Quiz Fundraisers Audit‑Ready by Design
          </h1>
          <p className="mx-auto mt-4 max-w-4xl text-indigo-900/80 text-lg md:text-xl leading-relaxed">
            Built for grassroots teams <strong>simple</strong> to run, <strong>supportive</strong> for volunteers, and <strong>transparent</strong> for committees and grant makers.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a href="/free-trial" className="rounded-xl bg-indigo-700 px-6 py-3 text-white font-semibold shadow-md hover:bg-indigo-800 transition-colors">
              Start Free Trial
            </a>
            <a href="/pricing" className="rounded-xl bg-white px-6 py-3 text-indigo-700 font-semibold shadow-md hover:bg-indigo-50 border border-indigo-200 transition-colors">
              See Pricing
            </a>
                {/* New: Founding Partner CTA */}
              <a
                href="/founding-partners"
                className="rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-8 py-4 text-white font-bold shadow-lg hover:scale-105 hover:shadow-xl transition"
              >
                Become a Founding Partner
              </a>
            <a href="/quiz/demo" className="rounded-xl bg-white px-6 py-3 text-indigo-700 font-semibold shadow-md hover:bg-indigo-50 inline-flex items-center gap-2 border border-indigo-200 transition-colors">
              <PlayCircle className="h-5 w-5" /> Watch Demo
            </a>
          </div>
        </div>
      </section>

      {/* Why Charities Choose FundRaisely */}
      <section className="px-4 pt-6 pb-10">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl border border-indigo-100 bg-white p-8 shadow-sm">
            <h2 className="text-indigo-900 text-2xl md:text-3xl font-bold mb-6">Why Charities Choose FundRaisely</h2>
            <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <Bullet>Audit‑ready reconciliation and exportable records (CSV/PDF)</Bullet>
              <Bullet>Supporter‑friendly experience that is fun with clear totals and impact</Bullet>
              <Bullet>Volunteer‑friendly setup and roles</Bullet>
              <Bullet>Transparent tracking for committee sign‑off</Bullet>
              <Bullet>Grant‑application‑friendly summaries</Bullet>
              <Bullet>Sponsor visibility for community partnerships</Bullet>
            </ul>
          </div>
        </div>
      </section>

      {/* How It Works - 4 Steps (supporters/donors wording) */}
      <section className="px-4 py-12 bg-gradient-to-r from-pink-50 to-rose-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-indigo-900 text-3xl md:text-4xl font-bold mb-4">Your Charity Quiz in 4 Simple Steps</h2>
            <p className="text-indigo-900/70 text-lg max-w-3xl mx-auto leading-relaxed">
              From setup to celebration, FundRaisely guides you through an event supporters love, and committees trust.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StepCard
              number="1"
              icon={<Sparkles className="h-5 w-5" />}
              title="Create Your Quiz Event"
              points={[
                'Quick 4‑step wizard',
                'Choose templates or customise rounds',
                'Add fundraising extras & prizes with sponsor recognition'
              ]}
            />
            <StepCard
              number="2"
              icon={<Users className="h-5 w-5" />}
              title="Invite & Engage Supporters"
              points={[
                'Share unique join links/QR codes',
                'Supporters join on their mobiles',
                'Clear roles for Hosts/Admins'
              ]}
            />
            <StepCard
              number="3"
              icon={<DollarSign className="h-5 w-5" />}
              title="Track Donations Clearly"
              points={[
                'Cash, Revolut, and other methods',
                'Admins mark payments received',
                'Extras encourage additional giving'
              ]}
            />
            <StepCard
              number="4"
              icon={<BarChart className="h-5 w-5" />}
              title="Report & Demonstrate Impact"
              points={[
                'Real‑time scores & totals',
                'Reconciliation + CSV/PDF exports',
                'Share outcomes with donors and committees'
              ]}
            />
          </div>
        </div>
      </section>

<OutcomePreview
  eyebrow="Illustrative outcomes"
  title="What success could look like for a charity quiz"
  intro="Based on similar community events and our gameplay design, these are typical ranges you might target on a well-run night."
  bullets={[
    <>Donation uplift of <strong>+20–35%</strong> vs. a standard table quiz</>,
    <><strong>50–80</strong> supporters · <strong>2–4</strong> prizes · <strong>1–3</strong> sponsors</>,
    <>Audit-ready CSV/PDF exports prepared in <strong>minutes</strong></>,
  ]}
  note="Figures are directional only and depend on pricing, attendance, extras uptake, and sponsor support."
/>

      {/* Key Benefits Grid (compliance/reporting emphasis) */}
      <section className="px-4 py-12 bg-gradient-to-r from-rose-50 to-pink-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-indigo-900 text-3xl md:text-4xl font-bold mb-4">Built for Trust and Transparency</h2>
            <p className="text-indigo-900/70 text-lg max-w-3xl mx-auto leading-relaxed">
              Give volunteers clarity and committees confidence, with reports that make impact easy to share.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Clock className="h-5 w-5" />}
              title="Simple Setup for Volunteers"
              desc="Run a professional quiz without extra workload—perfect for small teams."
            />
            <FeatureCard
              icon={<Shield className="h-5 w-5" />}
              title="Clear Governance"
              desc="Roles, audit trails, and exportable records support oversight and accountability."
            />
            <FeatureCard
              icon={<FileText className="h-5 w-5" />}
              title="Audit‑Ready Reporting"
              desc="Reconciliation and CSV/PDF exports help with committee sign‑off and grants."
            />
            <FeatureCard
              icon={<Users className="h-5 w-5" />}
              title="Donor‑Friendly Experience"
              desc="Live totals and simple flows help supporters see their impact."
            />
            <FeatureCard
              icon={<Target className="h-5 w-5" />}
              title="Engaging but Responsible"
              desc="Extras drive participation without adding admin complexity."
            />
            <FeatureCard
              icon={<Award className="h-5 w-5" />}
              title="Sponsor Visibility"
              desc="Thank local partners on‑screen and in post‑event summaries."
            />
          </div>
        </div>
      </section>

      <section className="px-4 py-12 bg-gradient-to-r from-pink-50 to-rose-50">
  <div className="container mx-auto max-w-6xl">
    <div className="text-center mb-12">
      <h2 className="text-indigo-900 text-3xl md:text-4xl font-bold mb-4">Grant-Maker & Governance Friendly</h2>
      <p className="text-indigo-900/70 text-lg max-w-3xl mx-auto leading-relaxed">
        FundRaisely isn’t just fun for supporters, it also helps your treasurer, board, and grant applications with professional reporting.
      </p>
    </div>
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <FeatureCard icon={<FileText className="h-5 w-5" />} title="Grant Application Exports" desc="Download participation summaries to help with funder reporting requirements." />
      <FeatureCard icon={<Shield className="h-5 w-5" />} title="Governance Support" desc="Audit-ready logs make committee sign-off smoother and stress-free." />
      <FeatureCard icon={<TrendingUp className="h-5 w-5" />} title="Impact Visibility" desc="Show supporters and grant-makers exactly how their support made a difference." />
    </div>
  </div>
</section>


      {/* FAQ Section (expanded, charity‑specific) */}
      <section className="px-4 py-12">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-indigo-900 text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-indigo-900/70 text-lg max-w-3xl mx-auto leading-relaxed">
              Practical answers for Charity organisers, volunteers, and treasurers.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <FAQItem
              question="Is this compliant for fundraisers?"
              answer="Quizzes are games of skill. We provide best‑practice guidance and clear reporting to support compliance and audits, this is general guidance, not legal advice."
            />
            <FAQItem
              question="How are payments and donations tracked?"
              answer="Admins mark payments by method (cash,other instant payment options). The reconciliation panel compares expected vs. received across entry and extras."
            />
            <FAQItem
              question="Is donor data secure?"
              answer="We minimise data collection in‑flow and provide clear roles and exports. Please follow your organisation’s data policies."
            />
            <FAQItem
              question="Can we use the exports for committee and grants?"
              answer="Yes, CSV/PDF exports with participation, income by method/purpose, and prize/sponsor logs."
            />
            <FAQItem
              question="What if connectivity is weak?"
              answer="Optimised for mobile data; we share venue tips including hotspot fallback and pacing guidance."
            />
            <FAQItem
              question="Can we integrate with our CRM?"
              answer="Direct integrations are evolving. Use CSV exports for reconciliation/import."
            />
          </div>
        </div>
      </section>

      {/* Related internal links */}
      <section className="px-4 pt-4">
        <div className="container mx-auto max-w-6xl text-sm text-indigo-900/80">
          <p>
            Related: <a href="/quiz/how-it-works" className="underline">How it works</a> ·{' '}
            <a href="/quiz/features" className="underline">Features</a> ·{' '}
            <a href="/quiz/use-cases/clubs" className="underline">Sports clubs</a> ·{' '}
            <a href="/quiz/use-cases/schools" className="underline">Schools</a>
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-12">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-700 to-purple-600 p-8 shadow-lg text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Run Donor‑Trusted Quiz Fundraisers?</h2>
            <p className="text-lg max-w-3xl mx-auto leading-relaxed mb-8 text-indigo-100">
              Give supporters a great night as this is no ordinary quiz, while giving committees a clear report, start in minutes.
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

export default UsecaseCharitiesPage;

