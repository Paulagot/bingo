// src/pages/site/pages/features/CryptoDonationsPage.tsx
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

const path = '/features/crypto-donations';

const seoTitle =
  'Crypto and Digital Asset Payments for Clubs, Charities and Community Groups | FundRaisely';

const seoDescription =
  'Let supporters pay for events and donate using Solana and digital assets. Buy a quiz ticket, enter an elimination game, pay for a puzzle or donate - same wallet connection, same on-chain verification, same dashboard recording as every other payment method.';

const h1 = 'Reach a new generation of crypto donors';

const breadcrumbs = breadcrumbsForPath(path, h1);

const faqs = [
  {
    question: 'Can supporters use crypto to pay for events, not just donate?',
    answer:
      'Yes. Digital asset payments work across everything FundRaisely supports - buying a quiz ticket, entering an elimination game, paying for a puzzle challenge or making a direct donation. The flow is identical in every case: the supporter connects their own wallet, confirms the amount and sends. FundRaisely verifies on-chain and records the payment in your dashboard.',
  },
  {
    question: 'Do I need to understand crypto to accept digital asset payments?',
    answer:
      'No. You add your Solana wallet address to FundRaisely once. After that, crypto and digital asset payments appear as an option automatically across your fundraising pages, event tickets and donation widget. The supporter handles the technical side. You see the result in your normal dashboard.',
  },
  {
    question: 'What is a Solana wallet and how do I get one?',
    answer:
      'A Solana wallet is a free account that holds digital assets on the Solana network. It gives you a wallet address - a long string of letters and numbers - which is where payments and donations are sent. Free Solana wallets like Solflare or Backpack take about two minutes to set up. Once you have an address, paste it into your FundRaisely payment settings and you are done.',
  },
  {
    question: 'Does FundRaisely hold the funds?',
    answer:
      'No. Whether a supporter is paying for an event or making a donation, the digital assets go directly from their wallet to yours. FundRaisely verifies the transaction and records it in your dashboard but never holds your money.',
  },
  {
    question: 'Where do crypto payments appear in FundRaisely?',
    answer:
      'In your normal dashboard, alongside card and instant payments. A quiz ticket paid on Solana looks the same as one paid by card in your payment tracking, reconciliation view and reports. There is no separate crypto section to manage.',
  },
  {
    question: 'What does the supporter experience look like?',
    answer:
      'On a ticket page, event entry or donation widget, supporters see Solana listed as a payment option alongside card. They click it, connect their own wallet, confirm the amount and send. FundRaisely verifies the transaction on-chain and records it. For someone who already holds crypto on Solana, the whole thing takes under a minute.',
  },
  {
    question: 'Which digital assets can supporters use?',
    answer:
      'FundRaisely currently supports Solana (SOL), USDG and many other tokens. We are working to expand the digital assets available over time.',
  },
  {
    question: 'How do I convert digital asset payments to euros or sterling?',
    answer:
      'Right now, conversion is handled on your own terms through your chosen exchange. The payment arrives in your Solana wallet and you decide when and how to convert it. We are working with a custodial partner to offer a fully managed option - conversion and transfer to your bank account - which will be available soon.',
  },
  {
    question: 'Can crypto payments be included in my fundraising reports?',
    answer:
      'Yes. Digital asset payments are recorded in your FundRaisely reports the same way as any other payment - amount, status and transaction reference all visible in your event report and reconciliation view, included in your total raised.',
  },
  {
    question: 'Is this only for organisations already involved in Web3?',
    answer:
      'No. Any club, charity, school or community group can add a Solana wallet address and start accepting digital asset payments and donations. You do not need to be involved in the crypto space - you just need a wallet address, which takes two minutes to create.',
  },
];

const structuredData = compactStructuredData([
  webPageJsonLd(path, h1, seoDescription),
  faqJsonLd(faqs),
]);

const howItWorksItems = [
  {
    title: 'Add your wallet address once',
    text: 'Paste your Solana wallet address into your FundRaisely payment settings. That is the only technical step your organisation ever needs to take.',
  },
  {
    title: 'Solana appears across your fundraising pages',
    text: 'Once your address is saved, digital asset payments appear as an option when setting up event ticket pages, game entry flows, puzzle purchases and your donation widget - automatically, with no further setup.',
  },
  {
    title: 'The supporter handles their own wallet',
    text: 'Supporters who hold digital assets on Solana connect their own wallet on the payment page, choose an amount, the tokenand confirm the transaction. Your organisation is not involved in their wallet or their transaction.',
  },
  {
    title: 'FundRaisely verifies on-chain',
    text: 'When a supporter sends crypto - whether paying for an event or donating - FundRaisely checks the transaction on-chain and confirms it before recording it as a completed payment.',
  },
  {
    title: 'The payment lands in your normal dashboard',
    text: 'Verified payments appear in your FundRaisely dashboard alongside every other payment method - included in your total raised, your payment tracking and your reports.',
  },
  {
    title: 'Funds go directly to your wallet',
    text: 'Whether it is a ticket purchase or a donation, the digital assets go from the supporter\'s wallet straight to yours. FundRaisely records it but never touches it.',
  },
];

