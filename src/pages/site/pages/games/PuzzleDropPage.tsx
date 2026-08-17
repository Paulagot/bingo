// src/pages/site/pages/games/PuzzleDropPage.tsx
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

const path = '/event-formats/puzzle-drop';

const seoTitle =
  'Puzzle Drop | One-Off Puzzle Fundraiser for Clubs, Charities and Community Groups | FundRaisely';

const seoDescription =
  'Sell a single puzzle as a standalone fundraiser. FundRaisely Puzzle Drop lets clubs, charities and community groups run a one-off digital challenge with a live leaderboard, no subscription required.';

const h1 = 'Sell a single puzzle as a quick standalone fundraiser';

const breadcrumbs = breadcrumbsForPath(path, h1);

const faqs = [
  {
    question: 'What is a Puzzle Drop?',
    answer:
      'A Puzzle Drop is a one-off digital puzzle sold as a single fundraiser. Supporters pay once to access the puzzle, complete it, and appear on a live leaderboard. There is no season, no subscription, and no repeat commitment - just one puzzle, one payment, one leaderboard.',
  },
  {
    question: 'How is a Puzzle Drop different from the Weekly Puzzle Challenge?',
    answer:
      'The Weekly Puzzle Challenge is a fixed-season subscription where supporters pay once and receive a new puzzle each week. A Puzzle Drop is a single standalone puzzle with no ongoing commitment. The Drop is the one-off version - ideal for selling in person, at an event, or as a quick campaign activity.',
  },
  {
    question: 'Can a Puzzle Drop be sold in person?',
    answer:
      'Yes, and this is one of the main ways organisations use it. A club rep or volunteer can sell access to a Puzzle Drop at a game, a community night, a family fun day or door to door using a QR code or shared link. The buyer pays on their phone and gets immediate access.',
  },
  {
    question: 'Is there a leaderboard?',
    answer:
      'Yes. Every Puzzle Drop has its own leaderboard. Supporters who buy access can see how their score compares to everyone else who played, which creates real competition even for a one-off fundraiser.',
  },
  {
    question: 'Can a Puzzle Drop be used to introduce the Weekly Challenge?',
    answer:
      'Yes. A Drop is a natural way to let new supporters try a puzzle before committing to a full season. Organisations can run a Drop at an event, let people play, see the leaderboard, and then offer the Weekly Challenge as the next step.',
  },
  {
    question: 'Who sets the price?',
    answer:
      'The organiser sets the price for each Puzzle Drop. There is no fixed amount - the organisation decides what fits their supporter base and fundraising goal.',
  },
  {
    question: 'What kind of puzzle is used?',
    answer:
      'FundRaisely uses a range of digital puzzle types including word challenges, logic puzzles, number games and memory tasks. The organiser does not need to create the puzzle content - it is supplied and ready to use.',
  },
  {
    question: 'Do supporters need an account to play?',
    answer:
      'Supporters access the Puzzle Drop through the purchase link. The flow is designed to be low friction - pay, play, check the leaderboard.',
  },
  {
    question: 'Can the same puzzle be used for multiple Drops?',
    answer:
      'Each Puzzle Drop is set up individually by the organiser. The puzzle mix can vary between drops, which is useful if the same supporter base is likely to play more than one.',
  },
];

const structuredData = compactStructuredData([
  webPageJsonLd(path, h1, seoDescription),
  faqJsonLd(faqs),
]);

const howItWorksItems = [
  {
    title: 'One puzzle, one price',
    text: 'The organiser sets up a Puzzle Drop with a fixed entry price. Supporters pay once and get immediate access to the puzzle.',
  },
  {
    title: 'Sell via link or QR code',
    text: 'The Drop generates a shareable link and QR code. Share it digitally, display it at an event, or have a volunteer show it in person.',
  },
  {
    title: 'Supporters play on their phones',
    text: 'No app download needed. Supporters complete the puzzle directly in their browser after paying.',
  },
  {
    title: 'Scores go live on the leaderboard',
    text: 'Every completed puzzle contributes a score to the leaderboard, which all participants can see.',
  },
  {
    title: 'No ongoing commitment',
    text: 'Supporters pay once for one puzzle. There is no subscription, no recurring charge and no further commitment unless they choose to join a full season.',
  },
  {
    title: 'Records in the organiser dashboard',
    text: 'Sales, payment status, participant count and final leaderboard are all visible in the organiser\'s event record.',
  },
];

