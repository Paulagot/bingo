import type React from 'react';
import { SEO } from '../components/SEO';
import { Header } from '../components/GeneralSite2/Header';
import { Suspense, lazy } from 'react';
import {
  BadgeCheck, Check, Sparkles, PlayCircle, Users,ChevronRight, TrendingUp, Shield, Award, Phone, Mail
} from 'lucide-react';
import { detectRegionFromUrl, currencyISO, formatMoney } from '../services/currency';

const SiteFooter = lazy(() => import('../components/GeneralSite2/SiteFooter'));

/** Absolute URL helpers for JSON-LD */
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

function FoundingPartnerPromo() {
  return (
    <div className="px-4 pb-6">
      <div className="container mx-auto max-w-6xl">
        <div className="rounded-2xl border border-green-200 bg-green-50/60 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white border text-green-700">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold text-green-900">
                Founding Partner pricing is opening soon
              </div>
              <div className="text-green-900/80 text-sm">
                Lock in our lowest-ever monthly rate for life. Limited to the first 100 clubs & charities.
              </div>
            </div>
          </div>
          <a
            href="/founding-partners"
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-white font-semibold shadow-sm hover:bg-green-700"
          >
            Learn more
            <ChevronRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}


const Bullet: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-3">
    <Check aria-hidden="true" className="mt-1 h-5 w-5 flex-shrink-0 text-green-600" />
    <span className="text-indigo-900/80">{children}</span>
  </li>
);

// const TestimonialCard: React.FC<{ quote: string; author: string; organization: string }> = ({ quote, author, organization }) => (
//   <div className="bg-white rounded-xl p-6 shadow-sm border border-indigo-100/60">
//     <div className="flex items-center gap-1 mb-3">
//       {[...Array(5)].map((_, i) => (
//         <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
//       ))}
//     </div>
//     <blockquote className="text-indigo-900/80 mb-4">"{quote}"</blockquote>
//     <div className="text-sm">
//       <div className="font-semibold text-indigo-900">{author}</div>
//       <div className="text-indigo-900/60">{organization}</div>
//     </div>
//   </div>
// );

