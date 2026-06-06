import { SEO } from '../../components/seo/SEO';
import { Breadcrumbs } from '../../components/seo/Breadcrumbs';
import { breadcrumbsForPath } from '../../components/seo/breadcrumbUtils';
import {
  compactStructuredData,
  faqJsonLd,
  webPageJsonLd,
  // videoJsonLd,
} from '../../components/seo/structuredData';

import { Hero } from '../../components/sections/Hero';
// import { VideoSection } from '../../components/sections/VideoSection';
import { FeatureGrid } from '../../components/sections/FeatureGrid';
import { ProcessSteps } from '../../components/sections/ProcessSteps';
import { ScreenshotShowcase } from '../../components/sections/ScreenshotShowcase';
import { SplitSection } from '../../components/sections/SplitSection';
import { FAQSection } from '../../components/sections/FAQSection';
import { RelatedLinks } from '../../components/sections/RelatedLinks';
import { CTASection } from '../../components/sections/CTASection';

import { images } from '../../config/imageConfig';

const path = '/event-formats/ticketed-events';

const seoTitle =
  'Ticketed Fundraising Event Software for Clubs and Charities | FundRaisely';

const seoDescription =
  'Set up non-digital ticketed fundraising events such as dinners, galas, sports events, race nights, coffee mornings and family fun days, with ticket sales, QR check-in, admin helpers, payment tracking and reconciliation.';

const h1 = 'Run ticketed fundraising events without the spreadsheet chaos';

const breadcrumbs = breadcrumbsForPath(path, h1);

/*
const videoSlot = {
  title: 'See how a FundRaisely ticketed event works',
  text: 'Watch how a club, charity or community group can set up a ticketed event, add ticket prices, include sponsor or prize details, share the event link, check guests in with QR codes and reconcile payments afterwards.',
  imageKey: 'ticketingHeroScreenshot' as const,
  videoLabel: 'Ticketed fundraising event walkthrough',
  transcript:
    'This walkthrough should show the full ticketed event flow: creating the fundraiser, selecting ticketed event as the format, adding ticket prices, adding sponsor details, adding prize or giveaway details, sharing the event link, selling or reserving tickets, adding admins, scanning ticket QR codes on mobile, accepting payments on the night and reviewing the reconciliation record afterwards.',
};
*/

const faqs = [
  {
    question: 'What is a non-digital ticketed event?',
    answer:
      'A non-digital ticketed event is a real-world fundraising event where the activity happens offline, such as a dinner, gala, sports event, coffee morning, race night, awards night, concert, workshop or family fun day. FundRaisely supports the setup, ticketing, check-in, payment tracking and reconciliation around the event.',
  },
  {
    question: 'Is this different from a quiz or elimination game?',
    answer:
      'Yes. Quiz and Elimination are ready-to-run digital fundraising activities. Ticketed events are for ordinary in-person fundraisers where the organisation is running its own event and needs a better way to manage tickets, attendance, payments and records.',
  },
  {
    question: 'What types of events can we set up?',
    answer:
      'You can use this format for dinners, galas, sports events, race nights, awards nights, coffee mornings, family fun days, concerts, comedy nights, workshops, training days, community evenings, club socials, charity lunches, breakfast mornings, open days and other ticketed fundraisers.',
  },
  {
    question: 'How does a ticketed event work?',
    answer:
      'The host sets up the event, selects ticketed event as the format, adds the ticket price, includes sponsor details or prize and giveaway details if needed, and shares the event link with supporters.',
  },
  {
    question: 'Can supporters buy or reserve tickets online?',
    answer:
      'Yes. The event can be shared with supporters so they can join the ticket flow before the event. The organiser can then track ticket activity and payment status from the event dashboard.',
  },
  {
    question: 'Can we take payment on the night?',
    answer:
      'Yes. Organisers can accept payment on the night and keep those payments connected to the event record. This helps reduce confusion between advance sales, walk-ins, cash, instant payments and outstanding amounts.',
  },
  {
    question: 'Can admins help at the event?',
    answer:
      'Yes. Hosts can add admins or helpers who can support check-in, scan ticket QR codes on mobile, help with walk-ins and assist with payment checks without needing to control the whole event.',
  },
  {
    question: 'How does QR check-in work?',
    answer:
      'Each ticket can have a QR code. At the event, an admin or organiser scans the QR code on mobile, confirms the ticket and checks the person in.',
  },
  {
    question: 'Can we include sponsor or prize details?',
    answer:
      'Yes. Hosts can add sponsor details, prize information or giveaway details where relevant, helping keep the event record clearer and making follow-up easier after the fundraiser.',
  },
  {
    question: 'Do ticketed events connect to reconciliation?',
    answer:
      'Yes. Ticketed events can use the same payment tracking and reconciliation flow as other FundRaisely formats, helping organisers review what was expected, what was received, what is outstanding and what was handled on the night.',
  },
];

