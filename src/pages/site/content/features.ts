import type { TemplateContent } from "./types";

const standardRelated = [
  {
    label: "Event formats",
    to: "/event-formats",
    description:
      "See the quiz, elimination and wider fundraising event formats.",
  },
  {
    label: "Reports",
    to: "/features/reports",
    description: "Review totals and after-event records.",
  },
  {
    label: "Book a demo",
    to: "/demo",
    description: "Talk through how FundRaisely could fit your organisation.",
  },
];

const liveFeatureFaqs = [
  {
    question: "Is this page final copy?",
    answer:
      "No. This is structured starter copy so final screenshots, product details and proof points can be plugged in without changing the page layout.",
  },
  {
    question: "Does this marketing page connect to the live app?",
    answer:
      "No. This is a standalone marketing template only. It has no backend, payment, game or dashboard integration.",
  },
];

const soonFaqs = [
  {
    question: "Is this feature live today?",
    answer:
      "Not yet. This page is intentionally marked as coming soon so the marketing site can include the agreed product roadmap without pretending the feature is ready.",
  },
  {
    question: "What can organisers use first?",
    answer:
      "Start with the current platform areas: quiz fundraisers, ticketing, payment tracking, event management, dashboards and reports.",
  },
];

type FeatureOptions = {
  slug: string;
  path: string;
  h1: string;
  eyebrow: string;
  intro: string;
  imageKey: TemplateContent["imageKey"];
  status?: TemplateContent["status"];
  statusLabel?: string;
  emphasis?: TemplateContent["visualEmphasis"];
  video?: boolean;

  seoTitle?: string;
  seoDescription?: string;
  problemTitle?: string;
  problemText?: string;
  solutionTitle?: string;
  solutionText?: string;
  benefits?: TemplateContent["benefits"];
  process?: TemplateContent["process"];
  screenshotSlots?: TemplateContent["screenshotSlots"];
  videoSlot?: TemplateContent["videoSlot"];
  faqs?: TemplateContent["faqs"];
  relatedLinks?: TemplateContent["relatedLinks"];

  sections?: TemplateContent["sections"];
};

function feature({
  path,
  h1,
  eyebrow,
  intro,
  imageKey,
  status,
  statusLabel,
  emphasis = "balanced",
  video = false,
  seoTitle,
  seoDescription,
  problemTitle,
  problemText,
  solutionTitle,
  solutionText,
  benefits,
  process,
  screenshotSlots,
  videoSlot,
  faqs,
  relatedLinks,
  sections,
}: FeatureOptions): TemplateContent {
  const isSoon = status === "coming_soon";
  const label = statusLabel ?? (isSoon ? "Coming soon" : undefined);

  return {
    path,
    seoTitle: seoTitle ?? `${h1} | FundRaisely`,
    seoDescription: seoDescription ?? intro,
    eyebrow,
    h1,
    intro,
    imageKey,
    status,
    statusLabel: label,
    visualEmphasis: isSoon ? "photo_heavy" : emphasis,

    primaryCta: {
      label: "Book a demo",
      to: "/demo",
    },

    secondaryCta: {
      label: "View all features",
      to: "/features",
    },

    videoSlot:
      videoSlot ??
      (video
        ? {
            title: `Add a short ${eyebrow.toLowerCase()} walkthrough here`,
            text: "Use this section for a short product video or screen recording when the feature is ready to show. Until then, the placeholder makes the intended page hierarchy clear.",
            imageKey,
            videoLabel: `${eyebrow} video placeholder`,
            transcript: `Show the organiser opening ${eyebrow.toLowerCase()}, reviewing the key screens, and seeing how it connects to campaigns, events and reports.`,
          }
        : undefined),

    problemTitle:
      problemTitle ??
      (isSoon
        ? "This is part of the wider FundRaisely roadmap"
        : "Fundraising admin gets scattered quickly"),

    problemText:
      problemText ??
      (isSoon
        ? "As FundRaisely expands beyond quiz fundraisers, this feature area will help organisers manage more of the practical work around fundraising campaigns and events."
        : "Clubs, schools and community groups often manage fundraising across spreadsheets, messages, payment notes and committee updates. That makes it harder to see what is happening clearly."),

    solutionTitle:
      solutionTitle ??
      (isSoon
        ? "A coming-soon page ready for final product detail"
        : "A clearer workspace for organisers"),

    solutionText:
      solutionText ??
      (isSoon
        ? "This page is set up with useful holding content, FAQs, related links and screenshot slots so final copy can be added once the feature is ready."
        : "FundRaisely gives organisers a structured place to manage the information that matters before, during and after a fundraiser."),

    benefits:
      benefits ??
      (isSoon
        ? [
            {
              title: "Roadmap clarity",
              text: "Show visitors that this feature is planned without overstating availability.",
            },
            {
              title: "Useful holding copy",
              text: "Explain the problem this feature will solve while the product detail is still being finalised.",
            },
            {
              title: "Screenshot-ready",
              text: "Swap in real screenshots, videos and final copy when the feature is ready.",
            },
            {
              title: "Connected platform story",
              text: "Link this future feature back to the live fundraiser, ticketing and reporting pages.",
            },
          ]
        : [
            {
              title: "Clearer records",
              text: "Keep important fundraiser details easier to review and update.",
            },
            {
              title: "Less manual checking",
              text: "Reduce reliance on scattered notes, messages and spreadsheets.",
            },
            {
              title: "Committee friendly",
              text: "Make it easier to explain what happened and what still needs attention.",
            },
            {
              title: "Ready for screenshots",
              text: "Use the page slots for real product images, short videos and examples.",
            },
          ]),

    process:
      process ??
      (isSoon
        ? [
            {
              title: "Define the workflow",
              text: "Use this page to describe the organiser problem and planned product flow.",
            },
            {
              title: "Add screenshots later",
              text: "Replace placeholders when the feature has polished screens.",
            },
            {
              title: "Connect to live features",
              text: "Link back to ticketing, payments, reports and event formats.",
            },
            {
              title: "Improve the copy",
              text: "Add final feature detail, examples and FAQs before launch.",
            },
          ]
        : [
            {
              title: "Set up the fundraiser",
              text: "Create the campaign, event or event format with the right details.",
            },
            {
              title: "Share with supporters",
              text: "Give people a clear page or joining route.",
            },
            {
              title: "Track the activity",
              text: "Keep participation, payments and organiser notes together.",
            },
            {
              title: "Review the outcome",
              text: "Use reports and records after the fundraiser.",
            },
          ]),

    screenshotSlots: screenshotSlots ?? [
      {
        title: "Primary screen",
        description: "Use this slot for the main product screenshot.",
        imageKey,
      },
      {
        title: "Dashboard context",
        description:
          "Show how this feature appears in the organiser dashboard.",
        imageKey: "dashboardScreenshot",
      },
      {
        title: "Reporting context",
        description: "Show how this feature feeds into reports or summaries.",
        imageKey: "reportsScreenshot",
      },
    ],

    faqs: faqs ?? (isSoon ? soonFaqs : liveFeatureFaqs),

    relatedLinks: relatedLinks ?? standardRelated,

    sections,
  };
}

