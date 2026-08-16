// src/pages/site/pages/games/SponsoredEventsPage.tsx
import { SEO } from '../../components/seo/SEO';
import { Breadcrumbs } from '../../components/seo/Breadcrumbs';
import { breadcrumbsForPath } from '../../components/seo/breadcrumbUtils';
import { compactStructuredData, faqJsonLd, webPageJsonLd } from '../../components/seo/structuredData';

import { Hero } from '../../components/sections/Hero';
import { FeatureGrid } from '../../components/sections/FeatureGrid';
import { ProcessSteps } from '../../components/sections/ProcessSteps';
import { SplitSection } from '../../components/sections/SplitSection';
import { FAQSection } from '../../components/sections/FAQSection';
import { RelatedLinks } from '../../components/sections/RelatedLinks';
import { CTASection } from '../../components/sections/CTASection';

import { images } from '../../config/imageConfig';

const path = '/event-formats/sponsored-events';

const seoTitle =
  'Sponsored Events and Sponsored Activities for Clubs, Charities and Schools | FundRaisely';

const seoDescription =
  'Set up a sponsored walk, run, cycle, readathon or any sponsored activity in FundRaisely. Link it to peer fundraising to unlock participant pages, personal targets, videos, sponsorship tracking and committee-ready reports.';

const h1 = 'A sponsored activity your participants can take to their own networks';

const breadcrumbs = breadcrumbsForPath(path, h1);

const faqs = [
  {
    question: 'What is a FundRaisely sponsored event?',
    answer:
      'A sponsored event is a fundraising activity - a walk, run, cycle, swim, readathon, parachute jump or any other challenge - where participants collect sponsorship from their own networks. You set up the activity in FundRaisely, then link it to peer fundraising to create individual participant pages where sponsors can pledge.',
  },
  {
    question: 'What is the difference between setting up the sponsored event and peer fundraising?',
    answer:
      'These are two separate steps. First, you create the sponsored event as an activity type in FundRaisely - adding the title, fundraising goal, activity type and sponsorship window. Then, in the peer fundraising dashboard, you link that event to unlock participant pages, individual targets, sponsorship tracking and reporting.',
  },
  {
    question: 'What kinds of activities does this support?',
    answer:
      'Any activity where participants collect personal sponsorship - walks, runs, cycles, swims, readathons, parachute jumps, challenges, treks and more. The activity itself happens offline. FundRaisely manages everything around it.',
  },
  {
    question: 'Who sets up the participant pages?',
    answer:
      'The organiser sets up participant pages through the peer fundraising dashboard after linking the sponsored event. The organiser adds the story, sets the personal target, adds a video and any personal details for each participant. Links are then distributed to participants manually.',
  },
  {
    question: 'Can each participant have their own target?',
    answer:
      'Yes. The organiser sets a personal fundraising target for each participant, which appears on their individual page alongside the overall event target.',
  },
  {
    question: 'Can videos be added to participant pages?',
    answer:
      'Yes. The organiser can add a video at the event level and add a participant video to each individual page. A personal video explaining why someone is taking on the challenge consistently increases how much their sponsors give.',
  },
  {
    question: 'How does sponsorship tracking work?',
    answer:
      'All sponsorship pledges are tracked through the peer fundraising dashboard. The organiser can see every participant, their individual total, payment status and progress against their personal target. Cash and instant payments are confirmed manually by the organiser. Stripe and crypto payments are confirmed automatically.',
  },
  {
    question: 'Is there a report at the end?',
    answer:
      'Yes. After the event, the organiser can access a full report showing participant numbers, individual totals, confirmed payments, outstanding amounts and an overall summary suitable for committee or board review.',
  },
  {
    question: 'Can supporters donate without being linked to a specific participant?',
    answer:
      'Yes. You can enable a general donation option alongside the sponsored event so supporters who are not connected to a specific participant can still contribute to the overall cause.',
  },
];

const structuredData = compactStructuredData([
  webPageJsonLd(path, h1, seoDescription),
  faqJsonLd(faqs),
]);

