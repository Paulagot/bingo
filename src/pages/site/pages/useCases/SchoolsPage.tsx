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
import { ProcessSteps } from '../../components/sections/ProcessSteps';
import { ScreenshotShowcase } from '../../components/sections/ScreenshotShowcase';
import { SplitSection } from '../../components/sections/SplitSection';
import { FAQSection } from '../../components/sections/FAQSection';
import { RelatedLinks } from '../../components/sections/RelatedLinks';
import { CTASection } from '../../components/sections/CTASection';

import { images } from '../../config/imageConfig';

const path = '/use-cases/schools';

const seoTitle =
  'Fundraising Software for Schools, PTAs and Parent Associations | FundRaisely';

const seoDescription =
  'FundRaisely helps schools, PTAs and parent associations run family-friendly fundraisers including quiz nights, child-focused templates, sponsored events, puzzle challenges, ticketed events, payment tracking and PTA reports.';

const h1 = 'Family-friendly fundraising tools for schools and PTAs';

const breadcrumbs = breadcrumbsForPath(path, h1);

const faqs = [
  {
    question: 'How can schools and PTAs use FundRaisely?',
    answer:
      'Schools, PTAs and parent associations can use FundRaisely to run family-friendly fundraisers such as quiz nights, sponsored walks, readathons, puzzle challenges, school discos, concerts, movie nights, ticketed events and digital campaign packs, with payment tracking and reports connected to the event.',
  },
  {
    question: 'Can FundRaisely support child-focused quiz templates?',
    answer:
      'Yes. FundRaisely can support child-focused, family-friendly and parent-focused quiz templates so school fundraisers do not have to start from a blank page or use a quiz format that feels too adult.',
  },
  {
    question: 'Can families play together?',
    answer:
      'Yes. Family quiz templates can be designed so children, parents, guardians and relatives can play together. This works well for school halls, online events, hybrid events and seasonal family fundraisers.',
  },
  {
    question: 'Can FundRaisely help with sponsored school events?',
    answer:
      'Yes. FundRaisely can support sponsored walks, runs, readathons, fitness challenges, skipathons, class challenges, school garden projects and other sponsored activities by giving families a clearer way to share, pay and track support.',
  },
  {
    question: 'Can schools use FundRaisely for ticketed events?',
    answer:
      'Yes. FundRaisely can support ticketed school events such as concerts, plays, discos, movie nights, family fun days, fairs, parent nights, workshops and seasonal events.',
  },
  {
    question: 'Can parents pay using different methods?',
    answer:
      'Yes. FundRaisely is designed around real school fundraising where payments may come through cash, Revolut-style instant payments, bank transfer, card, Stripe-style payments, door payments or manual confirmations.',
  },
  {
    question: 'Does FundRaisely help reduce cash and paper admin?',
    answer:
      'Yes. FundRaisely can reduce reliance on paper sponsor cards, cash envelopes, message threads and manual spreadsheets by keeping fundraiser links, participation, payments and reports connected.',
  },
  {
    question: 'Can PTAs get reports after an event?',
    answer:
      'Yes. FundRaisely can help PTAs review tickets, payments, participation, sponsors, prizes, expenses, totals and outstanding follow-up after a fundraiser.',
  },
  {
    question: 'Can FundRaisely help with PTA handover?',
    answer:
      'Yes. PTA teams change over time. FundRaisely helps keep event records and fundraising history clearer so next year’s committee is not starting from old spreadsheets, screenshots and WhatsApp messages.',
  },
  {
    question: 'Does FundRaisely hold the school’s money?',
    answer:
      'No. FundRaisely is designed to help organise and track fundraising activity. Schools and PTAs can use their own payment routes depending on the event setup.',
  },
];

const structuredData = compactStructuredData([
  webPageJsonLd(path, h1, seoDescription),
  faqJsonLd(faqs),
]);

