import { SEO } from '../../components/seo/SEO';
import { Breadcrumbs } from '../../components/seo/Breadcrumbs';
import { breadcrumbsForPath } from '../../components/seo/breadcrumbUtils';
import {
  compactStructuredData,
  faqJsonLd,
  webPageJsonLd,
} from '../../components/seo/structuredData';

import { Hero } from '../../components/sections/Hero';
import { FeatureGrid } from '../../components/sections/FeatureGrid';
import { SplitSection } from '../../components/sections/SplitSection';
import { ProcessSteps } from '../../components/sections/ProcessSteps';
import { FAQSection } from '../../components/sections/FAQSection';
import { RelatedLinks } from '../../components/sections/RelatedLinks';
import { CTASection } from '../../components/sections/CTASection';

import { images } from '../../config/imageConfig';

const path = '/event-formats/ticketed-events';

const seoTitle =
  'Ticketed Fundraising Event Software for Clubs and Charities | FundRaisely';

const seoDescription =
  'Set up real-world ticketed fundraising events such as dinners, galas, sports events, race nights, coffee mornings and family fun days, with ticket sales, easy payment options and mobile QR check-in.';

const h1 = 'Run ticketed fundraising events without the spreadsheet chaos';

const breadcrumbs = breadcrumbsForPath(path, h1);

const faqs = [
  {
    question: 'What is a non-digital ticketed event?',
    answer:
      'A non-digital ticketed event is a real-world fundraising event where the activity happens offline, such as a dinner, gala, sports event, coffee morning, race night, awards night, concert, workshop or family fun day. FundRaisely supports the setup, ticketing, check-in and payment flow around the event.',
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
      'The organiser creates the event, selects ticketed event as the format, adds the ticket price and shares the event link with supporters. Supporters can then open the link, choose a ticket, enter their details and follow the payment instructions.',
  },
  {
    question: 'Can supporters buy or reserve tickets online?',
    answer:
      'Yes. The event can be shared with supporters so they can go through the ticket flow before the event. This gives organisers a cleaner way to collect attendee details and manage ticket activity.',
  },
  {
    question: 'Can we take payment on the night?',
    answer:
      'Yes. Organisers can still handle payments on the night where needed, including walk-ins or supporters who did not pay in advance.',
  },
  {
    question: 'Can admins help at the event?',
    answer:
      'Yes. Hosts can add admins or helpers who can support check-in and help manage activity on the day or night of the event.',
  },
  {
    question: 'How does QR check-in work?',
    answer:
      'Each ticket can have a QR code. At the event, an organiser or helper scans the QR code on mobile, confirms the ticket and checks the person in.',
  },
  {
    question: 'Can we include sponsor or prize details?',
    answer:
      'Yes. If sponsors, prizes or giveaways are part of the event setup, those details can still be included where relevant.',
  },
  {
    question: 'Do ticketed events connect to reconciliation?',
    answer:
      'Yes. Ticketed events can still fit into the wider FundRaisely reporting and reconciliation flow after the fundraiser.',
  },
];

const structuredData = compactStructuredData([
  webPageJsonLd(path, h1, seoDescription),
  faqJsonLd(faqs),
]);

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
    text: 'Manage entry tickets and check-in for larger community days, school events and club fundraisers.',
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

