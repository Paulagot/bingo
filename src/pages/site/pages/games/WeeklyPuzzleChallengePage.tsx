// src/pages/site/pages/games/WeeklyPuzzleChallengePage.tsx
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

const path = '/event-formats/weekly-puzzle-challenge';

const seoTitle =
  'Weekly Puzzle Challenge for Clubs, Charities and Community Groups | FundRaisely';

const seoDescription =
  'Run a weekly puzzle challenge as a recurring fundraiser for your club, charity, school or community group. Supporters subscribe for a fixed season, a new puzzle drops each week, and a leaderboard tracks who comes out on top.';

const h1 = 'A weekly puzzle challenge your supporters actually look forward to';

const breadcrumbs = breadcrumbsForPath(path, h1);

const faqs = [
  {
    question: 'What is the FundRaisely Weekly Puzzle Challenge?',
    answer:
      'The Weekly Puzzle Challenge is a recurring digital fundraiser where supporters pay to join a season of weekly puzzles. A new puzzle is released each week, supporters play to beat their score and climb the leaderboard, and the organisation raises money consistently throughout the season.',
  },
  {
    question: 'How long does a season run?',
    answer:
      'The organisation sets the length of the season at the start. It could be four weeks, ten weeks, twelve weeks or any fixed number the organiser chooses. Supporters pay for the full season upfront via subscription.',
  },
  {
    question: 'What kinds of puzzles are included?',
    answer:
      'The puzzle engine includes a range of challenge types such as word puzzles, logic challenges, number games, memory tasks and more. The mix can vary from week to week, so the season stays interesting for repeat players.',
  },
  {
    question: 'Can supporters see how they rank against others?',
    answer:
      'Yes. Each weekly puzzle has its own leaderboard, and supporters can see how their score compares to everyone else who played that week. The leaderboard is part of what keeps people coming back and creates genuine competition within the group.',
  },
  {
    question: 'How do supporters pay?',
    answer:
      'Supporters sign up once for the full season via a Stripe subscription. Each weekly puzzle is then unlocked automatically as the season progresses, provided their payment is confirmed. Supporters who miss a payment lose access to future weeks but keep the weeks they already paid for.',
  },
  {
    question: 'Can this replace a weekly lotto?',
    answer:
      'Yes, and this is one of the main reasons organisations use it. For charities, schools and community groups where gambling regulations prevent running a lotto, the Weekly Puzzle Challenge offers a legal, skill-based alternative that generates recurring income from the same supporter base.',
  },
  {
    question: 'How does the organiser manage the challenge?',
    answer:
      'Organisers set up the challenge, choose the season length and entry price, publish it with a join code, and share that code with supporters. The system handles weekly puzzle delivery, payment gating and the leaderboard automatically.',
  },
  {
    question: 'Can supporters join after the season has started?',
    answer:
      'Yes. Late joiners can subscribe and start playing. They will have access to each puzzle as payments are confirmed from the point they join.',
  },
  {
    question: 'Who is this for?',
    answer:
      'The Weekly Puzzle Challenge works for any non-profit that wants regular fundraising income without running events every week. It suits sports clubs, charities, schools, PTAs and community groups where supporters already have a connection to the organisation and a reason to come back.',
  },
  {
    question: 'Is there a prize for the top scorer?',
    answer:
      'That is up to the organiser. The leaderboard creates natural competition and bragging rights within the group. Organisations can choose to add a prize for the season winner, a weekly prize for each top score, or leave it as a purely skill-based challenge where the leaderboard is the reward.',
  },
];

const structuredData = compactStructuredData([
  webPageJsonLd(path, h1, seoDescription),
  faqJsonLd(faqs),
]);

const howItWorksItems = [
  {
    title: 'Supporters subscribe for the season',
    text: 'A single subscription sign-up covers the full run. No chasing payments week by week.',
  },
  {
    title: 'A new puzzle drops each week',
    text: 'Each week a new challenge is unlocked automatically for everyone who has paid. Supporters play when it suits them during the week.',
  },
  {
    title: 'The leaderboard updates in real time',
    text: 'Scores are tracked and ranked as supporters complete each week\'s puzzle. The leaderboard is visible to all participants, creating genuine competition.',
  },
  {
    title: 'Payment gates access',
    text: 'Only confirmed subscribers can access each week\'s puzzle. If a payment fails, future weeks are locked until payment is resolved.',
  },
  {
    title: 'The organiser sets the season length',
    text: 'Choose four weeks, or fifty two weeks or anything in between. The season runs for exactly as long as the organiser decides at setup.',
  },
  {
    title: 'Records are kept for the organisation',
    text: 'Subscriber numbers, payment status, weekly participation and final scores are all available in the organiser dashboard.',
  },
];