export const featurePages: Record<string, TemplateContent> = {
  dashboard: feature({
    slug: "dashboard",
    path: "/features/dashboard",
    h1: "One dashboard for every fundraising event",
    eyebrow: "Dashboard",
    intro:
      "See what is coming up, what has ended, how much each event made and where to go next - from setup and ticketing through to direct-to-organisation payment records and reports.",
    imageKey: "dashboardOverviewScreenshot",
    emphasis: "screenshot_heavy",
    seoTitle:
      "Fundraising Event Dashboard for Clubs, Charities and Non-profits | FundRaisely",
    seoDescription:
      "View upcoming and ended fundraising events, ticket sales, targets, totals, event links and reports from one dashboard for clubs, charities and non-profits.",
    problemTitle:
      "Event admin gets messy when every fundraiser lives in a different place",
    problemText:
      "Grassroots organisers often juggle upcoming fundraisers, completed events, ticket sales, setup details, launch links, payment records and reports across messages, spreadsheets and separate tools. For clubs, charities and non-profits, it also matters that organisers can quickly see event totals without wondering where the money has been routed.",
    solutionTitle: "A single event dashboard for the whole organiser workflow",
    solutionText:
      "FundRaisely gives clubs, charities and non-profits an event dashboard where they can view upcoming and ended events, see event totals and goals, check ticket activity, open the Event Manager, launch supported digital events and jump straight to reports after the fundraiser. Payment records support FundRaisely’s direct-to-organisation model: the organisation connects its own payment methods and FundRaisely does not hold funds or take a percentage of money raised.",
    videoSlot: {
      title: "See how the FundRaisely dashboard keeps events organised",
      text: "This walkthrough should show an organiser reviewing the dashboard, filtering upcoming and ended events, opening an event card, editing setup details, checking ticket sales, launching a digital fundraiser and opening the after-event report.",
      imageKey: "dashboardOverviewScreenshot",
      videoLabel: "Dashboard walkthrough",
      transcript:
        "The demo should show six practical dashboard steps: viewing the event summary, spotting upcoming and ended events, opening event details, accessing the Event Manager, launching a live quiz or elimination event, and opening reports once the event has ended.",
    },
    screenshotSlots: [
      {
        title: "Event dashboard overview",
        description:
          "Show the main dashboard with summary totals, upcoming events, ended events and visible event status.",
        imageKey: "dashboardOverviewScreenshot",
        variant: "desktop",
      },
      {
        title: "Event card details",
        description:
          "Show event cards with event name, date, goal or target, amount raised, ticket sales and quick actions for event manager and reports.",
        imageKey: "dashboardEventCardsScreenshot",
        variant: "standard",
      },
      {
        title: "Manage and launch event",
        description:
          "Show the organiser opening an event from the dashboard and moving into the Event Manager to review setup, edit details, enable ticketing or launch the event.",
        imageKey: "dashboardManageLaunchScreenshot",
        variant: "wide",
      },
      {
        title: "Mobile organiser view",
        description:
          "Show a phone-friendly dashboard view so a volunteer can quickly check upcoming events, event status and next actions on the night.",
        imageKey: "dashboardMobileOrganiserScreenshot",
        variant: "mobile",
      },
    ],
    benefits: [
      {
        title: "See every event in one place",
        text: "Review upcoming and ended fundraising events from a single dashboard instead of hunting across spreadsheets, messages and separate tools.",
      },
      {
        title: "Understand event status quickly",
        text: "Use event cards and status views to see what is scheduled, what is ready to launch, what is running and what has ended.",
      },
      {
        title: "Track event totals and goals",
        text: "Show how much an event has made against its target, so clubs, charities and non-profits can spot progress before and after the fundraiser.",
      },
      {
        title: "Access the Event Manager directly",
        text: "Jump from the dashboard into the Event Manager to review setup details, edit the event, set price, link payment methods, enable ticketing and launch supported digital games.",
      },
      {
        title: "Open reports from each event",
        text: "When an event is complete, use the dashboard to access event reports, reconciliation records and downloadable committee summaries.",
      },
      {
        title: "Monitor ticket activity",
        text: "See ticket sales information from the event dashboard, including sales progress and the route into ticketing, direct-to-organisation payment records and redemption tracking.",
      },
      {
        title: "Built for digital event launch",
        text: "Launch with quiz and elimination events first, with more games planned soon and non-digital event types such as sponsored walks planned later.",
      },
      {
        title: "Ready for campaign-level growth",
        text: "Events can support the wider campaign workflow as FundRaisely expands campaign linking and campaign-level reporting.",
      },
    ],
    process: [
      {
        title: "Create or schedule the event",
        text: "Add an upcoming fundraiser such as a quiz or elimination event, with non-digital event types planned for future rollout.",
      },
      {
        title: "Set key event details",
        text: "Review the event name, description, date, target or goal, ticket price and setup information from the Event Manager.",
      },
      {
        title: "Enable ticketing and payments",
        text: "Choose the payment methods that should be available for ticket sales and event participation.",
      },
      {
        title: "Track upcoming events",
        text: "Use the dashboard to see what is coming up, what still needs setup and which events are ready to launch.",
      },
      {
        title: "Launch the event",
        text: "Open the live event flow from the dashboard or Event Manager when it is time to run the quiz or elimination game.",
      },
      {
        title: "Support the event team",
        text: "Use the in-game Event Manager to add admins who can help with setup, ticket checks and organiser tasks on the night.",
      },
      {
        title: "Review ended events",
        text: "After the fundraiser, return to the dashboard to see completed events and the amount made.",
      },
      {
        title: "Open reports and campaign records",
        text: "Access the event report, reconciliation records and future campaign-linked reporting from the event card.",
      },
    ],
    sections: {
      screenshots: {
        eyebrow: "Dashboard workflow",
        title: "Dashboard screens built for busy fundraiser organisers",
        text: "From event cards to direct links into event setup and reports, these screens show how FundRaisely helps organisers keep every event visible and easier to manage.",
      },
      benefits: {
        eyebrow: "Event visibility",
        title: "Everything organisers need to see before and after each event",
        text: "FundRaisely starts with an events dashboard that brings event status, totals, ticket activity, setup links, direct-to-organisation payment records and after-event reports into one place.",
      },
      process: {
        eyebrow: "Dashboard workflow",
        title: "From scheduled event to completed report",
        text: "The dashboard gives organisers a practical route through the event lifecycle: schedule the event, prepare it, launch it, monitor it and review what happened afterwards.",
      },
      proof: {
        eyebrow: "Why this matters",
        title: "Less digging around, clearer next actions for every fundraiser",
        text: "Instead of asking where the ticket page is, whether the event has launched or where the report lives, organisers can use the dashboard as the starting point for every event-related action.",
        imageKey: "dashboardEventCardsScreenshot",
        reverse: true,
        bullets: [
          "View upcoming and ended events",
          "See amount raised and target progress",
          "Open Event Manager from each card",
          "Track ticket activity",
          "Launch supported digital events",
          "Add admins for on-the-night help",
          "Open reports from completed events",
          "Prepare for campaign-level reporting",
        ],
      },
      faq: {
        intro:
          "These questions cover the practical dashboard issues clubs, charities, non-profits and committees usually need to understand before using FundRaisely.",
      },
      cta: {
        title: "Want one place to manage every fundraising event?",
        text: "Book a demo to see how FundRaisely brings event setup, ticketing, launch actions, event totals, direct-to-organisation payment records and reports into one organiser dashboard.",
        primaryCta: {
          label: "Book a demo",
          to: "/demo",
        },
        secondaryCta: {
          label: "See Event Manager",
          to: "/features/event-manager",
        },
      },
    },
    faqs: [
      {
        question: "What does the FundRaisely dashboard show?",
        answer:
          "The launch dashboard focuses on events. Organisers can see upcoming and ended events, event status, totals raised, goals or targets, ticket activity and direct links to manage or report on each event.",
      },
      {
        question: "Can organisers manage events from the dashboard?",
        answer:
          "Yes. The dashboard gives organisers quick access to the Event Manager, where they can review setup details, edit the event, set the price, link payment methods, enable ticketing and launch supported events.",
      },
      {
        question: "Can the dashboard show upcoming and completed events?",
        answer:
          "Yes. The dashboard is designed to make it easy to sort, view and manage what is coming up and what has already ended.",
      },
      {
        question: "Does the dashboard show how much an event made?",
        answer:
          "Yes. Event cards can show event totals and progress against the event goal or target, so organisers can quickly understand event performance.",
      },
      {
        question: "Can organisers open reports from the dashboard?",
        answer:
          "Yes. Completed events can link directly to their reports, including event totals, reconciliation records and downloadable summaries.",
      },
      {
        question: "Does the dashboard connect to ticketing?",
        answer:
          "Yes. The dashboard can show ticket activity and link organisers into the Event Manager and ticketing workflow for the event.",
      },
      {
        question: "Can the event be launched from the dashboard?",
        answer:
          "Yes. For supported digital events such as quizzes and elimination games, organisers can move from the dashboard into the launch flow when the event is ready.",
      },
      {
        question: "Can admins help manage an event on the night?",
        answer:
          "Yes. The in-game Event Manager allows clubs to add admins who can help with organiser tasks during the live event.",
      },
      {
        question: "Which event types are supported at launch?",
        answer:
          "The first dashboard launch is focused on quiz and elimination events. More digital games are planned soon, with non-digital event types such as sponsored walks planned later.",
      },
      {
        question: "Will events connect to campaigns?",
        answer:
          "Yes. FundRaisely is being built so events can be linked to campaigns, with campaign-level reporting planned as the platform expands.",
      },
      {
        question: "Does the dashboard show money held by FundRaisely?",
        answer:
          "No. FundRaisely does not hold fundraiser funds or take a percentage of event income. Dashboard totals are based on the event and payment records for money paid directly to the club, charity or non-profit through its own enabled payment methods.",
      },
    ],
    relatedLinks: [
      {
        label: "Event Manager",
        to: "/features/event-manager",
        description:
          "Review setup details, enable ticketing, add admins and launch the fundraiser.",
      },
      {
        label: "Ticketing",
        to: "/features/ticketing",
        description:
          "Sell tickets, track payment status and monitor redeemed versus unredeemed tickets.",
      },
      {
        label: "Reports",
        to: "/features/reports",
        description:
          "Open audit-ready event reports and after-event summaries from completed events.",
      },
    ],
  }),

  "campaign-manager": feature({
    slug: "campaign-manager",
    path: "/features/campaign-manager",
    h1: "Campaign Manager for connected fundraising activity",
    eyebrow: "Campaign Manager",
    intro:
      "A coming-soon workspace for grouping events, event formats, campaign pages and progress updates around one fundraising goal.",
    imageKey: "campaignPlanningScreenshot",
    status: "coming_soon",
  }),
  "event-manager": feature({
    slug: "event-manager",
    path: "/features/event-manager",
    h1: "Event management built for fundraiser nights",
    eyebrow: "Event Manager",
    intro:
      "Review event setup, update details, set the ticket price, link the organisation’s own payment methods, track advance sales and launch your fundraising game from one organiser view.",
    imageKey: "eventManagerHeroPhoto",
    emphasis: "photo_heavy",
    seoTitle:
      "Fundraising Event Management for Clubs, Charities and Non-profits | FundRaisely",
    seoDescription:
      "Plan, ticket and launch fundraising events from one place. FundRaisely helps clubs, charities and non-profits manage prices, payments, goals and event records.",
    problemTitle: "Fundraiser setup often lives in too many places",
    problemText:
      "A fundraising event might begin as a simple quiz night, but it quickly becomes a mix of setup decisions, ticket details, admin helpers, supporter links, room settings, last-minute edits and on-the-night responsibilities. For clubs, charities and non-profits, the problem is not just creating the event - it is keeping everything organised from setup through to the live digital game and the follow-up records afterwards.",
    solutionTitle: "One event workspace from setup to reporting",
    solutionText:
      "FundRaisely’s Event Manager gives each fundraiser its own workspace, so organisers can set up the event, review the key details, customise settings, confirm manual ticketing details, and launch the digital game when the room is ready. During the event, the game manager supports the live running of the fundraiser, including adding admins to help and on the night payment tracking. After the event, the same event dashboard gives quick access to financial records, audit-ready reports and impact statements - without organisers having to search across different tools or spreadsheets.",
    videoSlot: {
      title: "See how the Event Manager gets a fundraiser ready to launch",
      text: "This walkthrough shows an organiser reviewing the event setup, updating the price and goal, linking payment methods, checking advance ticket sales, and launching an event.",
      imageKey: "eventSetupOverviewScreenshot",
      videoLabel: "Event Manager walkthrough",
      transcript:
        "The demo should show five practical Event Manager steps: reviewing the event summary, updating details such as target and price, enabling ticketing by linking payment methods, tracking pre-sold tickets, and launching the live event.",
    },
    screenshotSlots: [
      {
        title: "Review event setup",
        description:
          "Quickly schedule your fundraiser in a few easy steps, then use the event dashboard to review the setup details, including the event format, target, ticketing status and launch readiness before supporters arrive or tickets are shared.",
        imageKey: "eventSetupOverviewPhotoshot",
        variant: "wide",
      },
          {
        title: "Link payment methods for ticketing and on the night payments",
        description:
          "Link payment methods for payments to activate ticketing then share the link so your supporters can buy tickets in advance, and link payment methods for on the night payments so you can track who has paid and who still owes money during the event.",
        imageKey: "eventPaymentMethodsScreenshot",
        variant: "standard",
      },
      {
        title: "Configure event settings",
        description:
          "Configure the event details such as the price and other customisations.",
        imageKey: "eventPriceGoalScreenshot",
        variant: "standard",
      },
  
        {
        title: "Launch the event and add admins to help on the night",
        description:
          "Once you lauch an event, it has its own workspace where you can add admin helpers, help users join , and manage the game controls.",
        imageKey: "eventaddadminScreenshot",
        variant: "standard",
      },
      {
        title: "Come back and report on the event",
        description:
          "Access post game reports and financial records from the same event dashboard, so organisers can keep everything in one place without rebuilding records in a spreadsheet.",
        imageKey: "eventLaunchDashboardScreenshot",
        variant: "standard",
      },
    ],
    benefits: [
      {
        title: "Review the setup quickly",
        text: "See the event details, format, target, ticketing status and launch readiness before supporters arrive or tickets are shared.",
      },
      {
        title: "Edit and update events",
        text: "Update key event information from the organiser view so clubs, charities and non-profits can fix details without rebuilding the fundraiser from scratch.",
      },
      {
        title: "Set price and fundraising goal",
        text: "Add a clear ticket price and event target so organisers can track what the fundraiser is aiming to raise.",
      },
      {
        title: "Enable ticketing with payment methods",
        text: "Link the payment methods that should appear on the public ticket page, including the organisation-owned Stripe, instant-payment or crypto wallet options that apply to that event.",
      },
      {
        title: "Track advance ticket activity",
        text: "Monitor tickets sold before the event, ticket redemptions and event readiness so the team knows what to expect on the night.",
      },
      {
        title: "Launch the event and add admins",
        text: "launch the quiz or elimination event when the room is ready. Then add admin helpers who can support setup, ticketing and payment tasks on the night.",
      },
    ],
    process: [
      {
        title: "Create or review the event",
        text: "Start by creating the event, the when and where, the goal and the payment methods. allow ticketing and payment on the night.",
      },
      {
        title: "Select the event format and customisations",
        text: "Select the event type, set the entry price and the prizes.",
      },
      {
        title: "Share the public ticket page",
        text: "Use the event ticket page to sell tickets in advance and give supporters a simple place to buy or claim their place.",
      },
          {
        title: "Track tickets before launch",
        text: "Review tickets sold, ticket redemptions and any setup gaps before the event starts.",
      },
        {
        title: "Launch the in game dashboard",
        text: "The in game dashboard provides real-time updates on event progress, ticket sales and payment statuses as well as the game controls for the host.",
      },
      {
        title: "Add admins for the night",
        text: "Invite admin helpers who can support organiser tasks such as player setup, ticket checks and payment follow-up.",
      },
      {
        title: "Report afterwards",
        text: "Connect event activity into reconciliation, reports and campaign-level summaries as those workflows roll out.",
      },
    ],
    sections: {
      screenshots: {
        eyebrow: "Event setup workflow",
        title: "Event screens built for real fundraiser admin",
        text: "From event setup to ticketing and launch controls, these screens show how organisers can prepare a fundraiser without losing track of payment methods, helpers or ticket activity.",
      },
      benefits: {
        eyebrow: "Event control",
        title: "Everything organisers need before the fundraiser starts",
        text: "FundRaisely Event Manager is designed for fundraising events that need setup checks, ticketing, direct-to-organisation payment options, helpers, launch controls and after-event records in one workflow.",
      },
      process: {
        eyebrow: "Event workflow",
        title: "From event setup to live fundraising",
        text: "The Event Manager follows the practical organiser journey: confirm the details, set the money rules, share tickets, prepare helpers and launch the event.",
      },
      proof: {
        eyebrow: "Why this matters",
        title: "Less setup panic before the fundraiser starts",
        text: "Instead of switching between notes, ticket lists, payment settings and game controls, organisers can use the Event Manager as the place to check readiness and move the fundraiser from planned to live.",
        imageKey: "eventLaunchDashboardScreenshot",
        reverse: true,
        bullets: [
          "Review event details in one place",
          "Set price, target and ticket options",
          "Link payment methods to ticketing",
          "Track tickets sold before launch",
          "Add admins to help on the night",
          "Launch games now and support more event formats over time",
        ],
      },
      faq: {
        intro:
          "These questions cover the practical event management issues clubs, charities, non-profits, admins and volunteers usually need to understand before using FundRaisely.",
      },
      cta: {
        title: "Want a simpler way to run your next fundraiser?",
        text: "Book a demo to see how FundRaisely helps clubs, charities and non-profits set up, ticket, manage and launch fundraising events while keeping payment control with the organisation.",
        primaryCta: {
          label: "Book a demo",
          to: "/demo",
        },
        secondaryCta: {
          label: "See ticketing",
          to: "/features/ticketing",
        },
      },
    },
    faqs: [
      {
        question: "What is the FundRaisely Event Manager?",
        answer:
          "The Event Manager is the organiser workspace for a fundraising event. It helps clubs review setup details, set the price and goal, link payment methods, track tickets, launch the event, run the event and report on the event.",
      },
    {
  question: "What activities can we add to an event?",
  answer:
    "In FundRaisely, the organiser sets up the event first, then adds the fundraising activity that sits inside it. That activity might be a ready-to-run game such as a quiz night, elimination game or puzzle challenge, a sponsored activity such as a walk or run, or a ticketed event such as a dinner, sports night, club event or community fundraiser.",
},
      {
        question: "Can organisers edit event details?",
        answer:
          "Yes. Organisers can review and update event setup details from the Event Manager so changes can be made without rebuilding the event from scratch.",
      },
      {
        question: "Can clubs set a fundraising target?",
        answer:
          "Yes. Clubs can set a goal or target for the event so organisers can see what the fundraiser is aiming to raise.",
      },
      {
        question: "Can each event have its own ticket price?",
        answer:
          "Yes. The event can have its own ticket price, which connects to ticketing and the event payment workflow.",
      },
      {
        question: "Can payment methods be selected per event?",
        answer:
          "Yes. Organisers can link the payment methods that should be available for a specific event, so the ticket page only shows the relevant options.",
      },
      {
        question: "Does each event get a public ticket page?",
        answer:
          "Yes. Events can have a public shareable ticket page so supporters have a clear place to buy or access tickets for that fundraiser.",
      },
      {
        question: "Can admins help on the night?",
        answer:
          "Yes. The in-game Event Manager allows clubs to add admin helpers who can support organiser tasks on the night without taking over the whole event. You can read more about this is the event details page.",
      },
      {
        question: "Can events be linked to campaigns?",
        answer:
          "Yes. Events are designed to connect into campaigns, so campaign-level reporting and fundraising summaries can build from the events that sit underneath them as those features roll out.",
      },
      {
        question: "Does Event Manager connect to reports?",
        answer:
          "Yes. Event activity such as tickets, payments, participation and launch details can feed into FundRaisely reporting and reconciliation workflows after the fundraiser.",
      },
      {
        question: "Does FundRaisely hold ticket or event money?",
        answer:
          "No. FundRaisely does not hold fundraiser funds or take a percentage of event income. The club, charity or non-profit connects its own Stripe account, uses its own instant-payment details and can set its own crypto wallet, so funds are paid directly to the organisation.",
      },
    ],
    relatedLinks: [
      {
        label: "Ticketing",
        to: "/features/ticketing",
        description:
          "Sell and manage tickets for the events created in FundRaisely.",
      },
      {
        label: "Payments",
        to: "/features/payments",
        description:
          "Choose payment methods and track how supporters pay for event tickets.",
      },
      {
        label: "Reports",
        to: "/features/reports",
        description:
          "Turn event activity, tickets and payment records into committee-ready reports.",
      },
    ],
  }),

  "public-campaign-event-pages": feature({
    slug: "public-campaign-event-pages",
    path: "/features/public-campaign-event-pages",
    h1: "Public campaign and event pages for supporters",
    eyebrow: "Public pages",
    intro:
      "Coming-soon public pages for sharing campaign stories, event details, ticket links and supporter calls to action.",
    imageKey: "communityCelebration",
    status: "coming_soon",
  }),
  payments: feature({
    slug: "payments",
    path: "/features/payments",
    h1: "Payment tracking without the spreadsheet chaos",
    eyebrow: "Payments",
    intro:
      "Track who has paid, who still needs follow-up and which payments need manual confirmation across card, Stripe, cash, bank transfer, Revolut and Solana crypto payments - while funds go directly to the club, charity or non-profit.",
    imageKey: "paymentsHeroScreenshot",
    emphasis: "screenshot_heavy",
    seoTitle:
      "Fundraising Payment Tracking for Clubs, Charities and Non-profits | FundRaisely",
    seoDescription:
      "Track fundraiser payments across card, Stripe, cash, bank transfer, Revolut and Solana crypto without FundRaisely holding funds or taking a percentage.",
    problemTitle: "Fundraising payments rarely arrive in one tidy place",
    problemText:
      "Community fundraisers often collect money in several different ways. One supporter pays by card, another sends Revolut, someone pays cash on the night, a parent uses bank transfer, and a digital supporter may pay by crypto. Clubs, charities and non-profits need a shared record without giving up control of where the money lands.",
    solutionTitle: "One clearer record for every expected payment",
    solutionText:
      "FundRaisely gives organisers a practical payment tracking workflow built around real fundraising behaviour. Online payments are confirmed automatically, while manual methods such as cash, Revolut or bank transfer can be claimed, reviewed and confirmed by the organiser. FundRaisely does not hold fundraiser funds or take a percentage: clubs connect their own Stripe, use their own instant-payment accounts and set their own crypto wallets so money is paid directly to them.",
    videoSlot: {
      title: "See how payment tracking works in FundRaisely",
      text: "This walkthrough shows how an organiser can add a club payment method, choose which payment options belong to an event, and manage manual payments such as cash, Revolut or late payments after the fundraiser.",
      imageKey: "paymentOptionsScreenshot",
      videoLabel: "Payment tracking walkthrough",
      transcript:
        "The demo should show three practical payment tracking steps: adding a payment method to a club, linking that method to a fundraising event, and managing manual payments that need organiser review. This includes confirming payments, accepting late payments and keeping the event record accurate before reporting.",
      videoUrl: "https://youtu.be/LtGyMXgFXk8",
    },
    screenshotSlots: [
      {
        title: "Choose payment methods per event",
        description:
          "Select which club payment methods should appear for each fundraiser, so supporters only see the options that apply.",
        imageKey: "paymentOptionsScreenshot",
        variant: "desktop",
      },
      {
        title: "Mobile-friendly payment review",
        description:
          "Review payment status, invitations and manual payment actions from a phone-friendly organiser view.",
        imageKey: "paymentActivePlayersMobileScreenshot",
        variant: "mobile",
      },
      {
        title: "See payment status at a glance",
        description:
          "Quickly spot who is paid, unpaid or still pending before the fundraiser starts or while the event is running.",
        imageKey: "paymentActivePlayersScreenshot",
        variant: "standard",
      },
      {
        title: "Resolve late and outstanding payments",
        description:
          "Accept late payments, write off balances that will not be collected, and keep a clear note of what changed.",
        imageKey: "paymentLatePaymentScreenshot",
        variant: "standard",
      },
    ],
    benefits: [
      {
        title: "Track every payment status",
        text: "See expected, claimed, confirmed, outstanding, late, disputed and written-off payments in one place, so organisers know what still needs action.",
      },
      {
        title: "Support the ways clubs actually get paid",
        text: "Use FundRaisely with card, Stripe, cash, bank transfer, Revolut and other manual payment methods that clubs, charities and non-profits already rely on.",
      },
      {
        title: "Solana crypto payment support",
        text: "Allow clubs, charities and non-profits to accept crypto payments through the Solana blockchain for suitable digital fundraisers, with funds sent to the wallet they configure rather than held by FundRaisely.",
      },
      {
        title: "Automatic confirmation where possible",
        text: "Stripe, card and supported crypto payments can be confirmed automatically, reducing the amount of manual checking needed for online fundraisers.",
      },
      {
        title: "Manual confirmation when needed",
        text: "For cash, Revolut, bank transfer and on-the-night payments, organisers can record the claim, confirm the amount received, accept a late payment or write off an unpaid balance.",
      },
      {
        title: "Cleaner event reconciliation",
        text: "After the fundraiser, payment records feed into reconciliation and reporting so committees can review direct-to-organisation payments with fewer gaps and fewer spreadsheet checks.",
      },
    ],
    process: [
      {
        title: "Set up club payment methods",
        text: "Add the payment methods your organisation wants to offer, such as Stripe, cash, Revolut, bank transfer, card tap on the night or Solana crypto payments.",
      },
      {
        title: "Choose methods for each event",
        text: "Select which payment options should appear for a specific fundraiser, so each quiz, event or campaign only shows the methods that make sense.",
      },
      {
        title: "Create expected payment records",
        text: "When a supporter buys a ticket, joins a fundraiser or registers for an event, FundRaisely records what they are expected to pay.",
      },
      {
        title: "Confirm automatic payments",
        text: "Card, Stripe and supported crypto payments are automatically marked as confirmed when the payment is completed successfully.",
      },
      {
        title: "Manage manual payments",
        text: "For Revolut, cash, bank transfer and on-the-night payments, organisers can confirm, accept late payment, dispute or write off the amount.",
      },
        {
        title: "End of event reconciliation and audit ready records",
        text: "At the end of each event, nonprofits can approve a clear payment reconciliation showing what was collected, what is still outstanding, and how late or unpaid amounts were handled.",
      },
      {
        title: "Review before reporting",
        text: "Use the payments and reconciliation views to check totals, resolve outstanding players and prepare clearer after-event records.",
      },
         {
        title: "Report",
        text: "Access detailed reports on payment activity, approved reconciliations and outstanding balances.",
      },
    ],
    sections: {
      screenshots: {
        eyebrow: "Payment workflow",
        title: "Payment screens built for real fundraiser admin",
        text: "From choosing payment methods to resolving late payments, these screens show how organisers can keep the payment record clearer before, during and after an event.",
      },
      benefits: {
        eyebrow: "Payment control",
        title: "Everything organisers need to keep payment records clear",
        text: "FundRaisely is designed for mixed payment methods, manual confirmation, online payments and after-event reconciliation.",
      },
      process: {
        eyebrow: "Payment workflow",
        title: "From payment setup to final reconciliation",
        text: "The payment workflow follows the way organisers actually collect money: set the methods, track what is expected, confirm what arrived and resolve anything outstanding.",
      },
      proof: {
        eyebrow: "Why this matters",
        title: "Less chasing, fewer gaps and clearer committee records",
        text: "Instead of piecing together screenshots, bank notes and messages after the event, organisers can keep payment decisions attached to the fundraiser from the start.",
        imageKey: "paymentLatePaymentScreenshot",
        reverse: true,
        bullets: [
          "Choose payment methods per event",
          "Track automatic and manual payments together",
          "Resolve late, disputed or written-off payments",
          "Feed cleaner totals into reports",
        ],
      },
      faq: {
        intro:
          "These questions cover the practical payment issues clubs, charities, non-profits and committees usually need to understand before using FundRaisely.",
      },
      cta: {
        title: "Want cleaner payment tracking for your next fundraiser?",
        text: "Book a demo to see how FundRaisely handles card payments, manual payment checks, Solana crypto payments and event reconciliation while keeping fundraiser money paid directly to your organisation.",
        primaryCta: {
          label: "Book a demo",
          to: "/demo",
        },
        secondaryCta: {
          label: "See ticketing",
          to: "/features/ticketing",
        },
      },
    },
    faqs: [
      {
        question: "Can FundRaisely take card payments?",
        answer:
          "Yes. FundRaisely can support online card payments through Stripe. Card payments can be confirmed automatically when the payment is completed successfully.",
      },
      {
        question: "Can clubs still accept cash, Revolut or bank transfer?",
        answer:
          "Yes. FundRaisely is designed for the way clubs and community groups actually collect money. Manual payment methods such as cash, Revolut and bank transfer can be tracked, claimed, confirmed and reviewed by organisers.",
      },
      {
        question: "Can FundRaisely support crypto payments?",
        answer:
          "Yes. FundRaisely can support Solana crypto payments for suitable digital fundraisers. This gives clubs an additional payment option while still allowing normal payment methods such as card, cash and bank transfer.",
      },
      {
        question:
          "What is the difference between claimed and confirmed payments?",
        answer:
          "A claimed payment means someone has said the payment was made or received. A confirmed payment means the organiser, admin or automated payment flow has verified that the money was received.",
      },
      {
        question: "Can organisers deal with late payments?",
        answer:
          "Yes. If someone has not paid by the expected time, organisers can accept a late payment, record the amount received, add notes and update the payment record before the event is finalised.",
      },
      {
        question: "Can unpaid payments be written off?",
        answer:
          "Yes. If a payment will not be collected, organisers can write it off so the event record reflects what actually happened rather than leaving unresolved balances hanging around.",
      },
      {
        question: "Does this replace accounting software?",
        answer:
          "No. FundRaisely is not trying to replace full accounting software. It gives fundraising organisers clearer event-level payment records before figures are passed into wider accounts, reports or committee summaries.",
      },
      {
        question: "Does payment tracking connect to reports?",
        answer:
          "Yes. Payment records can feed into event reconciliation, after-event reports and committee-friendly summaries so organisers can explain what was collected, what was outstanding and what decisions were made.",
      },
      {
        question: "Does FundRaisely hold fundraiser money?",
        answer:
          "No. FundRaisely does not hold fundraiser funds or take a percentage of ticket sales or event income. Clubs and non-profits connect their own Stripe account, use their own instant-payment details and set their own crypto wallet, so funds are paid directly to the organisation. Payment processor or wallet fees may still apply.",
      },
    ],
    relatedLinks: [
      {
        label: "Ticketing",
        to: "/features/ticketing",
        description:
          "Connect ticket sales, entries and supporter registrations to payment records.",
      },
      {
        label: "Reports",
        to: "/features/reports",
        description:
          "Review payment totals, reconciliation notes and after-event summaries.",
      },
      {
        label: "Event formats",
        to: "/event-formats",
        description:
          "See the quiz, elimination and event formats that can use payment tracking.",
      },
    ],
  }),
ticketing: feature({
  slug: "ticketing",
  path: "/features/ticketing",
  h1: "Ticketing and player entry for fundraising events",
  eyebrow: "Ticketing",
  intro:
    "Sell tickets in advance, let supporters redeem them at the event, and handle on-the-night player entry with QR-based payment flows.",
  imageKey: "ticketingHeroScreenshot",
  emphasis: "video_heavy",
  seoTitle:
    "Fundraising Ticketing and Player Entry for Clubs | FundRaisely",
  seoDescription:
    "Sell fundraiser tickets in advance, redeem tickets at the event and manage on-the-night player entry with Stripe, instant payments, crypto, cash and card tap options.",
  problemTitle: "Fundraiser entry does not always happen in advance",
  problemText:
    "Some supporters buy tickets before the event, while others decide to join on the night. Most ticketing tools are built for card checkout, but real club fundraisers also need instant payments, QR joins, ticket redemption and manual checks for cash or card tap payments.",
  solutionTitle: "Advance tickets and on-the-night entry in one flow",
  solutionText:
    "FundRaisely lets clubs sell tickets in advance, redeem tickets at the event and use QR codes for on-the-night player entry. Stripe and supported crypto can auto-confirm, while instant payments, cash and card tap payments can be manually verified by the organiser. Funds go directly to the club — FundRaisely does not hold funds or take a transaction percentage.",
  videoSlot: {
    title: "See how FundRaisely manages tickets, QR entry and payment confirmation",
    text: "This walkthrough should show a club linking payment methods, selling tickets in advance, redeeming a ticket at the event, and handling an on-the-night player who scans a QR code to join.",
    imageKey: "ticketPurchaseFlowScreenshot",
    videoLabel: "Ticketing and player entry walkthrough",
    transcript:
      "The demo should show the practical flow: linking club payment methods, enabling ticketing from the Event Manager, setting the ticket or entry price, choosing payment methods for the event, selling an advance ticket, redeeming that ticket at the event, showing the on-the-night QR join flow, auto-confirming Stripe or supported crypto payments, manually verifying instant payments, cash or card tap payments, and reviewing issued, pending, redeemed and player entry records.",
  },
  screenshotSlots: [
    {
      title: "Public ticket page",
      description:
        "Curretly each event gets a unique ticket link that can be shared with supporters so they can buy in advance. The fully branded campaign and events page is in development and ths will provide an experience like whats show in the image.  This was a real campaign we ran with BFP.",
      imageKey: "ticketingPublicPageScreenshot",
      variant: "wide",
    },

    {
      title: "Choose payment method",
      description:
        "Enable multiple payment methods for ticket sales and for payment on the night, so supporters can choose how they want to pay and organisers can track who has paid and who still owes money.",
      imageKey: "ticketingPaymentMethodsScreenshot",
      variant: "standard",
    },
        {
      title: "Instant payment reference",
      description:
        "FundRaisely provides a unique tracking reference for Revolut or Monzo-style instant payments can be matched back before the ticket or player entry is confirmed.  This is how we handle instant payments between non busienss accounts.",
      imageKey: "ticketingInstantPaymentScreenshot",
      variant: "standard",
    },
       {
      title: "Players can join with prepaid tickets or on the night",
      description:
        "Even if someone loses their ticket, they can still join the event as admin can share their unique ticket link with them for them to redeem.",
      imageKey: "ticketingScreenshot",
      variant: "mobile",
    },    
    {
      title: "Accept payments on the night with QR code entry",
      description:
        "Admin helpers can check in players who bought in advance, and players who join on the night can scan a QR code to start the player entry flow and choose from the payment methods enabled for on-the-night entry, such as Stripe, instant payments, supported crypto, cash or card tap.",
      imageKey: "cashatdoorScreenshot",
      variant: "mobile",
    },

    {
      title: "Full reporting at end of the event showing ticket sales, redemptions and player entry",
      description:
        "Even if someone loses their ticket, they can still join the event as admin can share their unique ticket link with them for them to redeem.",
      imageKey: "ticketreportingScreenshot",
      variant: "mobile",
    },
 
  ],
  benefits: [
    {
      title: "Sell tickets in advance",
      text: "Supporters can buy before the event using the ticket payment methods enabled by the club, such as Stripe, instant payments or supported crypto.",
    },
    {
      title: "Redeem tickets at the event",
      text: "Supporters who bought in advance can redeem their ticket when they arrive or when they join the digital game.",
    },
    {
      title: "QR code for on-the-night entry",
      text: "Players who have not bought in advance can scan a QR code on the night and start the player entry flow.",
    },
    {
      title: "More payment options on the night",
      text: "On-the-night player entry can support instant payments, Stripe, supported crypto, cash and card tap payments, depending on what the organiser enables.",
    },
    {
      title: "Sell with instant payments",
      text: "FundRaisely supports Revolut or Monzo-style instant payments for fundraiser entry, giving clubs a practical alternative to card-only ticketing.",
    },
    {
      title: "Auto-confirm where possible",
      text: "Stripe online payments and supported crypto payments can be confirmed automatically once the payment completes.",
    },
    {
      title: "Manual checks where needed",
      text: "Cash, card tap and instant-payment entries can be manually verified by the organiser before the player is marked as paid or ready to play.",
    },
    {
      title: "Reference codes for matching payments",
      text: "Supporters get a clear payment reference so organisers can match instant payments back to the correct ticket or player entry.",
    },
    {
      title: "Avoid confirming unpaid entries too early",
      text: "Instant-payment, cash and card tap entries can be kept pending until payment is verified, helping organisers avoid issuing tickets or admitting players before the money is received.",
    },
    {
      title: "Funds go directly to the organisation",
      text: "FundRaisely does not hold ticket or entry money and does not take a transaction percentage. Funds go directly to the accounts, wallets or payment methods controlled by the club, charity or non-profit.",
    },
    {
      title: "Track requested, confirmed and redeemed",
      text: "See which tickets or entries have been requested, paid, confirmed, issued, redeemed or still need follow-up.",
    },
    {
      title: "Plan-based capacity",
      text: "Ticket sales and player entry capacity can respect the club subscription level, with limits that can be increased when a club upgrades its plan.",
    },
    {
      title: "Ticket and entry reporting",
      text: "Review ticket sales, payment status, player entry and redemption activity after the event, with downloadable reports for organisers and committees.",
    },
  ],
  process: [
    {
      title: "Link payment methods",
      text: "The club links the payment methods it wants to use, such as Stripe, Revolut or Monzo-style instant payments and supported crypto wallets.",
    },
    {
      title: "Set the event ticket price",
      text: "Use the Event Manager to set the ticket or entry price for the quiz, elimination game or fundraising event.",
    },
    {
      title: "Choose advance ticket methods",
      text: "Select which linked payment methods should appear for advance ticket sales, such as Stripe, instant payments or supported crypto.",
    },
    {
      title: "Share the ticket page",
      text: "Send supporters to the event ticket page so they can buy in advance before the fundraiser.",
    },
    {
      title: "Confirm advance ticket payments",
      text: "Stripe and supported crypto are confirm automatically. Revolut or Monzo-style instant-payment tickets stay pending until the organiser confirms the money was received.",
    },
    {
      title: "Issue the confirmed ticket",
      text: "For advance sales, once payment is confirmed, be that automatically or manually, the ticket is issued with the correct status, reference and event record attached.",
    },
    {
      title: "Redeem tickets at the event",
      text: "Supporters who bought in advance can redeem their ticket when they arrive or when they join the digital game.",
    },
    {
      title: "Use a QR code for on-the-night joins",
      text: "Players who have not bought in advance can scan the event QR code, choose an available payment method and start the player entry flow.",
    },
    {
      title: "Accept on-the-night payments",
      text: "On-the-night player entry can support Stripe, instant payments, supported crypto, cash and card tap payments, depending on what the organiser enables.",
    },
    {
      title: "Verify manual payments",
      text: "Instant payments, cash and card tap payments can be manually verified by the organiser or admin before the player is marked as paid or ready to play.",
    },
    {
      title: "Track attendance and redemption",
      text: "Track redeemed tickets and confirmed player entries when supporters join the game or attend the event.",
    },
    {
      title: "Report after the fundraiser",
      text: "Use the ticket and player entry records to support reconciliation, committee updates and future campaign reporting.",
    },
  ],
  sections: {
    screenshots: {
      eyebrow: "Ticketing workflow",
      title: "Ticketing and entry screens built for real fundraiser payments",
      text: "From advance ticket sales to QR-based on-the-night entry, these screens show how FundRaisely keeps payments, attendance and event records connected.",
    },
    benefits: {
      eyebrow: "Ticket and entry control",
      title: "Sell in advance and manage players on the night",
      text: "FundRaisely is designed for fundraising events where organisers need to sell tickets ahead of time, redeem tickets at the event, admit players on the night, confirm payments and keep funds going directly to the organisation.",
    },
    process: {
      eyebrow: "Ticketing workflow",
      title: "From advance ticket sale to confirmed attendance",
      text: "The workflow follows how clubs actually run fundraisers: link payment methods, sell in advance, redeem tickets, use QR codes for on-the-night joins, verify manual payments and track who attended.",
    },
    proof: {
      eyebrow: "Why this matters",
      title: "Advance ticketing and on-the-night entry without losing payment control",
      text: "Most ticketing tools are built around card checkout. FundRaisely also supports QR joins, instant payments and manual verification for real-world on-the-night payments.",
      imageKey: "ticketingSalesRedemptionsScreenshot",
      reverse: true,
      bullets: [
        "Link club-controlled payment methods",
        "Sell tickets in advance",
        "Redeem advance tickets at the event",
        "Let on-the-night players scan a QR code to join",
        "Sell with Stripe, instant payments or supported crypto",
        "Support cash and card tap for on-the-night entry",
        "Auto-confirm Stripe and supported crypto payments",
        "Use reference codes for instant payments",
        "Manually verify instant payments, cash and card tap payments",
        "Keep entries pending until payment is verified",
        "Track tickets, entries and redemptions",
        "Download ticket and entry reports",
        "Keep funds paid directly to the organisation",
      ],
    },
    faq: {
      intro:
        "These questions cover the practical ticketing, player entry and payment-confirmation issues clubs, charities, non-profits and committees usually need to understand before using FundRaisely.",
    },
    cta: {
      title: "Want ticketing that supports how your club actually gets paid?",
      text: "Book a demo to see how FundRaisely helps clubs, charities and non-profits sell tickets in advance, manage QR-based on-the-night player entry and verify payments while keeping funds paid directly to the organisation.",
      primaryCta: {
        label: "Book a demo",
        to: "/demo",
      },
      secondaryCta: {
        label: "See payments",
        to: "/features/payments",
      },
    },
  },
  faqs: [
    {
      question: "Can clubs sell tickets through FundRaisely?",
      answer:
        "Yes. Clubs can enable ticketing for a fundraising event, set a ticket price and share a public ticket page with supporters.",
    },
    {
      question: "Can tickets be bought with cash?",
      answer:
        "No. Advance ticket purchases should use trackable payment methods such as Stripe, instant payments or supported crypto, so the ticket can be linked to a payment record before it is issued.",
    },
    {
      question: "Can supporters redeem tickets at the event?",
      answer:
        "Yes. Supporters who buy tickets in advance can redeem their ticket when they arrive or when they join the digital game, so organisers can track who actually attended.",
    },
    {
      question: "Can players join on the night without buying a ticket in advance?",
      answer:
        "Yes.Once the non profits allows it, players who have not bought in advance can scan an event QR code and start the on-the-night player entry flow.",
    },
     {
      question: "Can I just accept payments on the night and not sell tickets in advance?",
      answer:
        "Yes. Our payment flows are built around how clubs operate, allowing for both advance and on-the-night payment options.",
    },
    {
      question: "Which payment methods can be used for advance tickets?",
      answer:
        "For advance ticket sales, clubs can use Stripe card payments, Revolut or Monzo-style instant payments, and supported crypto payments.",
    },
    {
      question: "Which payment methods can be used on the night?",
      answer:
        "On-the-night player entry can support the same digital methods available for tickets, such as Stripe, instant payments and supported crypto, as well as cash and card tap payments where the organiser allows them.",
    },
    {
      question: "Do clubs need to link payment methods first?",
      answer:
        "Yes. The organisation should first add or connect the payment methods it wants to use, such as Stripe for card payments, Revolut or Monzo-style instant-payment details, supported crypto wallets, and any on-the-night cash or card tap options they want admins to verify.",
    },
    {
      question: "Are Stripe ticket payments confirmed automatically?",
      answer:
        "Yes. Tickets or player entries paid through Stripe online checkout can be automatically confirmed when the card payment completes successfully.",
    },
    {
      question: "Are crypto payments confirmed automatically?",
      answer:
        "Yes. Supported crypto payments can be confirmed automatically when the payment completes successfully, while still keeping normal payment options available for everyday supporters.",
    },
    {
      question: "How do Revolut or Monzo-style instant payments work?",
      answer:
        "FundRaisely gives the supporter clear payment instructions and a unique reference. Because personal instant-payment accounts usually cannot auto-confirm through an API, the ticket or player entry stays pending until the organiser confirms the money has arrived.",
    },
    {
      question: "Do cash and card tap payments auto-confirm?",
      answer:
        "No. Cash and card tap payments need to be manually verified by the organiser or admin before the player is marked as paid or ready to play.",
    },
    {
      question: "Why is instant-payment ticketing different?",
      answer:
        "Most ticketing platforms are built around card checkout. FundRaisely is designed for clubs that also rely on Revolut or Monzo-style instant payments, giving them a way to accept those payments without issuing tickets or confirming entries before payment is received.",
    },
    {
      question: "Can a ticket or player entry be held until payment is confirmed?",
      answer:
        "Yes. Entries paid by instant-payment methods, cash or card tap can remain pending until the organiser confirms payment. This helps avoid issuing tickets or admitting players before the money is actually received.",
    },
    {
      question: "Is an on-the-night QR join the same as an advance ticket?",
      answer:
        "Not exactly. Advance tickets are sold before the event and then redeemed. On-the-night QR joins are treated as player entry records, but they still connect the player to payment status, confirmation and event reporting.",
    },
    {
      question: "Are ticket sales or player numbers be capped?",
      answer:
        "Yes. Ticket sales and player capacity are capped based on the club subscription level. Clubs can increase their capacity by upgrading their subscription.",
    },
    {
      question: "Can organisers see requested versus redeemed tickets?",
      answer:
        "Yes. FundRaisely can track tickets requested, paid, confirmed, issued, redeemed and not yet redeemed, so organisers know what happened before and during the event.",
    },
    {
      question: "Can organisers see on-the-night player entries?",
      answer:
        "Yes. On-the-night player entries can be tracked separately from advance ticket sales, while still connecting each player to payment status and event records.",
    },
    {
      question: "Is there a ticket and entry report?",
      answer:
        "Yes. Reporting can show ticket activity, player entry, payment status and redemption activity so organisers can review what was sold, what was confirmed and what was used.",
    },
    {
      question: "Do ticket buyers become contacts in the CRM?",
      answer:
        "Ticket sales and player entries are designed to feed into participant records for the upcoming CRM. This should be described as a soon feature until the CRM workflow is live.",
    },
    {
      question: "Does ticketing connect to event reports?",
      answer:
        "Yes. Ticketing and player entry connect to event-level reporting so organisers can review sales, redemptions, payments and after-event records together.",
    },
    {
      question: "Does FundRaisely hold ticket money or take a transaction percentage?",
      answer:
        "No. FundRaisely does not hold ticket or entry money, does not process funds into its own account and does not take a transaction percentage from ticket or player entry income. Clubs, charities and non-profits connect their own Stripe account, use their own instant-payment details, set their own crypto wallet and manage their own on-the-night payment methods, so funds are paid directly to the organisation.",
    },
    
  ],
  relatedLinks: [
    {
      label: "Event Manager",
      to: "/features/event-manager",
      description:
        "Set up the event, choose ticketing options and launch the fundraiser.",
    },
    {
      label: "Payments",
      to: "/features/payments",
      description:
        "Track Stripe, instant payments, supported crypto, cash and card tap payments.",
    },
    {
      label: "Reports",
      to: "/features/reports",
      description:
        "Review ticket sales, player entry, payment totals and after-event reconciliation records.",
    },
  ],
}),

  "income-expenses-tracker": feature({
    slug: "income-expenses-tracker",
    path: "/features/income-expenses-tracker",
    h1: "Income and expenses tracker for fundraiser records",
    eyebrow: "Income & expenses tracker",
    intro:
      "A coming-soon feature area for recording fundraiser income, costs, adjustments and clearer net outcome notes.",
    imageKey: "reportsScreenshot",
    status: "coming_soon",
  }),
  reports: feature({
    slug: "reports",
    path: "/features/reports",
    h1: "Fundraising reports ready for committees and audits",
    eyebrow: "Reports",
    intro:
      "Turn event payments, tickets, players, prizes, volunteers and impact details into downloadable reports that clubs, charities and non-profits can share with committees, treasurers and stakeholders.",
    imageKey: "reportHeroScreenshot",
    emphasis: "screenshot_heavy",
    seoTitle:
      "Fundraising Reports for Clubs, Charities and Non-profits | FundRaisely",
    seoDescription:
      "Create audit-ready event reports for clubs, charities and non-profits, with reconciliation, ticket totals, impact summaries and direct-to-club payment records.",
    problemTitle: "After the fundraiser, the numbers are scattered",
    problemText:
      "After a fundraiser, organisers often need to explain more than a headline total. Committees, treasurers, trustees and non-profit teams may need to know what was collected, which tickets were sold or redeemed, who collected cash, what payments went to volunteers personal accounts and which payments are still outstanding. Then show how disputes were resolved, what changed after approval and whether funds were paid directly to the organisation.",
    solutionTitle:
      "One approved event record that stays clear after the night ends",
    solutionText:
      "FundRaisely gives organisers event-level reports built from the payment, ticketing and game records already captured during the fundraiser. Approved audit reports can be locked, financial reports can show late or disputed payment changes, and impact reports can summarise players, volunteers, scores, tickets, prizes and totals. The reports also support a direct-to-organisation funding model: FundRaisely does not hold event funds or take a percentage of the money raised.",
    videoSlot: {
      title: "See how reports work in FundRaisely",
      text: "This walkthrough should show how an organiser reviews event reconciliation, approves the audit-ready report, checks outstanding payments, and downloads committee-friendly financial and impact reports after a fundraiser.",
      imageKey: "reportOverviewScreenshot",
      videoLabel: "Reports walkthrough",
      transcript:
        "The demo should show four practical reporting steps: reviewing the event reconciliation, approving the locked audit report, updating post-event items such as late or disputed payments, and downloading the financial and impact reports for a committee, treasurer or campaign file.",
    },
    screenshotSlots: [
      {
        title: "Report overview",
        description:
          "See the event reporting hub with reconciliation status, key totals, report types and download actions in one place.",
        imageKey: "reportsScreenshot",
        variant: "wide",
      },
      {
        title: "Locked audit reconciliation",
        description:
          "Show the approved audit-ready reconciliation, including the approved totals and locked status once the event record has been signed off.",
        imageKey: "reportReconciliationScreenshot",
        variant: "standard",
      },
      {
        title: "Outstanding and adjusted payments",
        description:
          "Track late payments, disputed items, written-off balances and adjustments that happen after the original event reconciliation.",
        imageKey: "reportOutstandingPaymentsScreenshot",
        variant: "standard",
      },
      
      {
        title: "Impact, tickets and winners summary",
        description:
          "Summarise players, volunteers, tickets sold and redeemed, scores, prize or winner details and the final downloadable report view.",
        imageKey: "reportImpactExportScreenshot",
        variant: "standard",
      },
    ],
    benefits: [
      {
        title: "Audit-ready event reconciliation",
        text: "Create approved event reports that lock the reconciliation record once accepted, helping clubs, charities and non-profits keep a clearer audit trail for each fundraiser.",
      },
      {
        title: "Locked reports after approval",
        text: "Once the audit report is approved, it cannot be edited, helping committees preserve a clean record of what was signed off.",
      },
      {
        title: "Mixed payment method reporting",
        text: "Report on the payment methods clubs actually use, including Stripe or card, cash on the night, bank transfer, Revolut or Monzo-style instant payments and supported crypto payments.",
      },
      {
        title: "Outstanding payment follow-up",
        text: "Report on unpaid, late, disputed, resolved and written-off payments so the final financial picture is clearer than a single ticket-sales total.",
      },
      {
        title: "Financial report after adjustments",
        text: "Use the approved audit totals as the base, then reflect later activity such as late payments, resolved disputes or write-offs without rewriting the original audit report.",
      },
      {
        title: "Impact and participation summaries",
        text: "Show more than money raised by reporting players, volunteers, tickets sold and redeemed, scores, prize or winner details and headline event outcomes for clubs, charities and non-profits.",
      },
    ],
    process: [
      {
        title: "Run the fundraiser",
        text: "Tickets, player entries, payment claims, scores, volunteers, prizes and game activity are captured as the fundraiser takes place.",
      },
      {
        title: "Review the reconciliation",
        text: "The organiser checks income totals, payment statuses, payment methods and any unresolved items before approving the event record.",
      },
      {
        title: "Approve and lock the audit report",
        text: "Once reviewed, the audit-ready reconciliation is stamped and locked so the approved report cannot be edited later.",
      },
      {
        title: "Track outstanding items",
        text: "Late payments, disputed payments, write-offs and resolved balances can be followed up after the original event report is approved.",
      },
      {
        title: "Generate the financial report",
        text: "The financial report starts from the approved audit totals and then adjusts for post-event activity so the latest known collected total stays clear.",
      },
      {
        title: "Download and share reports",
        text: "Export the audit, financial and impact reports for committee review, treasurer records, campaign files or organiser handover.",
      },
    ],
    sections: {
      screenshots: {
        eyebrow: "Reporting workflow",
        title: "Report screens built for real fundraiser follow-up",
        text: "From approved event totals to outstanding payments and impact summaries, these screens show how organisers can move from game-night admin to clearer records.",
      },
      benefits: {
        eyebrow: "Reporting confidence",
        title: "Everything organisers need to explain what happened",
        text: "FundRaisely reports are designed for event-level reconciliation, mixed payment methods, committee review and practical after-event follow-up.",
      },
      process: {
        eyebrow: "Reporting workflow",
        title: "From event reconciliation to downloadable reports",
        text: "The reporting workflow follows what committees need after a fundraiser: approve the numbers, protect the audit record, then keep tracking anything that changes afterwards.",
      },
      proof: {
        eyebrow: "Why this matters",
        title: "Cleaner records for the people who have to explain the money",
        text: "Instead of asking one volunteer to reconstruct the whole fundraiser from screenshots, payment apps and memory, FundRaisely keeps the approved event record, payment follow-up and impact summary together.",
        imageKey: "reportReconciliationLockedScreenshot",
        reverse: true,
        bullets: [
          "Approve a locked audit-ready event report",
          "Separate original totals from later adjustments",
          "Track cash, instant payments, card and crypto in one workflow",
          "Download committee-friendly financial and impact reports",
        ],
      },
      faq: {
        intro:
          "These questions cover the practical reporting issues clubs, charities, non-profits, committees and treasurers usually need to understand before using FundRaisely.",
      },
      cta: {
        title: "Want clearer reports after your next fundraiser?",
        text: "Book a demo to see how FundRaisely turns event reconciliation, payment follow-up and impact summaries into downloadable reports for clubs, charities, non-profits, organisers and committees.",
        primaryCta: {
          label: "Book a demo",
          to: "/demo",
        },
        secondaryCta: {
          label: "See payments",
          to: "/features/payments",
        },
      },
    },
    faqs: [
      {
        question: "Can reports be downloaded?",
        answer:
          "Yes. FundRaisely reports can be downloaded so organisers can share them with a committee, treasurer, event team or campaign file.",
      },
      {
        question: "What makes the audit report audit-ready?",
        answer:
          "The audit report is based on the approved event reconciliation. It records the event totals, payment status and reporting details at the point of approval, then keeps that approved version separate from later changes. These are all tracked in a ledger and tracks who approved the payments and report and when, so clubs, charities and non-profits can keep a clearer audit trail for each fundraiser.",
      },
      {
        question: "Can an approved audit report be edited?",
        answer:
          "No. Once the audit report is approved, it is locked so the signed-off event record cannot be changed afterwards.",
      },
      {
        question:
          "Do reports cover cash, Revolut, Monzo, card and crypto payments?",
        answer:
          "Yes. FundRaisely is designed for mixed fundraising payments. Reports can include online card or Stripe payments, cash on the night, bank transfer, Revolut or Monzo-style instant payments and supported crypto payments.",
      },
      {
        question: "What happens if someone pays late?",
        answer:
          "Late payments can be tracked after the event. The financial report can reflect the later payment while the original approved audit report remains unchanged.",
      },
      {
        question: "Can reports show disputed or written-off payments?",
        answer:
          "Yes. Organisers can keep visibility over disputed, unresolved and written-off payments so the committee can see what was collected, what was not collected and what decision was made.",
      },
      {
        question: "Do reports include impact as well as money?",
        answer:
          "Yes. FundRaisely can report useful event impact details such as players, volunteers, tickets sold and redeemed, scores, prizes or winners and headline fundraising totals.",
      },
      {
        question: "Will reports work at campaign level?",
        answer:
          "Campaign-level reporting is planned as the platform expands. The current reporting focus is event and game-level records, with campaign-level summaries expected to build on those approved event reports.",
      },
      {
        question: "Does this replace accounting software?",
        answer:
          "No. FundRaisely does not replace full accounting software. It gives clubs and charities cleaner fundraiser-level records before figures are passed into accounts, board packs, annual reporting or wider financial systems.",
      },
      {
        question:
          "Do reports show that funds were paid directly to the club or non-profit?",
        answer:
          "Yes. FundRaisely is designed around direct-to-organisation payments. The club, charity or non-profit uses its own Stripe account, instant-payment details or crypto wallet, so FundRaisely does not hold fundraiser funds or take a percentage of the event income. Reports can help explain the payment records behind those totals.",
      },
    ],
    relatedLinks: [
      {
        label: "Payments",
        to: "/features/payments",
        description:
          "Track cash, instant payments, card, Stripe and crypto payments before they feed into reports.",
      },
      {
        label: "Ticketing",
        to: "/features/ticketing",
        description:
          "Connect ticket sales, redeemed tickets and supporter entries to event reporting.",
      },
      {
        label: "Event formats",
        to: "/event-formats",
        description:
          "See the quiz, elimination and event formats that can produce FundRaisely reports.",
      },
    ],
  }),

  "comms-hub": feature({
    slug: "comms-hub",
    path: "/features/comms-hub",
    h1: "Communications Hub for fundraiser updates",
    eyebrow: "Communications Hub",
    intro:
      "A coming-soon area for organising supporter messages, campaign updates, reminders and follow-up communication.",
    imageKey: "dashboardScreenshot",
    status: "coming_soon",
  }),

  crm: feature({
    slug: "crm",
    path: "/features/crm",
    h1: "CRM for supporters, donors and local contacts",
    eyebrow: "CRM",
    intro:
      "A coming-soon contact workspace for keeping supporter, sponsor, donor and community relationship records connected to fundraising activity.",
    imageKey: "committeeReports",
    status: "coming_soon",
  }),

  "task-manager": feature({
    slug: "task-manager",
    path: "/features/task-manager",
    h1: "Task Manager for fundraising teams",
    eyebrow: "Task Manager",
    intro:
      "A coming-soon area for assigning fundraiser tasks, deadlines and follow-up actions across organisers and volunteers.",
    imageKey: "volunteersTickets",
    status: "coming_soon",
  }),

  "team-manager": feature({
    slug: "team-manager",
    path: "/features/team-manager",
    h1: "Team Manager for organisers and admins",
    eyebrow: "Team Manager",
    intro:
      "A coming-soon feature for managing organiser roles, helpers, admins and team access across fundraising activity.",
    imageKey: "sportsClubFundraiser",
    status: "coming_soon",
  }),

  "volunteer-tools": feature({
    slug: "volunteer-tools",
    path: "/features/volunteer-tools",
    h1: "Volunteer tools for community fundraisers",
    eyebrow: "Volunteer tools",
    intro:
      "Coming-soon tools to help volunteers support ticketing, check-ins, payment follow-up, prize records and event tasks.",
    imageKey: "volunteersTickets",
    status: "coming_soon",
  }),

  "sponsor-tools": feature({
    slug: "sponsor-tools",
    path: "/features/sponsor-tools",
    h1: "Sponsor tools for community fundraising",
    eyebrow: "Sponsor tools",
    intro:
      "Coming-soon sponsor outreach and tracking tools for clubs, charities, schools and community groups.",
    imageKey: "sponsorFinderScreenshot",
    status: "coming_soon",
  }),

  "ai-prize-finder": feature({
    slug: "ai-prize-finder",
    path: "/features/ai-prize-finder",
    h1: "AI Prize Finder for fundraising teams",
    eyebrow: "AI Prize Finder",
    intro:
      "A coming-soon tool area to help organisers identify possible prizes, local supporters and sponsor opportunities.",
    imageKey: "sponsorFinderScreenshot",
    status: "coming_soon",
  }),

  "prize-manager": feature({
    slug: "prize-manager",
    path: "/features/prize-manager",
    h1: "Prize Manager for fundraising events",
    eyebrow: "Prize Manager",
    intro:
      "A coming-soon area for recording prizes, values, sponsors, winners, collection status and follow-up notes.",
    imageKey: "prizeTable",
    status: "coming_soon",
  }),

  compliance: feature({
    slug: "compliance",
    path: "/features/compliance",
    h1: "Compliance prompts for fundraising organisers",
    eyebrow: "Compliance",
    intro:
      "Prompt organisers to think through practical fundraising rules, records and committee checks before they publish a fundraiser.",
    imageKey: "complianceScreenshot",
    emphasis: "screenshot_heavy",
  }),
};

