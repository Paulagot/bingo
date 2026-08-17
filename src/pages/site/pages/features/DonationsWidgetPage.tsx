// src/pages/site/pages/features/DonationsWidgetPage.tsx
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

const path = '/features/donations-widget';

const seoTitle =
  'Donations Widget for Clubs, Charities and Community Groups | FundRaisely';

const seoDescription =
  'Add a FundRaisely donation button to any website, campaign page or club site. Accept card payments via Stripe, instant payments, and crypto donations in Solana directly to your own wallet - no intermediary holding your funds.';

const h1 = 'A donate button that works on any page and accepts crypto directly to your wallet';

const breadcrumbs = breadcrumbsForPath(path, h1);

const faqs = [
  {
    question: 'What is the FundRaisely Donations Widget?',
    answer:
      'The Donations Widget is an embeddable donate button that organisations can add to any website or page. When a supporter clicks it, a donation flow opens without leaving the page. The organisation receives the donation directly through their configured payment method - card via Stripe, instant payment, or crypto to their own Solana wallet.',
  },
  {
    question: 'What payment methods does it accept?',
    answer:
      'The widget supports card payments via Stripe, instant payment methods, and cryptocurrency donations on Solana. The organisation enables and configures the methods they want to use through their FundRaisely account.',
  },
  {
    question: 'How does the crypto donation work?',
    answer:
      'Crypto donations on Solana go directly to the organisation\'s own connected Solana wallet. FundRaisely does not hold the funds - the organisation connects their own wallet address and donations are sent directly to it. This is particularly meaningful for the Web3 community where donors may prefer to give in crypto.',
  },
  {
    question: 'Does the organisation need to use the FundRaisely payment infrastructure for crypto?',
    answer:
      'No. The organisation connects their own Solana wallet address. Crypto donations go directly from the donor to that wallet. FundRaisely facilitates the flow but does not act as an intermediary or hold funds on the organisation\'s behalf.',
  },
  {
    question: 'Can the widget be added to a club or charity website?',
    answer:
      'Yes. The widget is designed to be embedded on any website with a short snippet of code. It works inside an iframe on the host site, so donors do not need to leave the page to complete the donation.',
  },
  {
    question: 'Can the organisation set preset donation amounts?',
    answer:
      'Yes. Organisations can configure preset amounts that appear as options in the donation flow - for example €5, €10, €20. Donors can also choose to enter their own amount if the organiser enables that option.',
  },
  {
    question: 'Is the widget secure on a third-party website?',
    answer:
      'Yes. The widget includes a domain check - it only renders on domains the organisation has registered in their FundRaisely account. This prevents the widget from being embedded on unauthorised sites.',
  },
  {
    question: 'Are donations tracked and recorded?',
    answer:
      'Yes. All donations processed through the widget are recorded in the organisation\'s FundRaisely dashboard, including the amount, payment method and status. This gives the organisation a clear record of donations received through the widget.',
  },
  {
    question: 'Can the widget be used alongside event fundraising?',
    answer:
      'Yes. The Donations Widget sits alongside the event-based fundraising tools in FundRaisely. An organisation can run a quiz, an elimination game or a sponsored event and also have a donation widget on their website for supporters who want to give without taking part in an activity.',
  },
  {
    question: 'Who is the Donations Widget for?',
    answer:
      'The widget is for any non-profit that has a website and wants to make it easy for visitors to donate directly from it. It is particularly useful for organisations that want to accept crypto donations without setting up a separate crypto payment infrastructure, and for any organisation active in the Web3 space whose community prefers to give in Solana.',
  },
];

const structuredData = compactStructuredData([
  webPageJsonLd(path, h1, seoDescription),
  faqJsonLd(faqs),
]);

const coreFeatureItems = [
  {
    title: 'Embeds on any website',
    text: 'A short code snippet adds the donate button to any website page. The donation flow opens in place without the supporter leaving the site.',
  },
  {
    title: 'Card payments via Stripe',
    text: 'Accept credit and debit card donations through the organisation\'s connected Stripe account. Funds go directly to the organisation.',
  },
  {
    title: 'Instant payment support',
    text: 'Configure instant payment methods alongside card for supporters who prefer to pay that way.',
  },
  {
    title: 'Crypto donations on Solana',
    text: 'Accept cryptocurrency donations in Solana directly to the organisation\'s own connected wallet. FundRaisely does not hold the funds.',
  },
  {
    title: 'Preset donation amounts',
    text: 'Configure suggested amounts that appear as options in the widget - such as €5, €10 or €25 - to guide supporters toward a typical giving level.',
  },
  {
    title: 'Domain security check',
    text: 'The widget only renders on domains the organisation has registered. This prevents the donation flow from appearing on unauthorised sites.',
  },
];