const recurringIncomeItems = [
  {
    title: 'Have regular income every week of the season',
    text: 'Because supporters subscribes for the full season, the organisation has a clear picture of what will be raised each week.',
  },
  {
    title: 'No event to run each week',
    text: 'Once the season is live, the organiser does not need to prepare anything. The weekly puzzle delivers itself to every paying subscriber.',
  },
  {
    title: 'Supporters stay engaged across the season',
    text: 'Each new puzzle gives supporters a reason to check in and compete, keeping the organisation in their minds for the full season.',
  },
  {
    title: 'Repeatable across the year',
    text: 'Organisations can run multiple seasons throughout the year. A spring season, a back-to-school season, a winter challenge - each one generates a new round of income.',
  },
  {
    title: 'A lotto alternative where gambling is restricted',
    text: 'For non-profits where regulation prevents running a weekly lotto, the puzzle challenge is a skill-based legal alternative that generates similar recurring income.',
  },
  {
    title: 'Low admin overhead',
    text: 'Setting up a season takes minutes. After that, the system handles delivery, payment tracking, access gating and leaderboards without the organiser needing to manage anything weekly.',
  },
];

const leaderboardItems = [
  {
    title: 'Weekly rankings for every puzzle',
    text: 'Each week\'s puzzle has its own leaderboard. Supporters can see where they finished against the rest of the group immediately after completing the challenge.',
  },
  {
    title: 'Season-long competition',
    text: 'Cumulative scores across the season let supporters track how they are doing overall, not just week by week.',
  },
  {
    title: 'Bragging rights within the group',
    text: 'Within a club, school or community group, the leaderboard creates the same friendly rivalry as a quiz night without needing an in-person event.',
  },
  {
    title: 'Different puzzle types keep it fair',
    text: 'The range of puzzle formats across a season means the same person does not necessarily dominate every week, keeping it competitive for a wider group of supporters.',
  },
  {
    title: 'Prizes are optional',
    text: 'Organisers can add a weekly prize, a season prize or nothing at all. The leaderboard itself drives engagement - prizes are an addition, not a requirement.',
  },
  {
    title: 'Connected to the event record',
    text: 'Final scores, participation counts and payment records are available in the organiser reports after each week and at the end of the season.',
  },
];

const processSteps = [
  {
    title: 'Create the challenge',
    text: 'Set up the Weekly Puzzle Challenge, choose the season length and set the subscription price.',
  },
  {
    title: 'Publish and generate a join code',
    text: 'The system creates a unique join code and supporter join link for the challenge.',
  },
  {
    title: 'Share with supporters',
    text: 'Send the join link or code via WhatsApp, email, social media or whatever channel reaches your supporters.',
  },
  {
    title: 'Supporters subscribe and pay',
    text: 'Each supporter subscribes via stripe. Payment is confirmed before they can access the first puzzle.',
  },
  {
    title: 'Puzzles drop each week automatically',
    text: 'Every week, the next puzzle unlocks for all confirmed subscribers. No action needed from the organiser.',
  },
  {
    title: 'Supporters play and score',
    text: 'Supporters complete the weekly puzzle and their score is recorded on the leaderboard immediately.',
  },
  {
    title: 'The season ends with a final leaderboard',
    text: 'At the end of the season, the final rankings are set. Organisers can see total income, participation and scores in the event report.',
  },
];

const relatedLinks = [
  {
    label: 'Puzzle Drop',
    to: '/event-formats/puzzle-drop',
    text: 'Sell individual puzzles as a one-off fundraiser, without a season subscription.',
  },
  {
    label: 'Elimination game',
    to: '/event-formats/elimination',
    text: 'A quick last-person-standing fundraiser for clubs, pubs and community events.',
  },
  {
    label: 'Quiz fundraisers',
    to: '/event-formats/quiz',
    text: 'Run a full digital quiz night for teams or individuals.',
  },
  {
    label: 'Contact',
    to: '/contact',
    text: 'Talk to us about setting up a Weekly Puzzle Challenge for your organisation.',
  },
];

