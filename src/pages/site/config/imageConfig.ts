export type ImageKey =
  | "communityQuizNight"
  | "sportsClubFundraiser"
  | "schoolFundraisingEvent"
  | "volunteersTickets"
  | "committeeReports"
  | "prizeTable"
  | "communityCelebration"
  | "dashboardScreenshot"
  | "dashboardOverviewScreenshot"
  | "dashboardEventCardsScreenshot"
  | "dashboardManageLaunchScreenshot"
  | "dashboardMobileOrganiserScreenshot"
  | "eventManagerHeroPhoto"
  | "eventSetupOverviewScreenshot"
  | "eventPriceGoalScreenshot"
  | "eventPaymentMethodsScreenshot"
  | "eventLaunchDashboardScreenshot"
  | "eventaddadminScreenshot"
  | "eventSetupOverviewPhotoshot"
  | "ticketingScreenshot"
  | "ticketingHeroScreenshot"
  | "ticketPurchaseFlowScreenshot"
  | "ticketingPublicPageScreenshot"
  | "ticketingPaymentMethodsScreenshot"
  | "ticketingPaymentReferenceScreenshot"
  | "ticketingSalesRedemptionsScreenshot"
  | "ticketingInstantPaymentScreenshot"
  | "cashatdoorScreenshot"
  | "ticketreportingScreenshot"
  | "paymentTrackingScreenshot"
  | "paymentsHeroScreenshot"
  | "paymentActivePlayersScreenshot"
  | "paymentLatePaymentScreenshot"
  | "paymentOptionsScreenshot"
  | "paymentOnTheNightScreenshot"
  | "paymentActivePlayersMobileScreenshot"
  | "quizGameplayScreenshot"
  | "reportHeroScreenshot"
  | "reportsScreenshot"
  | "reportOverviewScreenshot"
  | "reportReconciliationLockedScreenshot"
  | "reportOutstandingPaymentsScreenshot"
  | "reportImpactExportScreenshot"
  | "campaignPlanningScreenshot"
  | "sponsorFinderScreenshot"
  | "complianceScreenshot";

export type SiteImage = {
  src: string;
  alt: string;
  caption?: string;
};

const photo = (id: string, w = 1400, h = 1000) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

const placeholder = (text: string, w = 1400, h = 900) =>
  `https://placehold.co/${w}x${h}/f7f1e8/12313f?text=${encodeURIComponent(text)}`;

