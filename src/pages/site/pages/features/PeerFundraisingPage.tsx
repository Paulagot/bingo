// src/pages/site/pages/features/PeerFundraisingPage.tsx
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

const path = '/features/peer-fundraising';

const seoTitle =
  'Peer Fundraising for Clubs, Charities, Schools and Community Groups | FundRaisely';

const seoDescription =
  'FundRaisely peer fundraising lets organisations sell activity packs door to door through members and players, and run sponsored events where participants collect sponsorship from their own networks. Personal pages, targets, videos, payment tracking and reports included.';

const h1 = 'Fundraising that travels further because your people carry it';

const breadcrumbs = breadcrumbsForPath(path, h1);

const faqs = [
  {
    question: 'What is peer fundraising in FundRaisely?',
    answer:
      'Peer fundraising in FundRaisely covers two things: selling activity packs where members, players or families act as sellers for the organisation, and sponsored events where individual participants collect personal sponsorship from their own networks. Both models let the fundraising reach beyond the organisation into the wider community through the people who are already connected to it.',
  },
  {
    question: 'What is an activity pack?',
    answer:
      'An activity pack is a bundle of digital event entries that can be sold by a participant, parent or member to their own contacts. A pack might include a quiz entry, an elimination game entry, a Puzzle Drop access code and a ticketed event ticket- all bundled together and sold through a personal link or QR code. The organisation sets up the pack and the price; the seller shares their link and the organisation gets the income.',
  },
  {
    question: 'Who can sell activity packs?',
    answer:
      'Both models are possible. The organisation can sell packs centrally, or individual members, players and families can each be given their own seller link to sell to their personal networks. The second model- where each person has their own link- is the door-to-door or player card equivalent, and typically reaches further because the ask comes from someone the buyer knows personally.',
  },
  {
    question: 'What can be bundled into an activity pack?',
    answer:
      'Packs can include entries to any FundRaisely digital activity- quiz nights, elimination games, Puzzle Drops, and ticketed event tickets. Organisations can mix and match activities into packs that suit their supporter base.',
  },
  {
    question: 'How does a sponsored event work?',
    answer:
      'For sponsored events, each participant gets their own personal fundraising page. They set a personal target, add their story and optionally a video, then share their unique link with their network. Supporters visit the page and pledge a sponsorship amount. The organiser can track all participants, all sponsorships and all payment status from one dashboard.',
  },
  {
    question: 'Can participants set their own targets?',
    answer:
      'No, not directly, but you can set a personal fundraising target for them which is shown on their individual page. The event also has an overall target set by the organiser. Both are visible, giving participants something personal to work toward while also showing how everyone is contributing to the collective goal.',
  },
  {
    question: 'Can participants add videos to their pages?',
    answer:
      'Yes. The organiser can add a video at event level and add one made by the participant to their page. A short personal video from a participant explaining why they are taking on the challenge is one of the most effective things they can do to increase how much their sponsors give.',
  },
  {
    question: 'How are payments tracked across a peer fundraiser?',
    answer:
      'For activity pack sales, payments are tracked through the standard FundRaisely payment methods.'
  },
  {
    question: 'Is there a report at the end?',
    answer:
      'Yes. Both peer fundraising formats generate reports showing participant numbers, individual totals, payment status, outstanding amounts and overall totals. These are available in the organiser dashboard and suitable for committee or board review.',
  },
   {
    question: 'Can someone just donate without buying or sponsoring?',
    answer:
      'Yes, you can enable a donation option alongside the peer fundraising model. That lets someone who is not connected to a participant or seller still contribute to the cause.',
  },
  
  {
    question: 'How is this different from a direct donation?',
    answer:
      'Peer fundraising travels through personal relationships- the ask comes from someone the supporter knows, which consistently generates more than an impersonal donation link. The sponsored event format makes that personal connection explicit. The activity pack model gives each seller a real product to sell rather than asking for a donation.',
  },
];

const structuredData = compactStructuredData([
  webPageJsonLd(path, h1, seoDescription),
  faqJsonLd(faqs),
]);

const twoModelsItems = [
  {
    title: 'Activity pack selling',
    text: 'Members, players and families each get a personal seller link. They sell bundles of digital event entries- quiz, elimination, puzzle, or any type of ticketed event - to their own contacts, door to door or online.',
  },
  {
    title: 'Sponsored activities',
    text: 'Each participant gets a personal fundraising page for a sponsored walk, run, cycle or challenge. You set a target, add the story, and they collect sponsorship from their own network.',
  },
  {
    title: 'Personal links for every participant',
    text: 'Whether selling packs or collecting sponsorship, each person has their own unique link. The organisation sets it up once; the participants do the reaching out.',
  },
  {
    title: 'Personal targets alongside the overall goal',
    text: 'In sponsored events, personal targets are set in addition to the event target. Individual goals create personal motivation.',
  },
  {
    title: 'Add a video at event or participant level',
    text: 'The organiser can add a video explaining the cause. Each participant can add their own story. Personal videos consistently increase how much sponsors give.',
  },
  {
    title: 'Full payment tracking and reporting',
    text: 'All sales, sponsorships, confirmed payments and outstanding amounts across every participant are visible in the organiser dashboard and included in the final report.',
  },
];

