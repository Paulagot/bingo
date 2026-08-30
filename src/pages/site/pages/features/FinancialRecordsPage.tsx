// src/pages/site/pages/features/FinancialRecordsPage.tsx
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

const path = '/features/financial-records';

const seoTitle =
  'Payment Tracking and Fundraising Reports for Clubs, Charities and Community Groups | FundRaisely';

const seoDescription =
  'Track payments across cash, card, instant payments and crypto. Generate audit-ready reconciliation and committee-ready reports. FundRaisely keeps your payment records and financial reports connected from the first ticket sale to the final committee update.';

const h1 = 'Track every payment. Report everything that matters.';

const breadcrumbs = breadcrumbsForPath(path, h1);

const faqs = [
  {
    question: 'What payment methods does FundRaisely support?',
    answer:
      'FundRaisely supports card payments via Stripe, Revolut and Monzo-style instant payments, cash, bank transfer, card tap on the night, and crypto on Solana payments. The organiser enables the methods that suit their event and supporter base.',
  },
  {
    question: 'Does FundRaisely hold fundraising money?',
    answer:
      'No. FundRaisely does not hold fundraiser funds or take a percentage of event income. Clubs and non-profits connect their own Stripe account, use their own instant-payment details and set their own crypto wallet, so funds are paid directly to the organisation.',
  },
  {
    question: 'What is the difference between a claimed and confirmed payment?',
    answer:
      'A claimed payment means someone has said the payment was made or received. A confirmed payment means the organiser, admin or automated payment flow has verified that the money was actually received.',
  },
  {
    question: 'Are Stripe and crypto payments confirmed automatically?',
    answer:
      'Yes. Card payments via Stripe and supported Solana crypto payments are confirmed automatically when the transaction completes successfully. Cash, instant payments and card tap payments require manual confirmation by the organiser.',
  },
  {
    question: 'How do Revolut or Monzo-style instant payments work?',
    answer:
      'FundRaisely gives the supporter clear payment instructions and a unique reference code. Because personal instant-payment accounts cannot auto-confirm through an API, the ticket or entry stays pending until the organiser confirms the money has arrived.',
  },
  {
    question: 'Can late or disputed payments be handled after the event?',
    answer:
      'Yes. Organisers can accept late payments, write off balances that will not be collected, and resolve disputes after the event closes. These changes are tracked separately so the original approved report is not altered.',
  },
  {
    question: 'What is the audit-ready reconciliation?',
    answer:
      'At the end of each event, the organiser reviews the payment totals, confirms what was collected and approves the reconciliation. Once approved, it is locked - it cannot be edited afterwards. This gives the committee a clear, verifiable record of what was signed off.',
  },
  {
    question: 'Can an approved report be changed?',
    answer:
      'The approved reconciliation is locked and cannot be edited. Any post-event activity - late payments, write-offs, resolved disputes - is tracked separately and reflected in the financial report without altering the original signed-off record.',
  },
  {
    question: 'What is the difference between a financial report and an impact report?',
    answer:
      'A financial report focuses on money - what was collected, what is outstanding, what was written off. An impact report adds the story around the fundraiser: participation, prizes, sponsors, winners, volunteers and outcomes. FundRaisely supports both.',
  },
  {
    question: 'Can reports be downloaded?',
    answer:
      'Yes. Financial, reconciliation and impact reports can be downloaded and shared with a committee, treasurer, board or campaign file.',
  },
  {
    question: 'Do reports cover mixed payment methods?',
    answer:
      'Yes. Reports reflect all the payment methods used across an event - Stripe, cash, instant payments, bank transfer, card tap and crypto - so the committee sees the full picture rather than just the online payments.',
  },
  {
    question: 'Does this replace accounting software?',
    answer:
      'No. FundRaisely is not trying to replace full accounting software. It gives fundraising organisers cleaner event-level payment records and reports before figures are passed into wider accounts, board packs or annual reporting.',
  },
];

const structuredData = compactStructuredData([
  webPageJsonLd(path, h1, seoDescription),
  faqJsonLd(faqs),
]);

const paymentItems = [
  {
    title: 'Card payments via Stripe',
    text: 'Accept card payments online through the organisation\'s own connected Stripe account. Confirmed automatically when the transaction completes.',
  },
  {
    title: 'Revolut and Monzo-style instant payments',
    text: 'FundRaisely gives each supporter a unique payment reference. Entries stay pending until the organiser confirms the money arrived - so no tickets are issued before payment is received.',
  },
  {
    title: 'Cash and card tap on the night',
    text: 'Record cash and card tap payments manually. Organisers or admin helpers confirm each one during or after the event.',
  },
  {
    title: 'Solana crypto payments',
    text: 'Accept digital asset payments in Solana. Funds go directly to the organisation\'s own connected wallet. Confirmed automatically on-chain before being recorded.',
  },
  {
    title: 'Bank transfer',
    text: 'Track bank transfer payments alongside every other method. Confirm manually when the transfer is received.',
  },
  {
    title: 'Funds go directly to you',
    text: 'FundRaisely does not hold fundraiser funds or take a percentage of event income. Every payment method is connected directly to the organisation.',
  },
];