export const images: Record<ImageKey, SiteImage> = {
  communityQuizNight: {
    src: photo("photo-1543269865-cbf427effbad"),
    alt: "A group of people enjoying a community quiz night around a table",
  },

  sportsClubFundraiser: {
    src: photo("photo-1526232761682-d26e03ac148e"),
    alt: "A local sports team gathered after a community match",
  },

  schoolFundraisingEvent: {
    src: photo("photo-1509062522246-3755977927d7"),
    alt: "A school classroom ready for a parent and pupil fundraising event",
  },

  volunteersTickets: {
    src: photo("photo-1556761175-b413da4baf72"),
    alt: "Volunteers organising event registrations and tickets at a table",
  },

  committeeReports: {
    src: photo("photo-1551836022-d5d88e9218df"),
    alt: "A committee reviewing reports and paperwork after an event",
  },

  prizeTable: {
    src: photo("photo-1513151233558-d860c5398176"),
    alt: "A prize table prepared for a local fundraising event",
  },

  communityCelebration: {
    src: photo("photo-1511632765486-a01980e01a18"),
    alt: "People celebrating together at a community fundraiser",
  },

  dashboardScreenshot: {
    src: placeholder("FundRaisely dashboard screenshot"),
    alt: "Placeholder for a FundRaisely dashboard screenshot",
  },

  dashboardOverviewScreenshot: {
    src: "/images/screenshots/dashboard-overview.png",
    alt: "FundRaisely dashboard showing upcoming and ended fundraising events, event totals, ticket sales and links to event manager and reports.",
  },

  dashboardEventCardsScreenshot: {
    src: "/images/screenshots/dashboard-event-cards.png",
    alt: "FundRaisely event cards showing event names, dates, goals, amount raised, ticket sales and quick actions.",
  },

  dashboardManageLaunchScreenshot: {
    src: "/images/screenshots/dashboard-manage-launch.png",
    alt: "FundRaisely dashboard flow showing an organiser opening an event, managing setup and launching the fundraiser.",
  },

  dashboardMobileOrganiserScreenshot: {
    src: "/images/screenshots/dashboard-mobile-organiser.png",
    alt: "Mobile FundRaisely dashboard showing upcoming events, event status and organiser next actions.",
  },

  eventManagerHeroPhoto: {
    src: "/images/screenshots/eventmanagement.png",
    alt: "FundRaisely Event Manager view showing fundraiser setup details, ticket price, payment methods and launch controls.",
  },

  eventSetupOverviewScreenshot: {
    src: "/images/screenshots/eventmanager.png",
    alt: "FundRaisely Event Manager overview showing event name, format, date, target, setup status and key actions.",
  },

    eventSetupOverviewPhotoshot: {
    src: "/images/screenshots/eventmanagerphoto.png",
    alt: "FundRaisely Event Manager overview showing event name, format, date, target, setup status and key actions.",
  },

  eventPriceGoalScreenshot: {
    src: "/images/screenshots/configure_event.png",
    alt: "FundRaisely Event Manager screen for editing the fundraiser target, schedule and setup details.",
  },

  eventPaymentMethodsScreenshot: {
    src: "/images/screenshots/paymentmethods.png",
    alt: "FundRaisely Event Manager screen showing payment methods selected for ticketing and on the night payment.",
  },

  eventLaunchDashboardScreenshot: {
    src: "/images/screenshots/reports.png",
    alt: "FundRaisely Event Manager launch dashboard showing advance tickets, redeemed tickets, launch controls and admin helper access.",
  },

 eventaddadminScreenshot: {
    src: "/images/screenshots/addadmin.png",
    alt: "Each game has it own workspace where you can add admin helpers, help users join , and manage the game controls.",
  },

  ticketingScreenshot: {
    src: "/images/screenshots/playerticket.png",
    alt: "FundRaisely ticketing view showing player details, ticket type, payment status and redemption status for a fundraising event.",
  },

  ticketingHeroScreenshot: {
    src: "/images/screenshots/ticketmgt.png",
    alt: "FundRaisely ticketing screen showing ticket sales, payment status and redeemed tickets for a fundraising event.",
  },

  ticketPurchaseFlowScreenshot: {
    src: "/images/screenshots/ticketing-public-page.png",
    alt: "FundRaisely supporter ticket purchase flow for a fundraising event.",
  },

  ticketingPublicPageScreenshot: {
    src: "/images/screenshots/ticketing-public-page.png",
    alt: "FundRaisely public ticket page showing event details, ticket price, capacity messaging and payment next step.",
  },

  ticketingPaymentMethodsScreenshot: {
    src: "/images/screenshots/paymentmethods.png",
    alt: "FundRaisely payment methods for ticketing and on the night payments, showing options for card, instant payment, crypto and cash.",
  },

  ticketingPaymentReferenceScreenshot: {
    src: "/images/screenshots/ticketing-payment-reference.png",
    alt: "FundRaisely ticket payment instruction screen showing a unique payment reference code.",
  },

  ticketingSalesRedemptionsScreenshot: {
    src: "/images/screenshots/ticketing-sales.png",
    alt: "FundRaisely organiser ticketing view showing tickets sold, payment status, confirmed tickets, redeemed tickets and report actions.",
  },
  ticketingInstantPaymentScreenshot: {
    src: "/images/screenshots/instantpayment.png",
    alt: "FundRaisely ticketing view showing instant payment reference for a ticket purchase.",
  },
    cashatdoorScreenshot: { 
      src: "/images/screenshots/cashatdoor.png",
      alt: "Admin simply marks cash at the door for cash they personally recieve and a full audit trail is generated.",
    },
  ticketreportingScreenshot: {
    src: "/images/screenshots/ticketreports.png",
    alt: "FundRaisely ticket reporting showing ticket sales, payment status, redeemed tickets and report export options.",
  },

  paymentTrackingScreenshot: {
    src: "/images/screenshots/payments-active-players.png",
    alt: "FundRaisely payment tracking view showing active players and payment statuses.",
  },

  paymentsHeroScreenshot: {
    src: "/images/screenshots/paymenthero.png",
    alt: "FundRaisely payment tracking dashboard for fundraiser organisers.",
  },

  paymentActivePlayersScreenshot: {
    src: "/images/screenshots/payments-active-players.png",
    alt: "FundRaisely active players view showing unpaid, pending and paid payment statuses.",
  },

  paymentLatePaymentScreenshot: {
    src: "/images/screenshots/payments-late-payment.png",
    alt: "FundRaisely payment reconciliation screen for accepting a late payment.",
  },

  paymentOptionsScreenshot: {
    src: "/images/screenshots/payments-event-options.png",
    alt: "FundRaisely event setup screen showing selected payment methods for a quiz.",
  },

  paymentOnTheNightScreenshot: {
    src: "/images/screenshots/payments-on-the-night.png",
    alt: "FundRaisely setup screen for enabling cash and card tap on-the-night payments.",
  },

  paymentActivePlayersMobileScreenshot: {
    src: "/images/screenshots/payments-active-players-mobile.png",
    alt: "Mobile view of FundRaisely payment tracking showing player payment status and organiser actions.",
  },

  quizGameplayScreenshot: {
    src: placeholder("Quiz gameplay screenshot"),
    alt: "Placeholder for a quiz gameplay screenshot",
  },

  reportsScreenshot: {
    src: "/images/screenshots/reportsscreen.png",
    alt: "Fundraisely reports screen showing player payment status and organiser actions.",
  },

  reportOverviewScreenshot: {
    src: "/images/screenshots/reporthero.png",
    alt: "FundRaisely report overview showing event reconciliation totals, payment status and downloadable report options.",
  },

  reportReconciliationLockedScreenshot: {
    src: "/images/screenshots/reports-reconciliation-locked.png",
    alt: "FundRaisely approved audit-ready reconciliation showing approved totals and locked report status.",
  },

  reportOutstandingPaymentsScreenshot: {
    src: "/images/screenshots/reports-outstanding-payments.png",
    alt: "FundRaisely reports screen showing late payments, disputed items, written-off balances and adjustments.",
  },

  reportImpactExportScreenshot: {
    src: "/images/screenshots/impacthero.png",
    alt: "FundRaisely impact report showing players, volunteers, tickets sold and redeemed, scores, prizes and final downloadable report details.",
  },

  reportHeroScreenshot: {
    src: "/images/screenshots/reporthero.png",
    alt: "FundRaisely report overview showing event reconciliation totals, payment status and downloadable report options.",
  },

  campaignPlanningScreenshot: {
    src: placeholder("Campaign planning screenshot"),
    alt: "Placeholder for a campaign planning screenshot",
  },

  sponsorFinderScreenshot: {
    src: placeholder("Sponsor and prize finder preview"),
    alt: "Placeholder for sponsor and prize finder tools",
  },

  complianceScreenshot: {
    src: placeholder("Compliance prompt screenshot"),
    alt: "Placeholder for compliance guidance prompts",
  },
};
