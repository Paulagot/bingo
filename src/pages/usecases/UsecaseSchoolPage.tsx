// ==========================================
// File: src/pages/quiz/use-cases/UsecaseSchoolPage.tsx
// Purpose: SEO-correct Schools & PTAs page (child-friendly, volunteer-friendly, community impact)
// ==========================================
import type React from 'react';
import {
 QrCode, CreditCard, FileText, PlayCircle, Users, Shield,
  BookOpen, Heart, TrendingUp, Clock, Zap, GraduationCap,  Award
} from 'lucide-react';

import { SEO } from '../../components/SEO';
import { Header } from '../../components/GeneralSite/Header';
import SiteFooter from '../../components/GeneralSite2/SiteFooter';
import OutcomePreview from '../../components/GeneralSite2/OutcomePreview';
import {  formatMoney } from '../../services/currency';

// -----------------------------
// Helpers
// -----------------------------
function getOrigin(): string {
  const env = (import.meta as any)?.env?.VITE_SITE_ORIGIN as string | undefined;
  if (env) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  return 'https://fundraisely.ie';
}
function abs(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${getOrigin()}${p}`;
}

// -----------------------------
// UI atoms
// -----------------------------
// const Bullet: React.FC<{ children: React.ReactNode }> = ({ children }) => (
//   <li className="flex items-start gap-3">
//     <Check className="mt-1 h-5 w-5 flex-shrink-0 text-green-600" />
//     <span className="text-indigo-900/80">{children}</span>
//   </li>
// );

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; desc: string }> = ({ icon, title, desc }) => (
  <div className="rounded-xl border border-blue-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-md">
      {icon}
    </div>
    <h3 className="text-indigo-900 text-lg font-semibold mb-2">{title}</h3>
    <p className="text-indigo-900/70 text-sm">{desc}</p>
  </div>
);

const BenefitCard: React.FC<{ icon: React.ReactNode; title: string; desc: string }> = ({ icon, title, desc }) => (
  <div className="rounded-2xl border border-blue-100 bg-white p-8 shadow-sm text-center hover:shadow-md transition-all duration-300">
    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg mx-auto mb-4">
      {icon}
    </div>
    <h3 className="text-indigo-900 text-xl font-semibold mb-2">{title}</h3>
    <p className="text-indigo-900/70">{desc}</p>
  </div>
);

const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => (
  <div className="rounded-xl border border-blue-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
    <h3 className="text-indigo-900 text-lg font-semibold mb-3">{question}</h3>
    <p className="text-indigo-900/70 leading-relaxed">{answer}</p>
  </div>
);

const UsecaseSchoolPage: React.FC = () => {
  // -----------------------------
  // Structured Data (objects, not strings)
  // -----------------------------
  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
      { '@type': 'ListItem', position: 2, name: 'Use Cases', item: abs('/quiz/use-cases') },
      { '@type': 'ListItem', position: 3, name: 'Schools & PTAs', item: abs('/quiz/use-cases/schools') },
    ],
  };

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'School & PTA Fundraising Quizzes | Easy & Engaging Events | FundRaisely',
    description:
      'Discover how FundRaisely helps schools and PTAs raise money with fun, interactive quiz nights. Easy setup, maximum engagement, and great results for your educational cause.',
    url: abs('/quiz/use-cases/schools'),
    mainEntity: {
      '@type': 'Organization',
      name: 'FundRaisely',
      url: abs('/'),
    },
    about: {
      '@type': 'Thing',
      name: 'School Fundraising Quiz',
      description:
        'Interactive fundraising quiz platform designed specifically for schools and PTAs to raise funds through engaging quiz nights.',
    },
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How can we ensure child-friendly content in our school fundraising quiz?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            "FundRaisely offers pre-loaded family-friendly and child-freindly templates. Simply select the appropriate template during setup, or customise your own quiz questions to suit your school's needs.",
        },
      },
      {
        '@type': 'Question',
        name: 'Is it easy for PTA volunteers to manage a fundraising quiz event?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'Absolutely! Our 4-step setup wizard makes it simple for volunteers with no technical skills. The clear role separation (Host runs the quiz, Admin helps with payments and player management) means multiple volunteers can collaborate easily, reducing pressure on any single person.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do we handle ticket sales and payments for school quiz events?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'FundRaisely supports real-world school fundraising. Collect cash at the door or share instant payment links (like Revolut). Admins simply mark who has paid and the payment method, and our reconciliation system automatically tracks everything with exportable reports perfect for school committees.',
        },
      },
      {
        '@type': 'Question',
        name: 'What about data privacy for students and families?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'Players join with a screen name or team name only; volunteers track payments. We provide secure, professional reporting.',
        },
      },
      {
        '@type': 'Question',
        name: 'How big can our school quiz fundraiser be on the free trial?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'Up to 20 connected devices, ideal for 20 teams or 20 individuals. Upgrades expand capacity and admin seats.',
        },
      },
    ],
  };

  const structuredData = [breadcrumbsJsonLd, webPageJsonLd, faqJsonLd];

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <SEO
        title="School & PTA Fundraising Quizzes | Easy & Engaging Events | FundRaisely"
        description="Discover how FundRaisely helps schools and PTAs raise money with fun, interactive quiz nights. Easy setup, maximum engagement, and great results for your educational cause."
        keywords="school fundraising quiz, PTA quiz fundraiser, school trivia night, fundraising ideas for schools, school event quiz, easy school fundraiser, virtual school quiz, PTA event planning, school community quiz, fundraising for education, quiz night fundraiser, quiz fundraiser, fundraising quiz for parents"
        domainStrategy="geographic"
        structuredData={structuredData}
        image={abs('/og/og-usecase-schools.jpg')}
      />

      <Header />

      {/* Hero Section */}
      <section className="relative px-4 pt-12 pb-8">
        <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-blue-300/30 blur-2xl" />
        <div className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-cyan-300/30 blur-2xl" />
        <div className="container relative z-10 mx-auto max-w-6xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-blue-700 text-sm font-medium">
            <GraduationCap className="h-4 w-4" /> Schools & PTAs
          </span>
          <h1 className="mt-6 mb-6 bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-600 bg-clip-text text-transparent text-4xl md:text-6xl font-bold leading-tight pb-2">
            Transform Your School Fundraising with Engaging Quiz Nights
          </h1>
          <p className="mx-auto mt-6 max-w-4xl text-indigo-900/70 text-lg md:text-xl leading-relaxed">
            Empower your school or PTA with an easy, engaging, and effective fundraising solution. FundRaisely helps
            educational institutions across the UK and Ireland host unforgettable quiz events that captivate your
            community and boost your fundraising.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a href="/free-trial" className="rounded-xl bg-indigo-700 px-6 py-3 text-white font-semibold shadow-md hover:bg-indigo-800 transition-colors">
              Run a Free Trial Quiz
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

      {/* Why FundRaisely Section */}
      <section className="px-4 py-12 bg-gradient-to-r from-blue-50 to-cyan-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-indigo-900 text-3xl md:text-4xl font-bold mb-4">Why FundRaisely is the Smart Choice for School Fundraising</h2>
            <p className="text-indigo-900/70 text-lg max-w-3xl mx-auto leading-relaxed">
              Schools and PTAs face unique challenges, limited volunteer time, budget constraints, and the need for
              child-friendly, inclusive activities. FundRaisely simplifies every step so your quiz is a resounding
              success.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard icon={<Clock className="h-5 w-5" />} title="Effortless Setup" desc="Our intuitive 4-step event setup wizard lets volunteers organise a professional quiz night in minutes." />
            <FeatureCard icon={<Zap className="h-5 w-5" />} title="Maximised Engagement" desc="Gamified extras like “Freeze” and “Robin Hood” keep families entertained and boost fundraising." />
            <FeatureCard icon={<FileText className="h-5 w-5" />} title="Transparent Tracking" desc="Manual payment tracking and reconciliation reports ease the burden on treasurers." />
            <FeatureCard icon={<Users className="h-5 w-5" />} title="Community Building" desc="Bring parents, teachers, and students together for a memorable night that builds school spirit." />
            <FeatureCard icon={<BookOpen className="h-5 w-5" />} title="Tailored Content" desc="Pre-loaded quiz templates to suit different age groups." />
            <FeatureCard icon={<Shield className="h-5 w-5" />} title="Safe & Secure" desc="Minimal data collection and clear roles to support privacy and safeguarding." />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-4 py-12">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-indigo-900 text-3xl md:text-4xl font-bold mb-4">How FundRaisely Makes Your School Quiz a Success</h2>
            <p className="text-indigo-900/70 text-lg max-w-3xl mx-auto leading-relaxed">
              FundRaisely provides all the tools you need to host a dynamic, profitable quiz fundraiser so you can focus on your school’s mission.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-blue-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="text-indigo-900 text-lg font-semibold mb-2">Event Setup Wizard</h3>
              <p className="text-indigo-900/70 text-sm">Configure entry fees, choose quiz templates, and add extras and prizes with guidance.</p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-indigo-900 text-lg font-semibold mb-2">Flexible Roles & Access</h3>
              <p className="text-indigo-900/70 text-sm">Host, Admin, and Player roles keep responsibilities clear and collaboration easy.</p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <QrCode className="h-5 w-5" />
              </div>
              <h3 className="text-indigo-900 text-lg font-semibold mb-2">Seamless Player Onboarding</h3>
              <p className="text-indigo-900/70 text-sm">Students and parents join via unique links or QR codes; admins track payment status.</p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <CreditCard className="h-5 w-5" />
              </div>
              <h3 className="text-indigo-900 text-lg font-semibold mb-2">Interactive Fundraising Extras</h3>
              <p className="text-indigo-900/70 text-sm">Boost donations with optional in-game extras that add excitement without raising entry fees.</p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <PlayCircle className="h-5 w-5" />
              </div>
              <h3 className="text-indigo-900 text-lg font-semibold mb-2">Host Game Controls</h3>
              <p className="text-indigo-900/70 text-sm">Automatic timers, smooth question flow, and leaderboards for a professional experience.</p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="text-indigo-900 text-lg font-semibold mb-2">Comprehensive Reporting</h3>
              <p className="text-indigo-900/70 text-sm">Post-event income reconciliation, prize logs, and engagement data with exportable reports.</p>
            </div>
          </div>
        </div>
      </section>

      <OutcomePreview
  eyebrow="Illustrative outcomes"
  title="What success could look like for schools & PTAs using FundRaisely"
  intro="Family-friendly rounds and simple roles help PTAs run repeatable events that build school spirit and budget."
  bullets={[
    <>Total raised of <strong>{formatMoney(800)}–{formatMoney(600)}</strong> for a single evening</>,
    <>Participation from <strong>40–80</strong> players across class years</>,
    <>Exportable finance summary for <strong>committee sign-off</strong></>,
  ]}
  note="Outcomes depend on pricing, participation, extras uptake, and prize/sponsor mix."
/>


      {/* Benefits Section */}
      <section className="px-4 py-12 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-indigo-900 text-3xl md:text-4xl font-bold mb-4">Unlock More Funds for Your School Community</h2>
            <p className="text-indigo-900/70 text-lg max-w-3xl mx-auto leading-relaxed">
              All funds raised directly supports vital programmes and resources. FundRaisely helps you turn quiz nights into meaningful impact.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <BenefitCard icon={<TrendingUp className="h-6 w-6" />} title="Increased Donations" desc="Gamified experiences encourage participation and additional giving." />
            <BenefitCard icon={<Heart className="h-6 w-6" />} title="Volunteer Empowerment" desc="Simple tools reduce workload for PTAs and staff." />
            <BenefitCard icon={<Award className="h-6 w-6" />} title="Enhanced Reputation" desc="Well-organised, fun events reflect positively on your school." />
            <BenefitCard icon={<Shield className="h-6 w-6" />} title="Sustainable Fundraising" desc="Easy-to-repeat events and clear reporting build reliable revenue." />
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      {/* <section className="px-4 py-12">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl border border-blue-100 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg">
                <Target className="h-6 w-6" />
              </div>
              <h2 className="text-indigo-900 text-3xl font-bold">Perfect For School Fundraising Goals</h2>
            </div>
            <p className="text-indigo-900/80 mb-6 leading-relaxed text-lg">
              Imagine new playground equipment, updated classroom technology, or enriching extracurricular activities—all powered by a great quiz night.
            </p>
            <ul className="space-y-3 mb-6">
              <Bullet>Fund classroom resources—from interactive whiteboards to library books</Bullet>
              <Bullet>Raise money for educational trips (e.g., Year 6 trip)</Bullet>
              <Bullet>Support sports programmes with new kits and equipment</Bullet>
              <Bullet>Upgrade playground equipment and outdoor learning spaces</Bullet>
              <Bullet>Finance extracurricular programmes like music and drama</Bullet>
              <Bullet>Build reserves for larger capital projects</Bullet>
            </ul>
          </div>
        </div>
      </section> */}

      {/* Safety & Compliance Section */}
      <section className="px-4 py-12 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-indigo-900 text-3xl md:text-4xl font-bold mb-4">Safety, Compliance, and Child-Friendly Content</h2>
            <p className="text-indigo-900/70 text-lg max-w-3xl mx-auto leading-relaxed">
              We understand schools prioritise safety and wellbeing. FundRaisely is designed with privacy and appropriateness in mind.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-blue-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="text-indigo-900 text-lg font-semibold mb-2">Data Privacy</h3>
              <p className="text-indigo-900/70 text-sm">Strict standards and minimal data collection support safer events.</p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="text-indigo-900 text-lg font-semibold mb-2">Financial Transparency</h3>
              <p className="text-indigo-900/70 text-sm">Reconciliation and exports assist with accountability and audits.</p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="text-indigo-900 text-lg font-semibold mb-2">Content Suitability</h3>
              <p className="text-indigo-900/70 text-sm">Family-friendly content available now;</p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-indigo-900 text-lg font-semibold mb-2">Volunteer Support</h3>
              <p className="text-indigo-900/70 text-sm">A streamlined process to reduce admin and risks for helpers.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-4 py-12">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-indigo-900 text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-indigo-900/70 text-lg max-w-3xl mx-auto leading-relaxed">
              Answers to common questions from PTAs, teachers, and school leaders.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <FAQItem
              question="How can we ensure child-friendly content in our school fundraising quiz?"
              answer="FundRaisely offers pre-loaded family-friendly and child-freindly templates. Simply select the appropriate template during setup, or customise your own quiz questions to suit your school's needs. "
            />
            <FAQItem
              question="Is it easy for PTA volunteers to manage a fundraising quiz event?"
              answer="Yes, our 4-step setup wizard and clear role separation (Host/Admin/Player) make collaboration easy."
            />
            <FAQItem
              question="How do we handle ticket sales and payments for school quiz events?"
              answer="Collect cash at the door or share instant payment links (like Revolut). Admins mark method; reconciliation handles the rest."
            />
            <FAQItem
              question="What about data privacy for students and families?"
              answer="Players join with a screen name or team name only; volunteers track payments. We provide secure, professional reporting."
            />
            <FAQItem
              question="How big can our school quiz be on the free trial?"
              answer="Up to 20 connected devices, ideal for 20 teams or 20 individuals. Upgrades expand capacity and admin seats."
            />
            <FAQItem
              question="Can we run in-person or online?"
              answer="FundRaisely supports mobile-led in-person events, soon online/hybrid too."
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
            <a href="/quiz/use-cases/charities" className="underline">Charities</a> ·{' '}
            <a href="/quiz/use-cases/clubs" className="underline">Clubs</a> ·{' '}
            <a href="/quiz/use-cases/community-groups" className="underline">Community groups</a>
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-12">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-600 p-8 shadow-lg text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Boost Your School’s Fundraising?</h2>
            <p className="text-lg max-w-3xl mx-auto leading-relaxed mb-8 text-blue-100">
              Make fundraising fun, efficient, and impactful. Whether it’s a school-wide quiz with the kids or a PTA night with the parents, FundRaisely makes it easy.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="/free-trial" className="rounded-xl bg-white px-8 py-4 text-indigo-700 font-semibold shadow-md hover:bg-blue-50 transition-colors text-lg">
                Run a Free Trial Quiz
              </a>
                  {/* New: Founding Partner CTA */}
              <a
                href="/founding-partners"
                className="rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-8 py-4 text-white font-bold shadow-lg hover:scale-105 hover:shadow-xl transition"
              >
                Become a Founding Partner
              </a>
              <a href="/pricing" className="rounded-xl bg-blue-800 px-8 py-4 text-white font-semibold shadow-md hover:bg-blue-900 border border-blue-600 transition-colors text-lg">
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

export default UsecaseSchoolPage;

