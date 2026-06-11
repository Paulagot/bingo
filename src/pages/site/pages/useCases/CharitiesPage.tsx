import { SEO } from '../../components/seo/SEO';
import { Breadcrumbs } from '../../components/seo/Breadcrumbs';
import { breadcrumbsForPath } from '../../components/seo/breadcrumbUtils';
import {
  compactStructuredData,
  faqJsonLd,
  webPageJsonLd,
} from '../../components/seo/structuredData';

import { Hero } from '../../components/sections/Hero';
import { FeatureGrid } from '../../components/sections/FeatureGrid';
import { ProcessSteps } from '../../components/sections/ProcessSteps';
import { ScreenshotShowcase } from '../../components/sections/ScreenshotShowcase';
import { SplitSection } from '../../components/sections/SplitSection';
import { FAQSection } from '../../components/sections/FAQSection';
import { RelatedLinks } from '../../components/sections/RelatedLinks';
import { CTASection } from '../../components/sections/CTASection';

import { images } from '../../config/imageConfig';

const path = '/use-cases/charities';

const seoTitle =
  'Fundraising Event Software for Charities and Nonprofits | FundRaisely';

const seoDescription =
  'FundRaisely helps charities and nonprofits run ready-to-use fundraising events, track payments, record sponsors and prizes, create impact statements, and keep financial history from past events for reporting and grant applications.';

const h1 = 'Run charity fundraisers with clearer records, reports and impact';

const breadcrumbs = breadcrumbsForPath(path, h1);

const faqs = [
  {
    question: 'How can charities use FundRaisely?',
    answer:
      'Charities can use FundRaisely to run ready-to-use fundraising activities such as quiz nights, elimination games, puzzle challenges, ticketed events, sponsored activities and campaign pages. The platform helps track participation, payments, sponsors, prizes, outcomes and after-event reports.',
  },
  {
    question: 'Why are reports important for charities?',
    answer:
      'Charities often need to show what happened after a fundraiser: how much was raised, how many people took part, which payments were confirmed, which sponsors were involved, what prizes were donated and what impact was created. FundRaisely helps keep those records connected to the event.',
  },
  {
    question: 'Can FundRaisely help with grant applications?',
    answer:
      'Yes. FundRaisely can help charities build a clearer history of past fundraising activity, including financial summaries, participation data, sponsor involvement, event outcomes and impact statements. This can support future grant applications, board reporting and funder updates.',
  },
  {
    question: 'Can charities create impact statements?',
    answer:
      'Yes. FundRaisely is designed to help charities turn event data into clearer impact statements, showing what was raised, who took part, what the money supported and what outcome can be reported back to supporters, trustees or funders.',
  },
  {
    question: 'Does FundRaisely only support digital fundraisers?',
    answer:
      'No. FundRaisely can support digital, in-person and hybrid fundraisers. Charities can use it for quiz nights, ticketed events, sponsored activities, community events, campaign pages and recurring skill-based challenges.',
  },
  {
    question: 'Can charities use donate what you want?',
    answer:
      'Yes. Charities can use flexible contribution models such as donate what you want, fixed ticket prices, sponsored contributions, paid entries or other fundraiser-specific setups.',
  },
  {
    question: 'Can sponsors and prize donors be recorded?',
    answer:
      'Yes. FundRaisely can help charities record sponsors, local business supporters, prize donors, donated goods, giveaways and event partners as part of the fundraiser record.',
  },
  {
    question: 'Can volunteers help manage events?',
    answer:
      'Yes. FundRaisely can support organiser and helper workflows so volunteers or admins can assist with ticketing, check-in, payment follow-up, participant support and event setup.',
  },
  {
    question: 'Does FundRaisely hold the charity funds?',
    answer:
      'No. FundRaisely is designed to help organise and track fundraising activity. Charities can use their own payment routes, accounts or supported payment methods depending on the event setup.',
  },
  {
    question: 'Can charities repeat successful events?',
    answer:
      'Yes. One of the main benefits is repeatability. A charity can turn a successful quiz, challenge, ticketed event or campaign into a repeatable format for future fundraising.',
  },
];

const structuredData = compactStructuredData([
  webPageJsonLd(path, h1, seoDescription),
  faqJsonLd(faqs),
]);

