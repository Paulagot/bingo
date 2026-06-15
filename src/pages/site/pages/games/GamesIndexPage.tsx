import { IndexPageTemplate } from '../../components/templates/IndexPageTemplate';

export default function GamesIndexPage() {
  return (
    <IndexPageTemplate
      path="/event-formats"
      seoTitle="Ready-to-Run Fundraising Event Formats | FundRaisely"
      seoDescription="Explore FundRaisely fundraising event formats, including quiz fundraisers, elimination games, puzzle challenges and non-digital ticketed events for dinners, galas, sports days and community fundraisers."
      eyebrow="Event Formats"
      h1="Ready-to-run fundraising formats"
      intro="FundRaisely gives organisations something practical to run, not just somewhere to collect money. Use event formats to turn fundraising ideas into activities people can join, share and support, from digital games to ticketed community events."
      imageKey="communityQuizNight"
      cards={[
        {
          title: 'Quiz fundraisers',
          text: 'A familiar, social event format with setup, ticketing, player management, payment tracking, host controls and reports.',
          to: '/event-formats/quiz',
        },
        {
          title: 'Elimination games',
          text: 'A quick last-person-standing fundraiser designed for regular participation, pub nights, club events, campaigns and one clear winner.',
          to: '/event-formats/elimination',
        },
        {
          title: 'Puzzle challenges (Soon)',
          text: 'A challenge-based format for supporters who enjoy clues, problem-solving and prize-led fundraising. This format is coming soon.',
          // to: '/event-formats/puzzle-challenges',
        },
        {
          title: 'Non-digital ticketed events',
          text: 'Set up dinners, galas, sports events, race nights, awards nights, coffee mornings, family fun days and other ticketed fundraisers with ticket sales, QR check-in, admins, payment tracking and reconciliation.',
          to: '/event-formats/ticketed-events',
        },
        /*
        {
          title: 'Escape room fundraisers',
          text: 'A team-based challenge format for schools, clubs, charities and community groups that want a more immersive fundraiser.',
          to: '/event-formats/escape-room',
        },
        */
        /*
        {
          title: 'Treasure hunts',
          text: 'A local challenge format for community trails, family fundraisers and supporter campaigns.',
          to: '/event-formats/treasure-hunt',
        },
        */
      ]}
      faqs={[
        {
          question: 'Why call these Event Formats?',
          answer:
            'Because FundRaisely is not only a quiz app. Event Formats gives room for digital games, repeatable fundraising activities, campaign activities and non-digital ticketed events that organisations can set up, share, run and report on.',
        },
        {
          question: 'Which event formats are available now?',
          answer:
            'FundRaisely is focused on quiz fundraisers, elimination games and ticketed event workflows. Puzzle challenges are planned soon, while other challenge formats can be added later as the platform expands.',
        },
        {
          question: 'What are non-digital ticketed events?',
          answer:
            'Non-digital ticketed events are ordinary fundraising events such as dinners, galas, sports events, race nights, awards nights, coffee mornings, family fun days, concerts, workshops, community evenings and other in-person fundraisers. The activity happens offline, but FundRaisely helps with setup, ticketing, check-in, payment tracking and reconciliation.',
        },
        {
          question: 'How do ticketed events work?',
          answer:
            'The host sets up the event, selects ticketed event as the format, adds ticket prices, sponsor details, prize or giveaway details where relevant, and shares the event link. Supporters can buy or reserve tickets, and the organiser can manage attendance and payments through the event flow.',
        },
        {
          question: 'Can helpers check people in at the event?',
          answer:
            'Yes. Hosts can add admins or helpers to support check-in on the day or night of the event. Admins can scan ticket QR codes on mobile, confirm attendance, help with walk-ins and support payment checks without needing to run the whole event.',
        },
        {
          question: 'Can organisations accept payment on the night?',
          answer:
            'Yes. Ticketed events can support payment on the night as well as pre-event ticket sales, depending on how the organiser wants to run the fundraiser. Payment records can then flow into the same tracking and reconciliation process used across FundRaisely event formats.',
        },
        {
          question: 'Can these formats connect to campaigns and reports?',
          answer:
            'Yes. Event formats are intended to connect back to campaigns, ticketing, payment tracking, CRM, impact statements and reports so each fundraiser has a clear setup, activity record and outcome record.',
        },
        {
          question: 'Can organisations still run ordinary events?',
          answer:
            'Yes. FundRaisely supports ordinary ticketed events as well as ready-to-run games and activities. That means an organisation can run a quiz, an elimination game, a campaign activity or a traditional event such as a dinner, gala, sports day or community fundraiser.',
        },
      ]}
      relatedLinks={[
        {
          label: 'Features',
          to: '/features',
          description: 'See the platform tools behind each fundraiser.',
        },
        {
          label: 'Quiz fundraisers',
          to: '/event-formats/quiz',
          description: 'Run a digital quiz night for teams or individuals.',
        },
        {
          label: 'Elimination games',
          to: '/event-formats/elimination',
          description: 'Run a quick last-person-standing fundraising game.',
        },
        {
          label: 'Book a demo',
          to: '/contact',
          description: 'Talk through which formats fit your organisation.',
        },
      ]}
    />
  );
}
