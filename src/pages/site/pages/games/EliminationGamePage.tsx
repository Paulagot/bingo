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

const path = '/event-formats/elimination';

const seoTitle =
  'Last Person Standing Fundraising Game for Clubs and Charities | FundRaisely';

const seoDescription =
  'Run a quick last-person-standing elimination fundraising game for clubs, charities, pubs, campaigns and community events, with repeatable gameplay, randomised rounds, easy joining, payment tracking and after-event records.';

const h1 = 'A quick digital fundraiser supporters can play again and again';

const breadcrumbs = breadcrumbsForPath(path, h1);

/*
const videoSlot = {
  title: 'See how a FundRaisely Elimination game works',
  text: 'Watch how a club, charity or community group can set up a quick last-person-standing fundraiser, invite players, start the game, move through randomised rounds and end with one winner.',
  imageKey: 'quizGameplayScreenshot' as const,
  videoLabel: 'Elimination fundraising game walkthrough',
  transcript:
    'This walkthrough should show the full Elimination game flow: creating the fundraiser, choosing entry settings, inviting players, confirming payments, opening the game, starting the elimination flow, showing different round types, knocking players out, reaching the final player and reviewing the event record afterwards.',
};
*/

const faqs = [
  {
    question: 'What is FundRaisely Elimination?',
    answer:
      'FundRaisely Elimination is a last-person-standing fundraising game. Players join on their phones, take part in quick challenge rounds and stay in the game until they are knocked out. The final remaining player wins.',
  },
  {
    question: 'Is Elimination the same as a quiz?',
    answer:
      'No. A quiz is usually a bigger planned event with teams, rounds, a host-led structure and more of a full event-night feel. Elimination is quicker, lighter and designed for regular repeat fundraising.',
  },
  {
    question: 'How does the game work?',
    answer:
      'Everyone starts in the game. Each round gives players a challenge. Players who fail are eliminated, and the remaining players move forward. The game continues until one player is left standing.',
  },
  {
    question: 'How many rounds are in each game?',
    answer:
      'Each Elimination game uses eight rounds, selected from a wider set of possible round types. This keeps the game simple to run while helping repeat games feel different.',
  },
  {
    question: 'Will every game be the same?',
    answer:
      'No. FundRaisely can vary the round mix, difficulty and skill level, so supporters can play again without feeling like they are repeating the exact same game.',
  },
  {
    question: 'Where could we use an elimination game?',
    answer:
      'Elimination can work as a weekly pub or clubhouse fundraiser, a family fun day activity, a campaign engagement game, a school or club challenge, or an add-on activity inside a bigger fundraising event.',
  },
  {
    question: 'Does the host need to prepare the game manually?',
    answer:
      'No. Elimination is designed so the host does not need to build every round manually. Once the fundraiser is set up, the host can start the game and let the system guide the flow.',
  },
  {
    question: 'Is this good for regular fundraising?',
    answer:
      'Yes. Elimination is especially useful when an organisation wants something lighter than a full quiz night. It can be repeated regularly and used to keep supporters engaged over time.',
  },
  {
    question: 'Can players join and pay like they do for other FundRaisely activities?',
    answer:
      'Yes. Elimination can use the same FundRaisely joining, payment and tracking workflows as other event formats, depending on how the organiser sets up the fundraiser.',
  },
  {
    question: 'Can Elimination be part of a bigger campaign?',
    answer:
      'Yes. It can run on its own or as one activity inside a wider fundraising campaign, giving supporters a reason to take part more than once.',
  },
];

const structuredData = compactStructuredData([
  webPageJsonLd(path, h1, seoDescription),
  faqJsonLd(faqs),
  // videoJsonLd(videoSlot, path),
]);

const screenshotSlots = [
  {
    title: 'Quick player joining',
    description:
      'Let supporters join the elimination game through a clear event flow, with player details and payment status connected to the fundraiser.',
    imageKey: 'ticketingHeroScreenshot' as const,
    variant: 'standard' as const,
  },
  {
    title: 'Simple host controls',
    description:
      'The host starts the game and follows the guided flow as players move through elimination rounds.',
    imageKey: 'quizGameplayScreenshot' as const,
    variant: 'standard' as const,
  },
  {
    title: 'Clear event records',
    description:
      'Keep participation, payments, winners and fundraising activity connected to the event record after the game ends.',
    imageKey: 'reportOverviewScreenshot' as const,
    variant: 'standard' as const,
  },
];