export default function WeeklyPuzzleChallengePage() {
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
        eyebrow="Weekly Puzzle Challenge"
        title={h1}
        description="The Weekly Puzzle Challenge gives clubs, charities, schools and community groups a way to generate recurring fundraising income without running a weekly event. Supporters pay once for a fixed season, a new puzzle unlocks each week, and a live leaderboard keeps the competition going until the final week."
        primaryCta={{ label: 'Book a demo', to: '/contact' }}
        secondaryCta={{ label: 'Explore event formats', to: '/event-formats' }}
        image={images.puzzels}
        status="Recurring income without a lotto"
        variant="standard"
      />

      <section className="section">
        <div className="site-shell problem-solution">
          <article>
            <p className="eyebrow">Problem</p>
            <h2>Weekly income is hard to sustain without a lotto or weekly event</h2>
            <p>
              Many non-profits rely on a weekly lotto for recurring income, but regulation makes that impossible for charities, schools and community groups where gambling restrictions apply. The alternative - running a new event every week - creates a workload most volunteer committees cannot sustain.
            </p>
            <p>
              The result is an income gap between big annual fundraisers. Organisations know their supporters would give regularly, but there is no simple mechanism to collect it without either breaking rules or burning out volunteers.
            </p>
          </article>

          <article>
            <p className="eyebrow">Solution</p>
            <h2>A skill-based weekly challenge that generates consistent income legally</h2>
            <p>
              The Weekly Puzzle Challenge is a fixed-season subscription fundraiser. Supporters subscribe for the full season, a new puzzle drops automatically each week, and a leaderboard tracks who comes out on top. The organiser sets it up once and the system does the rest.
            </p>
            <p>
              Because it is skill-based rather than chance-based, it works where gambling restrictions prevent a lotto. And because supporters subscribes for the season, the organisation has regular income in the bank.
            </p>
          </article>
        </div>
      </section>

      <FeatureGrid
        eyebrow="How it works"
        title="One setup, weekly income for the full season"
        text="The organiser creates the challenge, sets the season length and price, shares the join link, and the system handles everything else. No weekly tasks. No chasing payments. Just a puzzle that drops each week for every paying subscriber."
        items={howItWorksItems}
      />

         <FeatureGrid
        eyebrow="Built for recurring fundraising"
        title="Regular income without a weekly workload"
        text="Most recurring fundraising models either require weekly effort from the organiser or depend on gambling frameworks that not every organisation can use. The Weekly Puzzle Challenge removes both problems."
        items={recurringIncomeItems}
      />

      <SplitSection
        eyebrow="Leaderboard and bragging rights"
        title="The competition is part of what keeps supporters coming back"
        text="A quiz night creates social energy in a room. The Weekly Puzzle Challenge creates the same competitive energy across a season. Supporters check the leaderboard after each puzzle, see where they sit relative to teammates, parents or community members, and come back the next week to improve their position."
        bullets={[
          'Weekly leaderboard updated in real time as scores come in',
          'Season-long cumulative rankings visible to all subscribers',
          'Friendly competition within clubs, schools and community groups',
          'Different puzzle types across the season keep rankings unpredictable',
          'Optional prizes for weekly or season winners',
          'Bragging rights within the group - no prize required',
        ]}
        image={images.puzzels}
        reverse
      />

      <FeatureGrid
        eyebrow="Leaderboard and scoring"
        title="Give supporters something to compete for across the whole season"
        text="The leaderboard is not a minor feature - it is the reason supporters stay engaged past week one. A publicly visible ranking within the group creates the same social pressure as a fundraising thermometer, except it rewards skill as well as participation."
        items={leaderboardItems}
      />

      <ProcessSteps
        eyebrow="How to get started"
        title="From setup to first puzzle in a few steps"
        text="Creating a Weekly Puzzle Challenge is designed to be quick. The organiser sets the season parameters, publishes the challenge, and shares the join link. Everything else runs automatically."
        steps={processSteps}
      />

      <SplitSection
        eyebrow="Who it is for"
        title="Any non-profit that wants regular income without a weekly event or a lotto"
        text="The Weekly Puzzle Challenge is a fit wherever there is an existing supporter base that would give regularly if the mechanism were simple enough. Sports clubs, charities, schools, parent associations and community groups all have exactly that audience."
        bullets={[
          'Sports clubs looking for regular in-season income',
          'Charities where gambling regulations prevent running a lotto',
          'Schools and PTAs with parent communities who engage digitally',
          'Community groups wanting income between major fundraisers',
          'Any non-profit with a supporter base that already communicates via WhatsApp or email',
          'Organisations that want recurring income without recurring effort',
        ]}
        image={images.puzzels}
        reverse={false}
      />

      <FAQSection
        items={faqs}
        intro="Common questions about the Weekly Puzzle Challenge and how it works as a recurring fundraising format."
      />

      <RelatedLinks links={relatedLinks} />

      <CTASection
        title="Give your supporters something to play every week"
        text="Book a demo to see how the Weekly Puzzle Challenge can generate regular income for your club, charity, school or community group without the admin overhead of a weekly event."
        primaryCta={{ label: 'Book a demo', to: '/contact' }}
        secondaryCta={{ label: 'Explore event formats', to: '/event-formats' }}
      />
    </>
  );
}