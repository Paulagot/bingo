import { Link } from 'react-router-dom';

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

const path = '/use-cases/community-groups';

const seoTitle =
  'Fundraising Software for Community Groups and Local Projects | FundRaisely';

const seoDescription =
  'FundRaisely helps community groups, residents associations, arts groups, local networks and cause partners raise money through quizzes, games, ticketed events, puzzle challenges, sponsored activities, digital campaigns, payment tracking and after-event reports.';

const h1 = 'Fundraising tools for community groups, local projects and causes';

const breadcrumbs = breadcrumbsForPath(path, h1);

const caseStudyUrl = '/events/bonk-bfp-pub-quiz';

const faqs = [
  {
    question: 'How can community groups use FundRaisely?',
    answer:
      'Community groups can use FundRaisely to raise money for their own needs, local projects, shared spaces, supplies, events or external causes. The platform supports quizzes, elimination games, puzzle challenges, ticketed events, sponsored activities and digital campaigns with payment tracking and after-event reporting.',
  },
  {
    question: 'Can a community group raise money for itself?',
    answer:
      'Yes. A residents association, arts group, local society or community group can raise money for its own projects, such as flowers for a communal area, clean-up supplies, art materials, venue hire, workshops, equipment, events or local improvements.',
  },
  {
    question: 'Can a community raise money for a separate cause?',
    answer:
      'Yes. A community can organise an event or campaign where the funds go to a separate cause, charity or charitable partner. This works well when a community has members, supporters or an audience who want to gather around a cause.',
  },
  {
    question: 'What is an example of this working in practice?',
    answer:
      'FundRaisely was used for a Buddies for Paws quiz with Superteam Ireland, where the community gathered people for a donate-what-you-want quiz event. €147 was raised directly, the amount was matched, and €290 was raised for the cause overall.',
  },
  {
    question: 'Can the event use donate what you want?',
    answer:
      'Yes. Community fundraisers can use a donate-what-you-want entry model where supporters choose their own contribution to take part, instead of being forced into a fixed ticket price.',
  },
  {
    question: 'Can community fundraisers be run in person?',
    answer:
      'Yes. FundRaisely can support in-person, hybrid and online events. A community quiz, local fundraiser, residents event or arts group fundraiser can be run in a pub, community space, club venue, school hall, local hall or online setting.',
  },
  {
    question: 'Can sponsors or partners be shown?',
    answer:
      'Yes. FundRaisely can support partner and sponsor recognition, which is useful when a local business, cause partner, community partner or prize donor is involved in the fundraiser.',
  },
  {
    question: 'Does FundRaisely only support quizzes?',
    answer:
      'No. Quizzes are one event format, but community groups can also use elimination games, puzzle challenges, sponsored activities, ticketed events and campaign-style fundraisers.',
  },
  {
    question: 'Can FundRaisely track payments after the event?',
    answer:
      'Yes. FundRaisely helps organisers review payments, participation, ticketing, donations, prizes, sponsors and outstanding follow-up after the fundraiser.',
  },
  {
    question: 'Can community groups use FundRaisely for recurring fundraisers?',
    answer:
      'Yes. Community groups can repeat successful formats or use recurring activities such as puzzle challenges to keep supporters engaged over several weeks.',
  },
  {
    question: 'Does FundRaisely hold the money raised?',
    answer:
      'No. FundRaisely is designed so the organisation, cause or event organiser can use their own payment routes. The platform helps organise and track the fundraising activity rather than holding the money raised.',
  },
];

const structuredData = compactStructuredData([
  webPageJsonLd(path, h1, seoDescription),
  faqJsonLd(faqs),
]);