const cryptoItems = [
  {
    title: 'Donations go directly to your Solana wallet',
    text: 'The organisation connects their own Solana wallet address. Crypto donations go from the donor straight to that wallet - no intermediary, no holding period.',
  },
  {
    title: 'No crypto infrastructure needed',
    text: 'FundRaisely handles the payment flow and user experience. The organisation just needs a Solana wallet address - they do not need to build any crypto payment infrastructure.',
  },
  {
    title: 'Relevant for Web3-native communities',
    text: 'For organisations active in the Solana or wider Web3 ecosystem, many supporters already hold Solana and would prefer to donate in it rather than convert to fiat first.',
  },
  {
    title: 'Transparent destination',
    text: 'The wallet address the donation is going to can be visible to the donor, which aligns with the transparency values of the Web3 community.',
  },
  {
    title: 'Alongside traditional payment methods',
    text: 'Crypto is one option alongside Stripe and instant payments. Donors choose the method that works for them. The organisation does not have to choose crypto over card - they can offer both.',
  },
  {
    title: 'Recorded in the organisation dashboard',
    text: 'Crypto donations are recorded in the FundRaisely dashboard alongside card and instant payments, giving the organisation a single view of all donations received.',
  },
];

const deploymentItems = [
  {
    title: 'As a button on the homepage',
    text: 'A simple "Donate" button on the club or charity homepage that opens the donation flow in place without navigating away.',
  },
  {
    title: 'On a campaign page',
    text: 'Embed the widget on a specific campaign page so visitors to that page can donate directly to the campaign cause.',
  },
  {
    title: 'On a sponsored event page',
    text: 'Place the widget alongside event information so supporters who cannot take part in the event can still donate to the cause.',
  },
  {
    title: 'On a blog post or news article',
    text: 'An organisation that writes about the work they do can embed a donate button inside or alongside the content.',
  },
  {
    title: 'On a club or team page',
    text: 'Each team, section or group within an organisation could have its own page with a widget configured for donations to that specific cause.',
  },
  {
    title: 'Linked from social media',
    text: 'The widget page URL can also be shared as a standalone link - useful for social media posts or WhatsApp shares where embedding is not possible.',
  },
];

const processSteps = [
  {
    title: 'Set up your FundRaisely account',
    text: 'Connect your payment methods in FundRaisely - Stripe for card payments, and your Solana wallet address for crypto donations.',
  },
  {
    title: 'Configure the widget',
    text: 'Choose which payment methods to enable, set preset donation amounts, and register the domains where the widget will appear.',
  },
  {
    title: 'Get the embed code',
    text: 'FundRaisely generates the embed snippet for your widget. Copy it and paste it into any page on your website.',
  },
  {
    title: 'The button appears on your site',
    text: 'The donate button renders on your page. Supporters see it when they visit, click it and the donation flow opens without leaving your site.',
  },
  {
    title: 'Donations are processed directly',
    text: 'Card payments go to your Stripe account. Crypto donations go directly to your Solana wallet. Instant payments go to your configured instant payment account.',
  },
  {
    title: 'All donations recorded in FundRaisely',
    text: 'Every donation is logged in your FundRaisely dashboard, with payment method, amount and status - giving you a complete record.',
  },
];

const relatedLinks = [
  {
    label: 'Peer fundraising',
    to: '/features/peer-fundraising',
    text: 'Let members and participants carry your fundraising to their own networks.',
  },
  {
    label: 'Payments and reports',
    to: '/features/financial-records',
    text: 'Track all income across cash, card, instant payments and crypto.',
  },
  {
    label: 'Web3 fundraising',
    to: '/web3',
    text: 'Explore FundRaisely\'s wider approach to Web3 and crypto fundraising.',
  },
  {
    label: 'Contact',
    to: '/contact',
    text: 'Talk to us about setting up the Donations Widget for your organisation.',
  },
];

