import { IndexPageTemplate } from '../../components/templates/IndexPageTemplate';

export default function FeaturesIndexPage() {
  return (
    <IndexPageTemplate
      path="/features"
      seoTitle="Fundraising Platform Features for Clubs, Charities and Nonprofits | FundRaisely"
      seoDescription="Explore FundRaisely features for events, ticketing, peer fundraising, payment tracking, financial reports, impact reports, donations and crypto payments."
      eyebrow="Features"
      h1="Everything your organisation needs to run, track and report on fundraising"
      intro="FundRaisely brings the practical parts of grassroots fundraising into one joined-up platform. Set up events, run built-in digital games, sell through peer fundraising, track payments across every method your supporters use, and produce clear reports for the committee - without rebuilding everything in a spreadsheet after every fundraiser."
      imageKey="dashboardOverviewScreenshot"
      cards={[
        {
          title: 'Event Manager',
          text: 'Set up and manage each fundraiser from one event workspace. Configure payment methods, manage ticketing, add admin helpers, launch the event and return afterwards to complete records and reports.',
          to: '/features/event-manager',
        },
        {
          title: 'No prep required - the game content is already there',
          text: 'Quiz questions, elimination rounds and puzzle challenges are built in to the platform. No content to prepare, no scoring to manage, no hosting script to write. Pick the format, set the price, press start.',
          to: '/event-formats',
        },
        {
          title: 'Ticketing and registration',
          text: 'Sell tickets in advance, redeem them at the event and handle on-the-night entry with QR codes. Supports Stripe, instant payments, cash, card tap and crypto on Solana.',
          to: '/features/ticketing',
        },
        {
          title: 'Peer fundraising',
          text: 'Sell activity packs door to door through individual member and player seller links, or run sponsored events where each participant collects sponsorship from their own network with a personal page and target.',
          to: '/features/peer-fundraising',
        },
        {
          title: 'Payments and reports',
          text: 'Track every payment status across cash, card, instant payments and crypto. Approve a locked audit-ready reconciliation and download financial and impact reports for the committee and treasurer.',
          to: '/features/financial-records',
        },
        {
          title: 'Impact reports and records',
          text: 'Show more than the money. Record participation, prizes, sponsors, volunteers and outcomes so the committee can see the real story behind the fundraiser and share it with supporters.',
          to: '/features/impact-reports',
        },
        {
          title: 'Donations widget',
          text: 'Embed a donate button on any website. Accepts card, instant payments and crypto on Solana donations directly to your own wallet - no intermediary holding your funds.',
          to: '/features/donations-widget',
        },
        {
          title: 'Crypto and digital asset payments',
          text: 'Accept Digital Assets across event ticket purchases, game entries and donations. Supporters connect their own wallet and pay directly to yours. The transaction appears in your normal dashboard alongside every other payment.',
          to: '/features/crypto-donations',
        },
      ]}
      faqs={[
        {
          question: 'Is FundRaisely only a quiz app?',
          answer:
            'No. Quiz fundraisers are one ready-to-run activity inside the wider FundRaisely platform. The feature set covers event management, ticketing, peer fundraising, payment tracking, reporting and crypto payments - all connected in one platform.',
        },
        {
          question: 'Do I need to prepare questions or content for the games?',
          answer:
            'No. The quiz questions, elimination rounds and puzzle challenges are built into the platform. Organisers do not need to prepare any content, manage scoring or write a hosting script. The game runs itself once you press start.',
        },
        {
          question: 'What is peer fundraising?',
          answer:
            'Peer fundraising in FundRaisely covers two models. The first lets members, players and families sell activity packs - bundles of event entries - door to door or online through their own personal seller link. The second is for sponsored events like walks or cycles, where each participant gets a personal fundraising page to collect sponsorship from their own network.',
        },
        {
          question: 'Where do ready-to-run games and activities live?',
          answer:
            'Ready-to-run games, sponsored activities and ticketed fundraiser formats live under Event Formats. The features section covers the platform tools that support those fundraisers - event management, ticketing, peer fundraising, payments, reports and crypto.',
        },
        {
          question: 'Does FundRaisely hold fundraiser money?',
          answer:
            'No. FundRaisely is designed around direct-to-organisation payments. Organisations connect their own Stripe account, use their own instant payment details and set their own Solana wallet. Funds go directly to the organisation - FundRaisely does not hold money or take a percentage of what is raised.',
        },
        {
          question: 'Can organisations accept crypto payments?',
          answer:
            'Yes. FundRaisely supports Solana crypto payments across event entries, ticket purchases and donations. The organisation connects their own Solana wallet address once, and crypto payments appear in the normal dashboard alongside card and instant payments.',
        },
        {
          question: 'Can ordinary events be managed as well as digital games?',
          answer:
            'Yes. The event tools support ticketed events such as dinners, galas, sports nights and community fundraisers as well as ready-to-run digital games. Organisers can manage setup, ticketing, payments and reports in the same workflow regardless of the event type.',
        },
      ]}
      relatedLinks={[
        {
          label: 'Event formats',
          to: '/event-formats',
          description: 'See the ready-to-run games, sponsored events and ticketed formats.',
        },
        {
          label: 'Peer fundraising',
          to: '/features/peer-fundraising',
          description: 'Let members and players carry the fundraising to their own networks.',
        },
        {
          label: 'Payments and reports',
          to: '/features/financial-records',
          description: 'Track every payment and produce committee-ready reports.',
        },
        {
          label: 'Book a demo',
          to: '/contact',
          description: 'Talk through how FundRaisely fits your organisation.',
        },
      ]}
    />
  );
}