const readyToRunItems = [
  {
    title: 'Charity quiz nights',
    text: 'Run a digital quiz fundraiser for supporters, volunteers, local communities, corporate partners or campaign audiences, with ticketing, payments and reports connected to the event.',
  },
  {
    title: 'Elimination games',
    text: 'Use a quick, low-setup game format for supporter engagement, community events, donor nights or campaign moments where the charity needs something easy to run.',
  },
  {
    title: 'Puzzle challenges',
    text: 'Create recurring skill-based fundraisers where supporters take part over several weeks, giving charities a repeatable alternative to one-off donation asks.',
  },
  {
    title: 'Ticketed events',
    text: 'Manage ticketed fundraisers such as dinners, awareness nights, community events, workshops, gala-style events, talks, social nights or supporter gatherings.',
  },
  {
    title: 'Sponsored activities',
    text: 'Support sponsored walks, runs, challenges, readathons, fitness goals, community campaigns or supporter-led activities with clearer tracking.',
  },
  {
    title: 'Campaign pages',
    text: 'Create public campaign pages that explain the cause, the fundraising activity, the target, the partners and how supporters can take part.',
  },
];

const reportingItems = [
  {
    title: 'Event financial summaries',
    text: 'Review what was raised, what was confirmed, what is still outstanding and which payment methods were used.',
  },
  {
    title: 'Impact statements',
    text: 'Turn fundraiser activity into a clearer statement of what happened, who took part, what was raised and what the money will support.',
  },
  {
    title: 'Grant application history',
    text: 'Build a record of past fundraisers that can support future grant applications, funder reports and board updates.',
  },
  {
    title: 'Sponsor and prize records',
    text: 'Keep details of sponsors, prize donors, donated goods, giveaways and event partners connected to the fundraiser.',
  },
  {
    title: 'Participation data',
    text: 'Show how many people joined, bought tickets, donated, played, volunteered or supported the event.',
  },
  {
    title: 'Repeatable reporting',
    text: 'Use the same reporting structure across events so the charity is not reinventing the records every time.',
  },
];

const charityUseItems = [
  {
    title: 'For fundraising leads',
    text: 'Create repeatable activities, manage supporter participation and review event results without starting from scratch each time.',
  },
  {
    title: 'For trustees and boards',
    text: 'Give clearer summaries of fundraising activity, financial outcomes, supporter engagement and campaign performance.',
  },
  {
    title: 'For grant applications',
    text: 'Keep historical evidence from past events, including income, participation, sponsors, activities and impact statements.',
  },
  {
    title: 'For volunteers',
    text: 'Give helpers clearer roles around ticketing, check-in, payment review, participant support and event administration.',
  },
  {
    title: 'For supporters',
    text: 'Offer activities people can join, attend, play, share or contribute to, rather than relying only on donation appeals.',
  },
  {
    title: 'For charity partners',
    text: 'Support community or corporate partners who want to run an event for the charity, while keeping the outcome record clear.',
  },
];

const paymentTrackingItems = [
  {
    title: 'Track multiple payment routes',
    text: 'Support the real-world mix of charity fundraising payments, including card, instant payments, bank transfer, cash, donation links or other supported routes.',
  },
  {
    title: 'Separate confirmed and claimed payments',
    text: 'Help organisers see what is confirmed, what has been claimed, what is late and what still needs follow-up.',
  },
  {
    title: 'Reduce spreadsheet cleanup',
    text: 'Keep participants, tickets, donations, sponsors and payment status connected to the fundraiser instead of scattered across spreadsheets and messages.',
  },
  {
    title: 'Support reconciliation',
    text: 'Give finance or admin teams a clearer starting point for checking what came in after the event.',
  },
  {
    title: 'Record non-ticket income',
    text: 'Track extra income such as sponsors, prize support, on-the-night payments, donated amounts or fundraising extras.',
  },
  {
    title: 'Keep an audit-friendly trail',
    text: 'Create a more organised event record that can be reviewed by the charity team, trustees or finance lead.',
  },
];

