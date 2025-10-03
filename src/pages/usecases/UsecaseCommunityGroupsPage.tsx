import type React from 'react';
import { SEO } from '../../components/SEO';
import { Header } from '../../components/GeneralSite/Header';
import SiteFooter from '../../components/GeneralSite2/SiteFooter';
import { Sparkles, Check, QrCode,  Users, BarChart, Gift } from 'lucide-react';
import OutcomePreview from '../../components/GeneralSite2/OutcomePreview';
import { currencySymbol, formatMoney } from '../../services/currency';

// -----------------------------
// Helpers
// -----------------------------

function getOrigin(): string {
  const env = (import.meta as any)?.env?.VITE_SITE_ORIGIN as string | undefined;
  if (env) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin.replace(/\/$/, '');
  return 'https://fundraisely.ie';
}
function abs(path: string) { const p = path.startsWith('/') ? path : `/${path}`; return `${getOrigin()}${p}`; }

const Bullet: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-3"><Check className="mt-1 h-5 w-5 flex-shrink-0 text-green-600" /><span className="text-indigo-900/80">{children}</span></li>
);

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
            {icon}
            <h3 className="text-indigo-900 text-xl font-bold">{title}</h3>
        </div>
        <p className="mt-2 text-indigo-900/70">{children}</p>
    </div>
);