const readyToRunItems = [
  {
    title: 'Family quiz nights',
    text: 'Run a school-friendly quiz night for children, parents, guardians, teachers and families, with joining, payments, gameplay and reports connected to the event.',
  },
  {
    title: 'Child-focused quiz templates',
    text: 'Use quiz templates that feel suitable for younger audiences, family groups, seasonal school events and age-appropriate fundraising nights.',
  },
  {
    title: 'Sponsored activities',
    text: 'Support sponsored walks, runs, readathons, skipathons, fitness challenges, kindness challenges, class goals or school garden projects.',
  },
  {
    title: 'Puzzle challenges',
    text: 'Run a recurring skill-based family puzzle challenge across a number of weeks, giving families a fun reason to stay involved.',
  },
  {
    title: 'Ticketed school events',
    text: 'Manage entries for school concerts, plays, discos, movie nights, family fun days, fairs, parent nights, workshops and seasonal fundraisers.',
  },
  {
    title: 'Digital campaign packs',
    text: 'Give families and supporters a clearer way to share a fundraiser link, contribute and track support without relying only on paper forms.',
  },
];

const templateItems = [
  {
    title: 'Junior-friendly quiz packs',
    text: 'Use quiz content designed for younger children, with questions and formats that feel suitable for school and family audiences.',
  },
  {
    title: 'Family quiz templates',
    text: 'Create events where children and adults can play together, making the fundraiser feel more like a shared family activity.',
  },
  {
    title: 'Seasonal quiz themes',
    text: 'Run Halloween, Christmas, Easter, summer fair, back-to-school or end-of-year quiz nights without building the whole event from scratch.',
  },
  {
    title: 'Parent and teacher nights',
    text: 'Use parent-focused or teacher-versus-parents quiz formats for social nights, PTA events and school community fundraisers.',
  },
  {
    title: 'Class or year-group challenges',
    text: 'Support class-versus-class, year-group or house-style fundraising events where groups can compete in a friendly way.',
  },
  {
    title: 'Screen-share friendly gameplay',
    text: 'Use a public display for the room while keeping organiser controls separate, making the event easier to run in a hall or classroom setting.',
  },
];

const sponsoredItems = [
  {
    title: 'Sponsored walks and runs',
    text: 'Let families support familiar school fundraisers with clearer digital links and payment tracking.',
  },
  {
    title: 'Readathons and learning challenges',
    text: 'Support reading, spelling, maths, kindness, attendance or activity-based challenges that fit the school community.',
  },
  {
    title: 'Class fundraising goals',
    text: 'Raise money for class trips, resources, equipment, books, art supplies, sports gear or classroom improvements.',
  },
  {
    title: 'Parent-supported sharing',
    text: 'Give families a link they can share with relatives and supporters instead of relying only on paper cards and cash envelopes.',
  },
  {
    title: 'Less payment chasing',
    text: 'Track claimed, confirmed, late and outstanding payments so PTA volunteers know what still needs follow-up.',
  },
  {
    title: 'Clearer campaign records',
    text: 'Keep supporter activity, payment status and fundraising totals connected to the campaign.',
  },
];

const ticketedItems = [
  {
    title: 'School concerts and plays',
    text: 'Manage ticket sales, attendee lists, entry records and payment status for performances and school shows.',
  },
  {
    title: 'Discos and movie nights',
    text: 'Create simple ticketed events for family nights, pupil socials, movie nights, discos and seasonal school activities.',
  },
  {
    title: 'Family fun days and fairs',
    text: 'Support larger school events with tickets, sponsors, prizes, check-in and after-event records.',
  },
  {
    title: 'Parent and community nights',
    text: 'Run parent socials, quiz nights, talks, workshops or school community events with clearer ticketing and payments.',
  },
  {
    title: 'On-the-door payments',
    text: 'Support realistic school event flows where some people pay in advance and others pay on the door.',
  },
  {
    title: 'Admin helpers',
    text: 'Let trusted PTA volunteers or school helpers assist with check-in, payment review and event support.',
  },
];

