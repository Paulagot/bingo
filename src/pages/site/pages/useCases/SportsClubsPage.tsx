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

const path = '/use-cases/sports-clubs';

const seoTitle =
  'Fundraising Software for Sports Clubs, Teams and Coaches | FundRaisely';

const seoDescription =
  'FundRaisely helps sports clubs, teams and coaches run ready-to-use fundraisers including quiz nights, elimination games, puzzle challenges, sponsored activities, ticketed events, digital door-to-door campaigns, payment tracking and reports.';

const h1 =
  'Ready-to-run fundraisers for sports clubs, teams and coaches';

const breadcrumbs = breadcrumbsForPath(path, h1);

const faqs = [
  {
    question: 'How can sports clubs use FundRaisely?',
    answer:
      'Sports clubs can use FundRaisely to run team fundraisers, club-wide events, quiz nights, elimination games, puzzle challenges, ticketed events, sponsored challenges and digital campaign packs. It is designed to help clubs organise the event, collect or track payments, manage supporters and review the results afterwards.',
  },
  {
    question: 'Can individual teams fundraise separately from the whole club?',
    answer:
      'Yes. A coach, team manager or parent helper can use FundRaisely to run a fundraiser for a specific team, such as raising money for gear, travel, tournament costs, equipment or end-of-season activities.',
  },
  {
    question: 'Can a full club use FundRaisely for larger events?',
    answer:
      'Yes. A club committee can use FundRaisely for larger fundraisers such as quiz nights, awards nights, family days, ticketed events, sponsored activities, puzzle challenges or club-wide campaigns.',
  },
  {
    question: 'What makes the puzzle challenge useful for clubs?',
    answer:
      'The puzzle challenge gives clubs a recurring fundraiser that is based on games of skill rather than gambling. It can work as an alternative or companion to traditional club lotto-style fundraising, especially where a club wants something more family-friendly and skill-based.',
  },
  {
    question: 'Can FundRaisely help with door-to-door or player-led fundraising?',
    answer:
      'Yes. FundRaisely can support digital campaign packs where players, parents or team members share links instead of relying only on paper cards, cash collections or manual sponsor sheets.',
  },
  {
    question: 'Does FundRaisely handle ticketed club events?',
    answer:
      'Yes. Clubs can use FundRaisely for ticketed events such as awards nights, dinners, sporting events, family fun days, table quizzes and other club fundraisers.',
  },
  {
    question: 'Can clubs still accept cash, Revolut or other manual payments?',
    answer:
      'Yes. FundRaisely is designed around real grassroots fundraising, where clubs may use cash, instant payments, bank transfers, card payments or other payment methods. The platform helps organisers track what has been paid, what has been claimed and what still needs follow-up.',
  },
  {
    question: 'Does FundRaisely replace the club treasurer?',
    answer:
      'No. FundRaisely does not replace the treasurer or committee. It helps them by keeping event activity, payment records, ticket sales, prizes, sponsors and reports more organised.',
  },
  {
    question: 'Can coaches run quick fundraisers without a lot of setup?',
    answer:
      'Yes. Some formats, such as elimination games, are designed to be quick to run and easy to organise. They can work well for team-level fundraising, training-night activities, social events or short club fundraisers.',
  },
  {
    question: 'Can sponsors be included?',
    answer:
      'Yes. Clubs can record sponsors, prize donors and local businesses connected to an event. This makes it easier to recognise sponsors, report back and approach them again for future fundraisers.',
  },
];

const structuredData = compactStructuredData([
  webPageJsonLd(path, h1, seoDescription),
  faqJsonLd(faqs),
]);

const fundraiserFormats = [
  {
    title: 'Team quiz nights',
    text: 'Run a quiz for one team, several teams, parents, players or the wider club community, with ticketing, joining, host controls, payment tracking and reports connected to the event.',
  },
  {
    title: 'Elimination games',
    text: 'Use a fast, low-setup game format that can be run on the fly for team nights, club socials, quick campaigns or repeat fundraising moments.',
  },
  {
    title: 'Puzzle challenges',
    text: 'Create recurring skill-based puzzle fundraisers where supporters subscribe or pay across a number of weeks, giving clubs a non-gambling alternative to lotto-style fundraising.',
  },
  {
    title: 'Sponsored activities',
    text: 'Support sponsored walks, runs, challenges, skills tests, training goals or player-led campaigns with clearer links, payments and follow-up records.',
  },
  {
    title: 'Ticketed club events',
    text: 'Sell or manage entries for dinners, awards nights, family fun days, matches, sporting events, table quizzes, club nights and other real-world fundraisers.',
  },
  {
    title: 'Digital door-to-door packs',
    text: 'Give players, parents or team members a more modern way to share fundraising links, collect support and track activity without relying only on paper forms and cash.',
  },
];