featurePages['campaign-manager'] = feature({
  slug: 'campaign-manager',
  path: '/features/campaign-manager',
  h1: 'Campaign Manager for connected fundraising goals',
  eyebrow: 'Campaign Manager',
  intro:
    'Create the fundraising goal, connect the events and games that support it, and keep progress, payments and reports tied back to one clear campaign story.',
  imageKey: 'campaignPlanningScreenshot',
  emphasis: 'screenshot_heavy',
  seoTitle: 'Campaign Management for Fundraising Events | FundRaisely',
  seoDescription:
    'Create fundraising campaigns, connect events and games, track progress and keep reports organised for clubs, charities, schools and community groups.',
  problemTitle: 'Fundraising goals get lost when each activity is tracked separately',
  problemText:
    'A club or charity might run a quiz, sell tickets, collect cash, ask for prize donations, share a campaign page and follow up with supporters, but the wider goal can disappear across spreadsheets, messages and separate links. Committees need to know not just what one event raised, but how each action moved the campaign forward.',
  solutionTitle: 'One campaign structure for every fundraising action',
  solutionText:
    'FundRaisely connects the fundraising goal to the practical work that raises the money. Organisers can group events, games, ticketing, payments, prizes, sponsors and reports under one campaign so the story, progress and records stay together.',
  benefits: [
    {
      title: 'Set the fundraising goal',
      text: 'Create a clear campaign around a project, cause, team need, facility upgrade or community target.',
    },
    {
      title: 'Connect events and games',
      text: 'Link quiz nights, ticketed events, elimination games, puzzle challenges and other activity back to the campaign.',
    },
    {
      title: 'Track progress clearly',
      text: 'See how each fundraiser contributes to the target instead of adding figures manually after every event.',
    },
    {
      title: 'Keep records together',
      text: 'Connect reports, payments, participants, prizes, sponsors and follow-up notes to the campaign record.',
    },
  ],
  process: [
    {
      title: 'Create the campaign',
      text: 'Add the goal, target, story, dates and the organisation or team behind the fundraiser.',
    },
    {
      title: 'Add fundraising actions',
      text: 'Attach events, games, ticketed activities, door-to-door packs or other fundraising formats to the campaign.',
    },
    {
      title: 'Track money and activity',
      text: 'Follow the payments, participation and event results that contribute to the campaign target.',
    },
    {
      title: 'Report the outcome',
      text: 'Use campaign-level records to show what was raised, what happened and what supporters helped make possible.',
    },
  ],
  screenshotSlots: [
    {
      title: 'Campaign planning view',
      description: 'Show the goal, campaign details, target amount and linked fundraising activity.',
      imageKey: 'campaignPlanningScreenshot',
      variant: 'desktop',
    },
    {
      title: 'Linked events and games',
      description: 'Show how ready-to-run event formats and ordinary events connect back to a campaign.',
      imageKey: 'dashboardOverviewScreenshot',
    },
    {
      title: 'Campaign reporting',
      description: 'Show progress, totals, payments and impact details rolling up into the campaign record.',
      imageKey: 'reportOverviewScreenshot',
    },
  ],
  faqs: [
    {
      question: 'What is a campaign in FundRaisely?',
      answer:
        'A campaign is the fundraising goal or cause. Events, games, tickets, payments and reports can then connect back to that goal so organisers can see the bigger picture.',
    },
    {
      question: 'Can one campaign have multiple events?',
      answer:
        'Yes. A campaign can be supported by multiple fundraising actions, such as a quiz night, ticketed event, elimination game, puzzle challenge or door-to-door pack.',
    },
    {
      question: 'Can campaign reports include payments from different methods?',
      answer:
        'Yes. FundRaisely is designed to track mixed payment activity, including cash, card, bank transfer, instant payment and other supported routes, before those records feed into reports.',
    },
  ],
  relatedLinks: [
    { label: 'Event Manager', to: '/features/event-manager', description: 'Plan and manage the events attached to a campaign.' },
    { label: 'Event formats', to: '/event-formats', description: 'Explore ready-to-run fundraisers that can support a campaign.' },
    { label: 'Reports', to: '/features/reports', description: 'Review the records created by campaign and event activity.' },
  ],
  sections: {
    benefits: {
      eyebrow: 'Campaign structure',
      title: 'Keep the goal, the actions and the records connected',
      text: 'A campaign gives every fundraiser a clear reason, target and place to report back to.',
    },
    process: {
      eyebrow: 'How it works',
      title: 'From fundraising goal to campaign report',
      text: 'The campaign manager gives organisers a structure for repeat fundraising, not just one-off event admin.',
    },
    proof: {
      eyebrow: 'Platform fit',
      title: 'Campaigns are the goal. Events and games are the actions.',
      text: 'FundRaisely is built so organisations can run multiple fundraising actions without losing sight of the bigger target.',
      bullets: [
        'Connect ordinary events and ready-to-run formats to one campaign',
        'Keep supporter activity and payment records tied to the goal',
        'Report clearly on what was raised and what happened next',
      ],
      imageKey: 'campaignPlanningScreenshot',
      reverse: true,
    },
    cta: {
      title: 'Ready to organise fundraising around a clear campaign goal?',
      text: 'Book a demo to see how campaigns, events, payments and reports can fit together in FundRaisely.',
      primaryCta: { label: 'Book a demo',to: '/contact' },
      secondaryCta: { label: 'Explore event formats', to: '/event-formats' },
    },
  },
});