const UsecaseCommunityGroupsPage: React.FC = () => {
  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
      { '@type': 'ListItem', position: 2, name: 'Use Cases', item: abs('/quiz/use-cases') },
      { '@type': 'ListItem', position: 3, name: 'Community Groups', item: abs('/quiz/use-cases/community-groups') },
    ],
  };
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
        { '@type': 'Question', name: 'How can we customize questions for our local area?', acceptedAnswer: { '@type': 'Answer', text: 'FundRaisely offers flexible quiz creation. You can use our pre-built templates or create your own rounds with questions specific to your community, making the event more personal and engaging.' } },
        { '@type': 'Question', name: 'Is it easy for volunteers to manage?', acceptedAnswer: { '@type': 'Answer', text: 'Absolutely. Our platform is designed to be volunteer-friendly. The 4-step setup wizard and clear host controls mean anyone can run a professional-quality fundraising quiz with minimal training.' } },
        { '@type': 'Question', name: 'Can we use FundRaisely for small community gatherings?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, FundRaisely is perfect for events of all sizes. Our free trial supports up to 20 devices, making it ideal for smaller, more intimate community fundraisers.' } },
        { '@type': 'Question', name: 'How do we handle payments?', acceptedAnswer: { '@type': 'Answer', text: 'Our system is built for real-world community fundraising. You can collect payments via cash or other methods like Revolut, and your admin can easily mark players as paid. The platform then automatically reconciles the finances for you.' } }
    ],
  };

  const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'Community Group Fundraising Quizzes | Easy & Engaging Events | FundRaisely',
      'description': 'Discover how FundRaisely helps community groups raise money with fun, interactive quiz nights. Easy setup, maximum engagement, and great results for your local cause.',
      'url': abs('/quiz/use-cases/community-groups'),
      'breadcrumb': breadcrumbsJsonLd
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <SEO
        title="Community Group Fundraising Quizzes | Easy & Engaging Events | FundRaisely"
        description="Discover how FundRaisely helps community groups raise money with fun, interactive quiz nights. Easy setup, maximum engagement, and great results for your local cause."
        keywords="community fundraising quiz, community group trivia night, fundraising for local community, community event quiz, easy community fundraiser, virtual community quiz, neighborhood quiz night, local charity fundraiser, community engagement quiz, fundraising for social causes"
        structuredData={JSON.stringify(structuredData)}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <Header />

      <section className="relative px-4 pt-12 pb-8">
        <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-purple-300/30 blur-2xl" />
        <div className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-indigo-300/30 blur-2xl" />
        <div className="container relative z-10 mx-auto max-w-6xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-indigo-700 text-sm font-medium">
            <Sparkles className="h-4 w-4" /> For Community Groups
          </span>
          <h1 className="mt-4 bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent text-4xl md:text-6xl font-bold">Unite Your Community with Engaging Fundraising Quizzes</h1>
          <p className="mt-4 max-w-3xl text-indigo-900/70 text-lg md:text-xl">
            Bring your community together and fund local projects with a fun, interactive fundraising quiz. FundRaisely makes it simple for volunteers to host a memorable community event that boosts spirit and your budget.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="/free-trial" className="rounded-xl bg-indigo-700 px-6 py-3 text-white font-semibold shadow-md hover:bg-indigo-800">Run a Free Trial Quiz</a>
            <a href="/pricing" className="rounded-xl bg-white px-6 py-3 text-indigo-700 font-semibold shadow-md hover:bg-indigo-50">See Pricing</a>
          </div>
        </div>
      </section>

      <section className="px-4 pt-6 pb-12">
        <div className="container mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-bold text-indigo-900">The Perfect Fundraising Quiz for Community Groups</h2>
            <p className="text-center mt-2 max-w-2xl mx-auto text-lg text-indigo-900/70">FundRaisely is designed for the heart of our communities, empowering local groups with tools that are simple, effective, and fun.</p>
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <FeatureCard icon={<Users className="h-8 w-8 text-purple-600" />} title="Effortless for Volunteers">
                    Our simple 4-step wizard means anyone can set up a professional fundraising quiz in minutes. No tech skills needed, freeing up your volunteers to focus on what matters: your community.
                </FeatureCard>
                <FeatureCard icon={<BarChart className="h-8 w-8 text-purple-600" />} title="Maximize Your Fundraising">
                    Combine ticket sales with fun, interactive extras. Our platform gives you full control over pricing and provides automated reconciliation reports, making financial tracking transparent and easy.
                </FeatureCard>
                <FeatureCard icon={<Gift className="h-8 w-8 text-purple-600" />} title="Boost Community Spirit">
                    A fundraising quiz is more than just raising money; it's about bringing people together. Create a lively, competitive, and social event that strengthens neighborhood bonds and leaves everyone feeling connected.
                </FeatureCard>
            </div>
        </div>
      </section>

      <section className="bg-white px-4 py-12">
        <div className="container mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-bold text-indigo-900">How It Works: A Simple Path to a Successful Community Fundraiser</h2>
            <div className="mt-8 grid gap-8 md:grid-cols-2">
                <div className="rounded-2xl border border-indigo-100 p-6 shadow-sm">
                    <h3 className="text-xl font-bold text-indigo-900">1. Simple Setup</h3>
                    <p className="mt-2 text-indigo-900/70">Use our Event Setup Wizard to choose your quiz rounds, set ticket prices, and add optional fundraising extras. You can even showcase local sponsors by adding their details to the prizes.</p>
                </div>
                <div className="rounded-2xl border border-indigo-100 p-6 shadow-sm">
                    <h3 className="text-xl font-bold text-indigo-900">2. Easy Player Onboarding</h3>
                    <p className="mt-2 text-indigo-900/70">Players join your community fundraising quiz via a simple link or QR code on their smartphones. Admins can easily track payments, whether by cash or other methods, ensuring a smooth start to your event.</p>
                </div>
                <div className="rounded-2xl border border-indigo-100 p-6 shadow-sm">
                    <h3 className="text-xl font-bold text-indigo-900">3. Engaging Gameplay</h3>
                    <p className="mt-2 text-indigo-900/70">The quiz runs itself with automatic timers, live scoring, and interactive leaderboards. Fundraising extras like 'Freeze' and 'Clue' add another layer of fun and give players more ways to support your cause.</p>
                </div>
                <div className="rounded-2xl border border-indigo-100 p-6 shadow-sm">
                    <h3 className="text-xl font-bold text-indigo-900">4. Transparent Reporting</h3>
                    <p className="mt-2 text-indigo-900/70">After the event, our reconciliation panel gives you a clear overview of funds raised. Export audit-ready reports for your committee, providing full transparency and making future event planning even easier.</p>
                </div>
            </div>
        </div>
      </section>

      <section className="px-4 py-12 bg-gradient-to-r from-purple-50 to-indigo-50">
  <div className="container mx-auto max-w-6xl">
    <div className="text-center mb-12">
      <h2 className="text-indigo-900 text-3xl md:text-4xl font-bold mb-4">Celebrate Local Pride</h2>
      <p className="text-indigo-900/70 text-lg max-w-3xl mx-auto leading-relaxed">
        Community quizzes are more than fundraisers, they’re a chance to celebrate the place you call home.
      </p>
    </div>
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <FeatureCard icon={<Users className="h-6 w-6 text-purple-600" />} title="Neighbourhood Themes">
        Create rounds that highlight your local history, landmarks, or sports heroes.
      </FeatureCard>
      <FeatureCard icon={<Gift className="h-6 w-6 text-purple-600" />} title="Local Business Prizes">
        Showcase small businesses by featuring them as prize sponsors.
      </FeatureCard>
      <FeatureCard icon={<QrCode className="h-6 w-6 text-purple-600" />} title="Community Shout-Outs">
        Use QR codes to link to community projects or upcoming local events.
      </FeatureCard>
    </div>
  </div>