const communityOwnNeedsItems = [
  {
    title: 'Residents associations',
    text: 'Raise money for flowers, planting, benches, clean-up days, communal areas, seasonal displays, local improvements or neighbourhood events.',
  },
  {
    title: 'Arts and creative groups',
    text: 'Fund supplies, materials, workshops, exhibitions, venue hire, equipment, printing, performances or community art projects.',
  },
  {
    title: 'Local clubs and societies',
    text: 'Support small group costs such as room hire, equipment, trips, guest speakers, activities, insurance or member events.',
  },
  {
    title: 'Neighbourhood projects',
    text: 'Bring people together around a specific local improvement, shared green, community space, clean-up project or local goal.',
  },
  {
    title: 'Community events',
    text: 'Run ticketed events, quizzes, social nights, family activities or seasonal fundraisers to support the group’s own costs.',
  },
  {
    title: 'Cause support',
    text: 'Use the same fundraising tools to support an external cause, charity, campaign or community partner when the group wants to help others.',
  },
];

const communityFundraiserItems = [
  {
    title: 'Community quiz nights',
    text: 'Run a quiz for residents, members, families, neighbours, supporters or a wider local audience, with joining, payments and reports connected to the event.',
  },
  {
    title: 'Donate-what-you-want events',
    text: 'Let supporters choose their own contribution to take part, which can feel more open and inclusive for community-led fundraisers.',
  },
  {
    title: 'Quick elimination games',
    text: 'Run a fast, low-setup game that works well for meetups, local groups, online communities, social groups and informal fundraising moments.',
  },
  {
    title: 'Puzzle challenges',
    text: 'Create a recurring skill-based fundraiser where supporters take part across a number of weeks, giving the community a reason to stay engaged.',
  },
  {
    title: 'Ticketed community events',
    text: 'Use FundRaisely for dinners, meetups, workshops, social nights, sports events, family days, pub nights or other local events.',
  },
  {
    title: 'Digital campaign packs',
    text: 'Give members, volunteers or supporters a link they can share so the community can raise money together around one project, group or cause.',
  },
];

const partnershipItems = [
  {
    title: 'The group gets a fundraiser',
    text: 'A local group, residents association or arts group can raise money for its own project without having to build the whole process manually.',
  },
  {
    title: 'The cause gets support',
    text: 'A charity, campaign or cause can benefit from funds raised by a community that wants to help.',
  },
  {
    title: 'The community gets an activity',
    text: 'People have something fun and social to take part in, rather than simply being asked to donate.',
  },
  {
    title: 'Partners get visibility',
    text: 'Sponsors, partners and community supporters can be recognised as part of the event experience.',
  },
  {
    title: 'Supporters feel involved',
    text: 'People are not just giving money. They are joining, playing, competing, sharing and helping create the result.',
  },
  {
    title: 'The format can be repeated',
    text: 'Once a community event works, it can become a repeatable fundraiser for future projects, causes, campaigns or partners.',
  },
];

const whyItWorksItems = [
  {
    title: 'Participation beats passive donation',
    text: 'A quiz, game, challenge or ticketed event gives people a reason to show up, interact and contribute, instead of only seeing another payment link.',
  },
  {
    title: 'Local groups already have trust',
    text: 'Residents associations, arts groups, societies and shared-interest communities often have the trust needed to bring people together.',
  },
  {
    title: 'Small projects still need structure',
    text: 'Even a practical local fundraiser needs records, payment tracking, reminders and a clear way to show what was raised.',
  },
  {
    title: 'Events create energy',
    text: 'A live fundraiser gives people a shared moment, which makes the campaign easier to talk about and easier to remember.',
  },
  {
    title: 'Skill-based formats feel different',
    text: 'Quizzes, puzzles and games of skill can make fundraising feel fun, social and inclusive.',
  },
  {
    title: 'Reports help close the loop',
    text: 'After the event, organisers can show what happened, what was raised, who took part and how the money will be used.',
  },
];