featurePages['impact-reports'] = feature({
  slug: 'impact-reports',
  path: '/features/impact-reports',
  h1: 'Impact reports and records for every fundraiser',
  eyebrow: 'Impact reports',
  intro:
    'Show more than the money. Capture participation, prizes, sponsors, outcomes and the story of what the fundraiser helped make possible.',
  imageKey: 'reportImpactExportScreenshot',
  emphasis: 'screenshot_heavy',
  seoTitle: 'Fundraising Impact Reports for Clubs and Nonprofits | FundRaisely',
  seoDescription:
    'Create impact reports for fundraising campaigns and events, including participation, prizes, sponsors, outcomes and what was raised.',
  problemTitle: 'Fundraising reports often stop at the money',
  problemText:
    'Committees and supporters need to know what was raised, but they also need the story behind it: who took part, which prizes or sponsors supported the event, what the funds were for and what changed because people got involved.',
  solutionTitle: 'Impact records that connect participation to outcomes',
  solutionText:
    'FundRaisely helps organisers record the activity behind a fundraiser so they can report back with more than a single total. Participation, tickets, prizes, sponsors, winners, volunteers and campaign outcomes can all help show the real impact of the event.',
  benefits: [
    {
      title: 'Show participation',
      text: 'Record players, attendees, tickets, volunteers or collectors so the report reflects the people who helped.',
    },
    {
      title: 'Recognise prizes and sponsors',
      text: 'Keep prize and sponsor details connected to the fundraiser so local support can be acknowledged properly.',
    },
    {
      title: 'Explain the outcome',
      text: 'Connect the money raised to the campaign goal, project or community benefit it supported.',
    },
    {
      title: 'Bring supporters back',
      text: 'Use clearer impact records for thank-you messages, updates and future fundraising outreach.',
    },
  ],
  process: [
    {
      title: 'Capture event activity',
      text: 'Record attendance, entries, tickets, players, volunteers, collectors or other anonymous participation data during the fundraiser.',
    },
    {
      title: 'Add prizes and sponsors',
      text: 'Attach prize donations, sponsor names, winner details and fulfilment notes to the event record.',
    },
    {
      title: 'Connect to the campaign goal',
      text: 'Show how the fundraiser contributed to the wider cause, project or target.',
    },
    {
      title: 'Share the impact',
      text: 'Use the report to thank supporters, update committees and encourage people to join the next fundraiser.',
    },
  ],
  screenshotSlots: [
    {
      title: 'Impact report export',
      description: 'Show players, volunteers, tickets, scores, prizes and headline fundraising totals in one report, thats easy to export and share',
      imageKey: 'reportImpactExportScreenshot',
      variant: 'wide',
    },
    {
      title: 'Impact report overview',
      description: 'The impact report provides a comprehensive view of the fundraiser\'s outcomes and the people involved. Easy to share with supporters and committees.',
      imageKey: 'impactReportScreenshot',
      variant: 'wide',
    },
    // {
    //   title: 'Campaign context',
    //   description: 'Show how impact rolls back to the campaign goal or event record.',
    //   imageKey: 'campaignPlanningScreenshot',
    // },
  ],
  faqs: [
    {
      question: 'How is an impact report different from a financial report?',
      answer:
        'A financial report focuses on the money and reconciliation. An impact report adds the story around the fundraiser, such as participation, prizes, sponsors, winners, volunteers and outcomes.',
    },
    {
      question: 'Can impact reports help with supporter follow-up?',
      answer:
        'Yes. Impact records can support thank-you messages, committee updates, campaign updates and future supporter engagement.',
    },
    {
      question: 'Can impact reports include prizes and sponsors?',
      answer:
        'Yes. FundRaisely can keep prize and sponsor records connected to the fundraiser so local supporters can be recognised and reported clearly.',
    },
  ],
  relatedLinks: [
    { label: 'Reports', to: '/features/reports', description: 'Review financial and audit-ready fundraiser records.' },
    { label: 'Campaign Manager', to: '/features/campaign-manager', description: 'Connect impact back to the campaign goal.' },
    { label: 'CRM', to: '/features/crm', description: 'Use supporter records to bring people back.' },
  ],
  sections: {
    benefits: {
      eyebrow: 'Impact story',
      title: 'Show what happened because people took part',
      text: 'Impact reporting helps organisations move beyond a headline total and explain the value of the fundraiser.',
    },
    proof: {
      eyebrow: 'Supporter trust',
      title: 'People are more likely to support again when they can see the result',
      text: 'Clear impact records help organisers close the loop with supporters, sponsors, volunteers and committees.',
      bullets: [
        'Prove the commuity was activites and they took part',
        'Show who took part and what was raised',
        'Recognise prizes, sponsors and volunteers',
        'Connect outcomes to the campaign goal',
      ],
      imageKey: 'reportImpactExportScreenshot',
      reverse: true,
    },
  },
});