const teamFundraisingItems = [
  {
    title: 'Raise money at team level',
    text: 'A coach or team manager can run a fundraiser for a specific squad, age group or team without needing the whole club committee to build the event manually.',
  },
  {
    title: 'Support real team costs',
    text: 'Use fundraisers for gear, equipment, buses, tournament travel, referee costs, training expenses, end-of-season events or team development.',
  },
  {
    title: 'Let parents help more easily',
    text: 'Parents can help share links, support players, buy tickets, join events or contribute to campaigns without everything being managed through message threads.',
  },
  {
    title: 'Make fundraising repeatable',
    text: 'Once a team has a format that works, the same structure can be used again for another team, season, campaign or club activity.',
  },
  {
    title: 'Reduce pressure on volunteers',
    text: 'The organiser gets a clearer event flow instead of trying to manage sign-ups, payments, reminders, results and reports from separate tools.',
  },
  {
    title: 'Keep records connected',
    text: 'Players, supporters, tickets, payments, sponsors, prizes and event outcomes can stay connected to the fundraiser instead of being scattered across spreadsheets.',
  },
];

const clubLevelItems = [
  {
    title: 'Club-wide campaigns',
    text: 'Run a fundraiser across the whole club, with multiple teams, parents, supporters, volunteers and sponsors connected to one campaign or event.',
  },
  {
    title: 'Seasonal fundraisers',
    text: 'Create repeatable fundraisers around the start of season, finals, tours, Christmas, summer events, registration periods or club development goals.',
  },
  {
    title: 'Committee-friendly reporting',
    text: 'Give treasurers and committees clearer records of what was raised, what is outstanding, which payments were confirmed and what activity took place.',
  },
  {
    title: 'Sponsor and prize tracking',
    text: 'Record local business sponsors, donated prizes, giveaways and sponsor recognition so the club can thank people properly and follow up later.',
  },
  {
    title: 'Admin helpers',
    text: 'Let trusted helpers support check-in, payments, ticketing, player setup or event admin without giving everyone full control of the fundraiser.',
  },
  {
    title: 'Multiple activity types',
    text: 'A club does not have to rely on one format. It can run quizzes, elimination games, puzzle challenges, sponsored events and ticketed events from the same platform.',
  },
];

const digitalDoorToDoorItems = [
  {
    title: 'Player-led sharing',
    text: 'Players can share a fundraiser link with family, neighbours and supporters, making it easier to support the team without carrying cash or paper sponsorship cards.',
  },
  {
    title: 'Parent-friendly collection',
    text: 'Parents can help their child or team share the fundraiser in a more organised way, while the club can still track what came in and what needs follow-up.',
  },
  {
    title: 'Useful for sponsored events',
    text: 'Digital packs can support sponsored walks, runs, skills challenges, training goals, team targets or wider club campaigns.',
  },
  {
    title: 'Less admin after collection',
    text: 'Instead of manually matching cash, names, screenshots and messages afterwards, the club has a clearer record linked to the fundraiser.',
  },
  {
    title: 'Works with club campaigns',
    text: 'A digital pack can sit inside a wider fundraising campaign, so team-level effort contributes to a larger club goal.',
  },
  {
    title: 'Better follow-up',
    text: 'Organisers can see which payments are confirmed, claimed, late, outstanding or need review, making the follow-up process more structured.',
  },
];

const paymentReportingItems = [
  {
    title: 'Track real payment methods',
    text: 'FundRaisely is built for the way clubs actually collect money, including cash, instant payments, bank transfers, card payments, Stripe-style payments or other supported methods.',
  },
  {
    title: 'See what is still outstanding',
    text: 'Organisers can review who has paid, who has claimed payment, what is confirmed and what still needs follow-up.',
  },
  {
    title: 'Reduce spreadsheet work',
    text: 'Payments, tickets, players, teams, sponsors and event details can be connected to the fundraiser instead of manually reconciled afterwards.',
  },
  {
    title: 'Support the treasurer',
    text: 'Treasurers can get clearer event records, payment summaries and after-event information without having to reconstruct the fundraiser from messages.',
  },
  {
    title: 'Record prizes and sponsors',
    text: 'Prize donors, sponsor names, giveaways and winner details can be recorded as part of the event history.',
  },
  {
    title: 'Report back to the committee',
    text: 'After the event, the club can review what happened, what was raised, what remains outstanding and what can be repeated next time.',
  },
];

