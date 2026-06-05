import { SEO } from '../seo/SEO';
import { Breadcrumbs } from '../seo/Breadcrumbs';
import { breadcrumbsForPath } from '../seo/breadcrumbUtils';
import {
  compactStructuredData,
  faqJsonLd,
  videoJsonLd,
  webPageJsonLd,
} from '../seo/structuredData';

import { Hero } from '../sections/Hero';
import { SplitSection } from '../sections/SplitSection';
import { FeatureGrid } from '../sections/FeatureGrid';
import { ProcessSteps } from '../sections/ProcessSteps';
import { ScreenshotShowcase } from '../sections/ScreenshotShowcase';
import { FAQSection } from '../sections/FAQSection';
import { RelatedLinks } from '../sections/RelatedLinks';
import { CTASection } from '../sections/CTASection';
import { StatusPanel } from '../sections/StatusPanel';
import { VideoSection } from '../sections/VideoSection';

import { images } from '../../config/imageConfig';
import type { TemplateContent } from '../../content/types';
import { statusText } from '../../content/types';

type Props = {
  content: TemplateContent;
  templateType:
    | 'feature'
    | 'game'
    | 'quiz'
    | 'use-case'
    | 'standard'
    | 'resource';
};

function getFallbackScreenshotTitle(
  content: TemplateContent,
  templateType: Props['templateType'],
) {
  if (content.visualEmphasis === 'screenshot_heavy') {
    return 'Product screens that show the workflow clearly';
  }

  if (content.visualEmphasis === 'video_heavy') {
    return 'Supporting screens from the walkthrough';
  }

  if (templateType === 'game') {
    return 'Gameplay and organiser views';
  }

  if (templateType === 'use-case') {
    return 'What this can look like in practice';
  }

  return 'Product and event visuals';
}

function getFallbackScreenshotText(
  content: TemplateContent,
  templateType: Props['templateType'],
) {
  if (content.visualEmphasis === 'video_heavy') {
    return 'Use the video to explain the flow, then use screenshots to show the key screens people may want to inspect in more detail.';
  }

  if (content.visualEmphasis === 'photo_heavy') {
    return 'Use real event photography first, with product screenshots where they help explain the organiser workflow.';
  }

  if (templateType === 'game') {
    return 'Show the supporter experience, organiser setup and after-event records so visitors can understand how the format works.';
  }

  return 'Use this section to show the most important product screens, event moments or reporting examples for this page.';
}

function getFallbackBenefitsTitle(templateType: Props['templateType']) {
  if (templateType === 'game') {
    return 'What supporters and organisers need to understand';
  }

  if (templateType === 'use-case') {
    return 'How FundRaisely helps this group fundraise';
  }

  if (templateType === 'resource') {
    return 'What this resource should cover';
  }

  return 'Built around practical fundraising work';
}

function getFallbackBenefitsEyebrow(templateType: Props['templateType']) {
  if (templateType === 'game') return 'Format structure';
  if (templateType === 'use-case') return 'How it helps';
  if (templateType === 'resource') return 'Guide sections';
  return 'What this page covers';
}

function getFallbackProcessTitle(templateType: Props['templateType']) {
  if (templateType === 'use-case') return 'Example fundraiser structure';
  if (templateType === 'game') return 'How this format can work';
  if (templateType === 'resource') return 'Suggested reading flow';
  return 'How the workflow fits together';
}

function getFallbackProcessText(templateType: Props['templateType']) {
  if (templateType === 'game') {
    return 'Break the format into clear steps so organisers can understand what happens before, during and after the fundraiser.';
  }

  if (templateType === 'use-case') {
    return 'Use this section to show how a fundraiser could be planned, promoted and reviewed for this audience.';
  }

  return 'Use this section to give visitors a practical middle structure instead of thin holding content.';
}