featurePages['crm'] = feature({
  slug: 'crm',
  path: '/features/crm',
  h1: 'CRM and supporter management for fundraisers',
  eyebrow: 'CRM',
  intro:
    'Keep supporter, donor, participant, volunteer and sponsor records connected to the campaigns and events they helped make happen.',
  imageKey: 'committeeReports',
  emphasis: 'photo_heavy',
  seoTitle: 'Fundraising CRM and Supporter Management | FundRaisely',
  seoDescription:
    'Keep supporter, donor, participant, volunteer and sponsor records connected to fundraising campaigns, events, games and reports.',
  problemTitle: 'Supporter history is often scattered after the event ends',
  problemText:
    'A fundraiser can involve players, donors, ticket buyers, sponsors, volunteers, collectors and committee helpers. If those people only exist in payment apps, spreadsheets and message threads, it is harder to thank them properly or invite them back to the next fundraiser.',
  solutionTitle: 'Supporter records connected to real fundraising activity',
  solutionText:
    'FundRaisely keeps relationship records connected to campaigns, events, games, payments and reports, so organisers can understand who took part, who supported the fundraiser and who should hear from them again.',
  benefits: [
    { title: 'Supporter records', text: 'Keep donors, ticket buyers, participants and local supporters connected to the fundraisers they joined.' },
    { title: 'Sponsor and prize contacts', text: 'Record local businesses, prize donors and sponsor relationships so follow-up is easier.' },
    { title: 'Volunteer context', text: 'See who helped with collections, tickets, admin or event-night tasks.' },
    { title: 'Repeat engagement', text: 'Use cleaner records for thank-you messages, updates and future fundraiser invitations.' },
  ],
  process: [
    { title: 'Capture supporters', text: 'Record people as they buy tickets, join events, donate, volunteer, sponsor or collect.' },
    { title: 'Connect them to activity', text: 'Link supporters to campaigns, events, payments, prizes and reports.' },
    { title: 'Review the relationship', text: 'See how someone has supported the organisation across different fundraisers.' },
    { title: 'Bring people back', text: 'Use supporter records for thank-you messages, updates and future fundraiser invitations.' },
  ],
  screenshotSlots: [
    { title: 'Supporter profile', description: 'Show contact details, fundraiser history and participation records.', imageKey: 'committeeReports', variant: 'desktop' },
    { title: 'Campaign supporters', description: 'Show supporters connected to a specific campaign or event.', imageKey: 'campaignPlanningScreenshot' },
    { title: 'Follow-up records', description: 'Show thank-you, sponsor and repeat engagement notes.', imageKey: 'dashboardScreenshot' },
  ],
  faqs: [
    { question: 'Who belongs in the FundRaisely CRM?', answer: 'Supporters can include donors, players, ticket buyers, volunteers, sponsors, prize donors, collectors and other local contacts involved in fundraising activity.' },
    { question: 'Why does CRM matter for grassroots fundraising?', answer: 'It helps organisations thank people, understand who supports them and invite the right people back to future fundraisers.' },
    { question: 'Does CRM replace a full charity database?', answer: 'No. FundRaisely focuses on practical fundraiser-level supporter records that connect to campaigns, events, payments and reports.' },
  ],
  relatedLinks: [
    { label: 'Campaign Manager', to: '/features/campaign-manager', description: 'Connect supporters to the campaigns they support.' },
    { label: 'Impact reports', to: '/features/impact-reports', description: 'Use supporter activity in impact reporting.' },
    { label: 'AI Prize Finder', to: '/features/ai-prize-finder', description: 'Track prize and sponsor outreach.' },
  ],
});

