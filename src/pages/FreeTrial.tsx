import type React from 'react';
import { Check, Shield, Users, Sparkles, BadgeCheck, CreditCard, PlayCircle, Clock, Star, Zap } from 'lucide-react';
import { SEO } from '../components/SEO';

const ListItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-3">
    <Check aria-hidden="true" className="mt-1 h-5 w-5 flex-shrink-0 text-green-600" />
    <span className="text-indigo-900/80">{children}</span>
  </li>
);

const FreeTrial: React.FC = () => {
  // --------- Domain-aware values for JSON-LD ---------
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://fundraisely.co.uk';
  const host =
    typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : 'fundraisely.co.uk';
  const currency = host.includes('co.uk') ? 'GBP' : 'EUR';

  // --------- Structured Data (passed to <SEO />) ---------
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What do I get with the free trial?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'You get starter credits (4 during beta, reducing to 2 post-beta), the 4-step setup wizard, prebuilt templates or custom rounds, General/Wipeout/Speed round types plus tiebreakers, fundraising extras (Clue, Freeze, RobinHood/RobPoints, Restore), admin seats, player management, automatic reconciliation once marked paid, and exportable gameplay and payment reports.',
        },
      },
      {
        '@type': 'Question',
        name: 'Do I need a credit card to start?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'No — create a free account and claim your trial credits without a card. Upgrade anytime for more capacity and features.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is this for in-person, virtual, or hybrid quiz nights?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'Today the free trial is designed for in-person events with manual payment collection. Hosts can accept cash or share an instant payment link (e.g., Revolut), and admins mark each player as paid and select the method. From there, reconciliation updates automatically. Virtual/hybrid flows with integrated online payments are on the roadmap.',
        },
      },
      {
        '@type': 'Question',
        name: 'How many players can we run with on the free trial?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'Up to 20 connected player devices in the free trial — suitable for real, full fundraising events. You can upgrade for larger events and more admin seats.',
        },
      },
      {
        '@type': 'Question',
        name: 'How are payments handled?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'Payments are collected in person (cash or an instant payment link, e.g., Revolut). Inside the dashboard, an admin marks each player as paid and selects the payment method. From there, reconciliation updates automatically and you can export an audit-ready report.',
        },
      },
    ],
  };

  const softwareJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'FundRaisely — Fundraising Quiz',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      name: 'Free Trial',
      price: '0',
      priceCurrency: currency, // GBP for .co.uk, EUR for .ie
      url: `${origin}/free-trial`,
      availability: 'https://schema.org/InStock',
    },
  };

  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
      { '@type': 'ListItem', position: 2, name: 'Free Trial', item: `${origin}/free-trial` },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-white px-3 py-2 rounded-md shadow"
      >
        Skip to content
      </a>

      <SEO
        title="Fundraising Quiz Free Trial | FundRaisely"
        description="Run a real fundraising quiz night in minutes. Try FundRaisely's free trial with live scoring, admin controls, and exportable audit-ready reports."
        keywords="free trial fundraising quiz, quiz fundraiser software, charity quiz night platform"
        ukKeywords="free trial fundraising quiz UK, charity quiz software UK, fundraiser platform Britain"
        ieKeywords="free trial fundraising quiz Ireland, charity quiz software Ireland, fundraiser platform Ireland"
        domainStrategy="geographic"
        type="website"
        structuredData={[faqJsonLd, softwareJsonLd, breadcrumbsJsonLd]}
      />

      {/* Hero */}
      <section className="relative px-4 pt-10 pb-12">
        <div aria-hidden="true" className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-purple-300/30 blur-2xl" />
        <div aria-hidden="true" className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-indigo-300/30 blur-2xl" />

        <div className="container mx-auto max-w-6xl text-center relative z-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-green-700 text-sm font-bold border border-green-200">
            <Sparkles aria-hidden="true" className="h-4 w-4" /> FREE TRIAL — No Credit Card Needed
          </span>

          <h1 className="mt-6 bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent text-4xl md:text-6xl font-bold leading-tight">
            Fundraising Quiz <span className="whitespace-nowrap">Free Trial</span>
          </h1>

          <h2 className="mt-4 text-indigo-800 text-xl md:text-2xl font-semibold leading-snug">
            Run a real fundraising quiz night — set up in minutes, play on mobile, export audit-ready reports
          </h2>

          <p className="mx-auto mt-4 max-w-3xl text-indigo-900/70 text-lg md:text-xl">
            4-step wizard, prebuilt templates or custom rounds, live scoring & leaderboards, and audit-ready reporting.
            Collect cash or share an instant payment link; once an admin marks each player as paid and selects the method,
            reconciliation updates automatically.
          </p>

          {/* Enhanced CTA section */}
          <div className="mt-10 bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-indigo-100 shadow-xl">
            <div className="flex flex-wrap justify-center gap-4 mb-6">
              <a
                href="/signup?source=free-trial&returnTo=/quiz/create-fundraising-quiz"
                className="rounded-xl bg-indigo-700 px-8 py-4 text-white font-bold shadow-lg hover:bg-indigo-800 hover:scale-105 transition-all duration-300 text-lg"
              >
                Start Free Trial Now
              </a>

              <a
                href="/quiz/demo"
                className="rounded-xl bg-white px-8 py-4 text-indigo-700 font-bold shadow-lg hover:bg-indigo-50 hover:scale-105 transition-all duration-300 inline-flex items-center gap-2 border border-indigo-200"
              >
                <PlayCircle aria-hidden="true" className="h-5 w-5" /> Watch Demo
              </a>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="inline-flex items-center gap-2 text-indigo-900">
                <BadgeCheck aria-hidden="true" className="h-4 w-4 text-green-600" /> No setup fees
              </div>
              <div className="inline-flex items-center gap-2 text-indigo-900">
                <CreditCard aria-hidden="true" className="h-4 w-4 text-green-600" /> No credit card
              </div>
              <div className="inline-flex items-center gap-2 text-indigo-900">
                <Users aria-hidden="true" className="h-4 w-4 text-green-600" /> Up to 20 devices
              </div>
              <div className="inline-flex items-center gap-2 text-indigo-900">
                <Clock aria-hidden="true" className="h-4 w-4 text-green-600" /> 4 trial credits
              </div>
            </div>
          </div>

          {/* Target audience callout */}
          <div className="mt-8 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-6 shadow-sm">
            <h3 className="text-indigo-900 mb-2 text-xl font-bold">Built for in-person fundraisers</h3>
            <p className="text-indigo-900/70 text-lg">
              Perfect for <strong>schools, PTAs, sports clubs, community groups, and charities</strong> running quiz nights with
              on-the-night payments and transparent reporting.
            </p>
          </div>
        </div>
      </section>

      {/* What's included - Dark section */}
      <section aria-labelledby="features-heading" className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 py-20">
        <div aria-hidden="true" className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-purple-400/20 blur-3xl" />
        <div aria-hidden="true" className="absolute -right-16 top-32 h-56 w-56 rounded-full bg-indigo-400/20 blur-3xl" />

        <div className="container mx-auto max-w-6xl px-4 relative z-10">
          <div className="mb-12 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-2 text-white/90 text-sm font-medium border border-white/20">
              <Star aria-hidden="true" className="h-4 w-4" /> Complete Feature Set
            </span>

            <h2 id="features-heading" className="text-white mb-4 text-3xl md:text-4xl font-bold mt-6">
              What's included in your{' '}
              <span className="bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">free trial</span>
            </h2>
            <p className="text-white/80 mx-auto max-w-2xl text-lg">
              Run a complete, real fundraising event end-to-end with these features enabled.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
                <Users aria-hidden="true" className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-white mb-2 text-lg font-bold">4-Step Setup Wizard</h3>
              <p className="text-white/80">Create your event in minutes — ticketing, extras, capacity, and room link/QR.</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
                <Shield aria-hidden="true" className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-white mb-2 text-lg font-bold">Templates or Custom</h3>
              <p className="text-white/80">Pick from prebuilt quiz templates or customise rounds and questions.</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg">
                <Zap aria-hidden="true" className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-white mb-2 text-lg font-bold">Round Types + Tiebreakers</h3>
              <p className="text-white/80">General Trivia, Wipeout, and Speed Round — plus ready-to-run tiebreakers.</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 shadow-lg">
                <Sparkles aria-hidden="true" className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-white mb-2 text-lg font-bold">Fundraising Extras</h3>
              <p className="text-white/80">Clue, Freeze, RobinHood (RobPoints), Restore — boost engagement and funds.</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-indigo-600 shadow-lg">
                <Users aria-hidden="true" className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-white mb-2 text-lg font-bold">Admin & Player Management</h3>
              <p className="text-white/80">Add admins (2 on trial, 10 on premium). Invite players by link or QR and manage attendance.</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-green-600 shadow-lg">
                <CreditCard aria-hidden="true" className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-white mb-2 text-lg font-bold">Payment & Reconciliation</h3>
              <p className="text-white/80">Collect cash or share instant payment links. Mark players paid — reconciliation updates automatically and exports audit-ready reports.</p>
            </div>
          </div>

          {/* CTA in dark section */}
          <div className="text-center mt-12">
            <a
              href="/signup?source=free-trial&returnTo=/quiz/create-fundraising-quiz"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-indigo-900 font-bold shadow-xl hover:bg-indigo-50 hover:scale-105 transition-all duration-300"
            >
              Start Your Free Trial
              <div className="h-2 w-2 rounded-full bg-indigo-600" />
            </a>
          </div>
        </div>
      </section>

      {/* What you'll be able to do - Light section */}
      <section id="capabilities" className="px-4 py-16">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-indigo-900 mb-4 text-3xl font-bold">Complete end-to-end fundraising solution</h2>
            <p className="text-indigo-900/70 mx-auto max-w-2xl text-lg">
              Everything you need to run successful fundraising quiz nights from start to finish.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-indigo-100 p-8 shadow-lg">
            <h3 className="text-indigo-900 mb-6 text-xl font-semibold">You'll be able to:</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <ul className="space-y-3">
                <ListItem>Set ticket price and enable fundraising extras</ListItem>
                <ListItem>Invite teams with a join link or QR code</ListItem>
                <ListItem>Collect payments (cash or instant link) and mark paid + method</ListItem>
              </ul>
              <ul className="space-y-3">
                <ListItem>Run the quiz live with mobile play, auto-scoring, and leaderboards</ListItem>
                <ListItem>Export transparent results and payment reconciliation reports</ListItem>
                <ListItem>Support up to 20 connected player devices</ListItem>
              </ul>
            </div>
          </div>

          {/* Coming soon section */}
          <div className="mt-8 rounded-2xl bg-indigo-50/60 p-8 border border-indigo-100">
            <h3 className="text-indigo-900 mb-4 text-xl font-bold">Coming soon</h3>
            <ul className="space-y-2">
              <ListItem>Integrated online payments and automatic reconciliation</ListItem>
              <ListItem>Virtual and hybrid event flows</ListItem>
              <ListItem>Expanded capacity options and admin seats</ListItem>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ - Light section */}
      <section id="faq" className="px-4 py-16">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-indigo-900 mb-4 text-3xl font-bold">Free trial — FAQs</h2>
            <p className="text-indigo-900/70 mx-auto max-w-2xl">Quick answers so you can get started fast.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-indigo-100/50">
              <h3 className="text-indigo-900 mb-2 text-lg font-semibold">Do I need a credit card?</h3>
              <p className="text-indigo-900/70">No — create a free account and claim your credits without a card.</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg border border-indigo-100/50">
              <h3 className="text-indigo-900 mb-2 text-lg font-semibold">Is it for in-person only?</h3>
              <p className="text-indigo-900/70">
                Yes for now — it's optimized for in-person events. Collect cash or use an instant payment link; once admins mark paid
                and choose the method, reconciliation is automatic and exportable. Virtual/hybrid with built-in online payments is on
                the roadmap.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg border border-indigo-100/50">
              <h3 className="text-indigo-900 mb-2 text-lg font-semibold">How many devices can connect?</h3>
              <p className="text-indigo-900/70">Up to 20 player devices on the trial. Upgrade for more capacity.</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg border border-indigo-100/50">
              <h3 className="text-indigo-900 mb-2 text-lg font-semibold">What's included?</h3>
              <p className="text-indigo-900/70">
                4-step wizard; templates or custom; General/Wipeout/Speed + tiebreakers; fundraising extras; admins & player
                management; automatic reconciliation once marked paid; gameplay and payment reports.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">Ready to start your free trial?</h3>
            <p className="mb-6 text-white/90">Join thousands of organizations already using FundRaisely for their fundraising events.</p>
            <a
              href="/signup?source=free-trial&returnTo=/quiz/create-fundraising-quiz"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-indigo-700 font-bold shadow-lg hover:bg-indigo-50 hover:scale-105 transition-all duration-300"
            >
              Create Free Account Now
              <div className="h-2 w-2 rounded-full bg-indigo-600" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FreeTrial;




