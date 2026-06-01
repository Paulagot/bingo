import { SEO } from '../../components/seo/SEO';
import { Breadcrumbs } from '../../components/seo/Breadcrumbs';
import { breadcrumbsForPath } from '../../components/seo/breadcrumbUtils';
import {
  compactStructuredData,
  faqJsonLd,
  videoJsonLd,
  webPageJsonLd,
} from '../../components/seo/structuredData';

import { Hero } from '../../components/sections/Hero';
import { VideoSection } from '../../components/sections/VideoSection';
import { FeatureGrid } from '../../components/sections/FeatureGrid';
import { ProcessSteps } from '../../components/sections/ProcessSteps';
import { ScreenshotShowcase } from '../../components/sections/ScreenshotShowcase';
import { SplitSection } from '../../components/sections/SplitSection';
import { FAQSection } from '../../components/sections/FAQSection';
import { RelatedLinks } from '../../components/sections/RelatedLinks';
import { CTASection } from '../../components/sections/CTASection';

import { images } from '../../config/imageConfig';

const path = '/event-formats/quiz';

const seoTitle =
  'Digital Fundraising Quiz Event Software for Clubs and Charities | FundRaisely';

const seoDescription =
  'Run a self-hosted digital fundraising quiz for teams or individuals, with one connected device per player or team, ticketing, payment tracking, admin helpers, host controls, screen-share gameplay, scoring, timing, fundraising extras, sponsor shoutouts and reports.';

const h1 = 'Run a digital fundraising quiz night without building everything yourself';

const breadcrumbs = breadcrumbsForPath(path, h1);

const videoSlot = {
  title: 'See how a FundRaisely quiz runs from setup to game night',
  text: 'Watch how a club, charity or community group can set up a digital quiz fundraiser, choose teams or individuals, decide how supporters join, collect or confirm payments, add fundraising extras, recognise sponsors, open the room, run questions, manage scoring and review the event afterwards.',
  imageKey: 'quizGameplayScreenshot' as const,
  videoLabel: 'Digital quiz fundraiser walkthrough',
  transcript:
    'This walkthrough should show the full digital quiz event flow: creating the fundraiser, choosing team or individual play, choosing a fixed entry fee or donate-what-you-want setup, adding fundraising extras, adding sponsor shoutouts, inviting players, adding admins, opening the room, using host controls, showing the screen-share view, managing connected devices, questions, timing and scoring, and reviewing the event record after the quiz.',
};

const faqs = [
  {
    question: 'Is FundRaisely Quiz a digital quiz?',
    answer:
      'Yes. FundRaisely Quiz is a digital quiz event. Players or teams join on connected devices, and the organiser runs the quiz using host controls and a separate screen-share view.',
  },
  {
    question: 'Can the quiz be played by teams or individuals?',
    answer:
      'Yes. The organiser can choose whether the quiz is played by individuals or by teams. For team play, one connected device can represent the whole team, which works well for tables, families, club groups and pub quiz-style events.',
  },
  {
    question: 'Does every person need their own device?',
    answer:
      'Not always. Usage is based on connected devices. If the quiz is configured for individual play, each player can use their own device. If it is configured for team play, one device can be used by the team.',
  },
  {
    question: 'Is FundRaisely Quiz only for online events?',
    answer:
      'No. FundRaisely Quiz can support in-person, hybrid and online quiz fundraisers. The host controls help the organiser run the game, while the screen-share view gives the room or remote audience a cleaner display.',
  },
  {
    question: 'Can a volunteer host run the quiz without being experienced?',
    answer:
      'Yes. FundRaisely is designed to help an ordinary volunteer run a more polished quiz night. The host controls guide the organiser through questions, timing, scoring, reviews, leaderboards and game phases, so they are not trying to manage everything from notes and spreadsheets.',
  },
  {
    question: 'Can we add admins or helpers on the night?',
    answer:
      'Yes. Organisers can add admin helpers to support the event. Admins can help with setup, player joining, payment checks and on-the-night support without taking over the host controls.',
  },
  {
    question: 'Can we charge a fixed entry fee?',
    answer:
      'Yes. A quiz fundraiser can be configured with a fixed entry price so supporters know what they are paying before they join.',
  },
  {
    question: 'Can we use donate what you want instead of a fixed fee?',
    answer:
      'Yes. Where that setup is enabled, organisers can let supporters choose their own contribution amount while still joining the quiz event.',
  },
  {
    question: 'When are fundraising extras purchased?',
    answer:
      'Fundraising extras are selected while the supporter is paying or joining, not randomly purchased during gameplay. This keeps the payment flow clearer and lets the organiser design extras in advance to boost fundraising.',
  },
  {
    question: 'What are fundraising extras?',
    answer:
      'Fundraising extras are optional paid game features designed to increase the amount raised while making the quiz more fun. Depending on the quiz setup, these can include things such as clues, extra time, lifelines, second chances, restore points or other quiz-specific boosts.',
  },
  {
    question: 'Can we recognise sponsors during the quiz?',
    answer:
      'Yes. FundRaisely can support sponsor shoutouts so clubs, charities and non-profits can give local businesses visible recognition during the quiz. This helps make sponsorship easier to offer, explain and deliver.',
  },
  {
    question: 'Does FundRaisely replace the quiz host?',
    answer:
      'No. FundRaisely supports the host with structure, controls and clear screens. The club, charity, school or community group still runs its own event, but the host is not left trying to manage the whole night manually.',
  },
  {
    question: 'Does FundRaisely hold the money raised?',
    answer:
      'No. FundRaisely is designed so funds are paid directly through the organisation’s own connected payment methods or wallet, depending on the event setup. FundRaisely does not need to hold the fundraiser money.',
  },
  {
    question: 'Do we get a report after the quiz?',
    answer:
      'Yes. The quiz can connect into event records covering participation, payment status, teams or individual players, prizes, winners, sponsor shoutouts, fundraising extras and after-event reporting.',
  },
];