const paymentStatusItems = [
  {
    title: 'Expected',
    text: 'A supporter has registered or bought a ticket. Payment has not yet arrived or been claimed.',
  },
  {
    title: 'Claimed',
    text: 'The supporter or organiser has said payment was made. Not yet confirmed by the organiser.',
  },
  {
    title: 'Confirmed',
    text: 'Payment has been verified - either automatically for Stripe and crypto, or manually by the organiser for cash and instant payments.',
  },
  {
    title: 'Late',
    text: 'Payment was not received by the expected time. Can still be accepted and confirmed after the event.',
  },
  {
    title: 'Disputed',
    text: 'A payment status is unclear or contested. Can be reviewed and resolved with notes attached.',
  },
  {
    title: 'Written off',
    text: 'Payment will not be collected. Recorded as written off so the event total reflects what actually happened.',
  },
];

const reportItems = [
  {
    title: 'Audit-ready reconciliation',
    text: 'After the event, the organiser reviews totals, confirms what was collected and approves the reconciliation. Once approved it is locked - a clear verifiable record that cannot be edited afterwards.',
  },
  {
    title: 'Locked reports after approval',
    text: 'The signed-off reconciliation is protected. Post-event changes like late payments or write-offs are tracked separately without altering the original approved record.',
  },
  {
    title: 'Financial report with adjustments',
    text: 'A financial report starts from the approved totals and then reflects any post-event activity - late payments, resolved disputes, write-offs - so the latest known position is always clear.',
  },
  {
    title: 'Mixed payment method reporting',
    text: 'Reports cover every payment method used across the event - Stripe, cash, instant payments, bank transfer, card tap and crypto - not just the online payments.',
  },
  {
    question: 'Impact reports',
    title: 'Impact reports',
    text: 'Beyond the money - record participation, prizes, sponsors, volunteers, winners and outcomes. Show what happened because people took part.',
  },
  {
    title: 'Downloadable for committees',
    text: 'Export financial, reconciliation and impact reports to share with a committee, treasurer, board or campaign file.',
  },
];

const processSteps = [
  {
    title: 'Set up your payment methods',
    text: 'Connect the payment methods your organisation wants to use - Stripe, instant payments, crypto wallet, cash or card tap. Each method is linked directly to the organisation, not to FundRaisely.',
  },
  {
    title: 'Choose methods per event',
    text: 'Select which payment options appear for each fundraiser. A quiz night might use Stripe and instant payments. A community event might also want cash on the night.',
  },
  {
    title: 'Sell tickets and accept entries',
    text: 'Supporters pay using the methods enabled for the event. Stripe and crypto confirm automatically. Cash, instant payments and card tap stay pending until confirmed.',
  },
  {
    title: 'Confirm manual payments',
    text: 'During or after the event, the organiser confirms cash, card tap and instant payments in the dashboard. Late payments, disputes and write-offs are handled here too.',
  },
  {
    title: 'Run the event',
    text: 'The payment dashboard updates in real time as confirmations come in. Organisers and admin helpers can see who has paid and who still needs attention.',
  },
  {
    title: 'Review and approve the reconciliation',
    text: 'After the event, review total income, outstanding amounts and any unresolved items. Approve the reconciliation to lock the record.',
  },
  {
    title: 'Track post-event changes',
    text: 'Accept late payments, resolve disputes or write off uncollected amounts. These are recorded separately so the approved report stays clean.',
  },
  {
    title: 'Download reports',
    text: 'Export the financial report, approved reconciliation and impact report for the committee, treasurer or campaign file.',
  },
];

const relatedLinks = [
  {
    label: 'Ticketing',
    to: '/features/ticketing',
    text: 'Connect ticket sales and player entries to payment tracking.',
  },
  {
    label: 'Impact reports',
    to: '/features/impact-reports',
    text: 'Add participation, prizes and outcomes to the financial picture.',
  },
  {
    label: 'Event Manager',
    to: '/features/event-manager',
    text: 'Configure payment methods and launch the event.',
  },
  {
    label: 'Crypto payments',
    to: '/features/crypto-donations',
    text: 'Accept Digital Assets payments directly to your wallet.',
  },
];