const structuredData = compactStructuredData([
  webPageJsonLd(path, h1, seoDescription),
  faqJsonLd(faqs),
  // videoJsonLd(videoSlot, path),
]);

const screenshotSlots = [
  {
    title: 'Ticket setup',
    description:
      'Create the event, choose the ticketed event format, set prices and prepare the ticket flow before sharing the event link.',
    imageKey: 'ticketingHeroScreenshot' as const,
    variant: 'standard' as const,
  },
  {
    title: 'Mobile QR check-in',
    description:
      'Let organisers and admins check guests in on mobile by scanning each ticket QR code at the door.',
    imageKey: 'paymentTrackingScreenshot' as const,
    variant: 'standard' as const,
  },
  {
    title: 'Payment reconciliation',
    description:
      'Review advance payments, on-the-night payments, outstanding amounts and final event records after the fundraiser.',
    imageKey: 'reportOverviewScreenshot' as const,
    variant: 'standard' as const,
  },
];

const eventTypeItems = [
  {
    title: 'Dinners and galas',
    text: 'Sell tickets for formal fundraising dinners, gala nights, charity balls and celebration events.',
  },
  {
    title: 'Sports events',
    text: 'Manage tickets for matches, tournaments, race days, club events, awards nights and supporter evenings.',
  },
  {
    title: 'Race nights',
    text: 'Set up ticketing for race nights, club socials and community fundraising evenings.',
  },
  {
    title: 'Coffee mornings',
    text: 'Use a simple ticket or entry flow for smaller fundraisers, breakfast mornings and local community gatherings.',
  },
  {
    title: 'Family fun days',
    text: 'Manage entry tickets, walk-ins, sponsor details, giveaways and check-in for larger community days.',
  },
  {
    title: 'Concerts and shows',
    text: 'Support ticketing for music nights, comedy nights, school shows, club performances and community entertainment.',
  },
  {
    title: 'Workshops and classes',
    text: 'Use ticketing for paid workshops, training days, information evenings or skills-based fundraising events.',
  },
  {
    title: 'Community events',
    text: 'Create a cleaner ticketing and attendance flow for open days, launches, local fundraisers and social events.',
  },
];

const setupItems = [
  {
    title: 'Select ticketed event',
    text: 'The host sets up the event as normal and chooses ticketed event as the activity format.',
  },
  {
    title: 'Add ticket price',
    text: 'Set the entry price so supporters know what they are paying before they reserve or buy a ticket.',
  },
  {
    title: 'Add sponsor details',
    text: 'Include sponsor information where local businesses or partners are supporting the event.',
  },
  {
    title: 'Add prizes or giveaways',
    text: 'Record prize, raffle, giveaway or donor details where they are part of the fundraiser.',
  },
  {
    title: 'Share the event link',
    text: 'Send supporters a clear link so they can view the event and join the ticket flow.',
  },
  {
    title: 'Track ticket activity',
    text: 'Keep ticket activity connected to the event record instead of relying on scattered lists and screenshots.',
  },
];

const checkInItems = [
  {
    title: 'Add admins',
    text: 'Bring in trusted helpers who can support check-in and payment checks on the day or night of the event.',
  },
  {
    title: 'Use mobile check-in',
    text: 'Admins can check guests in from a phone, making it practical for doors, tables, entrances and outdoor events.',
  },
  {
    title: 'Scan ticket QR codes',
    text: 'Each ticket can be scanned at the event so the organiser has a clearer record of who arrived.',
  },
  {
    title: 'Support walk-ins',
    text: 'Handle people who arrive on the night and need to pay, confirm details or be added to the event.',
  },
  {
    title: 'Check payment status',
    text: 'Admins can help identify who has paid, who is outstanding and who needs a manual update.',
  },
  {
    title: 'Reduce pressure on the host',
    text: 'The organiser does not have to manage the whole door, payment flow and event at the same time.',
  },
];