const PricingPage: React.FC = () => {
  // ---------------- Region-aware pricing ----------------
  // EDIT THESE to your real UK/IE prices:
  const PRICES = {
    UK: { eventPass: 12, proMonthly: 20, typicalMin: 500, typicalMax: 2500, hostLow: 300, hostHigh: 750 },
    IE: { eventPass: 15, proMonthly: 25, typicalMin: 500, typicalMax: 2500, hostLow: 300, hostHigh: 750 },
    // ^ example: Event Pass a bit higher in IE, tweak as you wish
  } as const;

  const region = detectRegionFromUrl();            // 'UK' | 'IE'
  const iso = currencyISO();                       // 'GBP' | 'EUR'
  const price = PRICES[region];

  const eventPassPriceText = formatMoney(price.eventPass);
  const proMonthlyPriceText = formatMoney(price.proMonthly);
  const typicalRangeText = `${formatMoney(price.typicalMin)}–${formatMoney(price.typicalMax)}`;
  const hostRangeText = `${formatMoney(price.hostLow)}–${formatMoney(price.hostHigh)}`;

  // ---------- JSON-LD (dynamic currency & prices) ----------
  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
      { '@type': 'ListItem', position: 2, name: 'Pricing', item: abs('/pricing') },
    ],
  };

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Fundraising Quiz Pricing Plans — FundRaisely',
    url: abs('/pricing'),
    description:
      `Simple, transparent pricing for fundraising quiz software. Free trial available. Event passes from ${eventPassPriceText}. Perfect for charities, schools & community groups.`,
    isPartOf: { '@type': 'WebSite', url: abs('/') },
  };

  const offerCatalogJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    name: 'FundRaisely Fundraising Quiz Pricing',
    url: abs('/pricing'),
    itemListElement: [
      {
        '@type': 'Offer',
        name: 'Starter Plan (Free Trial)',
        price: '0',
        priceCurrency: iso,
        availability: 'https://schema.org/InStock',
        itemOffered: {
          '@type': 'Service',
          name: 'Free Fundraising Quiz Trial',
          areaServed: ['IE', 'GB'],
          audience: { '@type': 'Audience', audienceType: 'Small Community Groups, First-time Organizers' },
        },
      },
      {
        '@type': 'Offer',
        name: 'Event Pass',
        price: String(price.eventPass),
        priceCurrency: iso,
        availability: 'https://schema.org/InStock',
        itemOffered: {
          '@type': 'Service',
          name: 'Single Event Fundraising Quiz',
          areaServed: ['IE', 'GB'],
          audience: { '@type': 'Audience', audienceType: 'Charities, Schools, PTAs' },
        },
      },
      {
        '@type': 'Offer',
        name: 'Premium Subscription',
        price: String(price.proMonthly),
        priceCurrency: iso,
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: String(price.proMonthly),
          priceCurrency: iso,
          unitText: 'MONTH'
        },
        availability: 'https://schema.org/InStock',
        itemOffered: {
          '@type': 'Service',
          name: 'Unlimited Fundraising Quiz Events',
          areaServed: ['IE', 'GB'],
          audience: { '@type': 'Audience', audienceType: 'Large Charities, Schools with Regular Fundraising' },
        },
      },
    ],
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How much can we expect to raise with a fundraising quiz?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            `Most organizations using FundRaisely raise between ${typicalRangeText} per event, depending on participant numbers and ticket pricing. Our fundraising extras typically add 15–25% to total revenue.`,
        },
      },
      {
        '@type': 'Question',
        name: 'Are there any hidden fees or transaction charges?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'No hidden fees. FundRaisely pricing is completely transparent. Since most fundraising quizzes collect payments manually, there are no payment processing fees.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can we try before we buy?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'Absolutely! Our Starter plan is completely free and supports real fundraising events with up to 20 participants. You can run actual quiz nights before deciding to upgrade.',
        },
      },
      {
        '@type': 'Question',
        name: 'What if I need more than premium?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'Contant Us for custom enterprise plans for large charities or schools running multiple events per month.',
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-white px-3 py-2 rounded-md shadow">
        Skip to content
      </a>

      <SEO
        title="Fundraising Quiz Pricing Plans for Clubs, Charities & Schools — FundRaisely"
        description={`Simple, transparent pricing for fundraising quiz software. Free trial available. Event passes from ${eventPassPriceText}. Perfect for charities, schools & community groups in UK & Ireland.`}
        keywords="fundraising quiz pricing, charity quiz software pricing, school fundraiser pricing, quiz night pricing plans"
        ukKeywords="fundraising quiz pricing UK, charity quiz software pricing UK, school fundraiser pricing Britain"
        ieKeywords="fundraising quiz pricing Ireland, charity quiz software pricing Ireland, school fundraiser pricing Ireland"
        domainStrategy="geographic"
        type="website"
        structuredData={[breadcrumbsJsonLd, webPageJsonLd, offerCatalogJsonLd, faqJsonLd]}
      />

      <header><Header /></header>

      {/* Hero */}
      <section className="relative px-4 pt-12 pb-10">
        <div aria-hidden="true" className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-purple-300/30 blur-2xl" />
        <div aria-hidden="true" className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-indigo-300/30 blur-2xl" />
        <div className="container relative z-10 mx-auto max-w-6xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-green-800 text-sm font-semibold border border-green-200">
            <TrendingUp aria-hidden="true" className="h-4 w-4" /> Live Pricing Available
          </span>
          <h1 className="mt-5 bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent text-4xl md:text-6xl font-bold leading-tight">
            Fundraising Quiz Pricing Plans for Clubs, Charities & Schools
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-indigo-900/70 text-lg md:text-xl">
            Transform your next <strong>fundraising quiz night</strong> with professional software designed specifically for charities, schools, and community organizations. Choose the plan that fits your fundraising goals and budget.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="/free-trial" className="rounded-xl bg-indigo-700 px-6 py-3 text-white font-semibold shadow-md hover:bg-indigo-800">
              Run a Free Trial Quiz
            </a>
            <a href="/quiz/demo" className="rounded-xl bg-white px-6 py-3 text-indigo-700 font-semibold shadow-md hover:bg-indigo-50 inline-flex items-center gap-2">
              <PlayCircle aria-hidden="true" className="h-5 w-5" /> Watch the demo
            </a>
          </div>
        </div>
      </section>

      <FoundingPartnerPromo />

      {/* Pricing tiers */}
      <main id="main">
        <section className="px-4 pb-6">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-bold text-indigo-900 mb-8">Choose Your Fundraising Quiz Plan</h2>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Starter / Free */}
              <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-green-700 text-xs font-semibold">
                  <BadgeCheck aria-hidden="true" className="h-4 w-4" /> Available now
                </div>
                <h3 className="text-indigo-900 text-xl font-bold">Starter Plan (Free Trial)</h3>
                <p className="text-indigo-900/70 mt-1">Perfect for first-time organizers and small community groups</p>
                <div className="mt-4 text-3xl font-extrabold text-indigo-900">Free</div>
                <p className="text-sm text-indigo-900/60 mb-4">2 Free Quiz credits.</p>
                <ul className="mt-4 space-y-2">
                  <Bullet>
                  Run two real fundraising quiz with up to 20 participants</Bullet>
                  <Bullet>4-step setup wizard with templates</Bullet>
                  <Bullet>General, Wipeout & Speed rounds plus tiebreakers</Bullet>
                  <Bullet>Fundraising extras: Clue, Freeze, RobinHood, Restore</Bullet>
                  <Bullet>2 admin users for collaborative management</Bullet>
                  <Bullet>Immediate launch, no scheduling available</Bullet>
                  <Bullet>Payment tracking with auto-reconciliation</Bullet>
                  <Bullet>Basic sponsor showcase features</Bullet>
                  <Bullet>Audit ready post event reporting</Bullet>
                  <Bullet>Community Support</Bullet>
                  
                </ul>
                <a href="/free-trial" className="mt-6 inline-block w-full rounded-xl bg-indigo-700 px-4 py-3 text-center font-semibold text-white hover:bg-indigo-800">
                  Start Free Trial
                </a>
              </div>

              {/* Event Pass */}
              <div className="rounded-2xl border-2 border-indigo-500 bg-white p-6 shadow-lg relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-indigo-500 text-white px-4 py-1 rounded-full text-sm font-semibold">Most Popular</span>
                </div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-indigo-700 text-xs font-semibold">
                  <Award aria-hidden="true" className="h-4 w-4" /> Best Value
                </div>
                <h3 className="text-indigo-900 text-xl font-bold">Event Pass</h3>
                <p className="text-indigo-900/70 mt-1">Perfect for one off fundraising events that needs more than the starter pack.</p>
                {/* <div className="mt-4 text-3xl font-extrabold text-indigo-900">{eventPassPriceText}</div> */}
                 <div className="mt-4 text-3xl font-extrabold text-indigo-900">TBA</div>
                <p className="text-sm text-indigo-900/60 mb-4">per event</p>
                <ul className="mt-4 space-y-2">
                  <Bullet>Everything in Starter</Bullet>
                  <Bullet>Up to 50 connected devices</Bullet>
                  <Bullet>addational templates and round types</Bullet>
                  <Bullet>Customisable round to personalise quiz</Bullet>
                  <Bullet>Advanced sponsor showcase features</Bullet>
                  <Bullet>5 admin users for collaborative management</Bullet>                  
                  <Bullet>Schedule event</Bullet>
                  <Bullet>Priority email support on event day</Bullet>
                  
                </ul>
                <a href="/signup" className="mt-6 inline-block w-full rounded-xl bg-indigo-700 px-4 py-3 text-center font-semibold text-white hover:bg-indigo-800">
                  Join Waitlist
                </a>
              </div>

              {/* Premium Subscription */}
              <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1 text-purple-700 text-xs font-semibold">
                  <Sparkles aria-hidden="true" className="h-4 w-4" /> Premium
                </div>
                <h3 className="text-indigo-900 text-xl font-bold">Premium Subscription</h3>
                <p className="text-indigo-900/70 mt-1">Perfect for organizations running multiple events</p>
                {/* <div className="mt-4 text-3xl font-extrabold text-indigo-900">{proMonthlyPriceText}</div> */}
                <div className="mt-4 text-3xl font-extrabold text-indigo-900">TBA</div>
                <p className="text-sm text-indigo-900/60 mb-4">per month</p>
                <ul className="mt-4 space-y-2">
                  <Bullet>Everything in Event Pass</Bullet>
                  <Bullet>200 connected devices</Bullet>
                  <Bullet>Up to 10 admin users with role management</Bullet>
                  <Bullet>Email support with 24-hour response time</Bullet>
                  <Bullet>Team training</Bullet>
                  <Bullet>Dedicated account management</Bullet>
                  <Bullet>Early access to new features</Bullet>
                </ul>
                <a href="/signup" className="mt-6 inline-block w-full rounded-xl bg-indigo-700 px-4 py-3 text-center font-semibold text-white hover:bg-indigo-800">
                  Join Waitlist
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose FundRaisely */}
        <section className="px-4 py-12 bg-indigo-50/50">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-bold text-indigo-900 mb-8">Why Fundraising Organizations Choose FundRaisely</h2>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                  <TrendingUp className="h-8 w-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold text-indigo-900 mb-3">Built Specifically for Fundraising</h3>
                <p className="text-indigo-900/70">
                  Unlike generic quiz platforms, FundRaisely is designed from the ground up for charitable fundraising. Our fundraising extras like RobinHood and Freeze add interactive revenue opportunities without requiring additional volunteers or equipment.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                  <Shield className="h-8 w-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold text-indigo-900 mb-3">Transparent Financial Tracking</h3>
                <p className="text-indigo-900/70">
                  Every penny is accounted for with our automatic reconciliation system. Track entry fees, fundraising extras, and total revenue with audit-ready reports.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold text-indigo-900 mb-3">Professional Results, Volunteer-Friendly Setup</h3>
                <p className="text-indigo-900/70">
                  Our 4-step wizard means any volunteer can set up a professional quiz night in minutes. Pre-loaded question banks, automated scoring, and guided host prompts ensure smooth events every time.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Success Stories (keep generic—no currency claims) */}
        {/* <section className="px-4 py-12">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-bold text-indigo-900 mb-8">Fundraising Quiz Success Stories</h2>
            <div className="grid gap-6 md:grid-cols-3">
              <TestimonialCard
                quote="We raised more in one evening than our last two quizzes combined."
                author="Sarah Mitchell"
                organization="PTA Treasurer, Oakwood Primary School"
              />
              <TestimonialCard
                quote="The automatic reconciliation saved our treasurer hours—everything balanced perfectly."
                author="David Thompson"
                organization="Rotary Club Fundraising Chair"
              />
              <TestimonialCard
                quote="Players loved the interactive extras—friendly rivalry turned into real funds."
                author="Emma Clarke"
                organization="Local Animal Rescue Charity"
              />
            </div>
          </div>
        </section> */}

        {/* Pricing Comparison */}
        <section className="px-4 py-12 bg-indigo-50/50">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-bold text-indigo-900 mb-8">Pricing Comparison: FundRaisely vs Competitors</h2>
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-xl shadow-sm border border-indigo-100">
                <thead>
                  <tr className="border-b border-indigo-100">
                    <th className="text-left p-4 font-semibold text-indigo-900">Feature</th>
                    <th className="text-center p-4 font-semibold text-indigo-900">FundRaisely Event Pass</th>
                    <th className="text-center p-4 font-semibold text-indigo-900">Generic Quiz Platform</th>
                    <th className="text-center p-4 font-semibold text-indigo-900">Professional Host Service</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-indigo-50">
                    <td className="p-4 font-medium text-indigo-900">Cost per Event</td>
                    <td className="p-4 text-center text-indigo-900">{eventPassPriceText}</td>
                    <td className="p-4 text-center text-indigo-900/70">{formatMoney(0)}–{formatMoney(50)}/month</td>
                    <td className="p-4 text-center text-indigo-900/70">{hostRangeText}</td>
                  </tr>
                  <tr className="border-b border-indigo-50">
                    <td className="p-4 font-medium text-indigo-900">Fundraising Features</td>
                    <td className="p-4 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center text-indigo-900/70">None</td>
                    <td className="p-4 text-center text-indigo-900/70">Basic</td>
                  </tr>
                  <tr className="border-b border-indigo-50">
                    <td className="p-4 font-medium text-indigo-900">Payment Reconciliation</td>
                    <td className="p-4 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center text-indigo-900/70">Manual</td>
                    <td className="p-4 text-center text-indigo-900/70">Manual</td>
                  </tr>
                  <tr className="border-b border-indigo-50">
                    <td className="p-4 font-medium text-indigo-900">Charity-Specific Design</td>
                    <td className="p-4 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center text-indigo-900/70">Generic</td>
                    <td className="p-4 text-center text-indigo-900/70">Generic</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-medium text-indigo-900">Volunteer Training Required</td>
                    <td className="p-4 text-center text-indigo-900">Minimal</td>
                    <td className="p-4 text-center text-indigo-900/70">Extensive</td>
                    <td className="p-4 text-center text-indigo-900/70">Extensive</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ (currency-aware copy) */}
        <section className="px-4 py-12">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-indigo-900 mb-8 text-3xl font-bold text-center">Frequently Asked Questions About Pricing</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-indigo-100/60">
                <h3 className="text-indigo-900 mb-2 text-lg font-semibold">How much can we expect to raise with a fundraising quiz?</h3>
                <p className="text-indigo-900/70">
                  Most organizations using FundRaisely raise between {typicalRangeText} per event, depending on participant numbers and ticket pricing. Our fundraising extras typically add 15–25% to total revenue.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-indigo-100/60">
                <h3 className="text-indigo-900 mb-2 text-lg font-semibold">Are there any hidden fees or transaction charges?</h3>
                <p className="text-indigo-900/70">
                  No hidden fees. FundRaisely pricing is completely transparent. Since most fundraising quizzes collect payments manually (cash, direct transfer, instant payments), there are no payment processing fees to worry about.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-indigo-100/60">
                <h3 className="text-indigo-900 mb-2 text-lg font-semibold">Can we try before we buy?</h3>
                <p className="text-indigo-900/70">
                  Absolutely! Our Starter plan is completely free and supports real fundraising events with up to 20 participants. You can run actual quiz nights and collect real money before deciding to upgrade.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-indigo-100/60">
                <h3 className="text-indigo-900 mb-2 text-lg font-semibold">What's included in priority support?</h3>
                <p className="text-indigo-900/70">
                  Event Pass customers receive priority email support with guaranteed response within 4 hours on event days. Pro subscribers get both priority email and phone support, plus a dedicated account manager for ongoing assistance.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-indigo-100/60">
                <h3 className="text-indigo-900 mb-2 text-lg font-semibold">What if I need more than premium ?</h3>
                <p className="text-indigo-900/70">
                  Contant Us for custom enterprise plans for large charities or schools running multiple events per month.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-indigo-100/60">
                <h3 className="text-indigo-900 mb-2 text-lg font-semibold">How does billing work for the Event Pass?</h3>
                <p className="text-indigo-900/70">
                  Event Passes are purchased individually as needed. There's no subscription commitment, simply purchase an Event Pass when you're ready to run a quiz night. Each pass is valid for one event within 30 days of purchase.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-12 bg-gradient-to-r from-indigo-600 to-purple-600">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-white text-3xl font-bold mb-4">Ready to Transform Your Fundraising?</h2>
            <p className="text-indigo-100 text-lg mb-8">
              Join organizations across the UK and Ireland already using FundRaisely to run successful fundraising quiz nights.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="/free-trial" className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-indigo-700 font-bold shadow-lg hover:bg-indigo-50">
                Run a Free Trial Quiz
              </a>
              <a href="/contant" className="inline-flex items-center gap-2 rounded-xl bg-indigo-800 px-8 py-4 text-white font-bold shadow-lg hover:bg-indigo-900">
                Join Waitlist
              </a>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="px-4 py-12">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-indigo-900 text-3xl font-bold mb-4">Still Have Questions?</h2>
            <p className="text-indigo-900/70 text-lg mb-8">
              Our fundraising specialists are here to help you choose the right plan and maximize your quiz night success.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="/contact" className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-6 py-3 text-white font-semibold shadow-md hover:bg-indigo-800">
                <Phone className="h-5 w-5" />
                Book Free Consultation
              </a>
              <a href="mailto:support@fundraisely.co.uk" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-indigo-700 font-semibold shadow-md border border-indigo-200 hover:bg-indigo-50">
                <Mail className="h-5 w-5" />
                Email Support
              </a>
            </div>
          </div>
        </section>
      </main>

      <Suspense fallback={<div>Loading...</div>}>
        <SiteFooter />
      </Suspense>
    </div>
  );
};

export default PricingPage;


