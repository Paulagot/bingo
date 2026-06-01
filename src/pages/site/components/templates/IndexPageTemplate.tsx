import { SEO } from '../seo/SEO';
import { Breadcrumbs } from '../seo/Breadcrumbs';
import { breadcrumbsForPath } from '../seo/breadcrumbUtils';
import { collectionPageJsonLd } from '../seo/structuredData';
import { Hero } from '../sections/Hero';
import { FeatureGrid } from '../sections/FeatureGrid';
import { ProcessSteps } from '../sections/ProcessSteps';
import { FAQSection } from '../sections/FAQSection';
import { RelatedLinks } from '../sections/RelatedLinks';
import { CTASection } from '../sections/CTASection';
import { images, type ImageKey } from '../../config/imageConfig';
import type { BenefitItem, LinkItem, StepItem } from '../../content/types';
import type { FAQItem } from '../sections/FAQSection';

type Props = {
  path: string;
  seoTitle: string;
  seoDescription: string;
  eyebrow: string;
  h1: string;
  intro: string;
  imageKey: ImageKey;
  cards: BenefitItem[];
  steps?: StepItem[];
  faqs?: FAQItem[];
  relatedLinks?: LinkItem[];
};

export function IndexPageTemplate({ path, seoTitle, seoDescription, eyebrow, h1, intro, imageKey, cards, steps, faqs = [], relatedLinks = [] }: Props) {
  const breadcrumbs = breadcrumbsForPath(path, h1);
  const collectionItems = cards
    .filter((card) => Boolean(card.to))
    .map((card) => ({ label: card.title, to: card.to ?? path, description: card.text }));
  return (
    <>
      <SEO title={seoTitle} description={seoDescription} canonicalPath={path} breadcrumbs={breadcrumbs} structuredData={collectionPageJsonLd(path, h1, seoDescription, collectionItems)} />
      <Breadcrumbs items={breadcrumbs} />
      <Hero eyebrow={eyebrow} title={h1} description={intro} primaryCta={{ label: 'Book a demo', to: '/demo' }} secondaryCta={{ label: 'Explore features', to: '/features' }} image={images[imageKey]} variant="compact" />
      <FeatureGrid title="Explore this section" text="Find the pages most relevant to your organisation, from fundraising features and event formats to use cases and practical resources." items={cards} />
      {steps && <ProcessSteps eyebrow="Structure" title="How this fits together" steps={steps} />}
      {faqs.length > 0 && <FAQSection items={faqs} />}
      {relatedLinks.length > 0 && <RelatedLinks links={relatedLinks} />}
      <CTASection title="Want to see how FundRaisely could work for your organisation?" text="Book a demo or explore the ready-to-run fundraising formats that help clubs, schools, charities and community groups raise money with clearer records." primaryCta={{ label: 'Book a demo', to: '/demo' }} secondaryCta={{ label: 'Explore event formats', to: '/event-formats' }} />
    </>
  );
}
