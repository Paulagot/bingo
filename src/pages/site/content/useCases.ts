import type { TemplateContent } from './types';

export const useCasePages: Record<string, TemplateContent> = {
  'sports-clubs': {
    path: '/use-cases/sports-clubs',

    schemaMode: 'webPage',

    seoTitle:
      'Fundraising Software for Sports Clubs and Social Clubs | FundRaisely',
    seoDescription:
      'FundRaisely helps sports and social clubs run fundraising events, sell tickets, track payments, manage sponsors and prepare clearer reports for committees.',

    eyebrow: 'Sports clubs',
    h1: 'Fundraising tools for sports and social clubs',
    intro:
      'FundRaisely helps sports and social clubs run better fundraising events, sell tickets, track payments, manage prizes and give committees clearer reports after every fundraiser.',

    imageKey: 'sportsClubFundraiser',
    visualEmphasis: 'photo_heavy',

    primaryCta: {
      label: 'Book a demo',
     to: '/contact',
    },

    secondaryCta: {
      label: 'See event formats',
      to: '/event-formats',
    },

    problemTitle: 'Club fundraising often lands on the same busy volunteers',
    problemText:
      'Sports clubs raise money for kit, travel, facilities, tournaments, youth teams, equipment and social events - but the admin often ends up spread across WhatsApp messages, spreadsheets, cash notes, Revolut payments, ticket lists and committee updates. That makes it hard to know what has been sold, who has paid, what prizes were promised and what the final result actually was.',

    solutionTitle: 'A clearer way to organise club fundraisers',
    solutionText:
      'FundRaisely gives clubs a practical structure for fundraising events. Organisers can choose an event format, manage ticketing or entries, track payment status, record prizes and sponsors, and review the outcome afterwards. It is designed for real club workflows where some payments are online, some are manual, and volunteers need a simple way to keep everything together.',

    benefits: [
      {
        title: 'Run club-friendly event formats',
        text:
          'Start with quiz fundraisers and build towards wider event formats such as elimination games, puzzle challenges and other club fundraising activities.',
        to: '/event-formats',
      },
      {
        title: 'Sell tickets and manage entries',
        text:
          'Create clearer supporter journeys for members, parents, teams and local supporters who want to join or attend a fundraiser.',
        to: '/features/ticketing',
      },
      {
        title: 'Track payments without spreadsheet chaos',
        text:
          'Keep expected, claimed, confirmed, late and written-off payments easier to review across card, cash, bank transfer and instant payment methods.',
        to: '/features/payments',
      },
      {
        title: 'Give committees clearer reports',
        text:
          'After the event, review totals, participation, payment decisions, prizes and notes in a format that is easier to explain.',
        to: '/features/reports',
      },
      {
        title: 'Support sponsors and prize-led fundraising',
        text:
          'Record prize details, sponsor names and winner information so local business support is easier to recognise and report.',
        to: '/features/ai-prize-finder',
      },
      {
        title: 'Reduce volunteer admin',
        text:
          'Give hosts, admins and helpers a clearer workflow so one person is not left trying to reconcile everything afterwards.',
        to: '/features/event-manager',
      },
    ],

    process: [
      {
        title: 'Choose the fundraiser',
        text:
          'Pick the event format that suits the club, such as a quiz night, elimination fundraiser, ticketed social event or prize-led campaign.',
      },
      {
        title: 'Set up tickets and payment options',
        text:
          'Add prices, capacity, payment methods and any on-the-night payment options before sharing the fundraiser with members and supporters.',
      },
      {
        title: 'Promote through club channels',
        text:
          'Share the fundraiser with teams, parents, players, members, sponsors and local supporters using links or QR codes.',
      },
      {
        title: 'Track entries and payments',
        text:
          'See who has joined, who has paid, who is pending and what still needs follow-up before or after the event.',
      },
      {
        title: 'Run the event',
        text:
          'Use the relevant event tools, host screens, ticket records or admin views to keep the fundraiser organised on the day.',
      },
      {
        title: 'Report back to the committee',
        text:
          'Review income, payments, prizes, sponsors and event notes so the committee has a clearer record of the outcome.',
      },
    ],

    screenshotSlots: [
      {
        title: 'Club fundraiser dashboard',
        description:
          'Give organisers one place to see active events, payment checks, ticket activity and follow-up work.',
        imageKey: 'dashboardScreenshot',
        variant: 'desktop',
      },
      {
        title: 'Mobile-friendly organiser view',
        description:
          'Help volunteers review key fundraiser details from a phone while they are at the venue or on the move.',
        imageKey: 'paymentActivePlayersMobileScreenshot',
        variant: 'mobile',
      },
      {
        title: 'Ticketing and entries',
        description:
          'Track who has registered, how they are paying and which entries still need attention.',
        imageKey: 'ticketingScreenshot',
        variant: 'standard',
      },
      {
        title: 'Committee-ready reporting',
        description:
          'Use after-event records to explain what was collected, what was outstanding and what decisions were made.',
        imageKey: 'reportsScreenshot',
        variant: 'standard',
      },
    ],

    sections: {
      screenshots: {
        eyebrow: 'Club workflow',
        title: 'Screens built around real club fundraising admin',
        text:
          'From ticket sales to payment follow-up and committee reporting, FundRaisely is designed to help volunteers keep club fundraisers organised without relying on scattered spreadsheets.',
      },

      benefits: {
        eyebrow: 'Club benefits',
        title: 'Built for the way clubs actually raise money',
        text:
          'Sports and social clubs often need flexible fundraising tools that work for members, parents, sponsors, volunteers and committees.',
      },

      process: {
        eyebrow: 'How it works',
        title: 'A practical fundraising flow for clubs',
        text:
          'FundRaisely helps clubs move from idea to event to committee report with fewer loose ends.',
      },

      proof: {
        eyebrow: 'Club example',
        title: 'From quiz nights to wider club fundraising campaigns',
        text:
          'A club might start with a quiz night, add ticketing and payment tracking, then use the same platform structure for future fundraisers, social events, prize-led campaigns or team activities.',
        bullets: [
          'Raise funds for kit, travel, facilities or youth teams',
          'Give volunteers a clearer setup and payment workflow',
          'Recognise sponsors and prize supporters',
          'Report back to the committee with better records',
        ],
        imageKey: 'sportsClubFundraiser',
        reverse: true,
      },

      faq: {
        intro:
          'These questions cover the practical issues sports clubs usually ask before running a fundraiser with FundRaisely.',
      },

      cta: {
        title: 'Ready to organise your next club fundraiser?',
        text:
          'Book a demo to see how FundRaisely can help your club run event formats, sell tickets, track payments and report back with more confidence.',
        primaryCta: {
          label: 'Book a demo',
         to: '/contact',
        },
        secondaryCta: {
          label: 'Explore event formats',
          to: '/event-formats',
        },
      },
    },

    faqs: [
      {
        question: 'Is FundRaisely only for club quiz nights?',
        answer:
          'No. Quiz fundraisers are currently the most mature event format, but FundRaisely is being built as a wider fundraising platform for clubs, including ticketing, payment tracking, reports, event management, prize records and future event formats.',
      },
      {
        question: 'What can a sports club raise money for with FundRaisely?',
        answer:
          'Sports clubs can use FundRaisely to support fundraising for kit, travel, equipment, facilities, tournaments, youth teams, social events and community projects.',
      },
      {
        question: 'Can we sell tickets for a club fundraiser?',
        answer:
          'Yes. FundRaisely includes ticketing and entry tracking so clubs can manage who has registered, how many places are sold and which payments still need attention.',
      },
      {
        question: 'Can we track cash, Revolut, bank transfer and card payments?',
        answer:
          'Yes. FundRaisely is designed for mixed payment methods. Online payments can be confirmed where possible, while manual methods such as cash, Revolut and bank transfer can be tracked, claimed and confirmed by organisers.',
      },
      {
        question: 'Can volunteers or admins help manage the fundraiser?',
        answer:
          'Yes. FundRaisely is being structured around real club workflows where hosts, admins and volunteers may help with setup, ticketing, payment checks or event tasks.',
      },
      {
        question: 'Can FundRaisely help with sponsor and prize records?',
        answer:
          'Yes. Clubs can record prize details, sponsor names, values, winners and follow-up notes so local support is easier to recognise and report.',
      },
      {
        question: 'What does the committee get after the event?',
        answer:
          'FundRaisely can help organisers prepare clearer after-event records covering tickets, payments, outstanding amounts, write-offs, prizes, sponsors and fundraising totals.',
      },
      {
        question: 'Can we run a fundraiser over a few weeks?',
        answer:
          'Yes. FundRaisely can support campaign-style fundraising where tickets or entries are promoted over a selling window before the main event or final activity takes place.',
      },
    ],

    relatedLinks: [
      {
        label: 'Event formats',
        to: '/event-formats',
        description:
          'Explore quiz fundraisers, elimination events and future fundraising formats.',
      },
      {
        label: 'Payments',
        to: '/features/payments',
        description:
          'See how clubs can track manual and online payments without spreadsheet chaos.',
      },
      {
        label: 'Ticketing',
        to: '/features/ticketing',
        description:
          'Connect ticket sales and supporter entries to payment records.',
      },
      {
        label: 'Reports',
        to: '/features/reports',
        description:
          'Review totals and after-event records for committees.',
      },
    ],
  },

'schools-ptas': {
  path: '/use-cases/schools-ptas',

  schemaMode: 'webPage',

  seoTitle:
    'Fundraising Tools for Schools and PTAs | FundRaisely',
  seoDescription:
    'FundRaisely helps schools and PTAs run fundraising events, sell tickets, track payments, manage prizes and prepare clearer reports for committees and parent volunteers.',

  eyebrow: 'Schools & PTAs',
  h1: 'Fundraising tools for schools and PTAs',
  intro:
    'FundRaisely helps schools, PTAs and parent groups run easier fundraising events with clearer ticketing, payment tracking, prize records and committee-ready reports.',

  imageKey: 'schoolFundraisingEvent',
  visualEmphasis: 'photo_heavy',

  primaryCta: {
    label: 'Book a demo',
   to: '/contact',
  },

  secondaryCta: {
    label: 'See event formats',
    to: '/event-formats',
  },

  problemTitle: 'School fundraising needs to be simple for busy volunteers',
  problemText:
    'PTA and school fundraisers often depend on parents, teachers and volunteers who are already stretched. Ticket lists, cash at the door, bank transfers, prizes, sponsor notes, reminders and committee updates can quickly end up scattered across messages, spreadsheets and paper notes.',

  solutionTitle: 'A clearer structure for school and PTA fundraisers',
  solutionText:
    'FundRaisely gives school organisers a practical way to set up fundraising events, manage tickets or entries, track payment status, record prizes and review the outcome afterwards. It is designed to support real-world school fundraising where some payments happen online, some happen manually, and the committee needs a clear record after the event.',

  benefits: [
    {
      title: 'Run family-friendly event formats',
      text:
        'Start with quiz fundraisers and build towards wider event formats such as elimination games, puzzle challenges and other school-friendly fundraising activities.',
      to: '/event-formats',
    },
    {
      title: 'Sell tickets and manage entries',
      text:
        'Create a clearer journey for parents, pupils, staff and supporters who want to join, attend or support a school fundraiser.',
      to: '/features/ticketing',
    },
    {
      title: 'Track school payment methods',
      text:
        'Keep expected, claimed, confirmed, late and written-off payments easier to review across card, cash, bank transfer and instant payment methods.',
      to: '/features/payments',
    },
    {
      title: 'Give treasurers clearer reports',
      text:
        'Help PTA treasurers and school committees review ticket sales, payment decisions, prizes and fundraiser totals after the event.',
      to: '/features/reports',
    },
    {
      title: 'Support prizes and local sponsors',
      text:
        'Record prize details, sponsor names, values, winners and follow-up notes so local support is easier to recognise.',
      to: '/features/ai-prize-finder',
    },
    {
      title: 'Make volunteering easier',
      text:
        'Give organisers, hosts and helpers a clearer workflow so the fundraising admin does not fall to one person afterwards.',
      to: '/features/event-manager',
    },
  ],

  process: [
    {
      title: 'Choose the fundraiser',
      text:
        'Pick a school-friendly event format such as a quiz night, family challenge, ticketed event or prize-led fundraiser.',
    },
    {
      title: 'Set up tickets and payment options',
      text:
        'Add prices, capacity, payment methods and any on-the-night options before sharing the fundraiser with parents and supporters.',
    },
    {
      title: 'Share with the school community',
      text:
        'Promote the fundraiser through school channels, class groups, newsletters, posters, links or QR codes.',
    },
    {
      title: 'Track entries and payments',
      text:
        'See who has registered, who has paid, who is pending and which payments still need review.',
    },
    {
      title: 'Run the event',
      text:
        'Use the relevant event tools, ticket records, host screens or admin views to keep the fundraiser organised.',
    },
    {
      title: 'Report back clearly',
      text:
        'Review income, payment decisions, prizes, sponsors and event notes so the PTA or school committee has a clearer record.',
    },
  ],

  screenshotSlots: [
    {
      title: 'School fundraiser dashboard',
      description:
        'Give organisers one place to see active events, payment checks, ticket activity and follow-up work.',
      imageKey: 'dashboardScreenshot',
      variant: 'desktop',
    },
    {
      title: 'Mobile-friendly volunteer view',
      description:
        'Help parent volunteers review key fundraiser details from a phone while they are at school, at the venue or on the move.',
      imageKey: 'paymentActivePlayersMobileScreenshot',
      variant: 'mobile',
    },
    {
      title: 'Ticketing and entries',
      description:
        'Track who has registered, how they are paying and which entries still need attention.',
      imageKey: 'ticketingScreenshot',
      variant: 'standard',
    },
    {
      title: 'Committee-ready reporting',
      description:
        'Use after-event records to explain what was collected, what was outstanding and what decisions were made.',
      imageKey: 'reportsScreenshot',
      variant: 'standard',
    },
  ],

  sections: {
    screenshots: {
      eyebrow: 'School workflow',
      title: 'Screens built around real school fundraising admin',
      text:
        'From ticket sales to payment follow-up and committee reporting, FundRaisely is designed to help school and PTA volunteers keep fundraisers organised without relying on scattered spreadsheets.',
    },

    benefits: {
      eyebrow: 'School benefits',
      title: 'Built for the way schools and PTAs actually fundraise',
      text:
        'Schools need fundraising tools that work for parents, pupils, teachers, volunteers, treasurers and committees.',
    },

    process: {
      eyebrow: 'How it works',
      title: 'A practical fundraising flow for schools and PTAs',
      text:
        'FundRaisely helps organisers move from idea to ticket sales to event night to committee report with fewer loose ends.',
    },

    proof: {
      eyebrow: 'School example',
      title: 'From quiz nights to wider school fundraising campaigns',
      text:
        'A school or PTA might start with a quiz night, add ticketing and payment tracking, then use the same platform structure for future fundraisers, family events, prize-led campaigns or seasonal activities.',
      bullets: [
        'Raise funds for school resources, trips, equipment or projects',
        'Give parent volunteers a clearer setup and payment workflow',
        'Recognise local sponsors and prize supporters',
        'Report back to the PTA, board or committee with better records',
      ],
      imageKey: 'schoolFundraisingEvent',
      reverse: true,
    },

    faq: {
      intro:
        'These questions cover the practical issues schools, PTAs and parent volunteers usually ask before running a fundraiser with FundRaisely.',
    },

    cta: {
      title: 'Ready to organise your next school fundraiser?',
      text:
        'Book a demo to see how FundRaisely can help your school or PTA run event formats, sell tickets, track payments and report back with more confidence.',
      primaryCta: {
        label: 'Book a demo',
       to: '/contact',
      },
      secondaryCta: {
        label: 'Explore event formats',
        to: '/event-formats',
      },
    },
  },

  faqs: [
    {
      question: 'Is FundRaisely only for school quiz nights?',
      answer:
        'No. Quiz fundraisers are currently the most mature event format, but FundRaisely is being built as a wider fundraising platform for schools and PTAs, including ticketing, payment tracking, reports, event management, prize records and future event formats.',
    },
    {
      question: 'What can a school or PTA raise money for with FundRaisely?',
      answer:
        'Schools and PTAs can use FundRaisely to support fundraising for trips, equipment, classroom resources, sports activities, school improvements, community projects and seasonal campaigns.',
    },
    {
      question: 'Can we sell tickets for a school fundraiser?',
      answer:
        'Yes. FundRaisely includes ticketing and entry tracking so organisers can manage who has registered, how many places are sold and which payments still need attention.',
    },
    {
      question: 'Can we track cash, bank transfer, Revolut-style payments and card payments?',
      answer:
        'Yes. FundRaisely is designed for mixed payment methods. Online payments can be confirmed where possible, while manual methods such as cash, instant payment and bank transfer can be tracked, claimed and confirmed by organisers.',
    },
    {
      question: 'Can parent volunteers help manage the fundraiser?',
      answer:
        'Yes. FundRaisely is being structured around organiser, host and admin workflows so fundraising work can be shared more clearly between PTA members, staff and volunteers.',
    },
    {
      question: 'Can FundRaisely help with prizes and sponsors?',
      answer:
        'Yes. Schools can record prize details, sponsor names, values, winners and follow-up notes so local support is easier to recognise and report.',
    },
    {
      question: 'What does the PTA or school committee get after the event?',
      answer:
        'FundRaisely can help organisers prepare clearer after-event records covering tickets, payments, outstanding amounts, write-offs, prizes, sponsors and fundraising totals.',
    },
    {
      question: 'Can we run a fundraiser over a few weeks?',
      answer:
        'Yes. FundRaisely can support campaign-style fundraising where tickets or entries are promoted over a selling window before the main event or final activity takes place.',
    },
    {
      question: 'Is the platform suitable for family-friendly fundraising?',
      answer:
        'Yes. The copy, event setup and quiz content can be positioned around family-friendly fundraising, with organisers choosing appropriate formats, rounds and activities for their school community.',
    },
  ],

  relatedLinks: [
    {
      label: 'Event formats',
      to: '/event-formats',
      description:
        'Explore quiz fundraisers, elimination events and future fundraising formats.',
    },
    {
      label: 'Payments',
      to: '/features/payments',
      description:
        'See how schools and PTAs can track manual and online payments without spreadsheet chaos.',
    },
    {
      label: 'Ticketing',
      to: '/features/ticketing',
      description:
        'Connect ticket sales and supporter entries to payment records.',
    },
    {
      label: 'Reports',
      to: '/features/reports',
      description:
        'Review totals and after-event records for committees.',
    },
  ],
},

charities: {
  path: '/use-cases/charities',

  schemaMode: 'webPage',

  seoTitle:
    'Fundraising Tools for Charities and Non-profits | FundRaisely',
  seoDescription:
    'FundRaisely helps charities and non-profits run fundraising events, sell tickets, track payments, manage prizes and prepare clearer reports for committees, donors and grant records.',

  eyebrow: 'Charities & non-profits',
  h1: 'Fundraising tools for charities and non-profits',
  intro:
    'FundRaisely helps charities, non-profits and grassroots teams run supporter-friendly fundraising events with clearer ticketing, payment tracking, prize records and reports for committees, donors and grant files.',

  imageKey: 'communityCelebration',
  visualEmphasis: 'photo_heavy',

  primaryCta: {
    label: 'Book a demo',
   to: '/contact',
  },

  secondaryCta: {
    label: 'See event formats',
    to: '/event-formats',
  },

  problemTitle: 'Charity fundraising needs trust as well as energy',
  problemText:
    'Charity and non-profit fundraisers often rely on volunteers, local sponsors, donors and community supporters. The event might be fun, but the records still need to be clear. Ticket sales, cash, card payments, instant payments, prizes, sponsor notes, donor updates and committee sign-off can easily end up scattered across messages, spreadsheets and paper notes.',

  solutionTitle: 'A clearer fundraising workflow for volunteer-led teams',
  solutionText:
    'FundRaisely gives charities and non-profits a practical structure for running fundraising events. Teams can choose an event format, manage tickets or entries, track payments, record prizes and sponsors, and review the outcome afterwards. It helps organisers give supporters a better experience while keeping clearer records for treasurers, committees and future reporting.',

  benefits: [
    {
      title: 'Run supporter-friendly event formats',
      text:
        'Start with quiz fundraisers and build towards wider event formats such as elimination games, puzzle challenges and other community fundraising activities.',
      to: '/event-formats',
    },
    {
      title: 'Sell tickets and manage entries',
      text:
        'Create a clearer journey for supporters, donors, volunteers and local community members who want to join or attend a fundraiser.',
      to: '/features/ticketing',
    },
    {
      title: 'Track mixed payment methods',
      text:
        'Keep expected, claimed, confirmed, late and written-off payments easier to review across card, cash, bank transfer and instant payment methods.',
      to: '/features/payments',
    },
    {
      title: 'Prepare clearer event reports',
      text:
        'Review ticket sales, payment decisions, participation, prizes and sponsor notes after the fundraiser.',
      to: '/features/reports',
    },
    {
      title: 'Support prizes and sponsors',
      text:
        'Record prize details, sponsor names, values, winners and follow-up notes so community support is easier to recognise.',
      to: '/features/ai-prize-finder',
    },
    {
      title: 'Help volunteers stay organised',
      text:
        'Give hosts, admins and helpers a clearer workflow so fundraising records do not depend on one person’s spreadsheet.',
      to: '/features/event-manager',
    },
  ],

  process: [
    {
      title: 'Choose the fundraiser',
      text:
        'Pick a format that suits your supporters, such as a quiz night, ticketed event, elimination fundraiser, campaign activity or prize-led fundraiser.',
    },
    {
      title: 'Set up tickets and payment options',
      text:
        'Add entry prices, capacity, payment methods, prize details and any on-the-night payment options before sharing the fundraiser.',
    },
    {
      title: 'Invite supporters and volunteers',
      text:
        'Share the fundraiser through email, social media, local partners, volunteer groups, QR codes or community channels.',
    },
    {
      title: 'Track entries and payments',
      text:
        'See who has joined, who has paid, who is pending and which payments still need organiser review.',
    },
    {
      title: 'Run the event',
      text:
        'Use the relevant event tools, host screens, ticket records or admin views to keep the fundraiser organised on the day.',
    },
    {
      title: 'Review and report',
      text:
        'Check income, payment decisions, prizes, sponsors and event notes so the committee or board has a clearer record of the outcome.',
    },
  ],

  screenshotSlots: [
    {
      title: 'Charity fundraiser dashboard',
      description:
        'Give organisers one place to see active events, payment checks, ticket activity and follow-up work.',
      imageKey: 'dashboardScreenshot',
      variant: 'desktop',
    },
    {
      title: 'Mobile-friendly organiser view',
      description:
        'Help volunteers review key fundraiser details from a phone while they are at the venue or on the move.',
      imageKey: 'paymentActivePlayersMobileScreenshot',
      variant: 'mobile',
    },
    {
      title: 'Ticketing and supporter entries',
      description:
        'Track who has registered, how they are paying and which entries still need attention.',
      imageKey: 'ticketingScreenshot',
      variant: 'standard',
    },
    {
      title: 'Committee-ready reporting',
      description:
        'Use after-event records to explain what was collected, what was outstanding and what decisions were made.',
      imageKey: 'reportsScreenshot',
      variant: 'standard',
    },
  ],

  sections: {
    screenshots: {
      eyebrow: 'Charity workflow',
      title: 'Screens built around transparent fundraising admin',
      text:
        'From ticket sales to payment follow-up and after-event reporting, FundRaisely is designed to help charity teams keep supporter fundraisers organised and easier to review.',
    },

    benefits: {
      eyebrow: 'Charity benefits',
      title: 'Built for supporter trust and volunteer clarity',
      text:
        'Charities and non-profits need fundraising tools that are easy for volunteers, clear for treasurers and reassuring for committees, donors and local partners.',
    },

    process: {
      eyebrow: 'How it works',
      title: 'A practical fundraising flow for charities',
      text:
        'FundRaisely helps charities move from fundraiser idea to supporter engagement to committee-ready records with fewer loose ends.',
    },

    proof: {
      eyebrow: 'Charity example',
      title: 'From community quiz nights to repeatable fundraising campaigns',
      text:
        'A charity might start with a quiz night, add ticketing and payment tracking, then use the same platform structure for future campaigns, supporter events, sponsor-led fundraisers or community challenges.',
      bullets: [
        'Create supporter-friendly events that are simple to join',
        'Give volunteers clearer roles and payment workflows',
        'Recognise sponsors, prizes and local partners',
        'Keep cleaner records for committees, treasurers and grant files',
      ],
      imageKey: 'communityCelebration',
      reverse: true,
    },

    faq: {
      intro:
        'These questions cover the practical issues charities, non-profits, volunteers and treasurers usually ask before running a fundraiser with FundRaisely.',
    },

    cta: {
      title: 'Ready to organise your next charity fundraiser?',
      text:
        'Book a demo to see how FundRaisely can help your team run event formats, sell tickets, track payments and prepare clearer fundraising records.',
      primaryCta: {
        label: 'Book a demo',
       to: '/contact',
      },
      secondaryCta: {
        label: 'Explore event formats',
        to: '/event-formats',
      },
    },
  },

  faqs: [
    {
      question: 'Is FundRaisely only for charity quiz nights?',
      answer:
        'No. Quiz fundraisers are currently the most mature event format, but FundRaisely is being built as a wider fundraising platform for charities and non-profits, including ticketing, payment tracking, reports, event management, prize records and future event formats.',
    },
    {
      question: 'What can a charity or non-profit raise money for with FundRaisely?',
      answer:
        'Charities and non-profits can use FundRaisely to support community events, supporter campaigns, local projects, programme funding, equipment, outreach activities and cause-led fundraising.',
    },
    {
      question: 'Can we sell tickets for a charity fundraiser?',
      answer:
        'Yes. FundRaisely includes ticketing and entry tracking so organisers can manage who has registered, how many places are sold and which payments still need attention.',
    },
    {
      question: 'Can we track cash, bank transfer, instant payments and card payments?',
      answer:
        'Yes. FundRaisely is designed for mixed payment methods. Online payments can be confirmed where possible, while manual methods such as cash, instant payment and bank transfer can be tracked, claimed and confirmed by organisers.',
    },
    {
      question: 'Can volunteers or admins help manage the fundraiser?',
      answer:
        'Yes. FundRaisely is being structured around organiser, host and admin workflows so fundraising work can be shared more clearly between staff, volunteers and committee members.',
    },
    {
      question: 'Can FundRaisely help with prizes and sponsors?',
      answer:
        'Yes. Charities can record prize details, sponsor names, values, winners and follow-up notes so local support is easier to recognise and report.',
    },
    {
      question: 'Can we use FundRaisely reports for committee or grant records?',
      answer:
        'FundRaisely can help organisers prepare clearer after-event records covering tickets, payments, outstanding amounts, write-offs, prizes, sponsors and fundraising totals. These records can support internal review and reporting, but they are not a substitute for formal accounting or legal advice.',
    },
    {
      question: 'Is this compliant for charity fundraisers?',
      answer:
        'FundRaisely can help organisers keep clearer records and think through practical fundraising checks. Compliance requirements depend on your location, organisation type and fundraising activity, so charities should follow their own policies and seek professional advice where needed.',
    },
    {
      question: 'Can we run a fundraiser over a few weeks?',
      answer:
        'Yes. FundRaisely can support campaign-style fundraising where tickets or entries are promoted over a selling window before the main event or final activity takes place.',
    },
  ],

  relatedLinks: [
    {
      label: 'Event formats',
      to: '/event-formats',
      description:
        'Explore quiz fundraisers, elimination events and future fundraising formats.',
    },
    {
      label: 'Payments',
      to: '/features/payments',
      description:
        'See how charities can track manual and online payments without spreadsheet chaos.',
    },
    {
      label: 'Ticketing',
      to: '/features/ticketing',
      description:
        'Connect ticket sales and supporter entries to payment records.',
    },
    {
      label: 'Reports',
      to: '/features/reports',
      description:
        'Review totals and after-event records for committees, treasurers and grant files.',
    },
  ],
},

  'community-groups': useCase(
    '/use-cases/community-groups',
    'Fundraising tools for community groups',
    'volunteersTickets',
    'Give local organisers a simpler way to run events, collect supporter details and review outcomes.',
  ),
};

