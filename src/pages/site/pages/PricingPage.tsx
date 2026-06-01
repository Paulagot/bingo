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
  gameCredits: string;
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
  'Quiz and elimination games included',
  'Future digital fundraising games supported',
  'No FundRaisely platform percentage',
  'Funds go directly to your own accounts',
];

const pricingFaqs = [
  {
    question: 'What is a digital game credit?',
    answer:
      'A digital game credit lets you run one eligible FundRaisely digital fundraising game, such as a quiz fundraiser, elimination game, puzzle challenge or future skill-based fundraising format.',
  },
  {
    question: 'Why are the plans limited by games, devices and users?',
    answer:
      'Those limits are the fairest way to price the platform. Everyone gets the same core tools, while larger organisations pay more when they run more games, connect more devices or need more management users.',
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
      'Yes. One-off Game Passes are planned for organisations that only need to run a single digital fundraising game.',
  },
];

function priceLabel(price: number) {
  return formatCurrencyExample(price, getMarketConfig());
}

function PricingCard({ plan }: { plan: Plan }) {
  return (
    <article className={`pricing-card ${plan.featured ? 'pricing-card--featured' : ''}`}>
      {plan.featured && <span className="pricing-card__badge">Most popular</span>}

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
            <strong>{plan.gameCredits}</strong>
            <span>Digital game credits</span>
          </p>
        </div>

        <div>
          <MonitorSmartphone aria-hidden="true" />
          <p>
            <strong>{plan.connectedDevices}</strong>
            <span>Connected devices per game</span>
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
      bestFor: 'Best for testing the platform and trying each digital game format.',
      managementUsers: '1',
      gameCredits: '1 per game type',
      connectedDevices: '20',
      ctaLabel: 'Start free',
      ctaTo: '/demo',
    },
    {
      name: 'Growth',
      price: 39,
      suffix: '/ month',
      intro: 'For clubs, schools and nonprofits running regular fundraisers.',
      bestFor: 'Best for active fundraising teams.',
      managementUsers: '5',
      gameCredits: '8 per month',
      connectedDevices: '150',
      ctaLabel: 'Choose Growth',
      ctaTo: '/demo',
      featured: true,
    },
    {
      name: 'Pro',
      price: 79,
      suffix: '/ month',
      intro: 'For larger organisations with bigger events and busier calendars.',
      bestFor: 'Best for larger teams and more regular fundraising.',
      managementUsers: '10',
      gameCredits: '20 per month',
      connectedDevices: '300',
      ctaLabel: 'Choose Pro',
      ctaTo: '/demo',
    },
  ];

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'FundRaisely Pricing',
      description:
        'Simple pricing for FundRaisely fundraising tools. Plans differ by digital game credits, connected devices and management users.',
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
        description="Every plan includes ticketing, payment tracking, reports and impact summaries. Plans only differ by digital game credits, connected devices and management users."
        primaryCta={{ label: 'Book a demo', to: '/demo' }}
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
              those tools are often locked behind higher plans, platform fees or percentage-based pricing. Then they need different platforms to run quizzes, and other digital events that require separate management. That makes it
              harder for volunteer-led teams to know what the software will really cost.
            </p>
          </article>

          <article>
            <p className="eyebrow">Solution</p>
            <h2>Same core tools on every plan, with fair usage limits</h2>
            <p>
              FundRaisely includes ticketing, payment tracking, reports and impact summaries across the plans. Pricing
              is based on digital game credits, connected devices and management users. FundRaisely does not hold your
              funds or take a platform percentage from what you raise.
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
              The core fundraising tools stay the same. Pick a plan based on how many games you expect to run, how many
              devices will connect, and how many people need access to the management system.
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
              <h3>Need more users, devices or game volume?</h3>
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
        title="Simple usage limits for digital fundraising games"
        text="Digital game credits keep pricing easy to understand while giving FundRaisely room to add more fundraising formats."
        steps={[
          {
            title: 'Choose your plan',
            text: 'Pick the monthly plan that matches your expected fundraising activity and management team size.',
          },
          {
            title: 'Use credits for eligible games',
            text: 'A credit can run one quiz, elimination game, puzzle challenge or future skill-based digital fundraising game.',
          },
          {
            title: 'Match devices to the event',
            text: 'Connected device limits keep larger live games predictable without restricting core fundraising tools.',
          },
          {
            title: 'Upgrade when you grow',
            text: 'Move up a plan when you run more games, need more management users or host larger digital events.',
          },
        ]}
      />

      <section className="section section--muted">
        <div className="site-shell pricing-pass-layout">
          <div>
            <p className="eyebrow">One-off game passes</p>
            <h2>Running one fundraiser? Use a Game Pass.</h2>
            <p>
              For organisations that do not want a monthly plan, one-off Game Passes let you run a single digital
              fundraising game with the same core tools included.
            </p>
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
                <p>1 digital game</p>
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
            description: 'Explore quiz fundraisers, elimination games and future digital formats.',
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
        text="Book a demo and we can walk through your fundraising calendar, likely event size and the plan that fits best."
        primaryCta={{ label: 'Book a demo', to: '/demo' }}
        secondaryCta={{ label: 'Explore features', to: '/features' }}
      />
    </>
  );
}