const structuredData = compactStructuredData([
  webPageJsonLd(path, h1, seoDescription),
  faqJsonLd(faqs),
  videoJsonLd(videoSlot, path),
]);

const screenshotSlots = [
  {
    title: 'Host controls for the organiser',
    description:
      'Move through rounds, questions, answer reviews, scoring and leaderboards from one guided host view.',
    imageKey: 'quizGameplayScreenshot' as const,
    variant: 'standard' as const,
  },
  {
    title: 'Ticketing and join setup',
    description:
      'Set the entry workflow, team or individual play, payment options, player details and fundraising extras before supporters join.',
    imageKey: 'ticketingHeroScreenshot' as const,
    variant: 'standard' as const,
  },
  {
    title: 'Payment and player tracking',
    description:
      'Help organisers and admins see who has joined, which devices are connected, who has paid, who needs review and what still needs follow-up.',
    imageKey: 'paymentTrackingScreenshot' as const,
    variant: 'standard' as const,
  },
];

const workflowItems = [
  {
    title: 'Teams or individuals',
    text: 'Choose whether the quiz is played by individual players or by teams. For team play, one connected device can represent the whole team.',
  },
  {
    title: 'One device per entry',
    text: 'Usage is based on connected devices, making it easy to support tables, families, club groups or individual players.',
  },
  {
    title: 'Fixed entry fee',
    text: 'Charge a clear ticket or player price for the quiz so supporters know what they are paying before the event.',
  },
  {
    title: 'Donate what you want',
    text: 'Let supporters choose their own contribution amount while still joining the quiz flow.',
  },
  {
    title: 'Fundraising extras at checkout',
    text: 'Offer optional paid extras while supporters are joining or paying, so the extra fundraising is planned before the game starts.',
  },
  {
    title: 'Sponsor shoutouts',
    text: 'Add visible sponsor recognition into the quiz so non-profits can offer local businesses a clearer reason to support the event.',
  },
  {
    title: 'Admin helpers',
    text: 'Add trusted helpers who can support player joining, payment checks and setup tasks on the night.',
  },
  {
    title: 'In-person, hybrid or online',
    text: 'Run the same digital quiz structure in a club room, school hall, pub, community space or online setting.',
  },
];

