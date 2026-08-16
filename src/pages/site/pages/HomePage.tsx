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
import { RelatedLinks } from '../components/sections/RelatedLinks';
import { images } from '../config/imageConfig';
import { getMarketConfig } from '../config/marketConfig';

export default function HomePage() {
  const market = getMarketConfig();

  const homeFaqs = [
    {
      question: 'How does FundRaisely work?',
      answer:
        'FundRaisely helps clubs, charities, schools and community groups set up a fundraiser, add an activity, invite participants, track payments and keep a clear record of what happened. The organiser creates the event first, then chooses the activity that sits inside it - a game, sponsored challenge, ticketed event or peer fundraising campaign.',
    },
    {
      question: 'What kind of activities can we run?',
      answer:
        'FundRaisely supports ready-to-run digital games including quiz nights, elimination games, weekly puzzle challenges and puzzle drops. It also supports sponsored events like walks, runs and cycles with personal participant pages, ticketed events like dinners and galas, and peer fundraising where members and players sell activity packs to their own networks.',
    },
    {
      question: 'What is peer fundraising?',
      answer:
        'Peer fundraising in FundRaisely covers two models. The first lets members, players and families sell activity packs - bundles of event entries - door to door or online through their own personal seller link. The second is for sponsored events like walks or cycles, where each participant gets a personal fundraising page to collect sponsorship from their own network.',
    },
    {
      question: 'Can we use FundRaisely for in-person events?',
      answer:
        'Yes. FundRaisely supports in-person, online and hybrid fundraising. Supporters can join from their own device while organisers and admins manage participants, payments, tickets, game controls and final records from the event dashboard.',
    },
    {
      question: 'How do payments work?',
      answer:
        'FundRaisely is designed around the way non-profits actually collect money. Organisers can track cash, card, bank transfer, instant payments, Stripe, Revolut-style payments and crypto on Solana. The platform records what was expected, claimed, confirmed, late, disputed or written off - so the fundraiser is easier to reconcile afterwards.',
    },
    {
      question: 'Can supporters donate in crypto?',
      answer:
        'Yes. FundRaisely supports Solana crypto payments across event entries and donations. Supporters connect their own wallet, confirm the amount and send. The transaction is verified on-chain and appears in the organiser dashboard alongside every other payment method. Funds go directly to the organisation\'s own connected wallet.',
    },
    {
      question: 'Does FundRaisely hold the money raised?',
      answer:
        'No. FundRaisely is designed so organisations use their own connected payment methods. Funds go directly to the organisation - FundRaisely does not hold money or take a percentage of what is raised.',
    },
    {
      question: 'What happens after the event?',
      answer:
        'After the event, organisers can review ticket sales, on-the-night payments, outstanding amounts and any adjustments. The reconciliation can be approved and locked, creating an audit-ready record. Financial and impact reports can be downloaded for the committee.',
    },
    {
      question: 'Who is FundRaisely for?',
      answer:
        'FundRaisely is for clubs, charities, schools, community groups, sports organisations and small non-profits that need practical ways to raise money. It is especially useful for groups that run repeat fundraisers, rely on volunteers, collect money in different ways and need clearer records afterwards.',
    },
  ];

  return (
    <>
      <SEO
        title="Fundraising Platform for Clubs, Schools and Charities"
        description="FundRaisely helps clubs, schools, charities, nonprofits and community groups turn fundraising ideas into ready-to-run events, games and peer fundraising campaigns - with payment tracking and reporting built in."
        canonicalPath="/"
        structuredData={compactStructuredData([
          webPageJsonLd(
            '/',
            'A fundraising platform people actually take part in.',
            'FundRaisely helps clubs, schools, charities, nonprofits and community groups run events, games and peer fundraising campaigns, track real-world payments and report clearly on what was raised.'
          ),
          faqJsonLd(homeFaqs),
        ])}
      />

      <Hero
        eyebrow="Fundraising platform"
        title="A fundraising platform people actually take part in."
        description={`FundRaisely helps ${market.commonOrganisationExamples} run events, games and peer fundraising campaigns - with payment tracking, reconciliation and reporting built in.`}
        primaryCta={{ label: 'Book a demo', to: '/contact' }}
        secondaryCta={{ label: 'Explore the platform', to: '/features' }}
        image={images.communityQuizNight}
        variant="home"
        priority={true}
      />

      <TrustBand
        items={[
          'Ready-to-run fundraising events and games',
          'Peer fundraising with personal seller pages',
          'Real-world payment tracking',
          'Funds stay with your organisation',
        ]}
      />

      <FeatureGrid
        eyebrow="The big idea"
        title="FundRaisely gives non-profits something to run, not just somewhere to collect money"
        text="Most fundraising tools start when someone is ready to donate or buy. FundRaisely starts earlier - what are we running, who is involved, how are people paying, what did we raise, and what do we do next?"
        columns="three"
        items={[
          {
            title: 'Run events and games people join',
            text: 'Quiz nights, elimination games, weekly puzzle challenges, puzzle drops, sponsored walks, ticketed dinners and door-to-door activity packs. Ready-to-run formats your supporters can take part in.',
            to: '/event-formats',
            label: 'View event formats',
          },
          {
            title: 'Let your people carry the fundraising further',
            text: 'Peer fundraising turns members, players and families into your distribution network. Sell activity packs door to door, or run sponsored events where each participant collects from their own network.',
            to: '/features/peer-fundraising',
            label: 'View peer fundraising',
          },
          {
            title: 'Prove what happened',
            text: 'Track payments across every method your supporters use. Approve the reconciliation, lock the record, download the report. Committees and treasurers get the full picture without the spreadsheet.',
            to: '/features/financial-records',
            label: 'View payments and reports',
          },
        ]}
      />

      <SplitSection
        eyebrow="Peer fundraising"
        title="Your members, players and families are your best fundraisers"
        text="The people most likely to give to your cause are the ones your members and players already know. FundRaisely peer fundraising puts the fundraising into their hands - each seller or participant gets their own link, and the organisation tracks everything without chasing envelopes."
        bullets={[
          'Sell activity packs door to door through individual seller links',
          'Bundle quiz entries, elimination games, puzzle drops and event tickets into one pack',
          'Run sponsored walks, runs and cycles with personal participant pages',
          'Each participant gets their own target, story and shareable link',
          'Cash, card, instant payments and crypto all tracked in the same dashboard',
          'Committee-ready report when the fundraiser is done',
        ]}
        image={images.tradationaldigital}
        cta={{ label: 'Explore peer fundraising', to: '/features/peer-fundraising' }}
        reverse={false}
      />

      <SplitSection
        eyebrow="Built for the mess"
        title="Built for how clubs actually collect money - not just how software companies wish they did"
        text="Cash. Card tap. Revolut. Monzo. Bank transfer. Stripe. Solana. Someone paid the host. Someone paid at the door. Someone promised to pay later. Someone bought tickets in advance. Someone donated in crypto. Grassroots fundraising is messy. FundRaisely is built to help organisers own that mess."
        bullets={[
          'Track expected, claimed, confirmed, late, disputed and written-off payments',
          'Support cash, card, bank transfer, instant payments, Stripe and crypto on Solana',
          'Keep payment notes, participant records and fundraiser totals together',
        ]}
        image={images.homePayment}
        cta={{ label: 'Explore payment tracking', to: '/features/financial-records' }}
        reverse
      />

      <ProcessSteps
        eyebrow="How it fits together"
        title="Run the event. Reach further through your people. Track the money. Report to the committee."
        text="FundRaisely is built around the full fundraising cycle - not just the moment someone pays. From the first event setup to the final committee report, everything stays connected."
        steps={[
          {
            title: 'Choose what to run',
            text: 'Set up a quiz night, elimination game, weekly puzzle challenge, sponsored walk, ticketed dinner or door-to-door activity pack - whatever fits your organisation and your supporters.',
          },
          {
            title: 'Let your people carry it further',
            text: 'Use peer fundraising to put individual seller links and personal participant pages in the hands of members, players and families. The fundraising travels further because the ask comes from someone the buyer knows.',
          },
          {
            title: 'Track every payment the real way',
            text: 'Record who paid, how they paid, who still needs chasing and which payments need review or write-off. Cash, card, instant payments and crypto all in one dashboard.',
          },
          {
            title: 'Report clearly and bring people back',
            text: 'Approve the reconciliation, lock the record, download the financial and impact report. Give the committee what they need and give supporters a reason to come back next time.',
          },
        ]}
      />

      <FeatureGrid
        eyebrow="Platform features"
        title="Everything your organisation needs to run, track and report on fundraising"
        text="From event setup to peer fundraising, payment tracking and committee reports - FundRaisely keeps each part of the fundraiser connected so less time is spent rebuilding records and more time is spent raising money."
        columns="three"
        items={[
      
  {
    title: 'Event Manager',
    text: 'Set up events, configure payment methods, manage ticketing, add admin helpers and launch your fundraiser from one organiser workspace.',
    to: '/features/event-manager',
  },
  {
    title: 'No prep required - the game content is already there',
    text: 'The quiz questions, elimination rounds and puzzle challenges are built in. No content to prepare, no scoring to manage, no hosting script to write. Pick the format, set the price, press start.',
    to: '/event-formats',
  },
  {
    title: 'Ticketing and registration',
    text: 'Sell tickets in advance, redeem them at the event and handle on-the-night entry with QR codes, instant payments, Stripe, cash and crypto.',
    to: '/features/ticketing',
  },
  {
    title: 'Peer fundraising',
    text: 'Sell activity packs door to door through individual seller links, or run sponsored events where each participant collects from their own network with a personal page and target.',
    to: '/features/peer-fundraising',
  },
  {
    title: 'Payments and reports',
    text: 'Track every payment status, approve a locked audit-ready reconciliation and download financial and impact reports for the committee and treasurer.',
    to: '/features/financial-records',
  },
  {
    title: 'Donations widget',
    text: 'Embed a donate button on any website. Accepts card, instant payments and crypto on Solana donations directly to your own wallet - no intermediary.',
    to: '/features/donations-widget',
  },
  {
    title: 'Crypto and digital asset payments',
    text: 'Accept Digital Assets across event entries and donations. Supporters connect their own wallet, pay directly to yours, and the transaction appears in your normal dashboard.',
    to: '/features/crypto-donations',
  },
  {
    title: 'Impact reports',
    text: 'Show more than the money. Record participation, prizes, sponsors, volunteers and outcomes so the committee can see the real story behind the fundraiser.',
    to: '/features/impact-reports',
  },
]}
  
      />

      <ScreenshotShowcase
        eyebrow="Product proof"
        title="Designed to replace the spreadsheet chaos behind local fundraising"
        text="From setup to ticket sales, live payments, game play and reporting, FundRaisely keeps the moving parts of a fundraiser together. Organisers can see what is planned, run the event, track who has paid and what was raised."
        slots={[
          {
            title: 'Campaign and Event Dashboard',
            description: 'Launch events and activities and access event management and reports directly from the dashboard.',
            imageKey: 'productdashboard',
          },
          {
            title: 'Event and supporter ticket journey',
            description: 'Each event has a public page with clear supporter journeys for paid entry, attendance, participation, QR codes and event access.',
            imageKey: 'ticketingPublicPageScreenshot',
            variant: 'standard',
          },
          {
            title: 'Payment methods for real-world fundraising',
            description: 'Cash at the door, Revolut to the coach, card in advance, Solana crypto, or a donation widget on your website - FundRaisely handles it all in one dashboard.',
            imageKey: 'paymentsDonations',
            variant: 'standard',
          },
          {
            title: 'Payment tracking and audit-ready records',
            description: 'See expected, claimed, confirmed, late, disputed and written-off payments in one organiser view. Reconcile event takings and approve audit-ready records.',
            imageKey: 'paymentsHeroScreenshot',
          },
          {
            title: 'Committee-ready reports and impact statements',
            description: 'Final totals, payment breakdowns, prizes, sponsors, participation and campaign outcomes - ready to download and share with committees and supporters.',
            imageKey: 'reportsScreenshot',
          },
          {
            title: 'Digital quiz fundraising events',
            description: 'Our quiz is built for a full fundraising event night. In-game play and supporter journeys are designed to be fun and social while keeping the organiser in control.',
            imageKey: 'gamePlayScreenshot',
          },
          {
            title: 'Quick regular fundraising games',
            description: 'Elimination is a fast last-person-standing game for a club Friday night or family fun day add-on. You do not always have to run a full event to fundraise.',
            imageKey: 'eliminationGameplayScreenshot',
          },
          {
            title: 'Weekly Puzzle Challenge for recurring income',
            description: 'A fixed-season subscription puzzle where supporters pay once and a new challenge drops each week. A leaderboard keeps it competitive - and a legal alternative to a weekly lotto.',
            imageKey: 'puzzels',
          },
          {
            title: 'Peer fundraising - sell through your people',
            description: 'Members and players each get their own seller link to sell activity packs door to door. The same model as a player card, but digital, with instant payment and automatic records.',
            imageKey: 'tradationaldigital',
          },
        ]}
      />

      <SplitSection
        eyebrow="Ready-to-run formats"
        title="Turn fundraising ideas into repeatable income"
        text="A non-profit should not have to start from scratch every time it needs money. FundRaisely gives organisations formats they can run monthly, seasonally or around a specific goal - digital events, peer campaigns and ticketed events all in one platform."
        bullets={[
          'Quiz nights for social, in-person or hybrid fundraising',
          'Elimination games for quick regular fundraising moments',
          'Weekly Puzzle Challenge for recurring season income',
          'Puzzle Drop for a quick one-off fundraiser sold anywhere',
          'Sponsored events with personal participant pages',
          'Door-to-door activity packs sold by members and players',
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
            description: 'See the platform areas across events, peer fundraising, payments and reports.',
          },
          {
            label: 'Event formats',
            to: '/event-formats',
            description: 'Explore quizzes, games, challenges, sponsored events and ready-to-run formats.',
          },
          {
            label: 'Pricing',
            to: '/pricing',
            description: 'Review simple pricing for clubs, schools, charities and community groups.',
          },
        ]}
      />

      <FAQSection
        title="Common questions about FundRaisely"
        intro="FundRaisely is more than a quiz app or donation page. These questions cover the platform as it actually works today."
        items={homeFaqs}
      />

      <CTASection
        title="Turn your next fundraising idea into something people can actually join"
        text="Run the event, reach further through your people, track every payment and report clearly on what was raised."
        primaryCta={{ label: 'Book a demo', to: '/contact' }}
        secondaryCta={{ label: 'Explore event formats', to: '/event-formats' }}
      />
    </>
  );
}