const processSteps = [
  {
    title: 'Choose the fundraising goal',
    text: 'Decide whether the club is raising money for a team, a trip, new gear, equipment, facilities, tournament costs or a wider club campaign.',
  },
  {
    title: 'Pick the activity',
    text: 'Choose a ready-to-run format such as a quiz, elimination game, puzzle challenge, sponsored activity, ticketed event or digital campaign pack.',
  },
  {
    title: 'Set the entry or collection method',
    text: 'Add the ticket price, donation amount, subscription setup, sponsor details, team target or payment options that fit the fundraiser.',
  },
  {
    title: 'Add helpers, sponsors or prizes',
    text: 'Bring in admins, team managers, parent helpers, prize donors or local sponsors so the event is easier to run and easier to recognise afterwards.',
  },
  {
    title: 'Share the link',
    text: 'Send the fundraiser to players, parents, supporters, members, sponsors or the wider club community.',
  },
  {
    title: 'Run the event or campaign',
    text: 'Use the selected format to run the quiz, game, puzzle challenge, ticketed event, sponsored activity or club campaign.',
  },
  {
    title: 'Track payments and participation',
    text: 'Keep an eye on entries, tickets, supporters, claimed payments, confirmed payments and outstanding follow-up.',
  },
  {
    title: 'Review and report afterwards',
    text: 'Check totals, payments, sponsors, prizes, winners, activity and results so the club has a clearer record for treasurers and committees.',
  },
];

const screenshotSlots = [
  {
    title: 'Event setup for club fundraisers',
    description:
      'Create a fundraiser around a team, club event, campaign, ticketed activity, quiz, elimination game or puzzle challenge.',
    imageKey: 'eventSetupOverviewPhotoshot' as const,
    variant: 'standard' as const,
  },
  {
    title: 'Payment and supporter tracking',
    description:
      'See who has joined, what has been paid, what has been claimed and what still needs follow-up.',
    imageKey: 'paymentTrackingScreenshot' as const,
    variant: 'standard' as const,
  },
  {
    title: 'Reports for committees and treasurers',
    description:
      'Review participation, income, payment status, sponsors, prizes and event outcomes after the fundraiser.',
    imageKey: 'reportOverviewScreenshot' as const,
    variant: 'standard' as const,
  },
];

const relatedLinks = [
  {
    label: 'Quiz fundraisers',
    to: '/event-formats/quiz',
    text: 'Run a digital quiz night for teams, parents, supporters or the whole club.',
  },
  {
    label: 'Elimination games',
    to: '/event-formats/elimination',
    text: 'Use a fast game format for quick, low-setup club or team fundraisers.',
  },
  {
    label: 'Ticketed events',
    to: '/event-formats/ticketed-events',
    text: 'Manage entries for awards nights, dinners, family days, sports events and other club fundraisers.',
  },
  {
    label: 'Payments',
    to: '/features/payments',
    text: 'Track cash, instant payments, card payments and outstanding amounts in one event record.',
  },
  {
    label: 'Reports',
    to: '/features/reports',
    text: 'Give committees and treasurers clearer after-event records.',
  },
];