const howItWorksItems = [
  {
    title: 'Everyone starts in',
    text: 'All joined players begin the game together, making the format easy to explain before the first round starts.',
  },
  {
    title: 'Players face quick challenges',
    text: 'Each round gives players a fast challenge designed to keep the game moving and the room engaged.',
  },
  {
    title: 'Wrong answers knock players out',
    text: 'Players who fail a round are eliminated, while surviving players continue to the next challenge.',
  },
  {
    title: 'Eight rounds per game',
    text: 'Each game uses eight rounds, keeping the format short enough for regular fundraising and social settings.',
  },
  {
    title: 'Randomised round mix',
    text: 'Rounds are selected from a wider set of possible challenge types, so repeat games do not feel identical.',
  },
  {
    title: 'Last player standing wins',
    text: 'The game continues until one player remains, creating a simple and exciting finish.',
  },
];

const repeatableFundraiserItems = [
  {
    title: 'Friday night pub game',
    text: 'Run a quick weekly game in a pub, clubhouse or social venue without planning a full event every time.',
  },
  {
    title: 'Clubhouse fundraiser',
    text: 'Give members and supporters a simple activity they can join before, during or after regular club nights.',
  },
  {
    title: 'Family fun day activity',
    text: 'Add a lightweight digital game alongside stalls, raffles, food, music, sports or other activities.',
  },
  {
    title: 'Campaign engagement',
    text: 'Use Elimination during a longer campaign to give supporters a reason to come back and take part again.',
  },
  {
    title: 'Bigger event add-on',
    text: 'Run it as a side activity inside a quiz night, fundraising weekend, sports day or community event.',
  },
  {
    title: 'Repeatable format',
    text: 'Use the same fundraising format again without rebuilding the whole event from scratch.',
  },
];

const randomisedGameItems = [
  {
    title: 'Wider round pool',
    text: 'The game can pull from a broader set of round types, while each individual game only uses eight.',
  },
  {
    title: 'Different each time',
    text: 'Because the round mix can change, repeat players do not simply get the exact same game again.',
  },
  {
    title: 'Difficulty variation',
    text: 'The game can mix easier and harder moments so the experience feels balanced and unpredictable.',
  },
  {
    title: 'Skill variation',
    text: 'Different types of rounds can test different player strengths, keeping the game more interesting.',
  },
  {
    title: 'Fast replay value',
    text: 'Supporters can play again another week without the organiser needing to design a new game manually.',
  },
  {
    title: 'Familiar but fresh',
    text: 'The rules stay simple, but the game content can change enough to keep people engaged.',
  },
];

const hostItems = [
  {
    title: 'Press start',
    text: 'Once the fundraiser is ready, the host can start the game without needing to build every round manually.',
  },
  {
    title: 'Guided game flow',
    text: 'The system moves the game through the elimination journey so the organiser is not managing everything from notes.',
  },
  {
    title: 'Easy to explain',
    text: 'Last person standing is a simple format, which makes it easy for new players to understand quickly.',
  },
  {
    title: 'Less pressure on volunteers',
    text: 'The organiser does not need to act like a full quizmaster or manage a complicated running order.',
  },
  {
    title: 'Works in busy settings',
    text: 'The format suits pubs, clubhouses, family fun days and community events where attention can be limited.',
  },
  {
    title: 'Built for regular use',
    text: 'Elimination is designed to be repeated, not treated as a once-a-year fundraising production.',
  },
];

const useCaseItems = [
  {
    title: 'Sports clubs',
    text: 'Run a regular clubhouse game for members, parents, supporters and players.',
  },
  {
    title: 'Charity campaigns',
    text: 'Add a repeatable game to a campaign so supporters have a reason to keep engaging.',
  },
  {
    title: 'Schools and parents groups',
    text: 'Use it as a simple fundraising activity at fun days, fairs or community evenings.',
  },
  {
    title: 'Pubs and venues',
    text: 'Give regulars a quick game that supports a local cause and can be repeated each week.',
  },
  {
    title: 'Community groups',
    text: 'Create a low-pressure fundraising activity that does not require a large organising team.',
  },
  {
    title: 'Event organisers',
    text: 'Add it as a short activity inside a larger fundraiser, campaign day or social event.',
  },
];

