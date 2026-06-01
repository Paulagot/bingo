import { IndexPageTemplate } from '../../components/templates/IndexPageTemplate';

export default function FeaturesIndexPage() {
  return (
    <IndexPageTemplate
      path="/features"
      seoTitle="Fundraising Platform Features for Clubs, Charities and Nonprofits | FundRaisely"
      seoDescription="Explore FundRaisely features for campaigns, events, ticketing, payment reconciliation, financial reports, impact reports, CRM and AI prize finding."
      eyebrow="Features"
      h1="One fundraising system for campaigns, events, games, payments and reports"
      intro="FundRaisely brings the practical parts of grassroots fundraising into one joined-up platform: campaign planning, event setup, ticketing, payment reconciliation, reporting, supporter records and prize-finding support."
      imageKey="dashboardOverviewScreenshot"
      cards={[
        {
          title: 'Campaign Manager',
          text: 'Create fundraising goals, organise activity around a cause and keep progress visible across events, games, donations and supporter activity.',
          to: '/features/campaign-manager',
        },
        {
          title: 'Event Manager',
          text: 'FundRaisely’s Event Manager gives clubs, charities and non-profits a practical workspace for each fundraiser. Organisers can review and update the event setup, add admin helpers, prepare the live digital game, manage key on-the-night actions and return afterwards to access reconciliation, financial reports and impact records for that specific event.',
          to: '/features/event-manager',
        },
        {
          title: 'Ticketing and registration',
          text: 'Create clear supporter journeys for paid entry, attendance, participation, QR codes and event access.',
          to: '/features/ticketing',
        },
        {
          title: 'Payment reconciliation',
          text: 'Track expected, claimed, confirmed, late, disputed and written-off payments across cash, card, bank transfer and instant payments.',
          to: '/features/payments',
        },
        {
          title: 'Financial reports and records',
          text: 'Give organisers, treasurers and committees clear after-event records without rebuilding everything in a spreadsheet.',
          to: '/features/reports',
        },
        {
          title: 'Impact reports and records',
          text: 'Show the real-world impact of what was raised and how it was spent, with clear records of participation, prizes, sponsors and outcomes.',
          to: '/features/impact-reports',
        },
        {
          title: 'CRM and supporter management',
          text: 'Keep supporter, donor, participant, volunteer and sponsor records connected to the fundraisers they helped make happen.',
          to: '/features/crm',
        },
        {
          title: 'AI Prize Finder',
          text: 'Help volunteers find, contact and track possible prize donors and local sponsors without spending hours starting from scratch.',
          to: '/features/ai-prize-finder',
        },
      ]}
      faqs={[
        {
          question: 'Is FundRaisely only a quiz app?',
          answer:
            'No. Quiz fundraisers are one ready-to-run event format inside the wider FundRaisely platform. The feature set is built around campaigns, events, ticketing, payment tracking, reporting, supporter records and repeat fundraising activity.',
        },
        {
          question: 'Where do ready-to-run games live?',
          answer:
            'Ready-to-run games and fundraising formats live under Event Formats. The features section focuses on the platform tools that support those fundraisers, such as campaigns, event management, payments, reports and CRM.',
        },
        {
          question: 'Does FundRaisely hold fundraiser money?',
          answer:
            'No. FundRaisely is designed around direct-to-organisation payments. Organisations use their own payment methods, such as Stripe, bank transfer, instant payment details or cash collection workflows, while FundRaisely helps track and reconcile what happened.',
        },
        {
          question: 'Can ordinary events be managed as well as games?',
          answer:
            'Yes. The event tools are intended for ordinary fundraisers as well as ready-to-run FundRaisely formats, so organisers can manage the campaign, event, ticketing, payments and reports in one structure.',
        },
      ]}
    />
  );
}