export default function SportsClubsPage() {
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
        eyebrow="Sports club fundraising"
        title={h1}
        description="FundRaisely helps sports clubs raise money at team level and club level with ready-to-run formats: quiz nights, elimination games, puzzle challenges, sponsored activities, ticketed events and digital campaign packs, all connected to payment tracking and after-event reports."
        primaryCta={{ label: 'Book a demo', to: '/contact' }}
        secondaryCta={{ label: 'Explore event formats', to: '/event-formats' }}
          image={images.clubHero}
        status="Built for grassroots clubs, teams, coaches and committees"
        variant="standard"
      />

      <section className="section">
        <div className="site-shell problem-solution">
          <article>
            <p className="eyebrow">Problem</p>
            <h2>Sports clubs are always fundraising, but volunteers are stretched</h2>
            <p>
              Most sports clubs need money all year round: team gear, travel,
              tournament costs, equipment, referee fees, facilities, awards
              nights, family days and club development projects. The problem is
              that the work usually lands on the same coaches, parents,
              treasurers and committee members.
            </p>
            <p>
              A fundraiser might start as a simple idea, but quickly turns into
              ticket lists, payment screenshots, cash collections, sponsor
              messages, WhatsApp follow-ups, spreadsheets and questions about
              who has paid, who still owes money and what was actually raised.
            </p>
          </article>

          <article>
            <p className="eyebrow">Solution</p>
            <h2>FundRaisely gives clubs practical fundraisers they can actually run</h2>
            <p>
              FundRaisely gives sports clubs ready-to-use fundraising formats
              that work at team level and club level. A coach can run a quick
              team fundraiser, while a committee can organise a full club event
              or recurring campaign.
            </p>
            <p>
              The platform brings the activity, supporter flow, ticketing,
              payments, sponsors, prizes and reporting into one clearer event
              record, so clubs are not trying to piece everything together after
              the fundraiser is over.
            </p>
          </article>
        </div>
      </section>

      <FeatureGrid
        eyebrow="Ready-to-run formats"
        title="Give coaches and committees more than one way to fundraise"
        text="A sports club should not have to rely on one annual fundraiser or one volunteer with a spreadsheet. FundRaisely gives clubs different activity types that can fit a team, a season, a campaign or a full club event."
        items={fundraiserFormats}
      />

      <SplitSection
        eyebrow="Team-level fundraising"
        title="Help individual teams raise money without waiting for a full club campaign"
        text="A team might need money for new kits, travel, equipment, tournament costs or an end-of-season activity. FundRaisely lets a coach, parent helper or team manager create a focused fundraiser for that team, while still keeping the event organised and easy to report on."
        bullets={[
          'Create fundraisers for a specific team, squad or age group',
          'Use quiz nights, elimination games, sponsored challenges or digital campaign packs',
          'Let parents and players share links with family and supporters',
          'Track payments without relying only on screenshots or cash notes',
          'Keep team fundraising records clearer for the club treasurer',
          'Repeat the same structure for another team or season',
        ]}
        image={images.ticketingHeroScreenshot}
        reverse={false}
      />

      <FeatureGrid
        eyebrow="For coaches and team managers"
        title="Make smaller team fundraisers easier to organise"
        text="Not every fundraiser needs to be a major club event. Some of the most useful fundraising happens at team level, where a coach or parent helper needs something quick, clear and easy to share."
        items={teamFundraisingItems}
      />

      <SplitSection
        eyebrow="Club-level events"
        title="Run bigger fundraisers across the whole club"
        text="For club committees, FundRaisely can support larger fundraising events and campaigns that involve multiple teams, members, parents, sponsors and volunteers. The club can choose the format that fits the occasion and keep the records connected afterwards."
        bullets={[
          'Run club quiz nights, awards nights, family days or ticketed events',
          'Use elimination games for quick social fundraising moments',
          'Create club-wide campaigns around specific goals',
          'Include sponsors, prize donors and local business support',
          'Let trusted admins help with check-in, payments and setup',
          'Review income, participation and outstanding payments afterwards',
        ]}
        image={images.communityQuizNight}
        reverse
      />

      <FeatureGrid
        eyebrow="For committees"
        title="Support club-wide fundraising without creating more admin"
        text="Club committees need fundraising activity, but they also need records that make sense afterwards. FundRaisely helps connect the fundraiser to payments, supporters, sponsors, prizes and reports."
        items={clubLevelItems}
      />

      <SplitSection
        eyebrow="Recurring revenue"
        title="Use puzzle challenges as a skill-based alternative to club lotto"
        text="Many clubs rely on lotto-style fundraising, but not every club wants to build recurring income around gambling. A puzzle challenge gives clubs a different option: supporters can pay or subscribe for a number of weeks and take part in a recurring game of skill."
        bullets={[
          'Create a recurring fundraiser based on puzzles and skill',
          'Offer a family-friendly alternative to gambling-led fundraising',
          'Run campaigns across a number of weeks',
          'Use it alongside other club fundraising activity',
          'Give supporters a reason to come back each week',
          'Build repeatable revenue without creating a full event every time',
        ]}
        image={images.prizeTable}
        reverse={false}
      />

<SplitSection
  eyebrow="Digital door-to-door"
  title="Turn traditional player sponsorship into a digital campaign pack"
  text="Sports clubs already understand door-to-door sponsorship, player cards and family-led fundraising. FundRaisely can turn that familiar behaviour into a more organised digital flow, where players and parents share links and the club has clearer records of what came in."
  bullets={[
    'Give players or parents a fundraiser link to share',
    'Use links for sponsored walks, runs, challenges or team targets',
    'Reduce reliance on paper sponsor cards and loose cash',
    'Track supporter activity against the campaign',
    'Follow up on claimed, confirmed or outstanding payments',
    'Connect team-level effort to a wider club fundraising goal',
  ]}
  image={images.doorToDoorScreenshot}
  imageVariant="mobile"
  reverse
/>

      <FeatureGrid
        eyebrow="Player-led campaigns"
        title="Support the fundraising clubs already do, but make it easier to track"
        text="FundRaisely does not need clubs to abandon familiar fundraising methods. It gives those methods a better structure, especially when players, parents and team members are helping to collect support."
        items={digitalDoorToDoorItems}
      />

      <ScreenshotShowcase
        eyebrow="Product screens"
        title="From setup to payments to reports"
        text="The sports club page should show the practical side of FundRaisely: setting up an event, sharing a link, tracking supporters, checking payments and reviewing the fundraiser afterwards."
        slots={screenshotSlots}
      />

      <FeatureGrid
        eyebrow="Payments and records"
        title="Track the messy real-world money flow around club fundraising"
        text="Sports clubs often collect money through a mix of methods: cash, instant payments, bank transfers, card payments, ticket sales and sponsor contributions. FundRaisely is designed to help organisers see what is confirmed, what is claimed and what still needs follow-up."
        items={paymentReportingItems}
      />

      <SplitSection
        eyebrow="Treasurer and committee support"
        title="End the fundraiser with clearer records, not another spreadsheet mess"
        text="After a fundraiser, clubs need to know what happened. Who joined? Who paid? What is still outstanding? Which sponsors were involved? Which prizes were donated? What was raised for the team or club? FundRaisely helps keep that information connected to the event."
        bullets={[
          'Review ticket sales, entries, supporters or participants',
          'Track confirmed, claimed, late and outstanding payments',
          'Record sponsors, prize donors and giveaways',
          'Connect event activity to fundraising totals',
          'Give treasurers and committees clearer after-event records',
          'Make it easier to repeat successful fundraisers',
        ]}
        image={images.reportOverviewScreenshot}
        reverse={false}
      />

      <ProcessSteps
        eyebrow="How it works"
        title="From fundraising idea to club report"
        text="FundRaisely is designed to help a sports club move from a fundraising idea to a practical event or campaign, without losing the records along the way."
        steps={processSteps}
      />

      <SplitSection
        eyebrow="Why this matters"
        title="Clubs need fundraisers that fit real volunteer life"
        text="The strongest sports club fundraisers are the ones people can actually run. FundRaisely is designed around the reality of grassroots clubs: busy coaches, parent helpers, committee members, treasurers, local sponsors and supporters who want to help but need a simple way to take part."
        bullets={[
          'Useful for team-level and club-level fundraising',
          'Gives volunteers ready-to-run activity formats',
          'Supports both digital and real-world fundraising',
          'Helps clubs move beyond one-off manual spreadsheets',
          'Creates repeatable formats for future campaigns',
          'Keeps the focus on raising money for the club, not managing admin',
        ]}
        image={images.dashboardOverviewScreenshot}
        reverse
      />

      <FAQSection
        items={faqs}
        intro="These questions help sports clubs understand how FundRaisely can support team fundraisers, club events, recurring campaigns, sponsored activities, payment tracking and reporting."
      />

      <RelatedLinks links={relatedLinks} />

      <CTASection
        title="Want to give your club more ways to fundraise?"
        text="Book a demo to see how FundRaisely can help your sports club run team fundraisers, club events, puzzle challenges, sponsored campaigns, ticketed activities, payment tracking and reports from one clearer workflow."
        primaryCta={{ label: 'Book a demo', to: '/contact' }}
        secondaryCta={{ label: 'Explore event formats', to: '/event-formats' }}
      />
    </>
  );
}