const paymentItems = [
  {
    title: 'Advance ticket sales',
    text: 'Track people who paid or reserved before the event so the organiser has a clearer view before doors open.',
  },
  {
    title: 'Payment on the night',
    text: 'Accept and record payments at the event for walk-ins, late payments or supporters who did not pay in advance.',
  },
  {
    title: 'Multiple payment methods',
    text: 'Keep cash, instant payments, card or other supported payment methods connected to the same event record.',
  },
  {
    title: 'Outstanding amounts',
    text: 'See which tickets or attendees still need payment follow-up instead of checking separate notes.',
  },
  {
    title: 'Admin payment checks',
    text: 'Let helpers support payment confirmation without giving everyone full event control.',
  },
  {
    title: 'Final reconciliation',
    text: 'Review what was expected, what was received, what was outstanding and what was adjusted after the event.',
  },
];

const recordItems = [
  {
    title: 'Attendance record',
    text: 'Know who bought or reserved tickets and who actually checked in at the event.',
  },
  {
    title: 'Ticket record',
    text: 'Keep ticket details linked to the event instead of managing separate spreadsheets.',
  },
  {
    title: 'Sponsor record',
    text: 'Keep sponsor details connected to the fundraiser for thank-you messages and follow-up.',
  },
  {
    title: 'Prize and giveaway record',
    text: 'Record prize donors, giveaways or event awards as part of the event history.',
  },
  {
    title: 'Payment record',
    text: 'Track received, outstanding and manually updated payments in one place.',
  },
  {
    title: 'Committee-ready summary',
    text: 'Give treasurers, committees or campaign teams a clearer record after the event ends.',
  },
];

const processSteps = [
  {
    title: 'Create the event',
    text: 'Add the event name, date, location, fundraising goal and basic event details.',
  },
  {
    title: 'Choose ticketed event',
    text: 'Select non-digital ticketed event as the activity format.',
  },
  {
    title: 'Set ticket price',
    text: 'Add the ticket price or entry amount supporters need to pay.',
  },
  {
    title: 'Add sponsor or prize details',
    text: 'Include sponsor, prize, giveaway or donor details where they are part of the event.',
  },
  {
    title: 'Share the event link',
    text: 'Send the ticket link to supporters, members, parents, donors or guests.',
  },
  {
    title: 'Add admins',
    text: 'Invite helpers who can support check-in, QR scanning, walk-ins and payment checks.',
  },
  {
    title: 'Check guests in on mobile',
    text: 'Scan ticket QR codes at the event and mark attendees as checked in.',
  },
  {
    title: 'Record on-the-night payments',
    text: 'Accept and update payment records for walk-ins, late payments or manual payment methods.',
  },
  {
    title: 'Reconcile after the event',
    text: 'Review tickets, attendance, received payments, outstanding amounts and event outcomes.',
  },
];

const relatedLinks = [
  {
    label: 'Event formats',
    to: '/event-formats',
    text: 'Explore FundRaisely formats for games, activities and ticketed fundraisers.',
  },
  {
    label: 'Ticketing',
    to: '/features/ticketing',
    text: 'See how FundRaisely supports ticket setup, joining flows and attendee records.',
  },
  {
    label: 'Payments',
    to: '/features/payments',
    text: 'Track payment methods, outstanding amounts and collection status.',
  },
  {
    label: 'Reports',
    to: '/features/reports',
    text: 'Turn event records, payments and outcomes into clearer after-event reports.',
  },
];