const setupItems = [
  {
    title: 'Choose sponsored activity as the event type',
    text: 'When creating a new event in FundRaisely, select sponsored activity as the format. This tells the system what kind of fundraiser this is and unlocks the right setup options.',
  },
  {
    title: 'Add the basics',
    text: 'Give the event a title, set your fundraising goal and write a description of the cause. This becomes the public-facing event page that sponsors and participants will see.',
  },
  {
    title: 'Define the activity',
    text: 'Specify what participants will be doing - walk, run, cycle, swim, readathon, parachute jump or any other challenge. This gives the event context for participants and their sponsors.',
  },
  {
    title: 'Set the sponsorship window',
    text: 'Choose the date range during which sponsorships can be collected. This gives participants a clear window to share their pages and gather pledges before the activity takes place.',
  },
  {
    title: 'Publish the event',
    text: 'Once the basics are in place, publish the sponsored event. It is now ready to be linked to peer fundraising to unlock participant pages and sponsorship tracking.',
  },
  {
    title: 'Link to peer fundraising for participant pages',
    text: 'In the peer fundraising dashboard, link your published sponsored event. This is the step that creates individual participant pages, personal targets, sponsorship tracking and reporting.',
  },
];

const participantPageItems = [
  {
    title: 'Individual page per participant',
    text: 'Each participant gets their own page with a unique link. The organiser sets it up - adding the story, target and any personal details - then distributes the link to the participant to share.',
  },
  {
    title: 'Personal fundraising target',
    text: 'The organiser sets a personal target for each participant, visible on their page alongside the overall event goal. Individual targets give participants something concrete to aim for.',
  },
  {
    title: 'Video at event and participant level',
    text: 'Add a video to the main event page explaining the cause. Add a personal video to each participant page. A short personal video reliably increases how much sponsors give.',
  },
  {
    title: 'Shareable by the participant',
    text: 'The organiser distributes the unique page link to each participant. Participants then share it with their own network via WhatsApp, email, social media or wherever their contacts are.',
  },
  {
    title: 'Live progress visible to sponsors',
    text: 'As pledges come in, the participant page shows progress toward the personal target. Supporters who visit can see how close the participant is to their goal.',
  },
  {
    title: 'Optional general donation',
    text: 'Enable a donation option alongside participant pages so supporters who are not connected to a specific participant can still contribute to the overall event.',
  },
];

const processSteps = [
  {
    title: 'Create the sponsored event',
    text: 'Select sponsored activity as the event type in FundRaisely. Add a title, fundraising goal and description of the cause.',
  },
  {
    title: 'Define the activity and window',
    text: 'Specify the activity - walk, run, cycle, readathon or any other challenge - and set the sponsorship collection window.',
  },
  {
    title: 'Publish the event',
    text: 'Once the event details are complete, publish it. The event is live and ready to be connected to peer fundraising.',
  },
  {
    title: 'Link to peer fundraising',
    text: 'In the peer fundraising dashboard, link the sponsored event. This creates the participant page infrastructure, sponsorship tracking and reporting.',
  },
  {
    title: 'Set up participant pages',
    text: 'Add each participant through the peer fundraising dashboard. Set their personal target, write their story, add a video and any personal details.',
  },
  {
    title: 'Distribute participant links',
    text: 'Share each participant\'s unique page link with them directly. They then share it with their own network via WhatsApp, email or social media.',
  },
  {
    title: 'Sponsorships come in',
    text: 'Supporters visit participant pages and pledge. The organiser tracks all pledges, confirms payments and monitors progress across all participants from the dashboard.',
  },
  {
    title: 'Review the final report',
    text: 'After the event, access the full report - participant numbers, individual totals, payment breakdown and overall total for the committee.',
  },
];

const relatedLinks = [
  {
    label: 'Peer fundraising',
    to: '/features/peer-fundraising',
    text: 'Understand the full peer fundraising system - activity packs, participant pages, tracking and reports.',
  },
  {
    label: 'Quiz fundraisers',
    to: '/event-formats/quiz',
    text: 'Run a full digital quiz night with ticketing, teams and host controls.',
  },
  {
    label: 'Donations widget',
    to: '/features/donations-widget',
    text: 'Add a donate button to any website alongside your sponsored event.',
  },
  {
    label: 'Contact',
    to: '/contact',
    text: 'Talk to us about running a sponsored event for your organisation.',
  },
];