export default function DonationsWidgetPage() {
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
        eyebrow="Donations widget"
        title={h1}
        description="The FundRaisely Donations Widget puts a donate button on any page of your website. Supporters click it, choose their amount, pick their payment method - card, instant payment or Solana crypto - and complete the donation without leaving your site. Card and instant payments go to your connected accounts. Crypto donations go directly to your own Solana wallet. No intermediary. No holding period."
        primaryCta={{ label: 'Book a demo', to: '/contact' }}
        secondaryCta={{ label: 'Explore features', to: '/features' }}
        image={images.donationsHero}
        status="Card, instant payment and crypto on Solana"
        variant="standard"
      />

      <section className="section">
        <div className="site-shell problem-solution">
          <article>
            <p className="eyebrow">Problem</p>
            <h2>Most donation buttons send supporters away from your site to complete the gift</h2>
            <p>
              A supporter who visits your club or charity website, reads about your work and decides to donate should be able to do so immediately, on the page they are already on. Instead, most donation tools redirect them to a third-party page, create an account, ask for information that was not needed, and deliver the money to the platform first - not to your organisation.
            </p>
            <p>
              For organisations with a Web3-native supporter base, the problem is compounded. Those supporters may hold Solana or other crypto but have no straightforward way to donate it to a community group or charity without the funds passing through a centralised intermediary first.
            </p>
          </article>

          <article>
            <p className="eyebrow">Solution</p>
            <h2>An embeddable widget that accepts card and crypto - donations go straight to you</h2>
            <p>
              The FundRaisely Donations Widget embeds directly on your website. The donation flow happens on your page, in your branding context, without redirecting the supporter anywhere else. Card payments go to your Stripe account. Crypto donations in Solana go directly to your own wallet address - no intermediary, no holding.
            </p>
            <p>
              For the Web3 community, where direct wallet-to-wallet transactions are a natural part of how value moves, this is not a workaround - it is the expected model. For traditional clubs and charities, it simply means a donate button that works on their site without sending supporters away.
            </p>
          </article>
        </div>
      </section>

      <FeatureGrid
        eyebrow="What the widget does"
        title="A donation flow that works on your site without sending supporters elsewhere"
        text="The Donations Widget is built to be embedded, to feel like part of your site, and to complete the donation without the supporter ever needing to leave the page they are on."
        items={coreFeatureItems}
      />

      <SplitSection
        eyebrow="Crypto donations"
        title="Solana donations go directly to your wallet - no intermediary"
        text="For organisations connected to the Web3 community, the ability to Accept Digital Assets donations without funds passing through a third-party platform is significant. FundRaisely connects to the organisation's own wallet address. When a supporter chooses to donate in crypto, the transaction goes directly from their wallet to yours. FundRaisely handles the user experience; the funds go directly to where they belong."
        bullets={[
          'Donate in Solana directly to the organisation\'s own wallet',
          'No intermediary holds the funds between donor and organisation',
          'FundRaisely connects to any Solana wallet address',
          'Crypto donation recorded in the FundRaisely dashboard',
          'Sits alongside card and instant payment options',
          'Transparent destination - the wallet address is clear to the donor',
        ]}
        image={images.donationsBottom}
        reverse={false}
      />

      <FeatureGrid
        eyebrow="Crypto and Web3"
        title="For the community where wallet-to-wallet giving is the natural model"
        text="For the Solana and broader Web3 community, donating crypto to a cause they care about should be as straightforward as sending to any wallet. The FundRaisely widget makes that possible without the organisation needing to build any crypto infrastructure."
        items={cryptoItems}
      />

      <SplitSection
        eyebrow="Where to use it"
        title="Any page where a supporter might want to give"
        text="The widget is designed to be placed anywhere a visitor to your site might be motivated to donate. That could be the homepage, a campaign page, alongside event information, inside a news article about your work, or on any page that tells your organisation's story."
        bullets={[
          'Homepage donate button for any visitor to your site',
          'Campaign or project page alongside the story of the cause',
          'Event page for supporters who want to give but cannot attend',
          'Blog post or news content about the work you are doing',
          'Shareable as a standalone link for social media',
          'Multiple widgets across multiple pages, each configured for context',
        ]}
        image={images.paymentsDonations}
        reverse
      />

      <FeatureGrid
        eyebrow="Deployment options"
        title="Put a donate button wherever your supporters find you"
        text="The Donations Widget is flexible enough to sit in any context on any page where a supporter might be ready to give. The embed is lightweight and the donation flow is handled by FundRaisely without impacting your site's performance."
        items={deploymentItems}
      />

      <ProcessSteps
        eyebrow="Getting started"
        title="From setup to donate button on your site"
        text="Setting up the Donations Widget takes a few minutes. Configure the payment methods, register your domain and paste the embed code. The button is live immediately."
        steps={processSteps}
      />

      <FAQSection
        items={faqs}
        intro="Common questions about the FundRaisely Donations Widget, how it works and how crypto donations are handled."
      />

      <RelatedLinks links={relatedLinks} />

      <CTASection
        title="Put a donate button on your site that actually works for your supporters"
        text="Book a demo to see how the FundRaisely Donations Widget accepts card, instant payment and crypto on Solana donations directly - without sending your supporters away from your site."
        primaryCta={{ label: 'Book a demo', to: '/contact' }}
        secondaryCta={{ label: 'Explore all features', to: '/features' }}
      />
    </>
  );
}