const processSteps = [
  {
    title: 'Create the event',
    text: 'Add the event name, date, location, ticket price and the key details supporters need before they decide to attend.',
  },
  {
    title: 'Share the ticket link',
    text: 'Send one clear event link to members, parents, supporters, donors or guests so they can choose their ticket and enter their details.',
  },
  {
    title: 'Guide supporters through payment',
    text: 'Show attendees the payment instructions or available payment options so they are not messaging the organiser to ask how to pay.',
  },
  {
    title: 'Check people in on mobile',
    text: 'At the event, scan ticket QR codes from a phone and mark guests as checked in as they arrive.',
  },
  {
    title: 'Keep the event record cleaner',
    text: 'Keep ticket activity, attendee details and check-in information connected to the event instead of scattered across lists and messages.',
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
    text: 'See how payment options can fit around real-world fundraising events.',
  },
  {
    label: 'Reports',
    to: '/features/reports',
    text: 'See how FundRaisely turns event activity into clearer records and follow-up.',
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
        eyebrow="Ticketed fundraising events"
        title={h1}
        description="FundRaisely helps clubs, charities, schools and community groups set up real-world ticketed fundraisers such as dinners, galas, sports events, coffee mornings, race nights and family fun days. Create the event, share the ticket link, give supporters an easy payment flow and check people in on mobile at the door."
        primaryCta={{ label: 'Book a demo', to: '/contact' }}
        secondaryCta={{ label: 'Explore event formats', to: '/event-formats' }}
        image={images.ticketEventHeroScreenshot}
        status="Ticket links, attendee payments and mobile check-in for real-world fundraisers"
        variant="standard"
      />

      <section className="section">
        <div className="site-shell problem-solution">
          <article>
            <p className="eyebrow">Problem</p>
            <h2>Ticketed fundraisers are still managed in too many places</h2>
            <p>
              Clubs and community groups run brilliant real-world fundraisers,
              but the admin often ends up scattered across spreadsheets,
              WhatsApp messages, bank screenshots, paper lists and cash notes.
            </p>
            <p>
              Before the event, organisers are trying to work out who has a
              ticket, who has paid and who still needs a reminder. On the night,
              they also need to handle walk-ins, check people in and keep the
              queue moving.
            </p>
          </article>

          <article>
            <p className="eyebrow">Solution</p>
            <h2>A cleaner ticket flow from sign-up to check-in</h2>
            <p>
              FundRaisely gives each ticketed fundraiser a simple event page and
              ticket flow. Supporters can open the link, choose their ticket,
              enter their details and follow the payment instructions.
            </p>
            <p>
              At the event, organisers can check attendees in from a phone using
              QR codes, giving the team a clearer view of who has arrived without
              rebuilding the list from messages or paper records.
            </p>
          </article>
        </div>
      </section>

      <FeatureGrid
        eyebrow="Event examples"
        title="For the fundraisers communities already run"
        text="Not every fundraiser needs to be a digital game. FundRaisely also supports ordinary ticketed events where the activity happens offline, but the ticket flow needs to be easier for organisers and supporters."
        items={eventTypeItems}
      />

      <SplitSection
        eyebrow="Simple setup"
        title="Set up the event, add the ticket price and share the link"
        text="The organiser creates the event, chooses ticketed event as the format, adds the ticket price and shares the event link with supporters. It is designed for practical fundraisers where the team needs something simple, clear and easy to manage."
        bullets={[
          'Create dinners, galas, sports events and community fundraisers',
          'Set the ticket or entry price',
          'Add the event details supporters need',
          'Share one clear ticket link',
          'Let supporters choose their ticket and enter their details',
          'Keep the ticket flow connected to the event',
        ]}
        image={images.ticketingPaymentReferenceScreenshot}
        reverse={false}
      />

      <SplitSection
        eyebrow="Easy payment flow"
        title="Make it easier for attendees and supporters to pay"
        text="Supporters should not have to message the organiser, search for payment details or guess what reference to use. FundRaisely gives attendees a clearer flow from ticket selection to payment instructions, so the event feels more organised from the start."
        bullets={[
          'Let supporters choose their ticket from the event link',
          'Collect the attendee details the organiser needs',
          'Show clear payment instructions before the event',
          'Support practical payment options for grassroots fundraisers',
          'Reduce back-and-forth messages about how to pay',
          'Give supporters a smoother experience before they arrive',
        ]}
        image={images.ticketPurchaseFlowScreenshot}
        reverse
      />

      <SplitSection
        eyebrow="Mobile check-in"
        title="Scan ticket QR codes at the door"
        text="On the day or night of the fundraiser, organisers can check people in from a phone. Each ticket can be scanned using a QR code, helping the team confirm who has arrived without relying on printed lists or separate spreadsheets."
        bullets={[
          'Use QR codes for ticket check-in',
          'Scan tickets from mobile',
          'Mark guests as checked in at the event',
          'Support doors, tables, entrances and outdoor events',
          'Reduce duplicate or uncertain attendance records',
          'Keep check-in connected to the ticketed event',
        ]}
        image={images.ticketingSalesRedemptionsScreenshot}
        reverse={false}
      />

      <ProcessSteps
        eyebrow="How it works"
        title="From event setup to mobile check-in"
        text="The ticketed event flow is designed to stay simple: create the event, share the ticket link, guide supporters through payment and check people in on mobile when they arrive."
        steps={processSteps}
      />

      <FAQSection
        items={faqs}
        intro="These questions help visitors understand how FundRaisely supports real-world ticketed fundraisers such as dinners, galas, sports events and community days."
      />

      <RelatedLinks links={relatedLinks} />

      <CTASection
        title="Want cleaner ticketing for your next fundraiser?"
        text="Book a demo to see how FundRaisely helps clubs, charities, schools and community groups set up ticketed events, share ticket links, guide supporters through payment and check guests in on mobile."
        primaryCta={{ label: 'Book a demo', to: '/contact' }}
        secondaryCta={{
          label: 'Explore event formats',
          to: '/event-formats',
        }}
      />
    </>
  );
}