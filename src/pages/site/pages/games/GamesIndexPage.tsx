import { IndexPageTemplate } from '../../components/templates/IndexPageTemplate';

export default function GamesIndexPage() {
  return (
    <IndexPageTemplate
      path="/event-formats"
      seoTitle="Ready-to-Run Fundraising Event Formats | FundRaisely"
      seoDescription="Explore FundRaisely ready-to-run fundraising formats, including quiz fundraisers, elimination games, puzzle challenges, escape rooms and treasure hunts."
      eyebrow="Event Formats"
      h1="Ready-to-run fundraising formats"
      intro="FundRaisely gives organisations something to run, not just somewhere to collect money. Use event formats to turn fundraising ideas into practical activities people can join, share and support."
      imageKey="communityQuizNight"
      cards={[
        {
          title: 'Quiz fundraisers',
          text: 'A familiar, social event format with setup, ticketing, player management, payment tracking and reports.',
          to: '/event-formats/quiz',
        },
        {
          title: 'Elimination games',
          text: 'A last-person-standing style fundraiser designed for repeat participation, longer selling windows and one clear winner.',
          to: '/event-formats/elimination',
        },
        {
          title: 'Puzzle challenges',
          text: 'A challenge-based format for supporters who enjoy clues, problem-solving and prize-led fundraising.',
          to: '/event-formats/puzzle-challenges',
        },
        {
          title: 'Escape room fundraisers',
          text: 'A team-based challenge format for schools, clubs, charities and community groups that want a more immersive fundraiser.',
          to: '/event-formats/escape-room',
        },
        {
          title: 'Treasure hunts',
          text: 'A local challenge format for community trails, family fundraisers and supporter campaigns.',
          to: '/event-formats/treasure-hunt',
        },
      ]}
      faqs={[
        {
          question: 'Why call these Event Formats?',
          answer:
            'Because FundRaisely is not only a quiz app. Event Formats gives room for quizzes, games, challenges, door-to-door packs, raffles, auctions and future fundraising activities that organisations can run.',
        },
        {
          question: 'Can these formats connect to campaigns and reports?',
          answer:
            'Yes. Event formats are intended to connect back to campaigns, ticketing, payment tracking, CRM and reports so each fundraiser has a clear setup and outcome record.',
        },
        {
          question: 'Can organisations still run ordinary events?',
          answer:
            'Yes. FundRaisely should support ordinary events as well as ready-to-run formats. The event formats are the repeatable fundraising activities, while Event Manager and Campaign Manager support the wider platform workflow.',
        },
      ]}
      relatedLinks={[
        { label: 'Features', to: '/features', description: 'See the platform tools behind each fundraiser.' },
        { label: 'Campaign Manager', to: '/features/campaign-manager', description: 'Connect formats to a fundraising goal.' },
        { label: 'Book a demo', to: '/demo', description: 'Talk through which formats fit your organisation.' },
      ]}
    />
  );
}