const acrossEventsItems = [
  {
    title: 'Quiz ticket purchases',
    text: 'Supporters buying into a quiz fundraiser can pay on Solana. The ticket is confirmed, the payment recorded, and the entry shows up in your ticketing view the same as any other.',
  },
  {
    title: 'Elimination game entries',
    text: 'Players joining an elimination game can pay their entry fee in digital assets. Same flow, same verification, same dashboard recording.',
  },
  {
    title: 'Puzzle Drop payments',
    text: 'Supporters accessing a Puzzle Drop can pay on Solana. The payment is verified and access is granted the same way as a card payment.',
  },
  {
    title: 'Direct donations',
    text: 'Supporters who simply want to give - without taking part in an event - can donate in digital assets through your donation widget or fundraising page.',
  },
  {
    title: 'Ticketed events',
    text: 'For dinners, galas, community events and other ticketed fundraisers, supporters can purchase tickets using crypto held on Solana alongside every other payment method.',
  },
  {
    title: 'Same flow every time',
    text: 'Connect wallet, confirm amount, send. FundRaisely verifies on-chain and records the payment. It works identically whether the supporter is buying a ticket or making a donation.',
  },
];

const dashboardItems = [
  {
    title: 'Part of your normal total',
    text: 'Digital asset payments are included in your fundraiser total alongside card and instant payments. A Solana ticket purchase counts the same as a card purchase in your overall figures.',
  },
  {
    title: 'In your payment tracking view',
    text: 'Each digital asset payment appears in your payment records with the amount, status and transaction reference - the same information you see for every other payment method.',
  },
  {
    title: 'In your reconciliation and reports',
    text: 'After an event, digital asset payments appear in your reconciliation view and final report. Your treasurer sees the full picture without needing to know anything about blockchain.',
  },
  {
    title: 'Transaction verified before recording',
    text: 'FundRaisely only records a digital asset payment after verifying the transaction on-chain, so your records reflect confirmed income - not just pending transactions.',
  },
  {
    title: 'No separate crypto dashboard',
    text: 'Everything is in the same place you already manage your fundraising. You do not need to check a wallet or a blockchain explorer to see what came in.',
  },
  {
    title: 'Audit-ready records',
    text: 'On-chain transaction references are recorded alongside each payment, giving your treasurer and committee a clear, verifiable record of what was received and when.',
  },
];

const walletItems = [
  {
    title: 'What is a Solana wallet?',
    text: 'A Solana wallet is a free account that holds digital assets on the Solana network. It gives you a wallet address - a long string of letters and numbers - which is where payments and donations are sent, the same way a bank account number is where bank transfers go.',
  },
  {
    title: 'How do you get one?',
    text: 'Free Solana wallets like Solflare or Backpack take about two minutes to set up. Download the browser extension or mobile app, create an account and you have a wallet address.',
  },
  {
    title: 'What do you do with it?',
    text: 'Copy the wallet address and paste it into your FundRaisely payment settings. That is the only step. From that point, FundRaisely handles everything - across events, games and donations.',
  },
  {
    title: 'Is it safe?',
    text: 'Your wallet is secured by a private key or seed phrase that only you hold. FundRaisely only ever uses your public wallet address - the equivalent of sharing your bank account number to receive a transfer.',
  },
  {
    title: 'What about converting to euros or sterling?',
    text: 'Conversion is handled on your own terms through your chosen exchange. We are working with a custodial partner to offer a fully managed option - conversion and fiat transfer to your bank account - which will be available soon.',
  },
  {
    title: 'Do supporters need guidance?',
    text: 'Supporters who hold digital assets on Solana already understand wallets. Connecting their wallet on a payment page is a familiar two-click action for them. They do not need you to explain it.',
  },
];