const eventBoxItems = [
  {
    title: 'Digital quiz setup',
    text: 'Create the event, choose team or individual play, set the entry model, configure the rounds and prepare the fundraiser before the night starts.',
  },
  {
    title: 'Device-based joining',
    text: 'Let individuals or teams join from connected devices, with one device able to represent a whole team where that setup is chosen.',
  },
  {
    title: 'Ticketing and joining',
    text: 'Give supporters a clear route to buy, reserve or join the quiz, with player or team details connected to the event.',
  },
  {
    title: 'Payment tracking',
    text: 'Track confirmed, claimed, manual, late and outstanding payments without relying on a separate spreadsheet.',
  },
  {
    title: 'Admin support',
    text: 'Let helpers assist with player entry, team joining, payment follow-up and event setup while the host focuses on running the quiz.',
  },
  {
    title: 'Question flow',
    text: 'Guide the host through questions, rounds and game phases so the quiz has structure from start to finish.',
  },
  {
    title: 'Timing controls',
    text: 'Use timed questions and controlled progression so the night keeps moving and the room stays focused.',
  },
  {
    title: 'Scoring and review',
    text: 'Support answer review, scoring, results and leaderboard moments without the host manually calculating everything.',
  },
  {
    title: 'Screen-share view',
    text: 'Show a cleaner public display to the room while keeping organiser controls private.',
  },
  {
    title: 'Fundraising extras',
    text: 'Add optional paid boosts designed to increase fundraising while keeping the quiz playful.',
  },
  {
    title: 'Sponsor shoutouts',
    text: 'Give local sponsors visible recognition during the quiz, helping non-profits offer a clearer sponsorship benefit.',
  },
  {
    title: 'Prize and winner records',
    text: 'Record winners, prizes, sponsors and outcomes as part of the event record.',
  },
  {
    title: 'Reports after the quiz',
    text: 'Review participation, payments, extras, sponsors, prizes and fundraising totals after the event.',
  },
  {
    title: 'Repeatable format',
    text: 'Turn a successful quiz night into a repeatable fundraising format for future campaigns.',
  },
];

const hostControlItems = [
  {
    title: 'Guided question flow',
    text: 'The host can move through the quiz one phase at a time instead of trying to manage questions, screens, answers and scoring manually.',
  },
  {
    title: 'Timing built in',
    text: 'Timed questions help keep the night moving and make the quiz feel more professional for players and spectators.',
  },
  {
    title: 'Answer review',
    text: 'The host can review answers before moving to results, which is especially useful for live, hybrid or manually checked rounds.',
  },
  {
    title: 'Team and player visibility',
    text: 'The host can run the quiz with a clearer view of who is playing, whether the event is set up for individuals or teams.',
  },
  {
    title: 'Leaderboard moments',
    text: 'Leaderboards create natural energy in the room and give the host a clear way to move from gameplay to results.',
  },
  {
    title: 'Separate public display',
    text: 'The screen-share view keeps the audience focused on the quiz while the organiser keeps admin controls private.',
  },
  {
    title: 'Less pressure on the host',
    text: 'The system gives an inexperienced host the structure they need to run the night with more confidence.',
  },
];

const deviceItems = [
  {
    title: 'Individual play',
    text: 'Each player can join from their own device, which works well for remote, hybrid or competitive individual quiz formats.',
  },
  {
    title: 'Team play',
    text: 'A team can play from one connected device, making it ideal for tables, families, club groups, pub quiz teams and community events.',
  },
  {
    title: 'Clearer event setup',
    text: 'The organiser decides the play style before the event, so ticketing, joining, scoring and reporting match how the quiz will actually run.',
  },
  {
    title: 'Easier on-the-night support',
    text: 'Admins can help players or teams join on the night, reducing pressure on the host during busy check-in moments.',
  },
  {
    title: 'Works across event formats',
    text: 'The same digital quiz setup can work for in-person, hybrid or online fundraisers, depending on how the organisation wants to run the night.',
  },
  {
    title: 'Connected records',
    text: 'Player, team, payment, extras and results data stay connected to the event record, making follow-up easier after the quiz.',
  },
];

const extrasItems = [
  {
    title: 'Designed before the event',
    text: 'Extras are configured as part of the quiz setup, so the organiser can choose what fits the fundraiser before supporters join.',
  },
  {
    title: 'Purchased during entry',
    text: 'Supporters can add extras while paying or joining, keeping the money flow clearer and easier to reconcile.',
  },
  {
    title: 'Built to boost fundraising',
    text: 'Extras create extra income opportunities without simply asking people for another donation.',
  },
  {
    title: 'Connected to gameplay',
    text: 'Extras can affect the quiz experience, making them feel like part of the event rather than a bolt-on upsell.',
  },
  {
    title: 'Works for teams or individuals',
    text: 'Extras can be planned around the way the quiz is being played, whether one person is competing alone or a team is playing from one device.',
  },
  {
    title: 'Format-specific options',
    text: 'Different quiz formats can support different extras, such as clues, lifelines, second chances or restore points.',
  },
  {
    title: 'Clearer reporting',
    text: 'Because extras are linked to the player, team and event, organisers can review what was purchased after the quiz.',
  },
];