export default function TicketedEventsPage() {
  return (
    <>
      <SEO
        title={seoTitle}
        description={seoDescription}
        canonicalPath={path}
        breadcrumbs={breadcrumbs}
        structuredData={structuredData}
      />

      <Breadcrumbs items={breadcrumbs} />

      <Hero
        eyebrow="Non-digital ticketed fundraising events"
        title={h1}
        description="FundRaisely helps clubs, charities, schools and community groups set up ordinary ticketed fundraisers such as dinners, galas, sports events, coffee mornings, race nights and family fun days. The event happens in the real world, while FundRaisely supports the setup, ticket link, QR check-in, admins, payment tracking and reconciliation."
        primaryCta={{ label: 'Book a demo', to: '/contact' }}
        secondaryCta={{ label: 'Explore features', to: '/features' }}
        image={images.ticketingHeroScreenshot}
        status="Ticketing, mobile check-in and reconciliation for real-world fundraisers"
        variant="standard"
      />

      <section className="section">
        <div className="site-shell problem-solution">
          <article>
            <p className="eyebrow">Problem</p>
            <h2>Real-world fundraisers still create messy admin</h2>
            <p>
              Dinners, galas, sports events, coffee mornings and family fun days
              are familiar fundraisers, but the admin around them can quickly
              become messy. Ticket lists, payment screenshots, cash received,
              walk-ins, sponsor notes, prize details and attendance records often
              end up spread across messages, spreadsheets and paper lists.
            </p>
            <p>
              That makes it harder for volunteers to know who has paid, who has
              arrived, what is still outstanding and what needs to be reported
              after the event.
            </p>
          </article>

          <article>
            <p className="eyebrow">Solution</p>
            <h2>FundRaisely gives ordinary events a clearer ticket flow</h2>
            <p>
              With the ticketed event format, the host sets up the event, adds
              the ticket price, includes sponsor or prize details where needed
              and shares the event link with supporters.
            </p>
            <p>
              On the day or night of the fundraiser, admins can help with mobile
              check-in, scan ticket QR codes, handle walk-ins, accept payments
              and keep the final reconciliation connected to the event record.
            </p>
          </article>
        </div>
      </section>

      {/*
      <div id="ticketed-event-demo">
        <VideoSection
          title={videoSlot.title}
          text={videoSlot.text}
          imageKey={videoSlot.imageKey}
          videoLabel={videoSlot.videoLabel}
          transcript={videoSlot.transcript}
          cta={{ label: 'Book a demo', to: '/contact' }}
        />
      </div>
      */}

      <FeatureGrid
        eyebrow="Event examples"
        title="For the fundraisers communities already run"
        text="Not every fundraiser needs to be a digital game. FundRaisely also supports ordinary ticketed events where the activity happens offline, but the admin, ticketing and records need to be easier to manage."
        items={eventTypeItems}
      />

      <SplitSection
        eyebrow="Simple setup"
        title="Set up the event, add the ticket price and share the link"
        text="The host creates the event as normal, selects ticketed event as the format, adds the ticket price and includes any sponsor, prize or giveaway details that should be recorded. Then they share the event link with supporters."
        bullets={[
          'Create dinners, galas, sports events and community fundraisers',
          'Set the ticket or entry price',
          'Add sponsor details where relevant',
          'Add prize, giveaway or donor details',
          'Share one event link with supporters',
          'Keep ticket activity connected to the event record',
        ]}
        image={images.ticketingHeroScreenshot}
        reverse={false}
      />

      <FeatureGrid
        eyebrow="Ticket setup"
        title="A clearer flow before the event starts"
        text="Ticketed events help organisers collect the important details before the fundraiser, so they are not trying to rebuild the attendee list from messages, bank screenshots and handwritten notes."
        items={setupItems}
      />

      <ScreenshotShowcase
        eyebrow="Product screens"
        title="Ticketing, check-in and payment records in one event flow"
        text="This page should eventually show the practical screens behind a ticketed event: setup, ticket sales, mobile QR check-in, admin support, payment status and reconciliation."
        slots={screenshotSlots}
      />

      <SplitSection
        eyebrow="Mobile check-in"
        title="Scan ticket QR codes at the door"
        text="At the event, organisers and admins can check people in from a phone. Each ticket can be scanned using a QR code, helping the event team confirm who has arrived without relying on printed lists or separate spreadsheets."
        bullets={[
          'Use QR codes for ticket check-in',
          'Scan tickets from mobile',
          'Mark guests as checked in at the event',
          'Support door teams, table teams or roaming admins',
          'Reduce duplicate or uncertain attendance records',
          'Keep check-in connected to the final event record',
        ]}
        image={images.paymentTrackingScreenshot}
        reverse
      />

      <FeatureGrid
        eyebrow="Admins and helpers"
        title="Let helpers manage check-in without taking over the whole event"
        text="Ticketed events can use the same practical admin idea as FundRaisely games. The host stays in control, while trusted helpers support check-in, walk-ins and payment checks on mobile."
        items={checkInItems}
      />

      <SplitSection
        eyebrow="Payments on the night"
        title="Handle advance sales, walk-ins and late payments"
        text="Fundraisers rarely fit one perfect payment flow. Some supporters pay in advance, some pay on the night, some arrive as walk-ins and some need manual follow-up. FundRaisely helps keep those payment records connected to the ticketed event."
        bullets={[
          'Track advance ticket payments',
          'Record cash or instant payments on the night',
          'Support walk-ins and late attendees',
          'See which tickets still need payment follow-up',
          'Let admins help with payment checks',
          'Feed the final figures into reconciliation',
        ]}
        image={images.prizeTable}
        reverse={false}
      />

      <FeatureGrid
        eyebrow="Payment tracking"
        title="The same payment and reconciliation flow as your games"
        text="Ticketed events should not create a separate admin process. They can use the same FundRaisely payment tracking and reconciliation approach as quizzes and elimination games, so organisers have one consistent way to review event money."
        items={paymentItems}
      />

      <SplitSection
        eyebrow="Sponsors, prizes and giveaways"
        title="Keep the extra event details connected"
        text="Many ticketed fundraisers include sponsors, donated prizes, giveaways, raffles, awards or local business support. FundRaisely helps keep those details attached to the event record so the organiser has a clearer view after the fundraiser."
        bullets={[
          'Add sponsor details during setup',
          'Record prize or giveaway information',
          'Track donated support alongside the event',
          'Make thank-you follow-up easier',
          'Keep event details together for committee review',
          'Support future sponsor and donor relationships',
        ]}
        image={images.prizeTable}
        reverse
      />

      <FeatureGrid
        eyebrow="After-event records"
        title="Finish with a clearer record, not another pile of notes"
        text="After the fundraiser, the organiser can review the important pieces: tickets, attendance, payments, sponsors, prizes, giveaways and reconciliation. That makes it easier to report back to a committee, treasurer, charity team or campaign lead."
        items={recordItems}
      />

      <ProcessSteps
        eyebrow="How it works"
        title="From event setup to final reconciliation"
        text="The ticketed event flow is designed to match how real fundraisers work: set up the event, sell or reserve tickets, check people in, take payments where needed and reconcile afterwards."
        steps={processSteps}
      />

      <SplitSection
        eyebrow="Connected to the wider platform"
        title="One event flow for digital games and real-world fundraisers"
        text="Ticketed events help FundRaisely support more than games. A club can run a quiz, an elimination game, a gala dinner, a sports event or a family fun day through the same wider platform approach, with each fundraiser connected to ticketing, payment tracking and reports."
        bullets={[
          'Use FundRaisely for ordinary events as well as games',
          'Connect ticketed events to campaigns and reports',
          'Support admins and helpers across formats',
          'Keep payment tracking consistent',
          'Use reconciliation across different fundraiser types',
          'Build a clearer history of fundraising activity',
        ]}
        image={images.reportOverviewScreenshot}
        reverse={false}
      />

      <FAQSection
        items={faqs}
        intro="These questions help visitors understand that ticketed events are for real-world fundraisers such as dinners, galas, sports events and community days, with FundRaisely supporting the setup, check-in, payments and records."
      />

      <RelatedLinks links={relatedLinks} />

      <CTASection
        title="Want cleaner ticketing for your next fundraiser?"
        text="Book a demo to see how FundRaisely helps clubs, charities, schools and community groups set up ticketed events, share ticket links, check guests in on mobile, track payments and reconcile the fundraiser afterwards."
        primaryCta={{ label: 'Book a demo', to: '/contact' }}
        secondaryCta={{
          label: 'Explore event formats',
          to: '/event-formats',
        }}
      />
    </>
  );
}