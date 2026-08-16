// src/pages/site/pages/games/GamesIndexPage.tsx
import { IndexPageTemplate } from '../../components/templates/IndexPageTemplate';

export default function GamesIndexPage() {
  return (
    <IndexPageTemplate
      path="/event-formats"
      seoTitle="Ready-to-Run Fundraising Event Formats | FundRaisely"
      seoDescription="Explore FundRaisely fundraising event formats — quiz nights, elimination games, weekly puzzle challenges, puzzle drops, sponsored events and ticketed events for clubs, charities, schools and community groups."
      eyebrow="Event Formats"
      h1="Ready-to-run fundraising formats for clubs, charities and community groups"
      intro="FundRaisely gives organisations something practical to run, not just somewhere to collect money. Every format includes ticketing, payment tracking and reports. The digital games come with built-in content — no questions to write, no scoring to manage. Pick a format, set a price, press start."
      imageKey="communityQuizNight"
      cards={[
        {
          title: 'Quiz fundraisers',
          text: 'A full digital quiz night with built-in questions, team or individual play, host controls, ticketing, payment tracking and committee-ready reports. Nothing to prepare — the game runs itself.',
          to: '/event-formats/quiz',
        },
        {
          title: 'Elimination games',
          text: 'A quick last-person-standing fundraiser for club nights, pub events, family fun days and campaigns. Eight rounds, built-in challenges, one winner. Run it weekly or as a one-off.',
          to: '/event-formats/elimination',
        },
        {
          title: 'Weekly Puzzle Challenge',
          text: 'A fixed-season subscription puzzle that generates recurring income. Supporters pay once for the full season, a new puzzle drops each week, and a leaderboard tracks the competition. A legal alternative to a weekly lotto for non-profits where gambling is restricted.',
          to: '/event-formats/weekly-puzzle-challenge',
        },
        {
          title: 'Puzzle Drop',
          text: 'A single standalone puzzle sold via link or QR code. Sell it at a club night, on the doorstep or via WhatsApp. Each Puzzle Drop has its own leaderboard and takes minutes to set up.',
          to: '/event-formats/puzzle-drop',
        },
        {
          title: 'Sponsored events',
          text: 'Run sponsored walks, runs, cycles, readathons and challenges. Set up the activity, link it to peer fundraising and every participant gets their own page, target and shareable link to collect sponsorship from their own network.',
          to: '/event-formats/sponsored-events',
        },
        {
          title: 'Ticketed events',
          text: 'Set up dinners, galas, sports events, race nights, awards nights, coffee mornings, family fun days and any other in-person fundraiser with ticket sales, QR check-in, payment tracking and reconciliation.',
          to: '/event-formats/ticketed-events',
        },
      ]}
      faqs={[
        {
          question: 'Do I need to prepare content for the games?',
          answer:
            'No. Quiz questions, elimination rounds and puzzle challenges are all built into the platform. You do not need to write questions, manage scoring or prepare a hosting script. Set up the event, set the price, press start.',
        },
        {
          question: 'Which event formats are available now?',
          answer:
            'All six formats are live: quiz fundraisers, elimination games, the Weekly Puzzle Challenge, Puzzle Drop, sponsored events and ticketed events. Each has its own setup flow, payment tracking and reports.',
        },
        {
          question: 'What is the Weekly Puzzle Challenge?',
          answer:
            'The Weekly Puzzle Challenge is a subscription-based puzzle fundraiser where supporters pay once for a fixed season. A new puzzle drops each week, access is gated to confirmed subscribers, and a leaderboard tracks scores across the season. Because it is skill-based rather than chance-based, it works where gambling regulations prevent running a weekly lotto.',
        },
        {
          question: 'What is a Puzzle Drop?',
          answer:
            'A Puzzle Drop is a standalone one-off puzzle sold as a single fundraiser. Supporters pay once to access one puzzle and appear on the leaderboard. It is designed to be sold quickly in person — at a club night, on the doorstep or via a QR code — without requiring any event setup or ongoing subscription.',
        },
        {
          question: 'How do sponsored events work?',
          answer:
            'Sponsored events are set up as an activity type first — with a title, fundraising goal, activity type such as walk or cycle, and a sponsorship window. They are then linked in the peer fundraising dashboard, which creates individual participant pages, personal targets and sponsorship tracking. The organiser sets up each participant page and distributes the link for the participant to share with their own network.',
        },
        {
          question: 'What are ticketed events?',
          answer:
            'Ticketed events are ordinary in-person fundraisers such as dinners, galas, sports events, race nights, awards nights, coffee mornings and family fun days. The activity happens offline but FundRaisely handles setup, ticketing, QR check-in, payment tracking and reconciliation.',
        },
        {
          question: 'Can helpers check people in at an event?',
          answer:
            'Yes. Hosts can add admins or helpers to support check-in on the day or night of the event. Admins can scan ticket QR codes on mobile, confirm attendance, help with walk-ins and support payment checks without needing to manage the whole event.',
        },
        {
          question: 'Can organisations accept payment on the night?',
          answer:
            'Yes. All event formats support payment on the night as well as pre-event ticket sales, depending on how the organiser wants to run the fundraiser. Cash, card, instant payments and crypto are all supported.',
        },
        {
          question: 'Do all formats connect to reports?',
          answer:
            'Yes. Every event format connects to payment tracking, reconciliation and reports. After the event, organisers can approve a locked audit-ready reconciliation and download financial and impact reports for the committee.',
        },
        {
          question: 'Can these formats work alongside peer fundraising?',
          answer:
            'Yes. Sponsored events connect directly to peer fundraising. Activity packs — which can include quiz entries, elimination game entries, puzzle drops and event tickets — can be sold door to door through individual member and player seller links.',
        },
      ]}
      relatedLinks={[
        {
          label: 'Peer fundraising',
          to: '/features/peer-fundraising',
          description: 'Sell activity packs door to door or run sponsored events through your people.',
        },
        {
          label: 'Weekly Puzzle Challenge',
          to: '/event-formats/weekly-puzzle-challenge',
          description: 'Generate recurring income with a subscription puzzle season.',
        },
        {
          label: 'Features',
          to: '/features',
          description: 'See the platform tools behind every event format.',
        },
        {
          label: 'Contact',
          to: '/contact',
          description: 'Talk through which formats fit your organisation.',
        },
      ]}
    />
  );
}