const sponsorItems = [
  {
    title: 'Offer sponsors a clear benefit',
    text: 'Instead of asking a local business to donate with no obvious return, organisers can offer visible recognition during the quiz.',
  },
  {
    title: 'Use shoutouts during the event',
    text: 'Sponsor messages can be built into the quiz experience so supporters see who helped make the fundraiser possible.',
  },
  {
    title: 'Support prize sponsors',
    text: 'If a business donates a prize, the organiser can recognise that sponsor as part of the event instead of only mentioning them informally.',
  },
  {
    title: 'Make sponsorship easier to sell',
    text: 'A visible shoutout gives clubs, charities and non-profits something practical to offer when approaching local businesses.',
  },
  {
    title: 'Keep sponsor records connected',
    text: 'Sponsor details can sit alongside prizes, winners and event records so the organiser has a clearer follow-up trail.',
  },
  {
    title: 'Help build repeat support',
    text: 'When sponsors can see how they were recognised, it becomes easier for the organisation to thank them and approach them again.',
  },
];

const processSteps = [
  {
    title: 'Create the quiz event',
    text: 'Add the event details, fundraising goal, audience, date, format and basic quiz setup.',
  },
  {
    title: 'Choose teams or individuals',
    text: 'Decide whether the quiz will be played by individual players or by teams using one connected device per team.',
  },
  {
    title: 'Choose the entry workflow',
    text: 'Use a fixed fee, donate-what-you-want entry or another event-specific setup.',
  },
  {
    title: 'Configure rounds, timing and questions',
    text: 'Choose the quiz structure, round settings, timing and question flow so the host is not building everything manually.',
  },
  {
    title: 'Add fundraising extras',
    text: 'Choose optional paid extras that supporters can add while joining or paying for the quiz.',
  },
  {
    title: 'Add sponsor shoutouts',
    text: 'Recognise local businesses, prize donors or event sponsors with visible shoutouts during the quiz.',
  },
  {
    title: 'Add admins or helpers',
    text: 'Bring in trusted helpers to support player joining, team setup, payment checks and event setup on the night.',
  },
  {
    title: 'Share the ticket or join link',
    text: 'Invite supporters, players or teams to join before the quiz starts.',
  },
  {
    title: 'Open the room and run the quiz',
    text: 'Use host controls and the screen-share view to guide the night from first question to final leaderboard.',
  },
  {
    title: 'Review and report afterwards',
    text: 'Check players, teams, payments, extras, sponsors, winners, prizes and fundraising totals after the event.',
  },
];

const relatedLinks = [
  {
    label: 'Ticketing',
    to: '/features/ticketing',
    text: 'Sell or manage quiz entries and connect ticket activity to payment records.',
  },
  {
    label: 'Payments',
    to: '/features/payments',
    text: 'Track confirmed, claimed, manual, late and outstanding payments for fundraising events.',
  },
  {
    label: 'Reports',
    to: '/features/reports',
    text: 'Turn quiz participation, payment records and event outcomes into clearer after-event reports.',
  },
  {
    label: 'How to host a fundraising quiz',
    to: '/resources/guides/how-to-host-a-fundraising-quiz',
    text: 'A practical guide for planning, promoting and running a quiz fundraiser. Coming soon.',
  },
];

