import {
  Check,
  Gamepad2,
  MonitorSmartphone,
  Ticket,
  Users,
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
};

const includedFeatures = [
  'Ticketing included',
  'Same reports on every plan',
  'Payment tracking included',
  'Impact summaries included',
  'Quiz and elimination activities included',
  'Future fundraising activities supported',
  'No FundRaisely platform percentage',
  'Funds go directly to your own accounts',
];

const pricingFaqs = [
  {
    question: 'What is an activity credit?',
    answer:
      'An activity credit lets you run one eligible FundRaisely fundraising activity, such as a quiz fundraiser, elimination game, puzzle challenge or future skill-based fundraising format.',
  },
  {
    question: 'Why are the plans limited by activities, devices and users?',
    answer:
      'Those limits are the fairest way to price the platform. Everyone gets the same core tools, while larger organisations pay more when they run more activities, connect more devices or need more management users.',
  },
  {
    question: 'Do all plans get the same ticketing and reports?',
    answer:
      'Yes. FundRaisely does not lock important fundraising tools away from smaller clubs and nonprofits. Ticketing, payment tracking, reports and impact summaries are included across the plans.',
  },
  {
    question: 'Does FundRaisely take a percentage of what we raise?',
    answer:
      'No. FundRaisely charges for the software. Funds are paid directly to your organisation through your own Stripe account, bank details, instant payment method, cash process or supported wallet.',
  },
  {
    question: 'Are in-game helpers or event admins restricted?',
    answer:
      'Not in this pricing model. The user limit applies to management users who access the wider FundRaisely management system.',
  },
  {
    question: 'Can we run one event without subscribing?',
    answer:
      'Yes. One-off Activity Passes are available for organisations that only need to run a single fundraising activity. Contact us and we can help you choose the right pass.',
  },
];

function priceLabel(price: number) {
  return formatCurrencyExample(price, getMarketConfig());
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
        {plan.suffix && <span>{plan.suffix}</span>}
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

      <Link className={plan.featured ? 'button button--primary-dark' : 'button button--outline-dark'} to={plan.ctaTo}>
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
    },
    {
      name: 'Growth',
      price: 39,
      suffix: '/ month',
      intro: 'For clubs, schools and nonprofits running regular fundraisers.',
      bestFor: 'Best for active fundraising teams.',
      managementUsers: '5',
      activityCredits: '8 per month',
      connectedDevices: '150',
      ctaLabel: 'Create free account',
      ctaTo: '/signup',
      featured: true,
    },
    {
      name: 'Pro',
      price: 79,
      suffix: '/ month',
      intro: 'For larger organisations with bigger events and busier calendars.',
      bestFor: 'Best for larger teams and more regular fundraising.',
      managementUsers: '10',
      activityCredits: '20 per month',
      connectedDevices: '300',
      ctaLabel: 'Create free account',
      ctaTo: '/signup',
    },
  ];

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'FundRaisely Pricing',
      description:
        'Simple pricing for FundRaisely fundraising tools. Plans differ by activity credits, connected devices and management users.',
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

  return (
    <>
      <SEO
        title="FundRaisely Pricing"
        description={`Simple FundRaisely pricing for ${market.commonOrganisationExamples}. Same ticketing, reports and payment tracking on every plan.`}
        canonicalPath={path}
        breadcrumbs={breadcrumbs}
        structuredData={structuredData}
      />

      <Breadcrumbs items={breadcrumbs} />

      <Hero
        eyebrow="Pricing"
        status="No platform percentage"
        title="Simple pricing for practical fundraising"
        description="Every plan includes ticketing, payment tracking, reports and impact summaries. Plans only differ by activity credits, connected devices and management users."
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
              Many clubs, schools, charities and nonprofits need proper ticketing, payment tracking and reports, but
              those tools are often locked behind higher plans, platform fees or percentage-based pricing. Then they need
              different platforms to run quizzes and other fundraising activities that require separate management. That
              makes it harder for volunteer-led teams to know what the software will really cost.
            </p>
          </article>

          <article>
            <p className="eyebrow">Solution</p>
            <h2>Same core tools on every plan, with fair usage limits</h2>
            <p>
              FundRaisely includes ticketing, payment tracking, reports and impact summaries across the plans. Pricing is
              based on activity credits, connected devices and management users. FundRaisely does not hold your funds or
              take a platform percentage from what you raise.
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
              The core fundraising tools stay the same. Pick a plan based on how many activities you expect to run, how
              many devices will connect, and how many people need access to the management system.
            </p>
          </div>

          <div className="pricing-beta-note">
            <p className="eyebrow">Open beta founding partner offer</p>
            <h3>Get Pro usage for the Growth price</h3>
            <p>
              FundRaisely is currently in open beta. Anyone who signs up for a paid account during this period will
              become a founding partner and receive the Pro plan for the Growth price - FOR LIFE. This offer is only available during the open beta period, so sign up now to lock in your founding partner status.
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
                Enterprise pricing is available for multi-branch organisations, networks, federations and larger
                fundraising operations that need custom limits or onboarding.
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
            <h2>The important tools are not locked away</h2>
            <p>
              Smaller clubs and nonprofits still need proper ticketing, payment tracking and reports, so those tools are
              included from Free upwards.
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

      <ProcessSteps
        eyebrow="How credits work"
        title="Simple usage limits for fundraising activities"
        text="Activity credits keep pricing easy to understand while giving FundRaisely room to add more fundraising formats."
        steps={[
          {
            title: 'Choose your plan',
            text: 'Pick the monthly plan that matches your expected fundraising activity and management team size.',
          },
          {
            title: 'Use credits for eligible activities',
            text: 'A credit can run one quiz, elimination game, puzzle challenge or future skill-based fundraising activity.',
          },
          {
            title: 'Match devices to the event',
            text: 'Connected device limits keep larger live activities predictable without restricting core fundraising tools.',
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
              For organisations that do not want a monthly plan, one-off Activity Passes let you run a single fundraising
              activity with the same core tools included. Contact us and we can help you choose the right pass for your
              event size.
            </p>
            <Link className="button button--primary-dark" to="/contact">
              Contact us about a pass
            </Link>
          </div>

          <div className="pricing-pass-grid">
            {[
              { name: 'Small Pass', price: 19, devices: '50 devices' },
              { name: 'Standard Pass', price: 39, devices: '150 devices' },
              { name: 'Large Pass', price: 79, devices: '300 devices' },
            ].map((pass) => (
              <article className="pricing-pass-card" key={pass.name}>
                <Ticket aria-hidden="true" />
                <h3>{pass.name}</h3>
                <strong>{formatCurrencyExample(pass.price, market)}</strong>
                <p>1 activity</p>
                <span>{pass.devices}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <FAQSection
        title="Pricing questions"
        intro="The short version: the tools stay the same, and the limits are based on usage."
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
            label: 'Event Formats',
            to: '/event-formats',
            description: 'Explore quiz fundraisers, elimination games and future activity formats.',
          },
          {
            label: 'Payments',
            to: '/features/payments',
            description: 'See how FundRaisely supports direct-to-organisation payment tracking.',
          },
        ]}
      />

      <CTASection
        title="Want help choosing the right plan?"
        text="Contact us and we can walk through your fundraising calendar, likely event size and the plan that fits best."
        primaryCta={{ label: 'Contact us', to: '/contact' }}
        secondaryCta={{ label: 'Create free account', to: '/signup' }}
      />
    </>
  );
}