const processSteps = [
  {
    title: 'Get a Solana wallet',
    text: 'If you do not have one, download Solflare or Backpack - both are free and take about two minutes to set up. You will get a wallet address, which looks like a long string of letters and numbers.',
  },
  {
    title: 'Add your wallet address to FundRaisely',
    text: 'Go to your payment settings in FundRaisely and paste in your Solana wallet address. Save it. That is the only technical step you will ever need to do.',
  },
  {
    title: 'Solana appears across your fundraising',
    text: 'From this point, digital asset payments appear automatically when you are setting up your event ticket pages, game entry flows, puzzle purchases and donation widget - alongside card and instant payments.',
  },
  {
    title: 'A supporter pays or donates on Solana',
    text: 'The supporter sees Solana as a payment option, connects their own wallet, confirms the amount and sends. FundRaisely handles the payment flow - whether they are buying a ticket or making a donation.',
  },
  {
    title: 'FundRaisely verifies the transaction on-chain',
    text: 'The transaction is checked on the Solana network. Once confirmed, FundRaisely records it as a completed payment.',
  },
  {
    title: 'The payment appears in your normal dashboard',
    text: 'The payment shows up in your payment tracking, included in your fundraiser total, reconciliation view and reports - exactly as a card payment would.',
  },
];

const relatedLinks = [
  {
    label: 'Donations widget',
    to: '/features/donations-widget',
    text: 'Embed a donate button on any website that accepts card, instant payment and digital assets.',
  },
  {
    label: 'Payment and reporting',
    to: '/features/financial-records',
    text: 'See how all payment methods - including digital assets - flow into your reconciliation and reports.',
  },
  {
    label: 'Event formats',
    to: '/event-formats',
    text: 'Explore the wider FundRaisely Event Formats.',
  },
  {
    label: 'Contact',
    to: '/contact',
    text: 'Talk to us about setting up digital asset payments for your organisation.',
  },
];