export default function QuizGamePage() {
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
        eyebrow="Digital fundraising quiz event format"
        title={h1}
        description="FundRaisely gives clubs, charities, schools and community groups a ready-to-run digital quiz fundraiser with team or individual play, device-based joining, ticketing, payment tracking, admin helpers, host controls, screen-share gameplay, fundraising extras, sponsor shoutouts and after-event reports built into one event flow."
        primaryCta={{ label: 'Book a demo', to: '/demo' }}
        secondaryCta={{ label: 'Watch quiz demo', to: '#quiz-demo' }}
        image={images.communityQuizNight}
        status="Self-hosted digital quiz event in a box"
        variant="standard"
      />

      <section className="section">
        <div className="site-shell problem-solution">
          <article>
            <p className="eyebrow">Problem</p>
            <h2>A digital quiz sounds easy until the organiser has to run it</h2>
            <p>
              Most clubs and charities know a quiz night can work. The hard part
              is everything around it: deciding whether people play as teams or
              individuals, collecting entries, checking payments, helping players
              join from devices, choosing rounds, keeping time, scoring answers,
              showing results, recognising sponsors, managing helpers and
              reporting back afterwards.
            </p>
            <p>
              That usually leaves one or two volunteers trying to run the whole
              night from spreadsheets, message threads, printed notes, payment
              screenshots, connected devices and a quiz deck.
            </p>
          </article>

          <article>
            <p className="eyebrow">Solution</p>
            <h2>FundRaisely turns the quiz into a guided digital fundraising event</h2>
            <p>
              FundRaisely brings the setup, team or individual play, device-based
              joining, payment tracking, admin support, gameplay controls,
              fundraising extras, sponsor shoutouts and reporting into one event
              workflow.
            </p>
            <p>
              The host does not need to be an experienced quizmaster. The system
              gives them the structure to move through questions, timing,
              scoring, reviews and leaderboards, while admins can help players
              or teams join and keep payment records up to date.
            </p>
          </article>
        </div>
      </section>

      <div id="quiz-demo">
        <VideoSection
          title={videoSlot.title}
          text={videoSlot.text}
          imageKey={videoSlot.imageKey}
          videoLabel={videoSlot.videoLabel}
          transcript={videoSlot.transcript}
          cta={{ label: 'Book a demo', to: '/demo' }}
        />
      </div>

      <FeatureGrid
        eyebrow="Flexible digital quiz workflows"
        title="Choose the setup that fits your fundraiser"
        text="Not every quiz fundraiser works the same way. Some organisations want tables playing as teams from one device, some want individual players on their own devices, some want sponsor recognition, and some want optional extras that help raise more before the game even starts."
        items={workflowItems}
      />

      <FeatureGrid
        eyebrow="Teams or individuals"
        title="Run the quiz by connected device, team or player"
        text="FundRaisely Quiz is digital, but it still works brilliantly for real-world rooms. A connected device can represent one individual player or one team, depending on how the organiser wants the fundraiser to run."
        items={deviceItems}
      />

      <ScreenshotShowcase
        eyebrow="Product screens"
        title="The quiz event flow from setup to game night"
        text="The quiz page should show the practical screens that make this more than a game: setup, team or individual joining, ticketing, player entry, payment tracking, host controls, screen-share gameplay and reports."
        slots={screenshotSlots}
      />

      <SplitSection
        eyebrow="Host controls"
        title="Give an inexperienced quiz host the structure to run a brilliant night"
        text="The host controls are one of the strongest parts of the quiz product. They help the organiser move through the event step by step, so they are not trying to remember the running order, manage the timer, check answers, calculate scores, track connected teams or players and keep the room entertained all at once."
        bullets={[
          'Move through rounds, questions and game phases in order',
          'Use built-in timing so the event keeps moving',
          'Run the quiz for teams or individuals',
          'Manage scoring and leaderboard moments more clearly',
          'Keep organiser controls separate from the public screen-share view',
          'Help a volunteer host feel prepared, even if they have never run a quiz before',
        ]}
        image={images.quizGameplayScreenshot}
        reverse={false}
      />

      <FeatureGrid
        eyebrow="Built for the host"
        title="Questions, timing, scoring and leaderboards are part of the flow"
        text="FundRaisely is designed to reduce the pressure on the person running the quiz. The host gets a clear workflow for moving the room through the event, while the system keeps the live structure organised."
        items={hostControlItems}
      />

      <SplitSection
        eyebrow="Admins and helpers"
        title="Let helpers support the night without giving everyone host control"
        text="A real fundraising quiz often needs more than one person helping. FundRaisely lets organisers add admins who can support the event on the night, especially with player joining, team setup, device support, payment checks and general setup support."
        bullets={[
          'Add trusted admins or helpers to the quiz event',
          'Let helpers assist players or teams who are joining on the night',
          'Support manual payment checks where needed',
          'Help teams get set up on one connected device',
          'Keep the main host focused on running the quiz',
          'Reduce pressure on the organiser during busy check-in moments',
        ]}
        image={images.paymentTrackingScreenshot}
        reverse
      />

      <FeatureGrid
        eyebrow="Event in a box"
        title="Everything a digital quiz night needs, built around fundraising"
        text="FundRaisely is not just the quiz questions. It gives organisers the practical event pieces around the game, so a small team can run a more polished fundraiser with less guesswork."
        items={eventBoxItems}
      />

      <SplitSection
        eyebrow="Screen-share view"
        title="A clean display for the room, with organiser controls kept separate"
        text="For in-person and hybrid events, the screen-share view gives the room a clear display while the organiser keeps the working controls private. Teams or individuals can play from their devices while the public display keeps everyone focused on the quiz."
        bullets={[
          'Useful for club rooms, school halls, pubs and community spaces',
          'Works for teams playing from one device or individuals on their own devices',
          'Keeps the public display cleaner than the organiser dashboard',
          'Makes the event easier for players and spectators to follow',
          'Supports a more polished night without needing a professional quiz host',
        ]}
        image={images.communityQuizNight}
        reverse={false}
      />

      <FeatureGrid
        eyebrow="Fundraising extras"
        title="Extras designed to boost fundraising before the game starts"
        text="Fundraising extras are one of the biggest advantages of the FundRaisely quiz format. They are not random in-game purchases. They are configured by the organiser and selected while supporters are joining or paying, so the fundraiser can raise more while keeping the payment flow clearer."
        items={extrasItems}
      />

      <SplitSection
        eyebrow="More than a ticket price"
        title="Make the quiz more profitable without making it feel like another donation ask"
        text="A normal quiz night usually depends on the ticket price, a raffle or people putting cash in a bucket. FundRaisely extras create extra fundraising moments that are connected to the game itself and can be planned around team or individual play."
        bullets={[
          'Offer clues, hints or extra time where enabled',
          'Use lifelines or second chances for suitable quiz formats',
          'Support restore points or other format-specific boosts',
          'Let supporters add extras while paying or joining',
          'Use extras for individuals or teams, depending on the setup',
          'Keep extras connected to the event record for easier follow-up',
        ]}
        image={images.prizeTable}
        reverse
      />

      <FeatureGrid
        eyebrow="Sponsor shoutouts"
        title="Help non-profits give local sponsors a reason to say yes"
        text="Many quiz fundraisers rely on local businesses for prizes, donations or support. FundRaisely can make that sponsorship more valuable by giving sponsors visible shoutouts during the quiz, so the organisation has something clear to offer in return."
        items={sponsorItems}
      />

      <SplitSection
        eyebrow="Sponsor value"
        title="Turn sponsor support into part of the quiz experience"
        text="Sponsor recognition is often promised informally, but it can be hard for organisers to deliver it clearly on the night. Sponsor shoutouts give clubs, charities and non-profits a more practical way to thank local businesses and show supporters who backed the fundraiser."
        bullets={[
          'Recognise local businesses during the quiz',
          'Highlight prize donors and event sponsors',
          'Give sponsors a visible benefit beyond a logo on a poster',
          'Make sponsorship easier to explain when approaching businesses',
          'Keep sponsor details connected to the event record for follow-up',
        ]}
        image={images.prizeTable}
        reverse={false}
      />

      <ProcessSteps
        eyebrow="How it works"
        title="From idea to quiz night in one event flow"
        text="The page should make it clear that FundRaisely supports the whole digital quiz fundraiser, not just the live gameplay."
        steps={processSteps}
      />

      <SplitSection
        eyebrow="After-event records"
        title="End the night with clearer records, not another spreadsheet mess"
        text="After the quiz, organisers can review what happened: who joined, whether they played as individuals or teams, what was collected, what is still outstanding, which extras were purchased, which sponsors were recognised, which prizes were awarded and what can be reported back to the committee, charity, club or campaign team."
        bullets={[
          'Review participation by player, team or connected device',
          'Review payment status and outstanding amounts',
          'See fundraising extras connected to the event',
          'Record sponsor shoutouts, winners and prize details',
          'Connect quiz activity to reports and reconciliation',
          'Keep a clearer record for committees and treasurers',
        ]}
        image={images.reportOverviewScreenshot}
        reverse={false}
      />

      <FAQSection
        items={faqs}
        intro="These questions help visitors understand that FundRaisely Quiz is a self-hosted digital fundraising event workflow, not just a generic quiz game."
      />

      <RelatedLinks links={relatedLinks} />

      <CTASection
        title="Want to run a better digital fundraising quiz night?"
        text="Book a demo to see how FundRaisely helps clubs, charities, schools and community groups set up, host, fundraise, recognise sponsors and report on a digital quiz fundraiser for teams or individuals from one event workflow."
        primaryCta={{ label: 'Book a demo', to: '/demo' }}
        secondaryCta={{
          label: 'Read the quiz hosting guide',
          to: '/resources/guides/how-to-host-a-fundraising-quiz',
        }}
      />
    </>
  );
}