const paymentTrackingItems = [
  {
    title: 'Track mixed payment methods',
    text: 'Support the reality of school fundraising, where money may arrive by cash, bank transfer, card, instant payment, Stripe-style payment or manual confirmation.',
  },
  {
    title: 'See what is outstanding',
    text: 'Review which payments are confirmed, claimed, late or still need follow-up after an event.',
  },
  {
    title: 'Reduce paper and screenshot chaos',
    text: 'Keep participants, tickets, donations and payments connected instead of spread across envelopes, forms, messages and spreadsheets.',
  },
  {
    title: 'Support class reps and volunteers',
    text: 'Give helpers clearer information so one person is not trying to manage every payment manually.',
  },
  {
    title: 'Record prizes and sponsors',
    text: 'Track prize donors, local business sponsors, giveaways and event supporters as part of the fundraiser.',
  },
  {
    title: 'Create committee-ready summaries',
    text: 'Give the PTA, principal or school committee a clearer record of the fundraiser after it ends.',
  },
];

const handoverItems = [
  {
    title: 'Event history stays visible',
    text: 'Keep a record of past quizzes, sponsored events, ticketed activities, puzzle challenges and campaigns.',
  },
  {
    title: 'Reports for PTA meetings',
    text: 'Review what was raised, what was outstanding, who supported the event and what can be improved next time.',
  },
  {
    title: 'Useful for new committees',
    text: 'When volunteers rotate, the fundraising history does not disappear with last year’s WhatsApp group.',
  },
  {
    title: 'Sponsor and prize follow-up',
    text: 'Keep a record of which businesses donated prizes, sponsored events or supported the school community.',
  },
  {
    title: 'Repeat successful formats',
    text: 'Turn a strong quiz night, puzzle challenge or sponsored event into a repeatable fundraiser for future years.',
  },
  {
    title: 'Clearer financial review',
    text: 'Help treasurers and PTA volunteers review income, outstanding amounts, payment methods and final totals.',
  },
];

const puzzleItems = [
  {
    title: 'Weekly family challenge',
    text: 'Run a short challenge across several weeks so families have a recurring reason to take part.',
  },
  {
    title: 'Skill-based fundraising',
    text: 'Use puzzles and games of skill as a family-friendly alternative to purely donation-led fundraising.',
  },
  {
    title: 'Good for seasonal campaigns',
    text: 'Use puzzle challenges around Christmas, Easter, summer term, back-to-school or specific school projects.',
  },
  {
    title: 'Certificates or prizes',
    text: 'Add simple recognition, prizes, class shoutouts or certificates to encourage participation.',
  },
  {
    title: 'Repeat engagement',
    text: 'Give families something to come back to each week instead of asking for one-off support only.',
  },
  {
    title: 'Supports school projects',
    text: 'Use a puzzle challenge to raise money for books, art supplies, playground improvements, trips or equipment.',
  },
];

const processSteps = [
  {
    title: 'Choose the school goal',
    text: 'Decide whether the fundraiser is for books, equipment, trips, classroom resources, playground improvements, events or general PTA funds.',
  },
  {
    title: 'Pick the activity',
    text: 'Choose a family quiz, child-focused quiz, sponsored activity, puzzle challenge, ticketed event or digital campaign pack.',
  },
  {
    title: 'Choose the payment setup',
    text: 'Use a fixed ticket price, donate-what-you-want model, sponsored contribution, on-the-door payment flow or campaign contribution.',
  },
  {
    title: 'Add helpers, prizes or sponsors',
    text: 'Bring in PTA volunteers, class reps, local businesses, prize donors, teachers or school helpers.',
  },
  {
    title: 'Share with families',
    text: 'Give parents, guardians and supporters a clear link to join, buy tickets, donate or share the fundraiser.',
  },
  {
    title: 'Run the fundraiser',
    text: 'Host the quiz, puzzle challenge, sponsored event, school activity or ticketed fundraiser.',
  },
  {
    title: 'Track payments and participation',
    text: 'Review who joined, what was paid, what was claimed, what is outstanding and what needs follow-up.',
  },
  {
    title: 'Report and hand over',
    text: 'Create a clearer record for the PTA, principal, school board, treasurer or next year’s committee.',
  },
];