const inPersonItems = [
  {
    title: 'Club night or community event',
    text: 'A volunteer shows the QR code on their phone or on a screen. Attendees scan, pay and start playing immediately.',
  },
  {
    title: 'Door-to-door selling',
    text: 'A rep knocks on doors and shows the QR code or link. The householder pays on their own phone. No cash changes hands.',
  },
  {
    title: 'Family fun day add-on',
    text: 'Set up a Puzzle Drop as one activity alongside stalls, food, sport and other attractions at a larger fundraising day.',
  },
  {
    title: 'Pub or clubhouse fundraiser',
    text: 'Run a Drop on a Friday night before or after the main event. Takes minutes to set up and gives people something to compete on while they socialise.',
  },
  {
    title: 'Campaign activity',
    text: 'Include a Puzzle Drop as one activity inside a longer campaign, giving supporters a reason to engage beyond donating.',
  },
  {
    title: 'Standalone quick raise',
    text: 'No event needed. Share the link via WhatsApp, email or social and let supporters play from wherever they are.',
  },
];

const leaderboardItems = [
  {
    title: 'Live ranking from the first completion',
    text: 'As supporters finish the puzzle, their scores appear on the leaderboard in real time. Early players can see themselves overtaken as more people complete it.',
  },
  {
    title: 'Visible to all participants',
    text: 'Everyone who buys access to the Drop can see the full leaderboard. Knowing your neighbours or teammates can see your score changes how seriously people play.',
  },
  {
    title: 'Bragging rights without a prize',
    text: 'Top of a leaderboard in a local club or community group is genuinely motivating. The competition is real even without a formal prize attached.',
  },
  {
    title: 'Optional prizes from the organiser',
    text: 'Organisations can choose to offer a prize for the top score. The leaderboard makes it easy to identify the winner without any manual checking.',
  },
  {
    title: 'Each Drop has its own leaderboard',
    text: 'If you run multiple Drops across the year, each one has a fresh leaderboard - giving previous participants a chance to improve their standing next time.',
  },
  {
    title: 'Gateway to the season challenge',
    text: 'A supporter who finishes mid-table on a Drop and sees how they compare is a natural candidate for the Weekly Challenge, where they can compete properly over a full season.',
  },
];

const processSteps = [
  {
    title: 'Create the Puzzle Drop',
    text: 'Set up the Drop in FundRaisely, choose the puzzle type and set your entry price.',
  },
  {
    title: 'Get the join link and QR code',
    text: 'The system generates a shareable link and QR code supporters can use to access and pay for the puzzle.',
  },
  {
    title: 'Share or sell in person',
    text: 'Share digitally via WhatsApp, email or social, or show the QR code in person at a club night, event or door to door.',
  },
  {
    title: 'Supporters pay and play',
    text: 'Each supporter pays on their phone and gets immediate access to the puzzle. They complete it and a score is recorded.',
  },
  {
    title: 'Leaderboard updates in real time',
    text: 'Scores appear on the leaderboard as supporters complete the puzzle throughout the drop window.',
  },
  {
    title: 'Review the results',
    text: 'After the drop closes, the organiser can see total income, participant numbers and the final leaderboard in the event record.',
  },
];

const relatedLinks = [
  {
    label: 'Weekly Puzzle Challenge',
    to: '/event-formats/weekly-puzzle-challenge',
    text: 'Run a fixed-season subscription puzzle for recurring fundraising income.',
  },
  {
    label: 'Elimination game',
    to: '/event-formats/elimination',
    text: 'A quick last-person-standing fundraiser for regular club or community events.',
  },
  {
    label: 'Peer fundraising',
    to: '/features/peer-fundraising',
    text: 'Let members and players sell activity packs including Puzzle Drops to their own networks.',
  },
  {
    label: 'Contact',
    to: '/contact',
    text: 'Talk to us about running a Puzzle Drop for your organisation.',
  },
];