export function MarketingPageTemplate({ content, templateType }: Props) {
  const statusLabel = content.statusLabel ?? statusText(content.status);
  const breadcrumbs = breadcrumbsForPath(content.path, content.h1);

  const structuredData = compactStructuredData([
    webPageJsonLd(content.path, content.h1, content.seoDescription),
    faqJsonLd(content.faqs),
    videoJsonLd(content.videoSlot, content.path),
  ]);

  const screenshotEyebrow =
    content.sections?.screenshots?.eyebrow ??
    (templateType === 'use-case'
      ? 'Visual plan'
      : content.visualEmphasis === 'video_heavy'
        ? 'Screenshots'
        : 'Product screens');

  const screenshotTitle =
    content.sections?.screenshots?.title ??
    getFallbackScreenshotTitle(content, templateType);

  const screenshotText =
    content.sections?.screenshots?.text ??
    getFallbackScreenshotText(content, templateType);

  const benefitsEyebrow =
    content.sections?.benefits?.eyebrow ??
    getFallbackBenefitsEyebrow(templateType);

  const benefitsTitle =
    content.sections?.benefits?.title ??
    getFallbackBenefitsTitle(templateType);

  const benefitsText = content.sections?.benefits?.text;

  const processEyebrow = content.sections?.process?.eyebrow ?? 'Workflow';

  const processTitle =
    content.sections?.process?.title ?? getFallbackProcessTitle(templateType);

  const processText =
    content.sections?.process?.text ?? getFallbackProcessText(templateType);

  const proofEyebrow = content.sections?.proof?.eyebrow ?? 'Proof point';
  const proofTitle =
    content.sections?.proof?.title ??
    'Ready for final copy, images and proof points';
  const proofText =
    content.sections?.proof?.text ??
    'Use this section for a practical example, organiser context, product explanation or visual proof that helps visitors understand how FundRaisely supports real fundraising work.';
  const proofBullets =
    content.sections?.proof?.bullets ?? [
      'Show the organiser workflow clearly',
      'Keep the copy practical and specific',
      'Link visitors to the most relevant next step',
    ];
  const proofImage =
    images[content.sections?.proof?.imageKey ?? 'committeeReports'];
  const proofReverse = content.sections?.proof?.reverse ?? true;

  const faqIntro =
    content.sections?.faq?.intro ??
    'FAQs are built into the template so each page has useful long-tail content and can answer practical organiser questions.';

  const ctaTitle =
    content.sections?.cta?.title ?? 'Ready to shape this into your fundraiser?';
  const ctaText =
    content.sections?.cta?.text ??
    'Book a demo or explore the event formats and platform features that help organisations run fundraisers with clearer records.';
  const ctaPrimary =
    content.sections?.cta?.primaryCta ?? {
      label: 'Book a demo',
      to: '/demo',
    };
  const ctaSecondary =
    content.sections?.cta?.secondaryCta ?? {
      label: 'Explore quiz fundraisers',
      to: '/event-formats/quiz',
    };

  const statusPanelTitle =
    content.sections?.statusPanel?.title ??
    (content.status === 'coming_soon'
      ? 'This area is being prepared for rollout'
      : 'This area is being rolled out soon');

  const statusPanelText =
    content.sections?.statusPanel?.text ??
    'This page is intentionally structured now so final copy, product screenshots and rollout messaging can be added without changing the route or layout. Today, visitors can be directed to quiz fundraisers, ticketing, payment tracking and reports.';

  const statusPanelLinks =
    content.sections?.statusPanel?.links ?? [
      { label: 'See quiz fundraisers', to: '/event-formats/quiz' },
      { label: 'Book a demo', to: '/demo' },
    ];

  return (
    <>
      <SEO
        title={content.seoTitle}
        description={content.seoDescription}
        canonicalPath={content.path}
        breadcrumbs={breadcrumbs}
        structuredData={structuredData}
      />

      <Breadcrumbs items={breadcrumbs} />

      <Hero
        eyebrow={content.eyebrow}
        title={content.h1}
        description={content.intro}
        primaryCta={content.primaryCta}
        secondaryCta={content.secondaryCta}
        image={images[content.imageKey]}
        status={statusLabel}
        variant="standard"
      />

      {content.status && content.status !== 'live' && (
        <StatusPanel
          title={statusPanelTitle}
          text={statusPanelText}
          links={statusPanelLinks}
        />
      )}

      {content.problemTitle &&
        content.problemText &&
        content.solutionTitle &&
        content.solutionText && (
          <section className="section">
            <div className="site-shell problem-solution">
              <article>
                <p className="eyebrow">Problem</p>
                <h2>{content.problemTitle}</h2>
                <p>{content.problemText}</p>
              </article>

              <article>
                <p className="eyebrow">Solution</p>
                <h2>{content.solutionTitle}</h2>
                <p>{content.solutionText}</p>
              </article>
            </div>
          </section>
        )}

      {/* {content.videoSlot && (
        <VideoSection
          title={content.videoSlot.title}
          text={content.videoSlot.text}
          imageKey={content.videoSlot.imageKey}
          videoLabel={content.videoSlot.videoLabel}
          transcript={content.videoSlot.transcript}
          cta={{ label: 'Book a demo', to: '/demo' }}
        />
      )} */}

      <ScreenshotShowcase
        eyebrow={screenshotEyebrow}
        title={screenshotTitle}
        text={screenshotText}
        slots={content.screenshotSlots}
      />

      <FeatureGrid
        eyebrow={benefitsEyebrow}
        title={benefitsTitle}
        text={benefitsText}
        items={content.benefits}
      />

      <ProcessSteps
        eyebrow={processEyebrow}
        title={processTitle}
        text={processText}
        steps={content.process}
      />

      <SplitSection
        eyebrow={proofEyebrow}
        title={proofTitle}
        text={proofText}
        bullets={proofBullets}
        image={proofImage}
        reverse={proofReverse}
      />

      <FAQSection items={content.faqs} intro={faqIntro} />

      <RelatedLinks links={content.relatedLinks} />

      <CTASection
        title={ctaTitle}
        text={ctaText}
        primaryCta={ctaPrimary}
        secondaryCta={ctaSecondary}
      />
    </>
  );
}