export default function CryptoDonationsPage() {
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
        eyebrow="Crypto and digital asset payments"
        title={h1}
        description="Whether a supporter is buying a quiz ticket, entering an elimination game, paying for a puzzle challenge or simply making a donation - they can do it on Solana. On-chain verification, same dashboard recording. You add your wallet address once. The rest works like any other payment method."
        primaryCta={{ label: 'Book a demo', to: '/contact' }}
        secondaryCta={{ label: 'Explore features', to: '/features' }}
        image={images.cryptoHero}
        status="Solana payments and donations. Your wallet. Your dashboard."
        variant="standard"
      />

      <section className="section">
        <div className="site-shell problem-solution">
          <article>
            <p className="eyebrow">Problem</p>
            <h2>A growing number of supporters hold digital assets and have no way to use them to support causes they care about</h2>
            <p>
              Crypto and digital asset holders are often younger, more digitally engaged and genuinely generous - but most clubs, charities, schools and community groups have no way to accept a payment on Solana. The supporter who wanted to buy a quiz ticket, enter a game or make a donation in digital assets simply could not, and moved on.
            </p>
            <p>
              Setting this up from scratch requires technical knowledge most committees and treasurers do not have and should not need just to accept a payment.
            </p>
          </article>

          <article>
            <p className="eyebrow">Solution</p>
            <h2>One wallet address. Payments and donations across every FundRaisely activity. All in your normal dashboard.</h2>
            <p>
              You paste your Solana wallet address into FundRaisely once. From that point, digital asset payments appear automatically wherever supporters can pay - event tickets, game entries, puzzle purchases and direct donations. The supporter connects their own wallet, confirms and sends. FundRaisely verifies the transaction on-chain and records it in your dashboard alongside every other payment method.
            </p>
            <p>
              No separate system. No technical process to manage. No intermediary holding your funds. Crypto and digital asset payments work the same way as card - they just reach a different generation of supporter.
            </p>
          </article>
        </div>
      </section>

      <FeatureGrid
        eyebrow="How it works"
        title="One setup step. Works across every activity."
        text="Accepting digital asset payments in FundRaisely is designed to require almost nothing from the organiser. The supporter handles their own wallet. FundRaisely handles the verification and recording. You see the result in your normal dashboard."
        items={howItWorksItems}
      />

      <SplitSection
        eyebrow="Across events, games and donations"
        title="Not just donations - any way a supporter can pay, they can pay on Solana"
        text="Digital asset support is not limited to a donation button. It runs across the full FundRaisely payment experience. A supporter who holds Solana can buy a quiz ticket, join an elimination game, access a puzzle challenge or make a direct donation - all through the same wallet connection flow, all landing in the same dashboard."
        bullets={[
          'Quiz ticket purchases on Solana',
          'Elimination game entry payments',
          'Puzzle Drop and puzzle challenge payments',
          'Direct donations via the donations widget',
          'Ticketed event ticket purchases',
          'Same verification flow and dashboard recording every time',
        ]}
        image={images.paymentsDonations}
        reverse={false}
      />

      <FeatureGrid
        eyebrow="Where it works"
        title="Digital asset payments across the full fundraising experience"
        text="Adding a Solana wallet address to FundRaisely unlocks digital asset payments across every activity - not just a standalone donation button. Wherever a supporter can pay, they can pay on Solana."
        items={acrossEventsItems}
      />

      <SplitSection
        eyebrow="Your dashboard, your reports"
        title="Crypto payments show up exactly where you would expect them"
        text="There is no separate crypto section, no second dashboard to log into, no blockchain explorer to check. A Solana ticket purchase appears in your payment tracking the same way a card purchase does - in your total raised, your reconciliation view and your final event report. Your treasurer sees the full picture without needing to understand anything about digital assets."
        bullets={[
          'Included in your fundraiser total alongside all other payments',
          'Visible in payment tracking with amount, status and transaction reference',
          'Part of your reconciliation view and final event report',
          'Transaction verified on-chain before being recorded',
          'Audit-ready records with on-chain transaction references',
          'No separate crypto system to learn or manage',
        ]}
        image={images.paymentsHeroScreenshot}
        reverse
      />

      <FeatureGrid
        eyebrow="In your normal workflow"
        title="Digital asset payments look like every other payment in your dashboard"
        text="The goal was to make crypto and digital asset payments feel unremarkable from the organiser's point of view - not a special category, not a technical exception, just another payment method that shows up in the right place."
        items={dashboardItems}
      />

      <SplitSection
        eyebrow="Your wallet, your funds"
        title="No intermediary. Payments go directly from supporter to you."
        text="Whether a supporter is paying for an event or making a donation, the digital assets travel from their wallet to yours directly. FundRaisely verifies and records the transaction but never holds the money. It is in your wallet from the moment the transaction confirms on-chain. You decide what to do with it - hold it, convert it, transfer it - entirely on your own terms."
        bullets={[
          'Payments go from supporter wallet directly to your wallet',
          'FundRaisely verifies the transaction but never holds your funds',
          'You control when and how to convert to euros or sterling',
          'Your private wallet key is never shared with FundRaisely',
          'Only your public wallet address is used to receive payments',
          'A managed conversion option - wallet, off-ramp and fiat transfer - is coming soon',
        ]}
        image={images.paymentsDonations}
        reverse={false}
      />

      <FeatureGrid
        eyebrow="Getting a wallet"
        title="You do not need to understand crypto to set this up"
        text="The only thing your organisation needs is a Solana wallet address. Getting one is free and takes about two minutes. After that, FundRaisely handles everything across your events, games and donation pages."
        items={walletItems}
      />

      <ProcessSteps
        eyebrow="Getting started"
        title="From no wallet to accepting digital asset payments across your fundraising"
        text="The setup process is short. Most of it happens once and never needs to be touched again."
        steps={processSteps}
      />

      <SplitSection
        eyebrow="Who it is for"
        title="Any non-profit whose supporters include people who hold digital assets"
        text="Crypto and digital asset payments are a natural fit for organisations that already have supporters in that space - Web3 communities, tech-forward sports clubs, charities running online campaigns. But you do not need to be a crypto organisation to benefit. If some of your supporters hold crypto and digital assets and would rather pay in it than convert to card first, this is for you. You do not need to understand digital assets yourself. You need a wallet address, two minutes to create it, and a FundRaisely account to connect it to."
        bullets={[
          'Sports clubs with younger, digitally engaged supporter bases',
          'Charities and community groups running online campaigns',
          'Organisations connected to the Solana or wider Web3 community',
          'Any non-profit that wants to stop turning away digital-asset payments',
          'Treasurers who want crypto in their reports without a separate system',
          'Committees that want to accept every payment method their supporters prefer',
        ]}
        image={images.communityHero}
        reverse
      />

      <FAQSection
        items={faqs}
        intro="Common questions about accepting crypto and digital asset payments through FundRaisely - across events, games and donations."
      />

      <RelatedLinks links={relatedLinks} />

      <CTASection
        title="Stop turning away the supporters who want to pay in digital assets"
        text="Book a demo to see how FundRaisely handles crypto and digital asset payments - from wallet setup to dashboard recording - across quiz tickets, elimination entries, puzzle purchases and donations."
        primaryCta={{ label: 'Book a demo', to: '/contact' }}
        secondaryCta={{ label: 'Explore all features', to: '/features' }}
      />
    </>
  );
}