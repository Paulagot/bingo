import { IndexPageTemplate } from '../../components/templates/IndexPageTemplate';

export default function FeaturesIndexPage() {
  return (
    <IndexPageTemplate
      path="/features"
      seoTitle="Fundraising Platform Features for Clubs, Charities and Nonprofits | FundRaisely"
      seoDescription="Explore FundRaisely features for campaigns, events, ticketing, payment reconciliation, financial reports, impact reports, CRM and AI prize finding."
      eyebrow="Features"
      h1="One fundraising system for campaigns, events, games, payments and reports"
      intro="FundRaisely brings the practical parts of grassroots fundraising into one joined-up platform: campaign planning, event setup, ticketing, digital fundraising games, payment reconciliation, reporting, supporter records and prize-finding support."
      imageKey="dashboardOverviewScreenshot"
      cards={[
        {
          title: 'Campaign Manager (Soon)',
          text: 'Plan fundraising activity around a clear goal, connect multiple events or activities to the same campaign and give committees a simple way to see what is happening, what has been raised and what still needs attention.',
          // to: '/features/campaign-manager',
        },
        {
          title: 'Event Manager',
          text: 'Set up and manage each fundraiser from one event workspace. Organisers can add the activity, review key details, manage helpers, prepare the event flow and return afterwards to complete records, payments and reports.',
          to: '/features/event-manager',
        },
        {
          title: 'Ticketing and registration',
          text: 'Create a smoother joining process for supporters, players and attendees, whether the fundraiser uses paid entry, team registration, QR codes, guest lists or simple attendance tracking.',
          to: '/features/ticketing',
        },
        {
          title: 'Payment reconciliation',
          text: 'Keep track of what was expected, what was received and what still needs to be followed up across cash, instant payments, card, bank transfer or other collection methods used by the organisation.',
          to: '/features/payments',
        },
        {
          title: 'Financial reports and records',
          text: 'Turn the messy after-event admin into clearer records for organisers, treasurers and committees, including income summaries, payment notes, prize details and final event outcomes.',
          to: '/features/reports',
        },
        {
          title: 'Impact reports and records',
          text: 'Capture more than the amount raised. Record participation, sponsors, prizes, campaign outcomes and real-world impact so organisations can show supporters what their fundraising helped achieve.',
          to: '/features/impact-reports',
        },
        {
          title: 'CRM and supporter management (Soon)',
          text: 'Build a more useful record of the people and organisations behind each fundraiser, including donors, participants, volunteers, sponsors, prize donors and repeat supporters.',
          // to: '/features/crm',
        },
        {
          title: 'AI Prize Finder (Soon)',
          text: 'Give volunteers a better starting point for finding local prize donors and sponsors, with tools to identify possible leads, prepare outreach and keep track of who has been contacted.',
          // to: '/features/ai-prize-finder',
        },
      ]}
      faqs={[
        {
          question: 'Is FundRaisely only a quiz app?',
          answer:
            'No. Quiz fundraisers are one ready-to-run activity inside the wider FundRaisely platform. The feature set is built around campaigns, events, ticketing, payment tracking, reporting, supporter records and repeat fundraising activity.',
        },
        {
          question: 'Where do ready-to-run games and activities live?',
          answer:
            'Ready-to-run games, sponsored activities and ticketed fundraiser formats live under Event Formats. The features section focuses on the platform tools that support those fundraisers, such as campaigns, event management, payments, reports and CRM.',
        },
        {
          question: 'Does FundRaisely hold fundraiser money?',
          answer:
            'No. FundRaisely is designed around direct-to-organisation payments. Organisations use their own payment methods, such as Stripe, bank transfer, instant payment details or cash collection workflows, while FundRaisely helps track and reconcile what happened.',
        },
        {
          question: 'Can ordinary events be managed as well as games?',
          answer:
            'Yes. The event tools are intended for ordinary fundraisers as well as ready-to-run FundRaisely activities, so organisers can manage the campaign, event, ticketing, payments and reports in one structure.',
        },
      ]}
    />
  );
}