const screenshotSlots = [
  {
    title: 'School fundraiser setup',
    description:
      'Create a fundraiser around a quiz, sponsored activity, puzzle challenge, ticketed event or school campaign.',
    imageKey: 'eventSetupOverviewPhotoshot' as const,
    variant: 'standard' as const,
  },
  {
    title: 'Payments and participation',
    description:
      'Track families, tickets, donations, claimed payments, confirmed payments and outstanding follow-up.',
    imageKey: 'paymentTrackingScreenshot' as const,
    variant: 'standard' as const,
  },
  {
    title: 'Reports for PTA records',
    description:
      'Review what was raised, who took part, what is outstanding and what can be handed over after the event.',
    imageKey: 'reportOverviewScreenshot' as const,
    variant: 'standard' as const,
  },
];

const relatedLinks = [
  {
    label: 'Quiz fundraisers',
    to: '/event-formats/quiz',
    text: 'Run family-friendly quiz nights for pupils, parents, teachers and supporters.',
  },
  {
    label: 'Ticketed events',
    to: '/event-formats/ticketed-events',
    text: 'Manage tickets for school concerts, discos, fairs, movie nights and family events.',
  },
  {
    label: 'Payments',
    to: '/features/payments',
    text: 'Track real-world school fundraising payments across cash, card, bank transfer and manual methods.',
  },
  {
    label: 'Reports',
    to: '/features/reports',
    text: 'Create clearer records for PTA meetings, treasurers and school committees.',
  },
  {
    label: 'Event formats',
    to: '/event-formats',
    text: 'Explore the fundraising activities schools and PTAs can run with FundRaisely.',
  },
];