const caseStudyProofItems = [
  {
    title: 'It was not just a donation link',
    text: 'Supporters joined a live event, played the quiz and contributed through a donate-what-you-want model.',
  },
  {
    title: 'The community created the audience',
    text: 'Superteam Ireland helped gather people around the cause, showing how a community can support a separate charitable partner.',
  },
  {
    title: 'The cause received a clearer result',
    text: 'Buddies for Paws benefited from the fundraiser and the matched amount, giving the event a simple impact story.',
  },
  {
    title: 'The extras made it more engaging',
    text: 'Players noticed that the extras made the quiz feel different from an ordinary quiz, which is important for repeatability.',
  },
  {
    title: 'It can work in real venues',
    text: 'The feedback that this could run in pubs across Dublin shows how the format can fit community venues and social spaces.',
  },
  {
    title: 'The format can be repeated',
    text: 'The same structure could be used by residents associations, arts groups, local campaigns, clubs or community partners.',
  },
];

const paymentReportingItems = [
  {
    title: 'Donation and ticket tracking',
    text: 'Track who joined, who donated, who bought a ticket, who claimed payment and what still needs follow-up.',
  },
  {
    title: 'Donate-what-you-want support',
    text: 'Use flexible contribution models where supporters choose their own amount to take part.',
  },
  {
    title: 'Partner and sponsor records',
    text: 'Keep sponsor, partner, prize and supporter details connected to the event.',
  },
  {
    title: 'After-event summaries',
    text: 'Review participation, income, prizes, sponsors, winners and outcomes after the fundraiser.',
  },
  {
    title: 'Local project reporting',
    text: 'Give members, residents or supporters a clearer record of what was raised and how the money will be used.',
  },
  {
    title: 'Repeat campaign records',
    text: 'Use previous results to improve the next community fundraiser or repeat the format with another project or cause.',
  },
];

const processSteps = [
  {
    title: 'Choose the fundraising goal',
    text: 'Decide whether the group is raising money for its own project, a local improvement, supplies, an event, a shared goal or an external cause.',
  },
  {
    title: 'Gather the community',
    text: 'Bring in residents, members, neighbours, supporters, volunteers, partners or an online community who can help make the fundraiser work.',
  },
  {
    title: 'Pick the activity',
    text: 'Choose a quiz, elimination game, puzzle challenge, ticketed event, sponsored activity or campaign pack.',
  },
  {
    title: 'Choose the contribution model',
    text: 'Use donate-what-you-want, fixed ticket price, sponsored contribution, paid entry or another setup that fits the event.',
  },
  {
    title: 'Add partners, sponsors or prizes',
    text: 'Recognise the people and organisations helping the fundraiser, including community partners, sponsors, prize donors and local supporters.',
  },
  {
    title: 'Share the event link',
    text: 'Give the community one place to join, donate, buy a ticket or share the fundraiser.',
  },
  {
    title: 'Run the event',
    text: 'Host the quiz, game, challenge or ticketed activity and let supporters take part in the fundraising moment.',
  },
  {
    title: 'Report the impact',
    text: 'Review what was raised, who participated, what was matched or sponsored and what can be shared back with the group, cause or community.',
  },
];

const screenshotSlots = [
  {
    title: 'Community campaign page',
    description:
      'Give the fundraiser a public page where supporters can understand the project, cause, activity, partners and how to take part.',
    imageKey: 'eventSetupOverviewPhotoshot' as const,
    variant: 'standard' as const,
  },
  {
    title: 'Payment and participant tracking',
    description:
      'Track donations, tickets, participants, payment status and follow-up so the organiser is not relying on scattered messages.',
    imageKey: 'paymentTrackingScreenshot' as const,
    variant: 'standard' as const,
  },
  {
    title: 'After-event reporting',
    description:
      'Review participation, funds raised, sponsors, prizes, winners and impact after the fundraiser.',
    imageKey: 'reportOverviewScreenshot' as const,
    variant: 'standard' as const,
  },
];