const grantEvidenceItems = [
  {
    title: 'Past event totals',
    text: 'Show previous fundraising totals by event, campaign, activity type or period.',
  },
  {
    title: 'Participation history',
    text: 'Record how many people took part, bought tickets, donated, volunteered or supported each fundraiser.',
  },
  {
    title: 'Supporter engagement',
    text: 'Show that the charity can mobilise communities, supporters, volunteers or partners around fundraising activity.',
  },
  {
    title: 'Matched funding evidence',
    text: 'Record when funds were matched, sponsored or supported by a partner, helping show wider backing for a campaign.',
  },
  {
    title: 'Sponsor involvement',
    text: 'Keep a record of businesses, donors, prize sponsors or partners who supported previous fundraising activity.',
  },
  {
    title: 'Impact narrative',
    text: 'Turn event outcomes into a clearer story about what the charity did, what was raised and what changed as a result.',
  },
];

const supporterActivityItems = [
  {
    title: 'Give supporters something to do',
    text: 'A quiz, challenge, ticketed event or puzzle gives people a reason to show up and participate, not just donate once.',
  },
  {
    title: 'Make campaigns more shareable',
    text: 'Supporters are more likely to share an event, challenge or activity than a plain donation request.',
  },
  {
    title: 'Create community moments',
    text: 'Live and repeatable fundraisers help bring supporters, volunteers, beneficiaries, partners and communities together.',
  },
  {
    title: 'Support partner-led fundraising',
    text: 'Let a community group, company, club or local partner organise an activity in aid of the charity.',
  },
  {
    title: 'Build repeat participation',
    text: 'Recurring challenges and repeatable event formats give supporters a reason to return.',
  },
  {
    title: 'Recognise contribution',
    text: 'Record prizes, sponsors, helpers and supporters so the charity can thank people properly after the event.',
  },
];

const processSteps = [
  {
    title: 'Choose the campaign or cause',
    text: 'Start with the fundraising goal, appeal, project, service, community need or campaign the charity wants to support.',
  },
  {
    title: 'Pick the fundraising format',
    text: 'Choose a quiz, elimination game, puzzle challenge, ticketed event, sponsored activity or campaign page.',
  },
  {
    title: 'Set the contribution model',
    text: 'Use a fixed ticket price, donate-what-you-want model, sponsored contribution, recurring challenge or event-specific setup.',
  },
  {
    title: 'Add partners, sponsors and prizes',
    text: 'Record sponsors, prize donors, corporate partners, community partners, donated items or match-funding arrangements.',
  },
  {
    title: 'Invite supporters and helpers',
    text: 'Share the fundraiser with supporters, volunteers, community groups, corporate partners or local networks.',
  },
  {
    title: 'Run the fundraiser',
    text: 'Use the event format to bring people together, collect participation, track payments and create a live fundraising moment.',
  },
  {
    title: 'Review the financial record',
    text: 'Check confirmed payments, claimed payments, outstanding follow-up, sponsor income, ticket income and other event income.',
  },
  {
    title: 'Create the impact record',
    text: 'Turn the event into a report or impact statement that can support trustees, funders, grant applications and future campaigns.',
  },
];

const screenshotSlots = [
  {
    title: 'Campaign and event setup',
    description:
      'Create a fundraising activity around a cause, campaign, event, supporter group or partner-led fundraiser.',
    imageKey: 'eventSetupOverviewPhotoshot' as const,
    variant: 'standard' as const,
  },
  {
    title: 'Payment and supporter tracking',
    description:
      'Track donations, tickets, participants, payment status, sponsors and follow-up activity.',
    imageKey: 'paymentTrackingScreenshot' as const,
    variant: 'standard' as const,
  },
  {
    title: 'Reports and impact records',
    description:
      'Review fundraising totals, participation, sponsors, prizes, outcomes and impact after the event.',
    imageKey: 'reportOverviewScreenshot' as const,
    variant: 'standard' as const,
  },
];

const relatedLinks = [
  {
    label: 'Reports',
    to: '/features/reports',
    text: 'Create clearer after-event records, impact summaries and fundraising reports.',
  },
  {
    label: 'Payments',
    to: '/features/payments',
    text: 'Track payment status, outstanding amounts and real-world charity payment flows.',
  },
  {
    label: 'Quiz fundraisers',
    to: '/event-formats/quiz',
    text: 'Run a charity quiz night for supporters, communities, partners or volunteers.',
  },
  {
    label: 'Ticketed events',
    to: '/event-formats/ticketed-events',
    text: 'Manage ticketed dinners, talks, awareness events, workshops and supporter nights.',
  },
  {
    label: 'Community groups',
    to: '/use-cases/community-groups',
    text: 'See how communities can raise money for causes they care about.',
  },
];

