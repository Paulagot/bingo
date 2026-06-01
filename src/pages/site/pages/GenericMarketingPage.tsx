import { IndexPageTemplate } from '../components/templates/IndexPageTemplate';
import type { ImageKey } from '../config/imageConfig';

type GenericMarketingPageProps = {
  path: string;
  seoTitle: string;
  seoDescription: string;
  eyebrow: string;
  h1: string;
  intro: string;
  imageKey?: ImageKey;
  cards?: { title: string; text: string; to?: string }[];
};

export default function GenericMarketingPage({ path, seoTitle, seoDescription, eyebrow, h1, intro, imageKey = 'communityCelebration', cards }: GenericMarketingPageProps) {
  return (
    <IndexPageTemplate
      path={path}
      seoTitle={seoTitle}
      seoDescription={seoDescription}
      eyebrow={eyebrow}
      h1={h1}
      intro={intro}
      imageKey={imageKey}
      cards={cards ?? [
        { title: 'Platform overview', text: 'Use this section to add final copy, links and screenshots for this page.', to: '/features' },
        { title: 'Quiz fundraisers', text: 'Link visitors towards the most mature product area.', to: '/event-formats/quiz' },
        { title: 'Practical reports', text: 'Show how FundRaisely supports after-event review.', to: '/features/reports' },
      ]}
      steps={[
        { title: 'Explain the page purpose', text: 'Use the hero to make the page intent clear in one short paragraph.' },
        { title: 'Add useful sections', text: 'Use cards, screenshots and FAQs rather than thin holding content.' },
        { title: 'Guide the visitor onward', text: 'Include internal links to related features, event formats and use cases.' },
      ]}
      faqs={[
        { question: 'Is this page ready for final copy?', answer: 'Yes. The structure is ready and the holding copy can be replaced section by section.' },
        { question: 'Should this page include images?', answer: 'Yes. Use photographic images for brand and use-case pages, and product screenshots for feature or demo pages.' },
      ]}
      relatedLinks={[
        { label: 'Features', to: '/features' },
        { label: 'Event Formats', to: '/event-formats' },
        { label: 'Use cases', to: '/use-cases' },
      ]}
    />
  );
}