const relatedLinks = [
  {
    label: 'Buddies for Paws quiz campaign',
    to: caseStudyUrl,
    text: 'See the campaign page for the community quiz fundraiser.',
  },
  {
    label: 'Quiz fundraisers',
    to: '/event-formats/quiz',
    text: 'Run a live quiz fundraiser for a community project, local group, cause or campaign.',
  },
  {
    label: 'Elimination games',
    to: '/event-formats/elimination',
    text: 'Use a quick game format for low-setup community fundraising moments.',
  },
  {
    label: 'Ticketed events',
    to: '/event-formats/ticketed-events',
    text: 'Create ticketed community events such as meetups, dinners, social nights and local fundraisers.',
  },
  {
    label: 'Reports',
    to: '/features/reports',
    text: 'Turn participation, payments and outcomes into clearer after-event records.',
  },
];

export default function CommunityGroupsPage() {
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
        eyebrow="Community fundraising"
        title={h1}
        description="FundRaisely helps residents associations, arts groups, local networks, community groups and cause partners raise money for their own projects or for causes they care about, using ready-to-run quizzes, games, ticketed events, puzzle challenges, sponsored activities and digital campaigns."
        primaryCta={{ label: 'Book a demo', to: '/contact' }}
        secondaryCta={{ label: 'See the case study event', to: caseStudyUrl }}
        image={images.communityHero}
        status="Built for local projects, shared goals, community events and cause partnerships"
        variant="standard"
      />

      <section className="section">
        <div className="site-shell problem-solution">
          <article>
            <p className="eyebrow">Problem</p>
            <h2>
              Community groups often need practical funding, but the admin still
              gets messy
            </h2>
            <p>
              A residents association might need to raise money for flowers,
              planting, benches, clean-up supplies or improvements to a shared
              area. An arts group might need materials, venue hire, equipment,
              workshops or exhibition costs. A local society might need to cover
              room hire, events, trips or member activities.
            </p>
            <p>
              These fundraisers can be small, local and practical, but they
              still create admin: collecting money, tracking who paid, sharing
              links, reminding people, recognising helpers and explaining what
              was raised afterwards.
            </p>
          </article>

          <article>
            <p className="eyebrow">Solution</p>
            <h2>
              FundRaisely gives community groups a simple way to fundraise for
              themselves or for a cause
            </h2>
            <p>
              FundRaisely gives community groups ready-to-run activities they
              can use to raise money for their own projects, local improvements,
              supplies, events or shared goals.
            </p>
            <p>
              It can also support cause partnerships, where a community gathers
              its people around a charity or campaign. Either way, the event,
              supporter flow, payment tracking and after-event records stay
              connected.
            </p>
          </article>
        </div>
      </section>

      <FeatureGrid
        eyebrow="Fundraise for local needs"
        title="Raise money for your own group, your local area or a cause you care about"
        text="Community fundraising is not always about a formal charity. Sometimes it is about buying flowers for a shared green, funding art supplies, covering room hire, organising a local event or helping a cause the group cares about."
        items={communityOwnNeedsItems}
      />

      <section className="section">
        <div className="site-shell">
          <div className="case-study-feature">
            <div className="case-study-feature__content">
              <p className="eyebrow">Featured case study</p>

              <h2>How a community quiz raised funds for Buddies for Paws</h2>

              <p>
                FundRaisely supported a live community quiz where Superteam
                Ireland helped gather people around Buddies for Paws, the
                charitable arm of the BONK ecosystem.
              </p>

              <p>
                The event used a donate-what-you-want entry model, so supporters
                could choose their own contribution to take part. It was not
                just a donation page — it was a live quiz night with
                participation, gameplay, fundraising extras and a shared result
                at the end.
              </p>

              <div className="case-study-feature__stats">
                <article>
                  <strong>€147</strong>
                  <span>raised directly</span>
                </article>

                <article>
                  <strong>€290</strong>
                  <span>raised after match funding</span>
                </article>

                <article>
                  <strong>24</strong>
                  <span>participants took part</span>
                </article>
              </div>

              <ul className="case-study-feature__bullets">
                <li>Cause: Buddies for Paws</li>
                <li>Community partner: Superteam Ireland</li>
                <li>Format: live digital pub quiz</li>
                <li>Entry model: donate what you want</li>
                <li>Campaign page: /events/bonk-bfp-pub-quiz</li>
              </ul>

              <div className="case-study-feature__actions">
                <Link to={caseStudyUrl} className="button button--primary">
                  View the campaign page
                </Link>

                <Link
                  to="/event-formats/quiz"
                  className="button button--secondary"
                >
                  Explore quiz fundraisers
                </Link>
              </div>
            </div>

       <div className="case-study-feature__side">
  <div className="case-study-feature__media">
    <img
      src="/bonk-bfp-pub-quiz-banner.png"
      alt="Buddies for Paws charity pub quiz campaign banner"
    />

    <div className="case-study-feature__caption">
      <strong>Buddies for Paws × Superteam Ireland</strong>
      <span>Community quiz powered by FundRaisely</span>
    </div>
  </div>

  <div className="case-study-at-a-glance">
    <p className="eyebrow">At a glance</p>

    <dl>
      <div>
        <dt>Format</dt>
        <dd>Live digital pub quiz</dd>
      </div>

      <div>
        <dt>Entry model</dt>
        <dd>Donate what you want</dd>
      </div>

      <div>
        <dt>Cause</dt>
        <dd>Buddies for Paws</dd>
      </div>

      <div>
        <dt>Community partner</dt>
        <dd>Superteam Ireland</dd>
      </div>
    </dl>
  </div>
</div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="site-shell">
          <div className="case-study-quotes">
            <div className="case-study-quotes__intro">
              <p className="eyebrow">Player feedback</p>
              <h2>The quiz felt different from a normal fundraiser</h2>
              <p>
                The strongest feedback was not just that people donated. It was
                that they enjoyed taking part. The live quiz format and
                fundraising extras made the event feel more memorable than a
                standard donation ask.
              </p>
            </div>

            <div className="case-study-quotes__grid">
              <article>
                <blockquote>
                  “I can see this type of quiz being run in every pub in
                  Dublin.”
                </blockquote>
              </article>

              <article>
                <blockquote>
                  “The extras were cool. It wasn’t like an ordinary quiz at all,
                  so much more fun.”
                </blockquote>
              </article>
            </div>
          </div>
        </div>
      </section>

      <FeatureGrid
        eyebrow="What the case study proves"
        title="A community fundraiser works best when people have something to take part in"
        text="The Buddies for Paws quiz shows how FundRaisely can turn community goodwill into a structured fundraising event: a cause, a community partner, a public campaign page, flexible donations, live participation, optional extras, match funding and a clear result afterwards."
        items={caseStudyProofItems}
      />

      <FeatureGrid
        eyebrow="Ready-to-run activities"
        title="Give your community something to join, share or support"
        text="Whether the group is raising for its own project or supporting another cause, FundRaisely gives people an activity they can join, attend, play, share or contribute to."
        items={communityFundraiserItems}
      />

      <SplitSection
        eyebrow="Cause partnerships"
        title="A cause does not have to fundraise alone"
        text="One of the strongest uses for FundRaisely is a cause and community partnership. A charity, campaign or cause can benefit from the trust, reach and energy of a community that wants to help, while the community gets a clear event format to rally around."
        bullets={[
          'A community can organise an event for a separate cause',
          'The cause benefits from new supporters and wider reach',
          'The community gets a shared activity instead of a passive ask',
          'Partners and sponsors can be recognised during the fundraiser',
          'The event can be repeated for future campaigns',
          'After-event results can be shared back with everyone involved',
        ]}
        image={images.ticketingHeroScreenshot}
        reverse
      />

      <FeatureGrid
        eyebrow="How it works"
        title="Bring together the group, the community and the activity"
        text="FundRaisely helps structure the relationship between the people organising, the people taking part, the project being funded and any cause or partner receiving support."
        items={partnershipItems}
      />

      <SplitSection
        eyebrow="Donate what you want"
        title="Let supporters choose their contribution while still joining the event"
        text="The Buddies for Paws quiz used a donate-what-you-want model. That works especially well for community groups because it lowers the barrier to taking part while still encouraging people to give what they can."
        bullets={[
          'Supporters can choose their own contribution',
          'The event still has a clear participation flow',
          'Useful when the audience includes different budgets',
          'Works well for cause-led community events',
          'Can sit alongside sponsorship, matching or partner support',
          'Keeps the fundraiser more inclusive than a fixed-price-only model',
        ]}
        image={images.paymentTrackingScreenshot}
        reverse={false}
      />

      <FeatureGrid
        eyebrow="Why it works"
        title="Community fundraising is stronger when people can participate"
        text="A live activity gives supporters a reason to gather, talk about the project or cause and feel part of the result. That is much more memorable than a standalone donation ask."
        items={whyItWorksItems}
      />

      <ScreenshotShowcase
        eyebrow="Product screens"
        title="From campaign page to payment tracking to after-event records"
        text="Community groups need a public event page, a clear way for supporters to join or donate, and a record of what happened after the fundraiser."
        slots={screenshotSlots}
      />

      <FeatureGrid
        eyebrow="Payments and reporting"
        title="Keep the community fundraiser organised from start to finish"
        text="Community fundraising can involve donations, tickets, sponsors, prizes, match funding, manual payments and late follow-up. FundRaisely helps organisers keep those details connected to the event."
        items={paymentReportingItems}
      />

      <SplitSection
        eyebrow="More than the night itself"
        title="Give the community a result they can share afterwards"
        text="The end of a fundraiser should not be a vague message saying it went well. FundRaisely helps organisers review the amount raised, participation, payment status, sponsors, prizes and impact so the community can see what they achieved together."
        bullets={[
          'Show how many people took part',
          'Record the amount raised and any matched funding',
          'Track payment status and follow-up items',
          'Recognise partners, sponsors and prize donors',
          'Share the outcome with the group, cause or community',
          'Use the result to build momentum for the next fundraiser',
        ]}
        image={images.reportOverviewScreenshot}
        reverse
      />

      <ProcessSteps
        eyebrow="How it works"
        title="From community idea to clear fundraising result"
        text="FundRaisely gives community groups a practical way to move from a local need, shared project or good cause to a real fundraising event with a clear result."
        steps={processSteps}
      />

      <SplitSection
        eyebrow="Community-led fundraising"
        title="FundRaisely helps communities become organisers, not just donors"
        text="A community can be more than an audience. It can be the group that gathers people, hosts the event, brings in sponsors, creates momentum and helps a local project or cause reach supporters it might not reach alone."
        bullets={[
          'Useful for residents associations, arts groups, local communities, online communities and shared-interest groups',
          'Works for self-funded projects, local improvements and cause partnerships',
          'Supports quizzes, games, ticketed events and recurring challenges',
          'Makes fundraising feel social and participatory',
          'Keeps payment and event records clearer',
          'Helps turn one successful event into a repeatable format',
        ]}
        image={images.dashboardOverviewScreenshot}
        reverse={false}
      />

      <FAQSection
        items={faqs}
        intro="These questions help community groups understand how FundRaisely can support local projects, community-led events, cause partnerships, donate-what-you-want fundraisers, payment tracking and after-event reporting."
      />

      <RelatedLinks links={relatedLinks} />

      <CTASection
        title="Want to raise money for your group, your area or a cause?"
        text="Book a demo to see how FundRaisely can help your community run a quiz, game, challenge, ticketed event or digital campaign with payment tracking, partner recognition and after-event reports built in."
        primaryCta={{ label: 'Book a demo', to: '/contact' }}
        secondaryCta={{ label: 'See the Buddies for Paws event', to: caseStudyUrl }}
      />
    </>
  );
}