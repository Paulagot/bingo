import { SEO } from '../components/seo/SEO';
import { webPageJsonLd, faqJsonLd, compactStructuredData } from '../components/seo/structuredData';
import { Hero } from '../components/sections/Hero';
import { TrustBand } from '../components/sections/TrustBand';
import { FeatureGrid } from '../components/sections/FeatureGrid';
import { SplitSection } from '../components/sections/SplitSection';
import { ProcessSteps } from '../components/sections/ProcessSteps';
import { ScreenshotShowcase } from '../components/sections/ScreenshotShowcase';
import { FAQSection } from '../components/sections/FAQSection';
import { CTASection } from '../components/sections/CTASection';
import { VideoSection } from '../components/sections/VideoSection';
import { RelatedLinks } from '../components/sections/RelatedLinks';
import { images } from '../config/imageConfig';
import { getMarketConfig } from '../config/marketConfig';

export default function HomePage() {
  const market = getMarketConfig();

const homeFaqs = [
  {
    question: "How does FundRaisely work?",
    answer:
      "FundRaisely helps clubs, charities, schools and community groups set up a fundraiser, add an activity, invite participants, track payments and keep a clear record of what happened. The organiser creates the event first, then chooses the activity that sits inside it, such as a game, sponsored challenge or ticketed event.",
  },
  {
    question: "What kind of activities can we add to an event?",
    answer:
      "You can add ready-to-run fundraising activities such as quiz-style games, elimination games and puzzle challenges. FundRaisely is also being built to support sponsored activities like walks, runs, challenges and community campaigns, as well as ticketed events such as dinners, sports events, club nights and local fundraisers.",
  },
  {
    question: "Can we use FundRaisely for in-person events?",
    answer:
      "Yes. FundRaisely is being built for real grassroots fundraising, including in-person, online and hybrid events. Supporters can join from their own device, while organisers and admins can manage participants, payments, tickets, activity progress and final records from the event dashboard.",
  },
  {
    question: "How do payments work?",
    answer:
      "FundRaisely is designed around the way clubs actually collect money. Organisers can track cash, card, bank transfer, instant payments, Stripe, Revolut-style payments and other payment routes. The platform helps record what was expected, claimed, confirmed, late, disputed or written off, so the fundraiser is easier to reconcile afterwards.",
  },
  {
    question: "Does FundRaisely hold the money raised?",
    answer:
      "No. FundRaisely is designed so organisations can use their own connected payment methods where possible. The goal is to help organisers manage the fundraiser, track payments and produce clear records, without taking control of the club or charity’s money.",
  },
  {
    question: "Can admins or volunteers help run the event?",
    answer:
      "Yes. Organisers can add admins or helpers to support the event. Admins can help with setup, participant check-in, payment confirmation and event management tasks, which is useful when a fundraiser is being run by a committee or a team of volunteers.",
  },
  {
    question: "What happens after the event?",
    answer:
      "After the event, organisers can review ticket sales, on-the-night payments, extras, outstanding amounts and any manual adjustments. FundRaisely helps keep the final totals, payment notes and event records together, so the committee has a clearer report of what was raised and what still needs attention.",
  },
  {
    question: "Who is FundRaisely for?",
    answer:
      "FundRaisely is for clubs, charities, schools, community groups, sports organisations and small nonprofits that need practical ways to raise money. It is especially useful for groups that run repeat fundraisers, rely on volunteers, collect money in different ways and need clearer records afterwards.",
  },
];

  return (
    <>
      <SEO
        title="Fundraising Platform for Clubs, Schools and Charities"
        description="FundRaisely helps clubs, schools, charities, nonprofits and community groups turn fundraising ideas into ready-to-run campaigns, events and games with payment tracking and reporting built in."
        canonicalPath="/"
        structuredData={compactStructuredData([
          webPageJsonLd(
            '/',
            'A Fundraising platform people actually take part in.',
            'FundRaisely helps clubs, schools, charities, nonprofits and community groups create campaigns, run events and fundraising games, track real-world payments and report clearly on what was raised.'
          ),
          faqJsonLd(homeFaqs),
        ])}
      />

      <Hero
        eyebrow="Fundraising platform"
        title="A Fundraising platform people actually take part in."
        description={`FundRaisely helps ${market.commonOrganisationExamples} turn fundraising ideas into ready-to-run campaigns, events and games - with payment tracking, reconciliation and reporting built in.`}
        primaryCta={{ label: 'Book a demo',to: '/contact' }}
        secondaryCta={{ label: 'Explore the platform', to: '/features' }}
        image={images.communityQuizNight}
        variant="home"
      />

      <TrustBand
        items={[
          'Ready-to-run fundraising events',
          'Real-world payment tracking',
          'Campaign and event reporting',
          'Funds stay with your organisation',
        ]}
      />

      <FeatureGrid
        eyebrow="The big idea"
        title="FundRaisely gives non profits something to run, not just somewhere to collect money"
        text="Most fundraising tools start when someone is ready to donate or buy. FundRaisely starts earlier: what fundraiser are we running, who is involved, how are people paying, what did we raise, and what do we do next?"
        columns="three"
        items={[
          {
            title: 'Create the fundraising goal',
            text: 'Set up campaigns around real goals, projects, teams, causes and community needs, then connect events and fundraising activity back to the bigger target.',
            to: '/features/campaign-manager',
            label: 'View campaigns',
          },
          {
            title: 'Run events people join',
            text: 'Use ticketed events, quiz nights, elimination games, puzzle challenges, Sponsored events like walks, Ticketed events like galas, door-to-door packs and future fundraising formats to create participation, not just passive donations.',
            to: '/event-formats',
            label: 'View event formats',
          },
          {
            title: 'Prove what happened',
            text: 'Track income and impact. Payment status, participation, prizes, sponsors and final totals so committees, organisers and supporters can see the real outcome clearly.',
            to: '/features/reports',
            label: 'View reports',
          },
        ]}
      />

      <SplitSection
        eyebrow="Built for the mess"
        title="Built for how clubs actually collect money - not just how software companies wish they did"
        text="Cash. Card tap. Revolut. Monzo. Bank transfer. Stripe. Someone paid the host. Someone paid at the door. Someone promised to pay later. Someone bought tickets in advance. Someone gave extra on the night. Someone donated but did not attend. Someone collected cash door-to-door. Grassroots fundraising is messy. FundRaisely is being built to help organisers own that mess."
        bullets={[
          'Track expected, claimed, confirmed, late, disputed and written-off payments',
          'Support cash, card, bank transfer, instant payments and future payment routes',
          'Keep payment notes, participant records and fundraiser totals together',
        ]}
        image={images.homePayment}
        cta={{ label: 'Explore payment tracking', to: '/features/payments' }}
      />

      <ProcessSteps
        eyebrow="How the platform fits together"
        title="Campaigns are the goal. Events and games are the actions. Payments and reporting prove what happened."
        text="Campaigns are the fundraising goal. Events and games are the fundraising actions. Payments and reporting prove what happened. CRM helps you bring people back. FundRaisely is designed around the full fundraising cycle, not just the checkout page."
        steps={[
          {
            title: 'Create the campaign',
            text: 'Start with the fundraising goal: the cause, target, story, team, club project or community need.',
          },
          {
            title: 'Choose what to run',
            text: 'Launch a quiz, ticketed event, elimination game, puzzle challenge, door-to-door pack or another ready-to-run fundraising format.',
          },
          {
            title: 'Track money the real way',
            text: 'Record who paid, how they paid, who still needs chasing and which payments need review or write-off.',
          },
          {
            title: 'Report and bring people back',
            text: 'Review totals, participation, prizes, sponsors and supporter activity so the next fundraiser is easier to run.',
          },
        ]}
      />

      <FeatureGrid
        eyebrow="Platform areas"
        title="One fundraising system for campaigns, events, games, payments and reports"
        text="From the first fundraising idea to the final report, FundRaisely keeps campaigns, events, payments and supporter activity connected - helping organisations raise money more often without rebuilding everything in spreadsheets or hiring event hosts."
        columns="three"
        items={[
          {
            title: 'Campaign Manager (coming soon)',
            text: 'Create fundraising goals, organise activity around a cause and keep progress visible across events and donations.',
            to: '/features/campaign-manager',
          },
          {
            title: 'Event Manager',
            text: 'Plan fundraisers, manage practical details, link ticketing and keep each event connected to the wider campaign.',
            to: '/features/event-manager',
          },
          {
            title: 'Events, games and activities ready to run',
            text: 'Give organisations fundraising formats they can launch quickly and self host, from quiz nights to elimination games and puzzle challenges. We call these events in a box.',
            to: '/event-formats',
          },
          {
            title: 'Ticketing and registration',
            text: 'Create clear supporter journeys for paid entry, attendance, participation, QR codes and event access.',
            to: '/features/ticketing',
          },
          {
            title: 'Payment reconciliation',
            text: 'Track the real status of money collected across cash, card, bank transfer, instant payments, crypto and future routes.',
            to: '/features/payments',
          },
          {
            title: 'Financial reports and records',
            text: 'Give organisers, treasurers and committees clear, audit ready, after-event records without rebuilding everything in a spreadsheet.',
            to: '/features/reports',
          },
            {
            title: 'Impact reports and records',
            text: 'Show the real-world impact of what was raised and how it was spent, with clear records of participation, prizes, sponsors and outcomes - so organisers can prove what happened and bring people back to the next fundraiser.',
            to: '/features/reports',
          },
             {
            title: 'CRM and supporter management (coming soon)',
            text: 'Keep supporter records, track participation, send out thank you messages and impact statements. Bring people back to the next fundraiser with built-in CRM tools.',
            to: '/features/crm',
          },
              {
            title: 'AI Prize Finder (coming soon)',
            text: 'Volunteers spend hours chasing prize donations. The AI Prize Finder will help organisers find, contact and secure prize donations from local businesses in minutes, not hours.',
            to: '/features/ai-prize-finder',
          },
        ]}
      />

      {/* <VideoSection
        eyebrow="Platform preview"
        title="Show the full fundraising journey, not just one product screen"
        text="Use this space for a short walkthrough showing how an organiser creates a campaign, launches a fundraising event, shares the supporter page, tracks payments and reviews the final report."
        imageKey="dashboardScreenshot"
        videoLabel="FundRaisely platform walkthrough placeholder"
        transcript="Show the journey from campaign goal to ready-to-run event, supporter participation, real-world payment tracking, reconciliation and final reporting."
        cta={{ label: 'Book a demo',to: '/contact' }}
      /> */}

      <ScreenshotShowcase
        eyebrow="Product proof"
        title="Designed to replace the spreadsheet chaos behind local fundraising"
        text="From setup to ticket sales, live payments, game play, ready to run events and activities, reconciliation and reporting, FundRaisely keeps the moving parts of a fundraiser together. Organisers can see what is planned, run the event, see who has joined, how people paid, what still needs checking and what was raised at the end.."
        slots={[
          {
            title: 'Campaign and Event Dashboard',
            description: 'Lauch Events and Activities and access event managment and reports directly from the dashboard.',
            imageKey: 'productdashboard',
          },
          {
            title: 'Event and Campaign pages with Supporter ticket journey',
            description: 'Each event and campaign has a public page with clear supporter journeys for paid entry, attendance, participation, QR codes and event access.',
            imageKey: 'ticketingPublicPageScreenshot',
            variant: 'standard',
          },
              {
            title: 'Payment methods for real world fundraising',
            description: 'Every fundraiser is different, some pay cash at the door, some revolut to the coach, some buy a ticket in advance with credit card, and some like to pay with crypto. We help you handle it all, and provide you with a donation widget.',
            imageKey: 'paymentsDonations',
            variant: 'standard',
          },
          {
            title: 'Payment tracking and Audit Ready Records',
            description: 'Show expected, claimed, confirmed, late, disputed and written-off payments in one organiser view. Reconcile event takings, approve and have audit ready records.',
            imageKey: 'paymentsHeroScreenshot',
          },
          {
            title: 'Committee-ready Reports and Impact Statements',
            description: 'Final totals, payment breakdowns, prizes, sponsors and campaign outcomes and impact statements can be used for committes and supporters.',
            imageKey: 'reportsScreenshot',
          },
             {
            title: 'Exciting Digital Events',
            description: 'Our quiz has been optimised for a full fundraising Event. Our in game play and supporter journeys are designed to be fun, social and exciting for supporters, while keeping the organiser in control of the event. Running an event like a dinner, coffee morning or sporting event, we have you covered with our ticketing only events.',
            imageKey: 'gamePlayScreenshot',
          },
               {
            title: 'Run smaller more regular fundraising games',
            description: 'Elimination has been designed to be a quick digital community game that can be ran in a club on a Friday night, or as part of a family day as an extra add on. You do not always have to run an event to fundraise.',
            imageKey: 'eliminationGameplayScreenshot',
          },
               {
            title: 'Generate recurring income with subscription puzzles and challenges',
            description: 'Looking for an alternative to running a weekly lotto for reccurring income. Our puzzles and challenges offer something fun your supporters can subscribe to participate in on a weekly basis (soon).',
            imageKey: 'puzzels',
          },
         {
            title: 'Turn traditional supporter sponsorship into a digital campaign pack',
            description: 'Stop selling stuff people dont want and give them something to participate in. You already understand door-to-door sponsorship, player cards and family-led fundraising. FundRaisely can turn that familiar behaviour into a more organised digital flow, where players and parents share links and the club has clearer records of what came in (soon).',
            imageKey: 'tradationaldigital',
          },
        ]}
      />

      <SplitSection
        eyebrow="Ready-to-run formats"
        title="Turn fundraising ideas into repeatable income"
        text="A club should not have to start from scratch every time it needs money. FundRaisely helps organisations package fundraisers into repeatable formats that can be run monthly, seasonally or around a specific campaign goal."
        bullets={[
          'Quiz nights for social, in-person or hybrid fundraising',
          'Elimination games and challenge formats for repeat participation',
          'Puzzle challenges, cryptic raffles, door-to-door packs and future fundraising formats',
        ]}
          image={images.homeFormats}
        cta={{ label: 'Explore event formats', to: '/event-formats' }}
        reverse
      />

      <FeatureGrid
        eyebrow="Why it matters"
        title="Built for volunteer-led organisations that need professional records without enterprise complexity"
        text="For the people actually running the fundraiser, FundRaisely keeps the plan, participants, payments and final records together - so less time is spent chasing updates and more time is spent raising money."
        columns="four"
        items={[
          {
            title: 'For organisers',
            text: 'Know what is running, who is involved, what needs action and where each fundraiser stands.',
          },
          {
            title: 'For treasurers',
            text: 'See payment statuses, final totals, payment methods and records without chasing five different spreadsheets.',
          },
          {
            title: 'For committees',
            text: 'Review clear reports after events so decisions are based on records, not memory or WhatsApp messages.',
          },
          {
            title: 'For supporters',
            text: 'Take part in fundraisers that feel easy, local, social and worth joining - not just another donation ask.',
          },
        ]}
      />

      <RelatedLinks
        title="Explore FundRaisely"
        links={[
          {
            label: 'Features',
            to: '/features',
            description: 'See the platform areas across events, payments, ticketing, reports and more.',
          },
          {
            label: 'Event formats',
            to: '/event-formats',
            description: 'Explore quizzes, games, challenges and ready-to-run fundraising formats.',
          },
          {
            label: 'Pricing',
            to: '/pricing',
            description: 'Review simple pricing for clubs, schools, charities and community groups.',
          },
        ]}
      />

      <FAQSection
        title="FundRaisely homepage questions"
        intro="Use these FAQs to reinforce that FundRaisely is a wider fundraising platform, not just a quiz app or donation page."
        items={homeFaqs}
      />

      <CTASection
        title="Turn your next fundraising idea into something people can actually join"
        text="Create the campaign, run the event, track real-world payments and report clearly on what was raised."
        primaryCta={{ label: 'Book a demo',to: '/contact' }}
        secondaryCta={{ label: 'Explore event formats', to: '/event-formats' }}
      />
    </>
  );
}

