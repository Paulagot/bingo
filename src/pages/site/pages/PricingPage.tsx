import {
  Check,
  Gamepad2,
  MonitorSmartphone,
  Ticket,
  Users,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/seo/SEO';
import { Breadcrumbs } from '../components/seo/Breadcrumbs';
import { breadcrumbsForPath } from '../components/seo/breadcrumbUtils';
import { Hero } from '../components/sections/Hero';
import { ProcessSteps } from '../components/sections/ProcessSteps';
import { FAQSection } from '../components/sections/FAQSection';
import { CTASection } from '../components/sections/CTASection';
import { RelatedLinks } from '../components/sections/RelatedLinks';
import { images } from '../config/imageConfig';
import { getMarketConfig, formatCurrencyExample } from '../config/marketConfig';

type Plan = {
  name: string;
  price: number;
  suffix?: string;
  intro: string;
  managementUsers: string;
  activityCredits: string;
  connectedDevices: string;
  bestFor: string;
  ctaLabel: string;
  ctaTo: string;
  featured?: boolean;
  setupNote?: string;
};

type ComparisonRow = {
  feature: string;
  fundraisely: boolean | string;
  clubforce: boolean | string;
  enthuse: boolean | string;
  kwizzbit: boolean | string;
  rallyup: boolean | string;
  zeffy: boolean | string;
  givebutter: boolean | string;
};

const includedFeatures = [
  'Ready-to-run quiz, elimination and puzzle games - no content to prepare',
  'Weekly Puzzle Challenge - a legal lotto alternative for recurring income',
  'Peer fundraising - activity pack selling and sponsored events',
  'Ticketing and QR check-in for any event type',
  'Payment tracking across cash, card, instant payments and crypto',
  'Audit-ready reconciliation and locked reports',
  'Financial and impact reports',
  'Donations widget - embeddable on any website',
  'Crypto and digital asset payments to your own wallet',
  'No FundRaisely platform percentage',
  'Funds go directly to your own accounts',
];

const comparisonRows: ComparisonRow[] = [
  {
    feature: 'Monthly fee',
    fundraisely: 'From €49/mo',
    clubforce: 'From ~€35/mo',
    enthuse: 'From €39.99/mo',
    kwizzbit: 'From ~£20/mo',
    rallyup: 'Free',
    zeffy: 'Free',
    givebutter: 'Free',
  },
  {
    feature: 'Platform % on funds raised',
    fundraisely: 'None',
    clubforce: 'Yes - per club',
    enthuse: '1.9% + 30p',
    kwizzbit: 'None',
    rallyup: '0–6.9% by type',
    zeffy: 'Tip model',
    givebutter: 'Tip model or 3%',
  },
  {
    feature: 'Quiz - no content to prepare',
    fundraisely: true,
    clubforce: false,
    enthuse: false,
    kwizzbit: true,
    rallyup: false,
    zeffy: false,
    givebutter: false,
  },
  {
    feature: 'Elimination and puzzle challenge games',
    fundraisely: true,
    clubforce: false,
    enthuse: false,
    kwizzbit: false,
    rallyup: false,
    zeffy: false,
    givebutter: false,
  },
  {
    feature: 'Weekly Puzzle Subscription- lotto alternative',
    fundraisely: true,
    clubforce: false,
    enthuse: false,
    kwizzbit: false,
    rallyup: false,
    zeffy: false,
    givebutter: false,
  },
  {
    feature: 'Peer fundraising with participant pages',
    fundraisely: true,
    clubforce: false,
    enthuse: true,
    kwizzbit: false,
    rallyup: true,
    zeffy: false,
    givebutter: true,
  },
  {
    feature: 'Door-to-door activity pack selling',
    fundraisely: true,
    clubforce: false,
    enthuse: false,
    kwizzbit: false,
    rallyup: false,
    zeffy: false,
    givebutter: false,
  },
  {
    feature: 'Sponsored events with participant pages',
    fundraisely: true,
    clubforce: false,
    enthuse: true,
    kwizzbit: false,
    rallyup: true,
    zeffy: false,
    givebutter: true,
  },
  {
    feature: 'Ticketing and QR check-in',
    fundraisely: true,
    clubforce: true,
    enthuse: true,
    kwizzbit: false,
    rallyup: true,
    zeffy: true,
    givebutter: true,
  },
  {
    feature: 'Cash and instant payment tracking',
    fundraisely: true,
    clubforce: false,
    enthuse: false,
    kwizzbit: false,
    rallyup: false,
    zeffy: false,
    givebutter: false,
  },
  {
    feature: 'Audit-ready reconciliation and locked reports',
    fundraisely: true,
    clubforce: false,
    enthuse: false,
    kwizzbit: false,
    rallyup: false,
    zeffy: false,
    givebutter: false,
  },
  {
    feature: 'Crypto payments to your own wallet',
    fundraisely: true,
    clubforce: false,
    enthuse: false,
    kwizzbit: false,
    rallyup: false,
    zeffy: false,
    givebutter: false,
  },
  {
    feature: 'Embeddable donations widget',
    fundraisely: true,
    clubforce: false,
    enthuse: true,
    kwizzbit: false,
    rallyup: false,
    zeffy: true,
    givebutter: true,
  },
  {
    feature: 'Funds go directly to your accounts',
    fundraisely: true,
    clubforce: true,
    enthuse: true,
    kwizzbit: true,
    rallyup: false,
    zeffy: false,
    givebutter: false,
  },

];

const pricingFaqs = [
  {
    question: 'FundRaisely looks more expensive - why?',
    answer:
      'The platforms that appear free or cheaper typically make their money differently. Zeffy and Givebutter use a tip model where donors are asked to cover platform costs - that money comes from your supporters. RallyUp charges 0–6.9% per activity type on funds raised. Clubforce charges unpublished transaction fees per club. Enthuse charges 1.9% + 30p on every donation. FundRaisely charges a flat monthly fee with no percentage on what you raise. For an organisation running regular fundraising events, the total cost of a percentage-based model often exceeds a flat monthly fee - and with FundRaisely, every euro your supporters give goes directly to you.',
  },
  {
    question: 'What is an activity credit?',
    answer:
      'An activity credit lets you run one eligible FundRaisely fundraising activity, such as a quiz fundraiser, elimination game, puzzle challenge, Weekly Puzzle Challenge season or future skill-based fundraising format.',
  },
  {
    question: 'What does connected devices mean?',
    answer:
      'Connected devices refers to how many people can join a live activity at once - for example, how many players can join a quiz or elimination game at the same time. The Free plan suits smaller groups, while Growth and Pro support larger audiences.',
  },
  {
    question: 'Is the Weekly Puzzle Challenge a lotto alternative?',
    answer:
      'Yes. The Weekly Puzzle Challenge is a fixed-season subscription fundraiser where supporters pay once and a new puzzle drops each week. Because it is skill-based rather than chance-based, it is legal for charities, schools and community groups where gambling regulations prevent running a traditional weekly lotto. It generates the same kind of regular recurring income without the regulatory risk.',
  },
  {
    question: 'Can FundRaisely work alongside Clubforce or Klubfunder?',
    answer:
      'Yes. Clubforce and Klubfunder are club management platforms used for membership and lotto. FundRaisely is a fundraising events platform - quiz nights, elimination games, peer campaigns, sponsored events and the Weekly Puzzle Challenge. Many clubs use a club management platform for day-to-day admin and FundRaisely for the bigger income-generating events. Contact us to talk through how it fits your setup.',
  },
  {
    question: 'Do all plans get the same ticketing and reports?',
    answer:
      'Yes. FundRaisely does not lock important fundraising tools away from smaller clubs and nonprofits. Ticketing, payment tracking, reports and impact summaries are included across all plans.',
  },
  {
    question: 'Does FundRaisely take a percentage of what we raise?',
    answer:
      'No. FundRaisely charges for the software. Funds are paid directly to your organisation through your own Stripe account, bank details, instant payment method, cash process or supported wallet.',
  },
  {
    question: 'Is VAT included in the prices shown?',
    answer:
      'No. Prices shown are exclusive of VAT. VAT will be applied at the applicable rate for your country at checkout. Registered charities and non-profits should check with their accountant whether any VAT relief applies to their organisation.',
  },
  {
    question: 'What is onboarding support?',
    answer:
      'Onboarding support is an optional guided setup session where we help you configure your payment methods, set up your first event and walk through the platform with your team. It is not required - the platform can be set up independently - but many organisations find it saves time and reduces early mistakes. Contact us to arrange a session.',
  },
  {
    question: 'Can FundRaisely host our quiz night?',
    answer:
      'Yes. If you would like FundRaisely to host your quiz night or fundraising event, contact us to discuss what is involved. Hosted events are arranged separately from the platform plans.',
  },
  {
    question: 'Are in-game helpers or event admins restricted?',
    answer:
      'Not in this pricing model. The user limit applies to management users who access the wider FundRaisely management system.',
  },
  {
    question: 'Can we run one event without subscribing?',
    answer:
      'Yes. One-off Activity Passes are available for organisations that only need to run a single fundraising activity. Passes are self-guided - no onboarding support is included, but contact us if you need help or want someone to host the event for you.',
  },
  {
    question: 'What is the founding partner offer?',
    answer:
      'During the current open beta period, organisations that sign up for a paid plan become founding partners and receive the Pro plan at the Growth price. This is a time-limited early adopter offer available while the open beta is open.',
  },
];

function priceLabel(price: number) {
  return formatCurrencyExample(price, getMarketConfig());
}

function ComparisonCell({ value, featured }: { value: boolean | string; featured?: boolean }) {
  const baseStyle: React.CSSProperties = {
    padding: '0.625rem 0.75rem',
    textAlign: 'center',
    verticalAlign: 'middle',
    borderLeft: '1px solid #e2e4e8',
    backgroundColor: featured ? 'rgba(15,76,117,0.05)' : undefined,
  };

  if (typeof value === 'string') {
    return (
      <td style={{ ...baseStyle, fontSize: '0.75rem', color: '#5a6072', lineHeight: 1.35, fontWeight: 500 }}>
        {value}
      </td>
    );
  }

  return (
    <td style={baseStyle}>
      {value ? (
        <Check
          style={{
            width: '1.125rem',
            height: '1.125rem',
            color: '#16a34a',
            margin: '0 auto',
            display: 'block',
            strokeWidth: 2.5,
          }}
          aria-label="Yes"
        />
      ) : (
        <X
          style={{
            width: '1rem',
            height: '1rem',
            color: '#dc2626',
            margin: '0 auto',
            display: 'block',
            strokeWidth: 2.5,
            opacity: 0.55,
          }}
          aria-label="No"
        />
      )}
    </td>
  );
}

function PricingCard({ plan }: { plan: Plan }) {
  return (
    <article className={`pricing-card ${plan.featured ? 'pricing-card--featured' : ''}`}>
      {plan.featured && <span className="pricing-card__badge">Founding partner offer</span>}

      <div className="pricing-card__top">
        <h2>{plan.name}</h2>
        <p>{plan.intro}</p>
      </div>

      <div className="pricing-card__price">
        <strong>{priceLabel(plan.price)}</strong>
        {plan.suffix && <span>{plan.suffix} + VAT</span>}
      </div>

      <p className="pricing-card__best">{plan.bestFor}</p>

      <div className="pricing-card__limits" aria-label={`${plan.name} plan limits`}>
        <div>
          <Users aria-hidden="true" />
          <p>
            <strong>{plan.managementUsers}</strong>
            <span>Management users</span>
          </p>
        </div>
        <div>
          <Gamepad2 aria-hidden="true" />
          <p>
            <strong>{plan.activityCredits}</strong>
            <span>Activity credits</span>
          </p>
        </div>
        <div>
          <MonitorSmartphone aria-hidden="true" />
          <p>
            <strong>{plan.connectedDevices}</strong>
            <span>Connected devices per activity</span>
          </p>
        </div>
      </div>

      {plan.setupNote && (
        <p className="pricing-card__setup-note">* {plan.setupNote}</p>
      )}

      <Link
        className={plan.featured ? 'button button--primary-dark' : 'button button--outline-dark'}
        to={plan.ctaTo}
      >
        {plan.ctaLabel}
      </Link>
    </article>
  );
}

export default function PricingPage() {
  const market = getMarketConfig();
  const path = '/pricing';
  const breadcrumbs = breadcrumbsForPath(path, 'Pricing');

  const plans: Plan[] = [
    {
      name: 'Free',
      price: 0,
      intro: 'Try FundRaisely with real fundraising tools before choosing a paid plan.',
      bestFor: 'Best for testing the platform and trying each activity format.',
      managementUsers: '1',
      activityCredits: '1 per activity type',
      connectedDevices: '20',
      ctaLabel: 'Create free account',
      ctaTo: '/signup',
      setupNote: 'Self-guided setup - no onboarding support included.',
    },
    {
      name: 'Growth',
      price: 49,
      suffix: '/ month',
      intro: 'For clubs, schools and nonprofits running regular fundraisers.',
      bestFor: 'Best for active fundraising teams.',
      managementUsers: '5',
      activityCredits: '8 per month',
      connectedDevices: '150',
      ctaLabel: 'Create free account',
      ctaTo: '/signup',
      featured: true,
      setupNote: 'Onboarding support available - €249 + VAT.',
    },
    {
      name: 'Pro',
      price: 99,
      suffix: '/ month',
      intro: 'For larger organisations with bigger events and busier calendars.',
      bestFor: 'Best for larger teams and more regular fundraising.',
      managementUsers: '10',
      activityCredits: '20 per month',
      connectedDevices: '300',
      ctaLabel: 'Create free account',
      ctaTo: '/signup',
      setupNote: 'Onboarding support available - €249 + VAT.',
    },
  ];

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'FundRaisely Pricing',
      description:
        'Simple pricing for FundRaisely fundraising tools. Plans differ by activity credits, connected devices and management users. No platform percentage.',
      url: `${market.canonicalBaseUrl}${path}`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: pricingFaqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    },
  ];

  // Inline styles for the comparison table
  const tableWrapperStyle: React.CSSProperties = {
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    marginTop: '2rem',
    border: '1px solid #e2e4e8',
    borderRadius: '12px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.8125rem',
    minWidth: '780px',
    backgroundColor: '#ffffff',
  };

  const theadStyle: React.CSSProperties = {
    backgroundColor: '#f4f6f9',
    borderBottom: '2px solid #e2e4e8',
  };

  const thBaseStyle: React.CSSProperties = {
    padding: '0.875rem 0.75rem',
    textAlign: 'center',
    fontWeight: 700,
    fontSize: '0.8125rem',
    color: '#1a1a2e',
    whiteSpace: 'nowrap' as const,
    borderLeft: '1px solid #e2e4e8',
  };

  const thFeatureStyle: React.CSSProperties = {
    ...thBaseStyle,
    textAlign: 'left',
    width: '28%',
    paddingLeft: '1.25rem',
    borderLeft: 'none',
  };

  const thFeaturedStyle: React.CSSProperties = {
    ...thBaseStyle,
    backgroundColor: '#0f4c75',
    color: '#ffffff',
  };

  const featureCellStyle: React.CSSProperties = {
    padding: '0.625rem 0.75rem 0.625rem 1.25rem',
    color: '#1a1a2e',
    textAlign: 'left',
    fontWeight: 500,
    lineHeight: 1.4,
    borderBottom: '1px solid #e2e4e8',
  };

  return (
    <>
      <SEO
        title="FundRaisely Pricing"
        description={`Simple FundRaisely pricing for ${market.commonOrganisationExamples}. Same ticketing, reports and payment tracking on every plan. No platform percentage. A legal lotto alternative included.`}
        canonicalPath={path}
        breadcrumbs={breadcrumbs}
        structuredData={structuredData}
      />

      <Breadcrumbs items={breadcrumbs} />

      <Hero
        eyebrow="Pricing"
        status="No platform percentage"
        title="Simple pricing for practical fundraising"
        description="Every plan includes ticketing, payment tracking, reports, peer fundraising and the Weekly Puzzle Challenge - a legal lotto alternative for recurring income. Plans only differ by activity credits, connected devices and management users. Funds go directly to your organisation."
        primaryCta={{ label: 'Create free account', to: '/signup' }}
        secondaryCta={{ label: 'Explore features', to: '/features' }}
        image={images.committeeReports}
        variant="standard"
      />

      <section className="section">
        <div className="site-shell problem-solution">
          <article>
            <p className="eyebrow">Problem</p>
            <h2>Fundraising software pricing can punish smaller teams</h2>
            <p>
              Many clubs, schools, charities and nonprofits need proper ticketing, payment tracking
              and reports, but those tools are often locked behind higher plans, platform fees or
              percentage-based pricing. Running quizzes, peer campaigns and other fundraising
              activities often requires separate tools with separate costs on top.
            </p>
          </article>

          <article>
            <p className="eyebrow">Solution</p>
            <h2>A flat monthly fee - no percentage taken from what you raise</h2>
            <p>
              FundRaisely charges a flat monthly subscription. There is no platform percentage on
              ticket sales, event income or donations. Platforms that appear free often take 1–7%
              of what your supporters give, or ask donors to cover platform costs through tips.
              With FundRaisely, every euro your supporters give goes directly to your organisation.
            </p>
          </article>
        </div>
      </section>

      <section className="section section--muted">
        <div className="site-shell">
          <div className="section-heading">
            <p className="eyebrow">Plans</p>
            <h2>Choose the level of usage you need</h2>
            <p>
              The core fundraising tools stay the same across every plan. Pick based on how many
              activities you expect to run, how many people will join your events, and how many
              people need access to the management system. All prices exclude VAT.
            </p>
          </div>

          <div className="pricing-beta-note">
            <p className="eyebrow">Open beta founding partner offer</p>
            <h3>Get Pro usage at the Growth price</h3>
            <p>
              FundRaisely is currently in open beta. Organisations that sign up for a paid plan
              during this period become founding partners and receive the Pro plan at the Growth
              price. This is a time-limited early adopter offer available while the open beta
              is open - sign up now to lock in your founding partner rate.
            </p>
          </div>

          <div className="pricing-grid">
            {plans.map((plan) => (
              <PricingCard key={plan.name} plan={plan} />
            ))}
          </div>

          <div className="pricing-enterprise-note">
            <div>
              <p className="eyebrow">Larger organisations</p>
              <h3>Need more users, devices or activity volume?</h3>
              <p>
                Enterprise pricing is available for multi-branch organisations, networks,
                federations and larger fundraising operations that need custom limits or
                onboarding support.
              </p>
            </div>
            <Link className="button button--outline-dark" to="/contact">
              Talk to us
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="site-shell">
          <div className="section-heading">
            <p className="eyebrow">Included on every plan</p>
            <h2>The tools that matter are not locked away</h2>
            <p>
              FundRaisely is built around what grassroots fundraising actually needs - ready-to-run
              games, a legal lotto alternative, peer fundraising, real-world payment tracking and
              clear reports. All included from the Free plan upwards.
            </p>
          </div>

          <div className="card-grid card-grid--four">
            {includedFeatures.map((feature) => (
              <article className="info-card pricing-included-card" key={feature}>
                <Check aria-hidden="true" />
                <h3>{feature}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--muted">
        <div className="site-shell">
          <div className="section-heading">
            <p className="eyebrow">How we compare</p>
            <h2>More included. No percentage on what you raise.</h2>
            <p>
              FundRaisely costs more per month than platforms that appear free - but those platforms
              take a percentage of every pound or euro your supporters give, or ask donors to tip
              them at checkout. A club running €10,000 in fundraising events would pay €0 in
              platform fees with FundRaisely at €49/month, versus €190 – €690 in platform cuts on a
              percentage-based model. The maths changes quickly.
            </p>
          </div>

          <div style={tableWrapperStyle}>
            <table style={tableStyle}>
              <thead style={theadStyle}>
                <tr>
                  <th style={thFeatureStyle}>Feature</th>
                  <th style={thFeaturedStyle}>FundRaisely</th>
                  <th style={thBaseStyle}>Clubforce</th>
                  <th style={thBaseStyle}>Enthuse</th>
                  <th style={thBaseStyle}>Kwizzbit</th>
                  <th style={thBaseStyle}>RallyUp</th>
                  <th style={thBaseStyle}>Zeffy</th>
                  <th style={thBaseStyle}>Givebutter</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, rowIndex) => (
                  <tr
                    key={row.feature}
                    style={{
                      backgroundColor: rowIndex % 2 === 0 ? '#ffffff' : '#f9fafc',
                    }}
                  >
                    <td style={featureCellStyle}>{row.feature}</td>
                    <ComparisonCell value={row.fundraisely} featured />
                    <ComparisonCell value={row.clubforce} />
                    <ComparisonCell value={row.enthuse} />
                    <ComparisonCell value={row.kwizzbit} />
                    <ComparisonCell value={row.rallyup} />
                    <ComparisonCell value={row.zeffy} />
                    <ComparisonCell value={row.givebutter} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#5a6072', lineHeight: 1.6 }}>
            Comparison based on publicly available information as of 2026. Features and pricing may
            change - check each platform's website for current details. Clubforce: Galway-based,
            Ireland and UK, transaction fees quoted per club. Enthuse: Ireland and UK focused,
            1.9% + 30p processing fee applies. Kwizzbit: quiz platform only, no fundraising
            infrastructure. RallyUp: US-focused, 0–6.9% platform fee depending on activity type,
            funds flow through RallyUp. Zeffy: tip-funded model, available in UK only (not
            Ireland), funds flow through Zeffy. Givebutter: tip model or 3% platform fee, funds
            flow through Givebutter before payout.
          </p>

          <div
            style={{
              marginTop: '1.5rem',
              padding: '1.25rem 1.5rem',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e2e4e8',
              borderLeft: '4px solid #0f4c75',
            }}
          >
            <p style={{ margin: 0, fontSize: '0.9375rem', lineHeight: 1.6, color: '#1a1a2e' }}>
              <strong>Already using Clubforce or Klubfunder for membership and lotto?</strong>{' '}
              FundRaisely works alongside them as your fundraising events platform - quiz nights,
              elimination games, peer campaigns, sponsored events and the Weekly Puzzle Challenge
              as a legal lotto alternative - with the payment tracking and reports your committee
              needs afterwards.{' '}
              <Link to="/contact">Talk to us about how it fits.</Link>
            </p>
          </div>
        </div>
      </section>

      <ProcessSteps
        eyebrow="How credits work"
        title="Simple usage limits for fundraising activities"
        text="Activity credits keep pricing easy to understand while giving FundRaisely room to add more fundraising formats over time."
        steps={[
          {
            title: 'Choose your plan',
            text: 'Pick the monthly plan that matches your expected fundraising activity volume and management team size.',
          },
          {
            title: 'Use credits for eligible activities',
            text: 'A credit runs one quiz, elimination game, puzzle challenge, Weekly Puzzle Challenge season or future skill-based fundraising activity.',
          },
          {
            title: 'Match devices to your event size',
            text: 'Connected device limits determine how many people can join a live activity at once. Pick a plan that fits your typical event audience.',
          },
          {
            title: 'Upgrade when you grow',
            text: 'Move up a plan when you run more activities, need more management users or host larger fundraising events.',
          },
        ]}
      />

      <section className="section section--muted">
        <div className="site-shell pricing-pass-layout">
          <div>
            <p className="eyebrow">One-off activity passes</p>
            <h2>Running one fundraiser? Use an Activity Pass.</h2>
            <p>
              For organisations that do not want a monthly plan, one-off Activity Passes let you
              run a single fundraising activity with the same core tools included. All pass prices
              exclude VAT.
            </p>
            <p>
              Passes are self-guided - no onboarding support is included. Need help getting
              started or want someone to host your quiz night?{' '}
              <Link to="/contact">Contact us</Link> to discuss your options.
            </p>
            <Link className="button button--primary-dark" to="/contact">
              Contact us about a pass
            </Link>
          </div>

          <div className="pricing-pass-grid">
            {[
              { name: 'Small Pass', price: 29, devices: '50 devices' },
              { name: 'Standard Pass', price: 59, devices: '150 devices' },
              { name: 'Large Pass', price: 99, devices: '300 devices' },
            ].map((pass) => (
              <article className="pricing-pass-card" key={pass.name}>
                <Ticket aria-hidden="true" />
                <h3>{pass.name}</h3>
                <strong>{formatCurrencyExample(pass.price, market)}</strong>
                <p>+ VAT</p>
                <p>1 activity</p>
                <span>{pass.devices}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <FAQSection
        title="Pricing questions"
        intro="The short version: the tools stay the same across every plan, the limits are based on usage, and FundRaisely never takes a percentage of what you raise. All prices exclude VAT."
        items={pricingFaqs}
      />

      <RelatedLinks
        links={[
          {
            label: 'Features',
            to: '/features',
            description: 'See the fundraising tools included across the platform.',
          },
          {
            label: 'Weekly Puzzle Challenge',
            to: '/event-formats/weekly-puzzle-challenge',
            description: 'The legal lotto alternative for recurring fundraising income.',
          },
          {
            label: 'Event Formats',
            to: '/event-formats',
            description: 'Explore quiz fundraisers, elimination games and all activity formats.',
          },
          {
            label: 'Payments and reports',
            to: '/features/financial-records',
            description: 'See how FundRaisely supports direct-to-organisation payment tracking.',
          },
        ]}
      />

      <CTASection
        title="Want help choosing the right plan?"
        text="Contact us and we can walk through your fundraising calendar, typical event size and the plan that fits best - including onboarding support and hosted event options."
        primaryCta={{ label: 'Contact us', to: '/contact' }}
        secondaryCta={{ label: 'Create free account', to: '/signup' }}
      />
    </>
  );
}