</section>

<OutcomePreview
  eyebrow="Illustrative outcomes"
  title="What success could look like for community groups"
  intro="Small, local quizzes can still create big moments, especially with community or neighbourhood themes and simple extras."
  bullets={[
    <>Funds raised in the range of <strong>{formatMoney(600)}–{formatMoney(1200)}</strong> for smaller gatherings</>,
    <>Attendance of <strong>25–60</strong> with <strong>1–2</strong> local sponsors</>,
    <>Reconciliation and thank-you summary <strong>shared the same evening</strong></>,
  ]}
  note="Actuals vary by venue size, ticket price, extras pricing, and community support."
/>

      <section className="px-4 pt-6 pb-12">
        <div className="container mx-auto max-w-4xl">
            <h2 className="text-center text-3xl font-bold text-indigo-900">Frequently Asked Questions</h2>
            <div className="mt-8 space-y-4">
                <div className="rounded-lg border border-indigo-100 bg-white p-4">
                    <h3 className="font-semibold text-indigo-900">How can we customize questions for our local area?</h3>
                    <p className="mt-1 text-indigo-900/80">FundRaisely offers flexible quiz creation. You can use our pre-built templates and create your own round to include, with questions specific to your community, making the event more personal and engaging.</p>
                </div>
                <div className="rounded-lg border border-indigo-100 bg-white p-4">
                    <h3 className="font-semibold text-indigo-900">Is it easy for volunteers to manage?</h3>
                    <p className="mt-1 text-indigo-900/80">Absolutely. Our platform is designed to be volunteer-friendly. The 4-step setup wizard and clear host controls mean anyone can run a professional-quality fundraising quiz with minimal training.</p>
                </div>
                <div className="rounded-lg border border-indigo-100 bg-white p-4">
                    <h3 className="font-semibold text-indigo-900">Can we use FundRaisely for small community gatherings?</h3>
                    <p className="mt-1 text-indigo-900/80">Yes, FundRaisely is perfect for events of all sizes. Our free trial supports up to 20 playing devices (you choose teams or individuals), making it ideal for smaller, more intimate community fundraisers.</p>
                </div>
                <div className="rounded-lg border border-indigo-100 bg-white p-4">
                    <h3 className="font-semibold text-indigo-900">How do we handle payments?</h3>
                    <p className="mt-1 text-indigo-900/80">Our system is built for real-world community fundraising. You can collect payments via cash or other instant payment methods, and your admin can easily mark players as paid. The platform then automatically reconciles the finances for you.</p>
                </div>
            </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default UsecaseCommunityGroupsPage;