const processSteps = [
  {
    title: 'Create the fundraiser',
    text: 'Set up the Elimination activity as part of a FundRaisely event, campaign or regular fundraising night.',
  },
  {
    title: 'Choose the entry setup',
    text: 'Decide how players will join, how much they pay and what information you need from them.',
  },
  {
    title: 'Share the join link',
    text: 'Invite supporters to join before the game or let them join on the night.',
  },
  {
    title: 'Open the game',
    text: 'Let players enter, confirm who is ready and prepare the room for the elimination flow.',
  },
  {
    title: 'Press start',
    text: 'The host starts the game and the system guides the round flow.',
  },
  {
    title: 'Eliminate players each round',
    text: 'Players who fail a round are knocked out, and surviving players move forward.',
  },
  {
    title: 'Crown the winner',
    text: 'The final remaining player wins the game.',
  },
  {
    title: 'Review the event record',
    text: 'After the game, review participation, payment status, winners and fundraiser activity.',
  },
];

const relatedLinks = [
  {
    label: 'Event formats',
    to: '/event-formats',
    text: 'Explore the different fundraising activities and event formats available in FundRaisely.',
  },
  {
    label: 'Digital quiz',
    to: '/event-formats/quiz',
    text: 'Run a fuller quiz-night style fundraiser for teams or individuals.',
  },
  {
    label: 'Features',
    to: '/features',
    text: 'See the wider FundRaisely platform features for events, payments, reports and impact records.',
  },
  {
    label: 'Contact',
    to: '/contact',
    text: 'Talk to us about running Elimination for your club, charity, school or campaign.',
  },
];