export default function PuzzleDropPage() {
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
        eyebrow="Puzzle Drop"
        title={h1}
        description="A Puzzle Drop is a single digital puzzle sold as a one-off fundraiser. No season, no subscription, no ongoing commitment. Set a price, share the link or QR code, and supporters pay to play and appear on the leaderboard. Sell it at a club night, door to door, at a family fun day or via WhatsApp. The puzzle does the rest."
        primaryCta={{ label: 'Book a demo', to: '/contact' }}
        secondaryCta={{ label: 'Explore event formats', to: '/event-formats' }}
        image={images.puzzels}
        status="One puzzle, one payment, one leaderboard"
        variant="standard"
      />

      <section className="section">
        <div className="site-shell problem-solution">
          <article>
            <p className="eyebrow">Problem</p>
            <h2>Not every fundraising moment calls for a full event or a season commitment</h2>
            <p>
              Sometimes an organisation wants to raise money on a Friday night, at the school gate, at a family fun day or on the doorstep - without setting up a full quiz night, planning weeks in advance or asking supporters to commit to a subscription.
            </p>
            <p>
              The existing options are often either too big (a full event with ticketing, hosting and organisation) or too passive (a donation link with nothing to engage with). There is a gap in the middle for something quick, fun and compelling.
            </p>
          </article>

          <article>
            <p className="eyebrow">Solution</p>
            <h2>A digital puzzle that sells itself with a QR code and a leaderboard</h2>
            <p>
              A Puzzle Drop is that middle ground. One puzzle, one price, one shareable link or QR code. A supporter scans, pays, plays and sees their name on the leaderboard. The organiser sees the money in and the participation records without needing to run an event.
            </p>
            <p>
              It works digitally for remote supporters and in person for the rep selling on a club night or knocking on doors on a Saturday morning. The mechanism is the same either way.
            </p>
          </article>
        </div>
      </section>

      <FeatureGrid
        eyebrow="How it works"
        title="One puzzle from setup to leaderboard in minutes"
        text="A Puzzle Drop is the lightest fundraising format in FundRaisely. It is designed for the moments where you want to raise money quickly without planning a full event."
        items={howItWorksItems}
      />

      <SplitSection
        eyebrow="Sell anywhere"
        title="A QR code and a phone is all a volunteer needs"
        text="One of the defining features of a Puzzle Drop is how easy it is to sell in person. A volunteer at a club night, a rep on the doorstep, a stall at a family fun day - all they need is the QR code and the ability to take a payment. The supporter scans, pays on their own phone, and starts playing. No cash. No tickets. No admin."
        bullets={[
          'QR code and shareable link generated automatically',
          'Supporters pay and access the puzzle on their own phone',
          'Works at events, in person or shared digitally',
          'No cash handling for the volunteer',
          'Immediate access after payment',
          'Each sale is recorded automatically',
        ]}
        image={images.puzzels}
        reverse={false}
      />

      <FeatureGrid
        eyebrow="Where it fits"
        title="Quick fundraising without the planning overhead"
        text="A Puzzle Drop works wherever there is a moment and an audience - in person or online. It does not need an event around it to work, but it can sit inside a bigger event as an additional activity."
        items={inPersonItems}
      />

      <SplitSection
        eyebrow="Leaderboard and competition"
        title="A single puzzle with real competition attached"
        text="The leaderboard is what makes a Puzzle Drop more than just a digital raffle. Supporters are not just paying to participate - they are competing for a position. That changes the experience and creates a reason to talk about it with others who played."
        bullets={[
          'Live leaderboard visible to all who bought access',
          'Scores appear as supporters complete the puzzle',
          'Bragging rights within the group, club or community',
          'Optional prize for the top score',
          'Each Drop has its own separate leaderboard',
          'A gateway to the Weekly Challenge for competitive supporters',
        ]}
        image={images.puzzels}
        reverse
      />

      <FeatureGrid
        eyebrow="Competition and engagement"
        title="The leaderboard keeps people talking about it after they play"
        text="A puzzle with a leaderboard is a shared experience, not just a transaction. When supporters can see how they did compared to the rest of the group, the Puzzle Drop becomes something worth mentioning to others - which is exactly when fundraising spreads."
        items={leaderboardItems}
      />

      <ProcessSteps
        eyebrow="Getting started"
        title="From setup to first player in minutes"
        text="A Puzzle Drop is designed to be fast to create and even faster to sell. The whole setup can be done in a few minutes, and the QR code is ready to share or display immediately."
        steps={processSteps}
      />

      <FAQSection
        items={faqs}
        intro="Common questions about how Puzzle Drop works and where it fits into a fundraising plan."
      />

      <RelatedLinks links={relatedLinks} />

      <CTASection
        title="Ready to run your first Puzzle Drop?"
        text="Book a demo to see how a Puzzle Drop can give your club, charity, school or community group a quick, engaging fundraiser you can sell anywhere."
        primaryCta={{ label: 'Book a demo', to: '/contact' }}
        secondaryCta={{ label: 'See all event formats', to: '/event-formats' }}
      />
    </>
  );
}