export default function FinancialRecordsPage() {
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
        eyebrow="Payment tracking and reports"
        title={h1}
        description="FundRaisely keeps payment records and financial reports connected - from the first ticket sale to the final committee update. Cash, card, instant payments and crypto all tracked in one place. Audit-ready reconciliation that locks when approved. Reports that cover the money and the story behind it."
        primaryCta={{ label: 'Book a demo', to: '/contact' }}
        secondaryCta={{ label: 'Explore features', to: '/features' }}
        image={images.paymentsHeroScreenshot}
        status="Payments and reports. Connected."
        variant="standard"
      />

      <section className="section">
        <div className="site-shell problem-solution">
          <article>
            <p className="eyebrow">Problem</p>
            <h2>Fundraising money arrives in too many ways and disappears into too many places</h2>
            <p>
              One supporter pays by card. Another sends Revolut. Someone pays cash on the night. A parent does a bank transfer. Someone in your Web3 community pays in Solana. After the event, the treasurer has to piece together what came in across payment apps, message threads, handwritten notes and a spreadsheet that was already out of date before the doors opened.
            </p>
            <p>
              And then the committee wants a report.
            </p>
          </article>

          <article>
            <p className="eyebrow">Solution</p>
            <h2>One place where payments are tracked and reports are ready when the event ends</h2>
            <p>
              FundRaisely tracks every payment method in the same dashboard - card, Stripe, cash, instant payments, bank transfer and crypto. Each payment has a status. Each status can be confirmed, disputed, resolved or written off. When the event is over, the reconciliation is already built. Approve it, lock it and download the report for the committee.
            </p>
            <p>
              Funds go directly to your organisation. FundRaisely does not hold money or take a percentage. It keeps the records.
            </p>
          </article>
        </div>
      </section>

      <FeatureGrid
        eyebrow="Payment methods"
        title="The ways clubs actually collect money - all tracked in one place"
        text="FundRaisely is built for real fundraising payments, not just card checkout. Every method your organisation uses can be tracked, confirmed and included in the final report."
        items={paymentItems}
      />

      <SplitSection
        eyebrow="Payment tracking"
        title="Every payment has a status. Every status is actionable."
        text="Tracking payments across a fundraiser is not just about knowing who paid. It is about knowing who has not paid yet, who you are still waiting on, who you have given up on and who paid three weeks late. FundRaisely keeps all of that in the same view so the organiser always knows where things stand."
        bullets={[
          'See expected, claimed, confirmed, late, disputed and written-off payments',
          'Auto-confirm Stripe and crypto on Solana payments',
          'Manually confirm cash, instant payments and card tap',
          'Accept late payments after the event closes',
          'Write off uncollectable amounts with a note attached',
          'Resolve disputes with a clear record of what was decided',
        ]}
        image={images.paymentsHeroScreenshot}
        reverse={false}
      />

      <FeatureGrid
        eyebrow="Payment statuses"
        title="Six payment states that cover everything that happens in a real fundraiser"
        text="Most payment tools show paid or unpaid. FundRaisely tracks the full lifecycle of a payment - because in grassroots fundraising, the space between expected and confirmed is where most of the work happens."
        items={paymentStatusItems}
      />

      <SplitSection
        eyebrow="Reconciliation and reports"
        title="Approve the reconciliation. Lock the record. Download the report."
        text="After the event, the organiser reviews what was collected, resolves anything outstanding and approves the reconciliation. Once approved it locks - the committee gets a clean record that nobody can quietly edit afterwards. Late payments and post-event changes are tracked separately so the approved record stays intact."
        bullets={[
          'Review total income and outstanding amounts after the event',
          'Approve and lock the reconciliation - cannot be edited after approval',
          'Track late payments, disputes and write-offs separately',
          'Financial report reflects the latest known position',
          'Impact report covers participation, prizes, sponsors and outcomes',
          'Download all reports for the committee, treasurer or campaign file',
        ]}
        image={images.reportsScreenshot}
        reverse
      />

      <FeatureGrid
        eyebrow="Reports"
        title="What the committee actually needs after the fundraiser"
        text="The approved reconciliation is only part of what a committee needs. FundRaisely generates the financial report, tracks post-event changes and produces an impact summary - so the treasurer has the numbers and the organiser has the story."
        items={reportItems}
      />

      <SplitSection
        eyebrow="Your money stays with you"
        title="FundRaisely keeps the records. Your organisation keeps the money."
        text="Every payment method in FundRaisely connects directly to the organisation - Stripe to your Stripe account, instant payments to your own account details, crypto to your own wallet. FundRaisely does not hold funds, does not take a transaction percentage and does not sit between the supporter and the organisation. The approved reconciliation shows exactly that."
        bullets={[
          'Stripe connects to your own account - not a FundRaisely merchant account',
          'Instant payments go to your own Revolut or bank details',
          'Crypto goes directly to your own Solana wallet',
          'Cash and card tap stay with whoever collected them on the night',
          'Reports confirm direct-to-organisation payment records',
          'No FundRaisely percentage taken from ticket sales or event income',
        ]}
        image={images.paymentsDonations}
        reverse={false}
      />

      <ProcessSteps
        eyebrow="How it works"
        title="From first ticket sale to committee report"
        text="Payment tracking and reporting in FundRaisely follow the natural event lifecycle - set up before, track during, reconcile after, report to the committee."
        steps={processSteps}
      />

      <FAQSection
        items={faqs}
        intro="Common questions about payment tracking, reconciliation and reports in FundRaisely."
      />

      <RelatedLinks links={relatedLinks} />

      <CTASection
        title="Ready for cleaner payment records and committee-ready reports?"
        text="Book a demo to see how FundRaisely tracks payments across every method your organisation uses, generates audit-ready reconciliation and produces downloadable reports - all with funds going directly to you."
        primaryCta={{ label: 'Book a demo', to: '/contact' }}
        secondaryCta={{ label: 'Explore all features', to: '/features' }}
      />
    </>
  );
}