const activityPackItems = [
  {
    title: 'Bundle multiple activities into one pack',
    text: 'Combine a quiz entry, an elimination game, a Puzzle Drop and a ticketed event ticket into a single pack. The organisation controls what goes in and what the pack costs.',
  },
  {
    title: 'Each seller gets their own link',
    text: 'When the individual selling model is used, each member, player or parent gets a unique link. Sales from that link are tracked back to them.',
  },
  {
    title: 'Organisation-wide selling also possible',
    text: 'If a central selling model suits better, the organisation can sell packs through a shared link rather than individual ones. Both approaches are supported.',
  },
  {
    title: 'QR code for door-to-door selling',
    text: 'A QR code can be generated for the pack link. Sellers show it on their phone at the door or at an event. The buyer pays on their own phone immediately.',
  },
  {
    title: 'The digital equivalent of a player card',
    text: 'Traditional player card selling is familiar to clubs- each player sells to their own network. This is the same model, but the product is digital, the payment is instant and the records are automatic.',
  },
  {
    title: 'Sales tracked automatically',
    text: 'Every pack sale is recorded. The organiser can see total packs sold, income by seller link, payment status and how many entries have been used.',
  },
];

const sponsoredEventItems = [
  {
    title: 'Personal fundraising pages',
    text: 'Every participant gets their own page with a unique URL. The page shows their story, target and progress.',
  },
  {
    title: 'Story and video per participant',
    text: 'Participants can include their own description and add a video. A personal video explaining why someone is doing the walk or cycle reliably increases how much their sponsors give.',
  },
  {
    title: 'Personal target visible on the page',
    text: 'Each participant cant be set a target. A live progress bar shows how close they are. Supporters can see this when they visit the page.',
  },

  {
    title: 'Easy sharing for participants',
    text: 'Participants share their page link via WhatsApp, email, Instagram or wherever their network lives. The link takes supporters directly to the personal page.',
  },
  {
    title: 'Organiser video at event level',
    text: 'The event organiser can add a video to the main event page explaining the cause, the activity and where the money will go.',
  },
];

const processSteps = [
  {
    title: 'Create the peer fundraiser',
    text: 'Choose whether to set up an activity pack fundraiser or a sponsored event. Configure the details, payment methods and overall target.',
  },
  {
    title: 'Add the activities or event details',
    text: 'For packs, select which activities to include and set the pack price. For sponsored events, write the event description, add the organiser video and open participant registration.',
  },
  {
    title: 'Invite participants or sellers',
    text: 'Share the fundraiser with the people who will be doing the selling or participating. Each person gets their own personal link.',
  },
  {
    title: 'Participants set up their pages',
    text: 'For sponsored events, participants add their story, personal target and optionally a video to their individual pages.',
  },
  {
    title: 'Participants share and sell',
    text: 'Whether selling packs or sharing a sponsored page, participants reach out to their own contacts via WhatsApp, email, social media or in person.',
  },
  {
    title: 'sponsorships and sales come in',
    text: 'Pack sales and sponsorship pledges are recorded automatically. The organiser can see progress in real time.',
  },
  {
    title: 'Payments are confirmed',
    text: 'As payments arrive, the organiser confirms cash or instant payments through the dashboard and the records are updated. Stripe and crypto payments are confirmed automatically.',
  },
  {
    title: 'Review the final report',
    text: 'Access the full report after the fundraiser- participant numbers, individual totals, payment breakdown and overall income for the committee.',
  },
];

const relatedLinks = [
  {
    label: 'Sponsored events',
    to: '/event-formats/sponsored-events',
    text: 'See how sponsored walks, runs and challenges work in FundRaisely.',
  },
    {
    label: 'Elimination game',
    to: '/event-formats/elimination',
    text: 'A digital last man standing game, fun and engaging.',
  },
  {
    label: 'Puzzle Drop',
    to: '/event-formats/puzzle-drop',
    text: 'A one-off puzzle that can be included in an activity pack.',
  },
    {
    label: 'Ticketed events',
    to: '/event-formats/ticketed-events',
    text: 'Sporting events, Dinners, or any non digital event that requires tickets.',
  },
  {
    label: 'Donations widget',
    to: '/features/donations-widget',
    text: 'Add a donation button to any website or campaign page.',
  },
  {
    label: 'Contact',
    to: '/contact',
    text: 'Talk to us about setting up peer fundraising for your organisation.',
  },
];