export default function SponsoredEventsPage() {
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
        eyebrow="Sponsored events"
        title={h1}
        description="Set up a sponsored walk, run, cycle, readathon or any sponsored activity in FundRaisely. Then link it to peer fundraising to create individual participant pages, set personal targets, add videos, track sponsorships and generate a committee-ready report when it is over."
        primaryCta={{ label: 'Book a demo', to: '/contact' }}
        secondaryCta={{ label: 'Explore peer fundraising', to: '/features/peer-fundraising' }}
        image={images.communityHero}
        status="Walks, runs, cycles, swims, readathons and more"
        variant="standard"
      />

      <section className="section">
        <div className="site-shell problem-solution">
          <article>
            <p className="eyebrow">Problem</p>
            <h2>Sponsored events raise a lot of money but create a lot of admin</h2>
            <p>
              A sponsored walk or run is one of the most effective fundraising formats for clubs, charities and schools. People give more when they are sponsoring someone they know doing something meaningful. But paper sponsor cards, cash collected in envelopes and no clear view of what has been raised until it is all counted manually makes the follow-up genuinely painful.
            </p>
            <p>
              The event raises the money. The admin process loses track of some of it.
            </p>
          </article>

          <article>
            <p className="eyebrow">Solution</p>
            <h2>Set up the activity. Link to peer fundraising. Participant pages, tracking and reports follow.</h2>
            <p>
              In FundRaisely, a sponsored event is a two-step process. First you create the activity - the title, goal, activity type and sponsorship window. Then you link it to peer fundraising, which is where participant pages, individual targets, sponsorship tracking and reporting are created and managed.
            </p>
            <p>
              The organiser controls the setup. Participants get a link to share with their own network. Sponsors pledge on the participant's page. The money and the records stay together from the first pledge to the final report.
            </p>
          </article>
        </div>
      </section>

      <FeatureGrid
        eyebrow="Setting up a sponsored event"
        title="Two steps - the activity first, then peer fundraising for participant pages"
        text="A sponsored event in FundRaisely is set up as an activity type first, then connected to peer fundraising to unlock individual participant pages, sponsorship tracking and reports. Both steps are straightforward and the system guides you through each one."
        items={setupItems}
      />

      <SplitSection
        eyebrow="Participant pages via peer fundraising"
        title="Link to peer fundraising to create pages for every participant"
        text="Once the sponsored event is published, linking it in the peer fundraising dashboard is what creates the individual participant infrastructure. From there, the organiser sets up each participant's page - adding their story, personal target and video - then distributes the unique link for the participant to share with their own network."
        bullets={[
          'Each participant gets their own page with a unique link',
          'Organiser sets the personal target, story and video for each participant',
          'Links are distributed by the organiser to participants directly',
          'Participants share their page via WhatsApp, email or social media',
          'Live progress visible as sponsorships come in',
          'All participant activity tracked centrally in the peer dashboard',
        ]}
        image={images.communityHero}
        reverse={false}
      />

      <FeatureGrid
        eyebrow="Participant page features"
        title="Everything a participant needs to collect sponsorship from their own network"
        text="Each participant page is set up by the organiser and then shared by the participant. The page does the asking - the participant just needs to send the link."
        items={participantPageItems}
      />

      <SplitSection
        eyebrow="Tracking and reports"
        title="See every participant, every pledge, every payment without chasing anyone"
        text="The peer fundraising dashboard gives the organiser a complete view of the sponsored event - all participants, their individual totals, payment status and progress against personal targets. Cash and instant payments are confirmed manually. Stripe and crypto payments confirm automatically. When the event is over, the report is already there."
        bullets={[
          'Full participant list with individual totals and payment status',
          'Manual confirmation for cash and instant payments',
          'Automatic confirmation for Stripe and crypto payments',
          'Overall event progress against the fundraising target',
          'Outstanding amounts clearly visible for follow-up',
          'Committee-ready report available as soon as the event closes',
        ]}
        image={images.reportOverviewScreenshot}
        reverse
      />

      <ProcessSteps
        eyebrow="How it works"
        title="From activity setup to final report"
        text="The sponsored event setup is split across two areas of FundRaisely - the event setup and the peer fundraising dashboard. Both are straightforward and the order matters."
        steps={processSteps}
      />

      <FAQSection
        items={faqs}
        intro="Common questions about how sponsored events work in FundRaisely and how they connect to peer fundraising."
      />

      <RelatedLinks links={relatedLinks} />

      <CTASection
        title="Ready to replace the paper sponsor card?"
        text="Book a demo to see how FundRaisely handles sponsored event setup, participant pages, sponsorship tracking and reporting for your next walk, run, cycle or challenge."
        primaryCta={{ label: 'Book a demo', to: '/contact' }}
        secondaryCta={{ label: 'See peer fundraising', to: '/features/peer-fundraising' }}
      />
    </>
  );
}