function useCase(
  path: string,
  h1: string,
  imageKey: TemplateContent['imageKey'],
  intro: string,
): TemplateContent {
  return {
    path,
    schemaMode: 'webPage',
    seoTitle: `${h1} | FundRaisely`,
    seoDescription: intro,
    eyebrow: 'Use case',
    h1,
    intro,
    visualEmphasis: 'photo_heavy',

    primaryCta: {
      label: 'Book a demo',
     to: '/contact',
    },

    secondaryCta: {
      label: 'See fundraising ideas',
      to: '/resources/fundraising-ideas',
    },

    imageKey,

    problemTitle: 'Fundraising often depends on busy volunteers',
    problemText:
      'Tickets, payments, reminders, prizes and reporting can end up spread across chats, spreadsheets and paper notes.',

    solutionTitle: 'A practical structure for local fundraisers',
    solutionText:
      'FundRaisely gives organisers a clearer way to plan fundraising events, collect details and review the outcome afterwards.',

    benefits: [
      {
        title: 'Event formats',
        text:
          'Use structured fundraising formats that supporters understand and organisers can manage more easily.',
        to: '/event-formats',
      },
      {
        title: '10 to 14 day campaigns',
        text:
          'Build a selling window before a final event, quiz night or fundraiser activity.',
      },
      {
        title: 'Payment tracking',
        text:
          'Know who has paid, what is outstanding and what needs checking.',
        to: '/features/payments',
      },
      {
        title: 'Committee reports',
        text:
          'Prepare clearer totals and records after the fundraiser.',
        to: '/features/reports',
      },
    ],

    process: [
      {
        title: 'Choose the fundraiser',
        text:
          'Pick a quiz, event format or ticketed campaign structure.',
      },
      {
        title: 'Promote to supporters',
        text:
          'Share the event page and start collecting entries.',
      },
      {
        title: 'Run the event',
        text:
          'Use the platform structure to keep organisers aligned.',
      },
      {
        title: 'Review and report',
        text:
          'Check payment totals, prizes and outcomes.',
      },
    ],

    screenshotSlots: [
      {
        title: 'Campaign or event page',
        description:
          'Show the fundraiser or campaign landing page.',
        imageKey: 'campaignPlanningScreenshot',
        variant: 'desktop',
      },
      {
        title: 'Mobile supporter view',
        description:
          'Show how supporters or organisers can interact with the fundraiser from a phone.',
        imageKey: 'paymentActivePlayersMobileScreenshot',
        variant: 'mobile',
      },
      {
        title: 'Ticketing flow',
        description:
          'Show how supporters join or register.',
        imageKey: 'ticketingScreenshot',
        variant: 'standard',
      },
      {
        title: 'Report view',
        description:
          'Show committee-friendly reporting.',
        imageKey: 'reportsScreenshot',
        variant: 'standard',
      },
    ],

    faqs: [
      {
        question: 'Can this work for volunteer-led organisations?',
        answer:
          'Yes. FundRaisely is designed to reduce admin and make fundraising easier for busy organisers.',
      },
      {
        question: 'Can we use it for a quiz night first?',
        answer:
          'Yes. Quiz fundraisers are the strongest current event format and make a good starting point.',
      },
      {
        question: 'Can admins help manage the event?',
        answer:
          'FundRaisely is being structured around organiser, host and admin workflows so fundraising work can be shared more clearly.',
      },
    ],

    relatedLinks: [
      {
        label: 'Quiz fundraisers',
        to: '/event-formats/quiz',
      },
      {
        label: 'Ticketing',
        to: '/features/ticketing',
      },
      {
        label: 'Reports',
        to: '/features/reports',
      },
    ],
  };
}