export default function PeerFundraisingPage() {
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
        eyebrow="Peer fundraising"
        title={h1}
        description="FundRaisely peer fundraising turns your members, players, parents and participants into the distribution network for your fundraiser. Sell activity packs door to door through individual seller links, or run sponsored events where each participant collects personal sponsorship with their own page, target and story. The organisation sets it up. The people who already care about your cause do the reaching out."
        primaryCta={{ label: 'Book a demo', to: '/contact' }}
        secondaryCta={{ label: 'Explore features', to: '/features' }}
        image={images.communityHero}
        status="Activity pack selling and sponsored events"
        variant="standard"
      />

      <section className="section">
        <div className="site-shell problem-solution">
          <article>
            <p className="eyebrow">Problem</p>
            <h2>The people most likely to give to your cause are not always the ones you can reach directly</h2>
            <p>
              A club or charity might have two hundred supporters, but those two hundred people collectively know tens of thousands. That wider network is the most natural audience for your fundraising- but a single organisational social post or email does not reach it. The people who are already connected to your cause have to carry the message for it to travel that far.
            </p>
            <p>
              Traditional peer fundraising methods- paper sponsor cards, player card selling, door-to-door collection- work because of that personal connection. But the admin behind them is a burden, and the money is hard to track until it all arrives in envelopes at the end.
            </p>
          </article>

          <article>
            <p className="eyebrow">Solution</p>
            <h2>Digital peer fundraising that works the way the paper version always did</h2>
            <p>
              FundRaisely keeps the personal connection at the centre- each seller or participant has their own link- while replacing the paper and envelope tracking with digital records for cash, card, instant payments or crypto. The ask still comes from someone the supporter knows personally. The product being sold is real and something the buyer would enjoy. And the organiser can see everything without chasing anyone.
            </p>
            <p>
              Two models are supported: selling activity packs through individual seller links, and running sponsored events where each participant collects personal sponsorship. Both are built around the same principle- the fundraising reaches further because your people carry it.
            </p>
          </article>
        </div>
      </section>

      <FeatureGrid
        eyebrow="Two peer fundraising models"
        title="Pack selling and sponsored events- both built around personal connections"
        text="Peer fundraising in FundRaisely covers two different fundraising models with different mechanics but the same core idea: your supporters and participants do the reaching out to their own networks, and the organisation tracks and reports on everything."
        items={twoModelsItems}
      />

      <SplitSection
        eyebrow="Activity pack selling"
        title="The digital version of a player card or door-to-door pack"
        text="Most sports clubs and community groups know the door-to-door fundraising model- each player or member sells to their own network. FundRaisely turns that familiar model into a digital flow where packs can include quiz entries, elimination games, Puzzle Drops and event tickets, all bundled and sold through a personal link or QR code."
        bullets={[
          'Bundle multiple digital activities into one pack',
          'Each seller gets their own unique link and QR code',
          'Central selling via shared link also supported',
          'Buyers pay instantly on their own phone',
          'Every sale is tracked automatically',
          'Pack sales visible in the organiser dashboard in real time',
        ]}
        image={images.tradationaldigital}
        reverse={false}
      />

      <FeatureGrid
        eyebrow="Activity packs"
        title="Give your members something real to sell to their own networks"
        text="The most important thing about peer pack selling is that the product is worth buying. Activity packs include real digital events- quiz entries, puzzle challenges, elimination games- that the buyer actually gets to enjoy. That makes it an easier sell than a raffle ticket or a straightforward donation ask."
        items={activityPackItems}
      />

      <SplitSection
        eyebrow="Sponsored events"
        title="Each participant becomes their own fundraiser with a personal page"
        text="For sponsored walks, runs, cycles and challenges, FundRaisely gives every participant their own page. You write the story, set their personal target, add a video and a personal message and photo and share the link. Their sponsors pledge directly on the page. The organiser sees all participants, all sponsorships and all payments without needing to chase anyone or count envelopes."
        bullets={[
          'Every participant gets their own personal fundraising page',
          'Individual targets are set alongside the overall event goal',
          'Add a personal video to increase sponsor generosity',
          'Sponsor pledge list appears on the participant\'s page',
          'Shareable via WhatsApp, email, social or QR code',
          'Organiser confirms payments and tracks all activity centrally',
        ]}
        image={images.communityHero}
        reverse
      />

      <FeatureGrid
        eyebrow="Sponsored event tools"
        title="Replace the paper sponsor card with a personal page that sells itself"
        text="The paper sponsor card works because the ask is personal. FundRaisely keeps the personal ask and replaces the paper with a link, You can still collect cash, and the envelope the recorded with a payment record."
        items={sponsoredEventItems}
      />

      <ProcessSteps
        eyebrow="How to run a peer fundraiser"
        title="From setup to final report"
        text="Setting up either type of peer fundraiser in FundRaisely takes less time than organising the paper equivalent. Once it is live, the participants and sellers do the work."
        steps={processSteps}
      />

      <FAQSection
        items={faqs}
        intro="Common questions about how peer fundraising works in FundRaisely and the difference between the two models."
      />

      <RelatedLinks links={relatedLinks} />

      <CTASection
        title="Let your people carry the fundraising further than you can reach alone"
        text="Book a demo to see how FundRaisely peer fundraising works for activity pack selling, sponsored events and the organisations that rely on personal connections to raise more."
        primaryCta={{ label: 'Book a demo', to: '/contact' }}
        secondaryCta={{ label: 'Explore all features', to: '/features' }}
      />
    </>
  );
}