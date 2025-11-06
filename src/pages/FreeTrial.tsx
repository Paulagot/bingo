import React from 'react';
import { Check, Shield, Users, Sparkles, BadgeCheck, CreditCard, PlayCircle, Clock, Star, Zap } from 'lucide-react';
import { SEO } from '../components/SEO';
import SiteFooter from '../components/GeneralSite2/SiteFooter';

const ListItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-3">
    <Check aria-hidden="true" className="mt-1 h-5 w-5 flex-shrink-0 text-green-600" />
    <span className="text-indigo-900/80">{children}</span>
  </li>
);

const FreeTrial: React.FC = () => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://fundraisely.co.uk';
  const host = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : 'fundraisely.co.uk';
  const currency = host.includes('co.uk') ? 'GBP' : 'EUR';
  const currencySymbol = currency === 'GBP' ? '£' : '€';

  const DEVICE_LIMIT = 20;
  const IND_ENTRY_FEE = 10;
  const TEAM_ENTRY_FEE = 40;
  const EXTRAS_PRICE = 15;
  const EXTRAS_UPTAKE = 0.7;
  const TEAM_SIZE_MIN = 3;
  const TEAM_SIZE_MAX = 6;

  const aEntries = DEVICE_LIMIT * IND_ENTRY_FEE;
  const aExtras = Math.round(DEVICE_LIMIT * EXTRAS_UPTAKE) * EXTRAS_PRICE;
  const aTotal = aEntries + aExtras;

  const bTeams = DEVICE_LIMIT;
  const bEntries = bTeams * TEAM_ENTRY_FEE;
  const bExtras = Math.round(bTeams * EXTRAS_UPTAKE) * EXTRAS_PRICE;
  const bTotal = bEntries + bExtras;

  const fmt = (n: number) => `${currencySymbol}${n.toLocaleString()}`;

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What do I get with the free trial?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'You get 3 free quiz credits, the 4-step setup wizard, prebuilt templates or custom rounds, General/Wipeout/Speed round types plus tiebreakers, fundraising extras (Clue, Freeze, RobinHood/RobPoints, Restore), 2 admin seats, player management, automatic reconciliation once marked paid, audit-ready gameplay and payment reports, and basic sponsor showcase features.',
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
      priceCurrency: currency,
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
        description="Spin up a magical quiz night in minutes. Try FundRaisely's free trial with live play, fundraising extras, admin controls, and exportable audit-ready reports."
        keywords="free trial fundraising quiz, quiz fundraiser software, charity quiz night platform"
        ukKeywords="free trial fundraising quiz UK, charity quiz software UK, fundraiser platform Britain"
        ieKeywords="free trial fundraising quiz Ireland, charity quiz software Ireland, fundraiser platform Ireland"
        domainStrategy="geographic"
        type="website"
        structuredData={[faqJsonLd, softwareJsonLd, breadcrumbsJsonLd]}
          breadcrumbs={[
    { name: 'Home', item: '/' },
    { name: 'Free Trial', item: '/free-trial' },
  ]}
      />

      {/* Hero */}
      <section className="relative px-4 pt-10 pb-12">
        <div aria-hidden="true" className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-purple-300/30 blur-2xl" />
        <div aria-hidden="true" className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-indigo-300/30 blur-2xl" />

        <div className="container mx-auto max-w-6xl text-center relative z-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-green-700 text-sm font-bold border border-green-200">
            <Sparkles aria-hidden="true" className="h-4 w-4" /> FREE TRIAL — No Credit Card Needed
          </span>

          <h1 className="mt-4 pb-2 bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent text-4xl md:text-6xl font-bold">
            Fundraising Quiz <span className="whitespace-nowrap">Free Trial</span>
          </h1>

          <h2 className="mt-4 text-indigo-800 text-xl md:text-2xl font-semibold leading-snug">
            Set up in minutes, play on mobile, reconcile in a click — a little bit of showtime, a lot of transparency
          </h2>

          <p className="mx-auto mt-4 max-w-3xl text-indigo-900/70 text-lg md:text-xl">
            4-step wizard, prebuilt templates or custom rounds, live scoring & leaderboards, and audit-ready reporting.
            Collect cash or share an instant payment link; once an admin marks each player as paid and selects the method,
            reconciliation updates automatically.
          </p>

          {/* Enhanced CTA section */}
          <div className="mt-12 text-center bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">Ready to start your free trial?</h3>
            <p className="mb-6 text-white/90 text-lg max-w-2xl mx-auto">
              Run a full, real fundraiser with transparent reconciliation, and a bit of sparkle and lots of FUN.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 mb-6">
              <a
                href="/signup?source=free-trial&returnTo=/quiz/create-fundraising-quiz"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-indigo-700 font-bold shadow-lg hover:bg-indigo-50 hover:scale-105 transition-all duration-300 text-lg"
              >
                Start Free Trial Now
                <div className="h-2 w-2 rounded-full bg-indigo-600" />
              </a>

              <a
                href="/quiz/demo"
                className="inline-flex items-center gap-2 rounded-xl bg-transparent px-8 py-4 text-white font-bold shadow-lg hover:bg-white/10 hover:scale-105 transition-all duration-300 border border-white/30 text-lg"
              >
                <PlayCircle className="h-5 w-5" /> Watch Demo
              </a>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6">
              <div className="inline-flex items-center gap-2 text-white/90">
                <BadgeCheck className="h-4 w-4 text-emerald-300" /> No setup fees
              </div>
              <div className="inline-flex items-center gap-2 text-white/90">
                <CreditCard className="h-4 w-4 text-emerald-300" /> No credit card
              </div>
              <div className="inline-flex items-center gap-2 text-white/90">
                <Users className="h-4 w-4 text-emerald-300" /> Up to 20 devices
              </div>
              <div className="inline-flex items-center gap-2 text-white/90">
                <Clock className="h-4 w-4 text-emerald-300" /> 3 FULL credits
              </div>
            </div>

            <div className="rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white inline-flex items-start gap-3 text-sm text-left max-w-3xl mx-auto">
              <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                <strong>No scheduling on the free trial:</strong> create your quiz about <strong>30 minutes before doors open</strong>, invite teams, and you're ready to go.
              </span>
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
              <h3 className="text-white mb-2 text-lg font-bold">Templates</h3>
              <p className="text-white/80">Pick from prebuilt quiz templates.</p>
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
              <p className="text-white/80">2 admin seats on trial. Invite players by link or QR and manage attendance.</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-green-600 shadow-lg">
                <CreditCard aria-hidden="true" className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-white mb-2 text-lg font-bold">Payments & Reconciliation</h3>
              <p className="text-white/80">Collect cash or share instant links. Mark paid once — exports are audit-ready.</p>
            </div>
          </div>

          <div className="mt-10 mx-auto max-w-4xl bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h4 className="text-white mb-3 font-semibold">Also included on the free trial</h4>
            <ul className="grid gap-3 md:grid-cols-2">
              <li className="flex items-start gap-2 text-white/85"><Check className="h-4 w-4 mt-1 text-green-300" /> Basic sponsor showcase features</li>
              <li className="flex items-start gap-2 text-white/85"><Check className="h-4 w-4 mt-1 text-green-300" /> Immediate launch (no scheduling)</li>
              <li className="flex items-start gap-2 text-white/85"><Check className="h-4 w-4 mt-1 text-green-300" /> Audit-ready post-event reporting</li>
              <li className="flex items-start gap-2 text-white/85"><Check className="h-4 w-4 mt-1 text-green-300" /> Community support</li>
            </ul>
          </div>

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

      {/* What you'll be able to do */}
      <section id="capabilities" className="px-4 py-16">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-indigo-900 mb-4 text-3xl font-bold">Complete end-to-end fundraising flow</h2>
            <p className="text-indigo-900/70 mx-auto max-w-2xl text-lg">
              Everything you need to run a memorable, accountable quiz night — from setup to final tally.
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
        </div>
      </section>

      {/* How to get the most */}
      <section id="how-to" className="px-4 py-16">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-indigo-900 mb-4 text-3xl font-bold">How to get the most from your free trial</h2>
            <p className="text-indigo-900/70 mx-auto max-w-2xl text-lg">
              Three credits, two wins: one rehearsal, two real fundraisers.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-white rounded-2xl border border-indigo-100 p-8 shadow-lg">
              <h3 className="text-indigo-900 mb-2 text-xl font-semibold">1) Use your first credit for a practice run</h3>
              <p className="text-indigo-900/70 mb-4">
                Set up the quiz, add a couple of teams, and demo the flow with fellow volunteers.
                Try each fundraising extra (Clue, Freeze, RobinHood/RobPoints, Restore), mark payments, and export a report.
              </p>
              <ul className="space-y-2">
                <ListItem>Create the event ~30 minutes before your rehearsal start</ListItem>
                <ListItem>Share the QR link and join on mobile</ListItem>
                <ListItem>Test tiebreakers and the scoreboard reveal</ListItem>
              </ul>
            </div>

            <div className="bg-white rounded-2xl border border-indigo-100 p-8 shadow-lg">
              <h3 className="text-indigo-900 mb-2 text-xl font-semibold">2) Use your second credit for the live fundraiser</h3>
              <p className="text-indigo-900/70 mb-4">
                Open the room half an hour before doors, welcome teams as they arrive, and let the
                extras work their magic. You'll finish the night with an <strong>audit-ready total</strong>.
              </p>
              <ul className="space-y-2">
                <ListItem>Create the quiz ~30 minutes before doors open (no scheduling on trial)</ListItem>
                <ListItem>Seat teams, confirm payments, and start the show</ListItem>
                <ListItem>Download reconciliation & results before you pack up</ListItem>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Assumptions Calculator */}
      <section id="assumptions" className="px-4 pb-16">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl border border-indigo-100 bg-white p-8 shadow-lg">
            <h3 className="text-indigo-900 mb-3 text-2xl font-bold">What could you raise with the free trial?</h3>
            <p className="text-indigo-900/70 mb-6">
              Two simple scenarios using {DEVICE_LIMIT} devices and a {Math.round(EXTRAS_UPTAKE * 100)}% uptake on extras at {currencySymbol}{EXTRAS_PRICE}.
              Actuals vary — this is a planning guide.
            </p>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-md">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-indigo-900/70">Scenario A</div>
                    <div className="text-lg font-bold text-indigo-900">20 Individuals</div>
                  </div>
                </div>

                <ul className="space-y-1 text-indigo-900/80 text-sm">
                  <li>Entry: {DEVICE_LIMIT} × {currencySymbol}{IND_ENTRY_FEE} = <strong>{fmt(aEntries)}</strong></li>
                  <li>Extras: {Math.round(DEVICE_LIMIT * EXTRAS_UPTAKE)} × {currencySymbol}{EXTRAS_PRICE} = <strong>{fmt(aExtras)}</strong></li>
                </ul>
                <div className="mt-3 text-indigo-900 font-extrabold">≈ {fmt(aTotal)}</div>

                <p className="mt-3 text-xs text-indigo-900/60">
                  Tip: If you expect a family audience, encourage small teamlets to still pay individually (more extras purchased, more fun).
                </p>
              </div>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-md">
                    <Star className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-indigo-900/70">Scenario B</div>
                    <div className="text-lg font-bold text-indigo-900">20 Teams ({TEAM_SIZE_MIN}–{TEAM_SIZE_MAX} players)</div>
                  </div>
                </div>

                <ul className="space-y-1 text-indigo-900/80 text-sm">
                  <li>Entry: {bTeams} × {currencySymbol}{TEAM_ENTRY_FEE} = <strong>{fmt(bEntries)}</strong></li>
                  <li>Extras (per team): {Math.round(bTeams * EXTRAS_UPTAKE)} × {currencySymbol}{EXTRAS_PRICE} = <strong>{fmt(bExtras)}</strong></li>
                </ul>
                <div className="mt-3 text-indigo-900 font-extrabold">≈ {fmt(bTotal)}</div>

                <p className="mt-3 text-xs text-indigo-900/60">
                  Tip: Keep the extras simple — one price, one click — so team captains don't hesitate at the table.
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs text-indigo-900/60">
              Notes: Figures are illustrative. Local rules and your pricing strategy may affect outcomes. Always follow guidance for any
              regulated activities in your area.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-4 pb-16">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-indigo-900 mb-4 text-3xl font-bold">Fundraising Quiz Free trial — FAQs</h2>
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
                Yes for now, it's optimised for in-person events. Collect cash or use an instant payment link; once admins mark paid
                and choose the method, reconciliation is automatic and exportable.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg border border-indigo-100/50">
              <h3 className="text-indigo-900 mb-2 text-lg font-semibold">How many devices can connect?</h3>
              <p className="text-indigo-900/70">Up to 20 player devices on the trial. Upgrade for more capacity.</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg border border-indigo-100/50">
              <h3 className="text-indigo-900 mb-2 text-lg font-semibold">Can I schedule a quiz?</h3>
              <p className="text-indigo-900/70">
                Not on the free trial. Create your quiz about 30 minutes before doors open, invite teams, and go.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">Ready to start your free trial?</h3>
            <p className="mb-6 text-white/90">Run a full, real fundraiser with transparent reconciliation, and a bit of sparkle and lots of FUN.</p>
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
      
      <SiteFooter />
    </div>
  );
};

export default FreeTrial;