export default function CharitiesPage() {
  return (
    <>
      <SEO
        title={seoTitle}
        description={seoDescription}
        canonicalPath={path}
        breadcrumbs={breadcrumbs}
        structuredData={structuredData}
      />

      <Breadcrumbs items={breadcrumbs} />

      <Hero
        eyebrow="Charity fundraising"
        title={h1}
        description="FundRaisely helps charities run ready-to-use fundraising activities and keep the records that matter afterwards: payments, participation, sponsors, prizes, impact statements, financial summaries and past event history for trustees, funders and grant applications."
        primaryCta={{ label: 'Book a demo', to: '/contact' }}
        secondaryCta={{ label: 'Explore event formats', to: '/event-formats' }}
        image={images.reportOverviewScreenshot}
        status="Built for fundraising teams, trustees, volunteers and charity partners"
        variant="standard"
      />

      <section className="section">
        <div className="site-shell problem-solution">
          <article>
            <p className="eyebrow">Problem</p>
            <h2>
              Charity fundraisers create more than money — they create evidence
            </h2>
            <p>
              A charity fundraiser is rarely just a one-night event. It creates
              income, supporter activity, volunteer effort, sponsor involvement,
              prize records, payment follow-up and impact that may need to be
              reported later.
            </p>
            <p>
              When those records are spread across spreadsheets, payment
              screenshots, ticket lists, emails and messages, it becomes harder
              to report clearly to trustees, funders, supporters and grant
              providers.
            </p>
          </article>

          <article>
            <p className="eyebrow">Solution</p>
            <h2>
              FundRaisely connects the fundraiser, the money and the impact
              record
            </h2>
            <p>
              FundRaisely gives charities ready-to-run fundraising formats and
              keeps the practical records connected to each event or campaign.
              The charity can see what was raised, who took part, what is still
              outstanding and what can be reported afterwards.
            </p>
            <p>
              This helps charities move from ad hoc fundraising activity to a
              clearer history of events, financial outcomes and impact evidence.
            </p>
          </article>
        </div>
      </section>

      <FeatureGrid
        eyebrow="Ready-to-run formats"
        title="Give your charity more ways to fundraise without starting from scratch"
        text="FundRaisely gives charities practical event and campaign formats they can reuse across appeals, supporter groups, local campaigns, corporate partners and community fundraisers."
        items={readyToRunItems}
      />

      <SplitSection
        eyebrow="Impact and reporting"
        title="Turn each fundraiser into a useful record for the charity"
        text="The end of a fundraiser should not leave the team trying to piece together what happened. FundRaisely helps charities keep event activity, payment records, sponsor details, prizes and outcomes connected so they can produce clearer reports afterwards."
        bullets={[
          'Summarise income raised by event or campaign',
          'Track confirmed, claimed and outstanding payments',
          'Record participant, ticket, supporter and volunteer activity',
          'Keep sponsor, prize donor and partner details attached to the event',
          'Create clearer impact statements after fundraisers',
          'Use past event records to support trustee updates and future applications',
        ]}
        image={images.reportOverviewScreenshot}
        reverse={false}
      />

      <FeatureGrid
        eyebrow="Charity records"
        title="From impact statements to grant-ready evidence"
        text="Charities often need more than a total raised. They need a history of activity that shows community support, financial performance, participation and outcomes."
        items={reportingItems}
      />

      <SplitSection
        eyebrow="Grant applications"
        title="Keep financials and event history ready for future funding applications"
        text="When a charity applies for grants or reports to funders, previous fundraising activity can help show demand, community support, delivery capacity and responsible financial management. FundRaisely helps turn past events into a clearer evidence base."
        bullets={[
          'Review totals raised from previous events and campaigns',
          'Show participation and supporter engagement',
          'Record match funding, sponsorship and partner involvement',
          'Keep prize, sponsor and event outcome records in one place',
          'Use impact statements to explain what the money supported',
          'Build a stronger history for funder updates and grant applications',
        ]}
        image={images.dashboardOverviewScreenshot}
        reverse
      />

      <FeatureGrid
        eyebrow="Evidence for funders"
        title="Build a stronger picture of what your charity can deliver"
        text="FundRaisely can help charities keep the kind of information that is often useful later: past event totals, supporter activity, sponsor involvement, match funding and impact narratives."
        items={grantEvidenceItems}
      />

      <ScreenshotShowcase
        eyebrow="Product screens"
        title="From fundraiser setup to reports and impact records"
        text="The charity page should show that FundRaisely is not just an event tool. It connects the activity, payments, supporters and reports so charities can use the information afterwards."
        slots={screenshotSlots}
      />

      <FeatureGrid
        eyebrow="Payments and reconciliation"
        title="Track real-world charity payments more clearly"
        text="Charity fundraising often involves a mix of payment routes, manual confirmations, cash, transfers, card payments, sponsor support and late follow-up. FundRaisely helps keep the money trail easier to review."
        items={paymentTrackingItems}
      />

      <SplitSection
        eyebrow="Supporter engagement"
        title="Give supporters something to take part in, not just another donation ask"
        text="Donation pages are important, but supporters often respond better when they have an activity to join, share or attend. FundRaisely gives charities fundraising formats that make participation part of the campaign."
        bullets={[
          'Run quiz nights for supporters, volunteers or community partners',
          'Use quick games for campaign moments or social events',
          'Create recurring puzzle challenges for repeat engagement',
          'Use ticketed events for dinners, awareness nights or workshops',
          'Support sponsored activities and supporter-led campaigns',
          'Give partners a practical format to run in aid of the charity',
        ]}
        image={images.communityQuizNight}
        reverse={false}
      />

      <FeatureGrid
        eyebrow="Supporter activity"
        title="Make fundraising more participatory"
        text="FundRaisely helps charities move beyond passive appeals by giving supporters, partners and communities something practical to join, share and remember."
        items={supporterActivityItems}
      />

      <SplitSection
        eyebrow="Partner-led fundraising"
        title="Let communities and partners raise money for your charity"
        text="A charity does not always have to organise every fundraiser itself. Community groups, clubs, companies and supporters can run events in aid of a charity, while FundRaisely helps keep the activity and outcome clearer."
        bullets={[
          'Support community groups fundraising for your charity',
          'Let corporate partners run quiz nights, games or ticketed events',
          'Give supporters campaign pages and activity formats to share',
          'Track partner-led fundraising outcomes more clearly',
          'Record sponsor and prize support connected to the event',
          'Create reports that can be shared back with partners and supporters',
        ]}
        image={images.ticketingHeroScreenshot}
        reverse
      />

      <ProcessSteps
        eyebrow="How it works"
        title="From fundraising idea to impact record"
        text="FundRaisely helps charities move from an idea or appeal to a practical fundraising activity, then into a clearer financial and impact record afterwards."
        steps={processSteps}
      />

      <SplitSection
        eyebrow="Why this matters"
        title="Better records make every fundraiser more useful after it ends"
        text="A charity event should not disappear into a spreadsheet after the night is over. With clearer records, the same fundraiser can support future campaigns, trustee reporting, supporter updates, grant applications and repeat fundraising plans."
        bullets={[
          'Use event history to understand what works',
          'Show supporters and trustees what was achieved',
          'Make financial follow-up easier after each event',
          'Use reports to support future grant applications',
          'Recognise sponsors, partners, volunteers and prize donors',
          'Turn successful events into repeatable fundraising formats',
        ]}
        image={images.reportOverviewScreenshot}
        reverse={false}
      />

      <FAQSection
        items={faqs}
        intro="These questions help charities understand how FundRaisely supports ready-to-run fundraising activity, financial records, impact statements, grant evidence, sponsor tracking and after-event reporting."
      />

      <RelatedLinks links={relatedLinks} />

      <CTASection
        title="Want charity fundraisers that leave better records behind?"
        text="Book a demo to see how FundRaisely can help your charity run ready-to-use events, track payments, record sponsors and prizes, create impact statements and build a clearer history for trustees, funders and grant applications."
        primaryCta={{ label: 'Book a demo', to: '/contact' }}
        secondaryCta={{ label: 'Explore event formats', to: '/event-formats' }}
      />
    </>
  );
}