featurePages['ai-prize-finder'] = feature({
  slug: 'ai-prize-finder',
  path: '/features/ai-prize-finder',
  h1: 'AI Prize Finder for local fundraising teams',
  eyebrow: 'AI Prize Finder',
  intro:
    'Help volunteers find, contact and track possible prize donors and local sponsors without spending hours starting from a blank list.',
  imageKey: 'sponsorFinderScreenshot',
  emphasis: 'screenshot_heavy',
  seoTitle: 'AI Prize Finder for Club and Charity Fundraising | FundRaisely',
  seoDescription:
    'Find and track local prize donors and sponsor opportunities for fundraising events, quizzes, raffles and community campaigns.',
  problemTitle: 'Prize chasing takes time volunteers rarely have',
  problemText:
    'Local fundraising often relies on prizes, sponsors and donated experiences, but volunteers can spend hours working out who to ask, writing messages, tracking replies and remembering who already gave something last year.',
  solutionTitle: 'A faster way to build and manage prize outreach',
  solutionText:
    'The AI Prize Finder is designed to help organisers identify relevant local businesses and supporters, prepare outreach messages, track conversations and connect confirmed prizes back to the fundraiser or campaign.',
  benefits: [
    { title: 'Find likely prize donors', text: 'Build a more focused list of local businesses and supporters who may be relevant to the event.' },
    { title: 'Create outreach messages', text: 'Generate practical, editable messages that explain the fundraiser and the prize request clearly.' },
    { title: 'Track replies and follow-up', text: 'Keep outreach status, contact notes and confirmed prize details together.' },
    { title: 'Connect prizes to reports', text: 'Record confirmed prizes, sponsors and outcomes so they can be recognised after the fundraiser.' },
  ],
  process: [
    { title: 'Add the fundraiser context', text: 'Use the event, campaign, audience and fundraising goal to guide prize and sponsor suggestions.' },
    { title: 'Review suggested leads', text: 'Shortlist local businesses, sponsors or supporters that fit the fundraiser.' },
    { title: 'Send tailored outreach', text: 'Use editable messages to ask for a prize, sponsorship or practical support.' },
    { title: 'Track confirmed support', text: 'Record what was promised, who gave it and how it should be recognised in reports.' },
  ],
  screenshotSlots: [
    { title: 'Prize lead suggestions', description: 'Show suggested local businesses or supporters based on the fundraiser details.', imageKey: 'sponsorFinderScreenshot', variant: 'desktop' },
    { title: 'Outreach message', description: 'Show an editable prize request or sponsor outreach message.', imageKey: 'sponsorFinderScreenshot' },
    { title: 'Prize tracking', description: 'Show confirmed prizes, sponsors, status and follow-up notes.', imageKey: 'prizeTable' },
  ],
  faqs: [
    { question: 'What does the AI Prize Finder help with?', answer: 'It helps organisers identify possible prize donors or sponsors, prepare outreach messages and track the follow-up work around prize-led fundraising.' },
    { question: 'Can organisers edit the suggested messages?', answer: 'Yes. Outreach messages should be editable so clubs and charities can keep their own tone and add local context.' },
    { question: 'Can prize records appear in reports?', answer: 'Yes. Prize and sponsor records can feed into event and impact reports so supporters are recognised clearly.' },
  ],
  relatedLinks: [
    { label: 'CRM', to: '/features/crm', description: 'Keep sponsor and prize donor relationships connected.' },
    { label: 'Impact reports', to: '/features/impact-reports', description: 'Recognise prizes and sponsors in reports.' },
    { label: 'Event formats', to: '/event-formats', description: 'Use prizes across quizzes, games and other fundraiser formats.' },
  ],
});