export default function EliminationGamePage() {
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
        eyebrow="Last-person-standing fundraising game"
        title={h1}
        description="FundRaisely Elimination is a fast last-person-standing game for clubs, charities, schools, pubs and community groups. Players join, take part in quick challenge rounds and stay in the game until they are knocked out. The host only needs to start the game, while FundRaisely manages the round flow, difficulty mix and winner journey."
        primaryCta={{ label: 'Book a demo', to: '/contact' }}
        secondaryCta={{ label: 'Explore features', to: '/features' }}
        image={images.communityQuizNight}
        status="Quick repeatable fundraiser for clubs, pubs, campaigns and community events"
        variant="standard"
      />

      <section className="section">
        <div className="site-shell problem-solution">
          <article>
            <p className="eyebrow">Problem</p>
            <h2>Some fundraisers are too big to run every week</h2>
            <p>
              Quiz nights are brilliant, but they usually need planning and
              promotion, That makes them ideal for bigger fundraising
              nights, but harder to repeat every Friday or add casually to
              another event.
            </p>
            <p>
              Many clubs, charities and community groups need something lighter:
              a simple game supporters can join quickly, enjoy in the moment and
              come back to again.
            </p>
          </article>

          <article>
            <p className="eyebrow">Solution</p>
            <h2>A quick last-person-standing game built for repeat fundraising</h2>
            <p>
              FundRaisely Elimination turns last-person-standing gameplay into a
              repeatable fundraising format. Supporters join the game, answer
              quick challenges and keep playing until they are eliminated. The
              last player standing wins.
            </p>
            <p>
              The organiser does not need to build the game manually.
              FundRaisely can select from different round types, vary the
              difficulty and keep each play-through feeling familiar but fresh.
            </p>
          </article>
        </div>
      </section>

      {/*
      <div id="elimination-demo">
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
        eyebrow="How the game works"
        title="Last person standing, simple to explain and quick to play"
        text="Elimination is built around a format players already understand. Everyone starts in the game, each round removes players, and the final remaining player wins."
        items={howItWorksItems}
      />

      <SplitSection
        eyebrow="Built for regular fundraising"
        title="Not every fundraiser needs to be a full event night"
        text="Elimination is designed for organisations that want a lighter fundraising activity they can run more often. It can work as a weekly pub game, a clubhouse fundraiser, a family fun day activity or a campaign game that keeps supporters engaged over time."
        bullets={[
          'Run it as a quick weekly fundraiser',
          'Use it in pubs, clubhouses, schools or community spaces',
          'Add it to family fun days and larger events',
          'Use it as a campaign activity supporters can return to',
          'Keep the game easy to explain for new players',
          'Repeat the format without rebuilding everything from scratch',
        ]}
        image={images.communityQuizNight}
        reverse={false}
      />

      <FeatureGrid
        eyebrow="Repeatable fundraiser"
        title="A game format you can use again and again"
        text="Elimination works best when you want regular fundraising moments rather than one large event. It gives supporters something easy to join and gives organisers a format they can bring back weekly, monthly or during a campaign."
        items={repeatableFundraiserItems}
      />

      <ScreenshotShowcase
        eyebrow="Product screens"
        title="A lighter game flow connected to the wider FundRaisely platform"
        text="Elimination should feel quick to run, but still connected to the important event records: joining, payment status, player activity, winners and after-event review."
        slots={screenshotSlots}
      />

      <SplitSection
        eyebrow="Fresh each time"
        title="Eight rounds per game, selected from a wider set of challenges"
        text="Each Elimination game uses eight rounds, but those rounds can be drawn from a wider pool of challenge types. That means the rules stay easy to understand, while the game itself can change from one play-through to the next."
        bullets={[
          'Each game uses eight rounds',
          'Rounds are selected from a wider set of possible challenge types',
          'The game can vary difficulty across the flow',
          'Different skill types can appear in different games',
          'Repeat players do not simply get the same game every time',
          'The format stays familiar while the content feels fresh',
        ]}
        image={images.quizGameplayScreenshot}
        reverse
      />

      <FeatureGrid
        eyebrow="Randomised gameplay"
        title="Keep regular players engaged without making the host rebuild the game"
        text="For weekly or repeat fundraising, the game needs replay value. FundRaisely can vary the round mix, difficulty and skill level so supporters can come back without feeling like they already know exactly what is coming."
        items={randomisedGameItems}
      />

      <SplitSection
        eyebrow="Simple host flow"
        title="The host only needs to press start"
        text="Elimination is intentionally lighter than a full quiz night. The host should not have to prepare a full deck, write questions, manage a complicated running order or act like a professional quizmaster. Once the fundraiser is ready, they can start the game and follow the guided flow."
        bullets={[
          'No need to manually prepare every round',
          'No heavy quizmaster role required',
          'Simple last-person-standing rules',
          'Fast enough for pubs, clubs and busy event settings',
          'Easy for volunteers and helpers to support',
          'Designed for repeat use rather than one-off setup',
        ]}
        image={images.paymentTrackingScreenshot}
        reverse={false}
      />

      <FeatureGrid
        eyebrow="Built for the organiser"
        title="A quick fundraiser should not create a big admin job"
        text="The Elimination page should reassure organisers that the game is easy to run. The wider FundRaisely platform can handle joining, payments and event records, but this page should focus on the game being quick, repeatable and low-pressure."
        items={hostItems}
      />

      <SplitSection
        eyebrow="Where it fits"
        title="Use it on its own or inside a bigger campaign"
        text="Elimination can stand alone as a quick fundraiser, but it can also sit inside a wider campaign or event. A club could run it every Friday night, a charity could add it to a campaign, and a community group could use it as one activity during a larger fundraising day."
        bullets={[
          'Weekly pub or clubhouse fundraiser',
          'Campaign engagement activity',
          'Family fun day game',
          'School or club challenge',
          'Side activity at a larger fundraiser',
          'Quick social game for supporters and members',
        ]}
        image={images.prizeTable}
        reverse
      />

      <FeatureGrid
        eyebrow="Use cases"
        title="A flexible game for regular fundraising moments"
        text="Elimination works especially well where supporters are already gathering, socialising or following a campaign. It gives people a reason to take part without asking the organiser to run a full event every time."
        items={useCaseItems}
      />

      <ProcessSteps
        eyebrow="How it works"
        title="From join link to last player standing"
        text="The game flow should feel simple: set up the fundraiser, share the join link, start the game and let the elimination rounds find the winner."
        steps={processSteps}
      />

      <SplitSection
        eyebrow="Connected records"
        title="Quick to play, still connected to the event record"
        text="Even though Elimination is a lighter game format, it still benefits from being connected to the wider FundRaisely event flow. Organisers can keep track of who joined, who paid, who played, who won and what activity was created around the fundraiser."
        bullets={[
          'Keep player entries connected to the fundraiser',
          'Track payment status through the event flow',
          'Record the winner and game outcome',
          'Review participation after the game',
          'Use the same wider FundRaisely workflows as other activities',
          'Link supporters back into future games or campaigns',
        ]}
        image={images.reportOverviewScreenshot}
        reverse={false}
      />

      <FAQSection
        items={faqs}
        intro="These questions help visitors understand that Elimination is a fast, repeatable last-person-standing fundraiser, not a full quiz night or a one-off event format."
      />

      <RelatedLinks links={relatedLinks} />

      <CTASection
        title="Want a fundraiser supporters can play again and again?"
        text="Book a demo to see how FundRaisely Elimination helps clubs, charities, schools, pubs and community groups run quick last-person-standing games for regular fundraising, campaigns and bigger events."
        primaryCta={{ label: 'Book a demo', to: '/contact' }}
        secondaryCta={{
          label: 'Explore FundRaisely features',
          to: '/features',
        }}
      />
    </>
  );
}