export default function SchoolsPage() {
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
        eyebrow="School and PTA fundraising"
        title={h1}
        description="FundRaisely helps schools, PTAs and parent associations run family-friendly fundraisers people can actually take part in: child-focused quiz nights, family challenges, sponsored events, ticketed activities and digital campaigns, with payments and reports kept organised."
        primaryCta={{ label: 'Book a demo', to: '/contact' }}
        secondaryCta={{ label: 'Explore event formats', to: '/event-formats' }}
        image={images.schoolHero}
        status="Built for busy PTA volunteers, school communities and family fundraisers"
        variant="standard"
      />

      <section className="section">
        <div className="site-shell problem-solution">
          <article>
            <p className="eyebrow">Problem</p>
            <h2>
              School fundraisers should be fun for families, not overwhelming
              for volunteers
            </h2>
            <p>
              PTAs and school committees are often run by busy parents,
              guardians, teachers and volunteers. A simple fundraiser can quickly
              become a mix of paper forms, cash envelopes, payment screenshots,
              class rep messages, ticket lists and last-minute reminders.
            </p>
            <p>
              Schools also need fundraising activities that feel appropriate for
              children and families. A quiz night, sponsored activity or school
              event should feel welcoming, safe, easy to understand and simple
              for volunteers to run.
            </p>
          </article>

          <article>
            <p className="eyebrow">Solution</p>
            <h2>
              FundRaisely gives schools ready-to-run fundraisers with clearer
              records
            </h2>
            <p>
              FundRaisely helps schools and PTAs choose practical fundraising
              formats, share them with families, track payments and review what
              happened afterwards.
            </p>
            <p>
              From child-focused quiz templates to sponsored events, ticketed
              activities and family puzzle challenges, the platform gives school
              communities more ways to raise money without leaving the PTA to
              manage everything by hand.
            </p>
          </article>
        </div>
      </section>

      <FeatureGrid
        eyebrow="Ready-to-run school fundraisers"
        title="Give families something to join, play, attend or support"
        text="Schools and PTAs can use FundRaisely for familiar fundraisers, but with a clearer setup, payment flow and event record behind them."
        items={readyToRunItems}
      />

      <SplitSection
        eyebrow="School-friendly templates"
        title="Use child-focused and family quiz templates instead of starting from scratch"
        text="A school quiz should not feel like an adult pub quiz copied into a classroom. FundRaisely can support child-focused, family-friendly and parent-focused quiz templates so PTAs can choose content that fits the audience, age group and event."
        bullets={[
          'Choose family quiz templates for parents and children playing together',
          'Use child-friendly quiz packs for younger audiences',
          'Create seasonal quiz nights for Halloween, Christmas, Easter or summer events',
          'Run parent-versus-teacher or class-versus-class quiz formats',
          'Use screen-share friendly gameplay for school halls and community rooms',
          'Reduce the amount of quiz planning needed from PTA volunteers',
        ]}
        image={images.quizGameplayScreenshot}
        reverse={false}
      />

      <FeatureGrid
        eyebrow="Templates"
        title="Make the event feel suitable for the school community"
        text="Family-friendly templates are one of the strongest school use cases because they help volunteers run a fundraiser that feels appropriate, polished and easy to take part in."
        items={templateItems}
      />

      <SplitSection
        eyebrow="Sponsored fundraisers"
        title="Keep familiar school fundraising, but make it easier to share and track"
        text="Sponsored walks, readathons and class challenges already work well in schools. FundRaisely can help turn those familiar activities into clearer digital campaigns, with parent-supported sharing, payment tracking and after-event reports."
        bullets={[
          'Use digital links instead of relying only on paper sponsor cards',
          'Let parents and guardians share the fundraiser with family and supporters',
          'Track contributions against a class, event, project or school goal',
          'Reduce the need to match cash, forms and screenshots manually',
          'Support sponsored walks, runs, readathons and school challenges',
          'Create clearer totals after the fundraiser ends',
        ]}
        image={images.paymentTrackingScreenshot}
        reverse
      />

      <FeatureGrid
        eyebrow="Family sharing"
        title="Make sponsored activities easier for parents to support"
        text="The goal is not to put more pressure on children. It is to give families a clearer, parent-supported way to share and support school fundraisers."
        items={sponsoredItems}
      />

      <SplitSection
        eyebrow="Ticketed events"
        title="Manage school events without losing track of tickets and payments"
        text="Many school fundraisers are real-world events: concerts, discos, plays, movie nights, fairs, family fun days and parent socials. FundRaisely helps schools and PTAs manage the event, payments, attendance and reporting in one clearer flow."
        bullets={[
          'Sell or manage tickets for school concerts, plays and shows',
          'Support discos, movie nights, family fun days and fairs',
          'Track who paid in advance and who still needs follow-up',
          'Allow practical on-the-door payment flows where needed',
          'Let PTA volunteers help with check-in and payment review',
          'Review attendance, income and outstanding payments after the event',
        ]}
        image={images.ticketingHeroScreenshot}
        reverse={false}
      />

      <FeatureGrid
        eyebrow="School events"
        title="Support the events PTAs already run"
        text="FundRaisely is designed to support the practical school fundraising events that already happen, while making the records easier to manage afterwards."
        items={ticketedItems}
      />

      <SplitSection
        eyebrow="Puzzle challenges"
        title="Run a recurring family challenge across the school term"
        text="A puzzle challenge can give families a weekly skill-based activity to take part in. This can work well for term-long campaigns, seasonal fundraisers or school projects where the PTA wants repeat engagement instead of a single one-off event."
        bullets={[
          'Create a weekly family puzzle or challenge',
          'Use a skill-based format suitable for children and families',
          'Encourage repeat participation over several weeks',
          'Add certificates, prizes or class recognition',
          'Use it for seasonal or project-based fundraising',
          'Give families a reason to stay involved beyond one event',
        ]}
        image={images.prizeTable}
        reverse
      />

      <FeatureGrid
        eyebrow="Recurring engagement"
        title="Use puzzle challenges for family-friendly repeat fundraising"
        text="For schools, puzzle challenges can feel educational, playful and inclusive, while giving the PTA a repeatable format that does not need a full event every time."
        items={puzzleItems}
      />

      <ScreenshotShowcase
        eyebrow="Product screens"
        title="From school fundraiser setup to payment tracking and reports"
        text="The schools page should show the practical workflow: setting up the fundraiser, sharing it with families, tracking payments and creating clearer records afterwards."
        slots={screenshotSlots}
      />

      <FeatureGrid
        eyebrow="Payments"
        title="Track the way school fundraising money really comes in"
        text="School fundraising rarely uses one neat payment route. FundRaisely helps PTAs review cash, card, bank transfer, instant payments, on-the-door payments, claimed payments and outstanding follow-up."
        items={paymentTrackingItems}
      />

      <SplitSection
        eyebrow="PTA handover"
        title="Keep the records clear for the next committee"
        text="PTA teams change. Class reps move on. Volunteers rotate. FundRaisely helps keep event records, payment summaries, sponsors, prizes and reports connected so next year’s committee is not starting from scratch."
        bullets={[
          'Keep a history of past school fundraisers',
          'Review what worked and what raised the most',
          'Track sponsors, prize donors and local supporters',
          'Give treasurers clearer income and payment summaries',
          'Create useful reports for PTA meetings and school committees',
          'Make handover easier when volunteers change',
        ]}
        image={images.reportOverviewScreenshot}
        reverse={false}
      />

      <FeatureGrid
        eyebrow="Records and reports"
        title="Make school fundraising easier to repeat next year"
        text="A strong PTA fundraiser should become easier to run again. Clear event history helps new volunteers understand what happened, who supported it and what should be repeated."
        items={handoverItems}
      />

      <ProcessSteps
        eyebrow="How it works"
        title="From school fundraising idea to PTA report"
        text="FundRaisely helps schools and PTAs move from a fundraising idea to a real activity, then into payment tracking and committee-friendly records."
        steps={processSteps}
      />

      <SplitSection
        eyebrow="Why this matters"
        title="Schools need fundraisers that fit real family life"
        text="The best school fundraisers are easy to understand, simple to share, appropriate for children and realistic for busy volunteers to run. FundRaisely brings the activity, payment tracking and reporting into one clearer workflow."
        bullets={[
          'Use child-focused and family-friendly quiz templates',
          'Run sponsored activities without relying only on paper forms',
          'Support ticketed events families already attend',
          'Track mixed payment methods more clearly',
          'Give PTA volunteers a simpler follow-up process',
          'Keep records useful for future committees',
        ]}
        image={images.dashboardOverviewScreenshot}
        reverse
      />

      <FAQSection
        items={faqs}
        intro="These questions help schools and PTAs understand how FundRaisely supports family-friendly quizzes, sponsored events, ticketed activities, puzzle challenges, payment tracking and PTA reports."
      />

      <RelatedLinks links={relatedLinks} />

      <CTASection
        title="Want school fundraisers that are easier for families and PTAs?"
        text="Book a demo to see how FundRaisely can help your school or PTA run child-focused quizzes, sponsored activities, family challenges, ticketed events, payment tracking and committee-ready reports from one clearer workflow."
        primaryCta={{ label: 'Book a demo', to: '/contact' }}
        secondaryCta={{ label: 'Explore event formats', to: '/event-formats' }}
      />
    </>
  );
}