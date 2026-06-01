import type { ImageKey } from '../config/imageConfig';
import type { FAQItem } from '../components/sections/FAQSection';
import type { CTA } from '../components/sections/Hero';

export type MarketingStatus = 'live' | 'rolling_out' | 'coming_soon';

export type LinkItem = {
  label: string;
  to: string;
  description?: string;
};

export type BenefitItem = {
  title: string;
  text: string;
  to?: string;
};

export type StepItem = {
  title: string;
  text: string;
};

export type ScreenshotVariant = 'featured' | 'desktop' | 'wide' | 'mobile' | 'standard';
export type ScreenshotDisplayMode = 'contain' | 'cover';

export type ScreenshotSlot = {
  title: string;
  description: string;
  imageKey: ImageKey;
  variant?: ScreenshotVariant;
  displayMode?: ScreenshotDisplayMode;
};

export type VideoSlot = {
  title: string;
  text: string;
  imageKey: ImageKey;
  videoLabel?: string;
  transcript?: string;
  videoUrl?: string;
};

export type VisualEmphasis =
  | 'balanced'
  | 'video_heavy'
  | 'screenshot_heavy'
  | 'photo_heavy';

export type SectionIntro = {
  eyebrow?: string;
  title?: string;
  text?: string;
};

export type SplitContentSection = {
  eyebrow?: string;
  title?: string;
  text?: string;
  bullets?: string[];
  imageKey?: ImageKey;
  reverse?: boolean;
};

export type StatusPanelContent = {
  title?: string;
  text?: string;
  links?: LinkItem[];
};

export type CTASectionContent = {
  title?: string;
  text?: string;
  primaryCta?: CTA;
  secondaryCta?: CTA;
};

export type TemplateSections = {
  statusPanel?: StatusPanelContent;

  screenshots?: SectionIntro;
  benefits?: SectionIntro;
  process?: SectionIntro;
  proof?: SplitContentSection;
  faq?: {
    intro?: string;
  };
  cta?: CTASectionContent;
};

export type TemplateContent = {
  path: string;
  schemaMode?: 'webPage' | 'collectionPage' | 'faqPage';
  seoTitle: string;
  seoDescription: string;

  eyebrow: string;
  h1: string;
  intro: string;

  primaryCta: CTA;
  secondaryCta?: CTA;

  imageKey: ImageKey;

  status?: MarketingStatus;
  statusLabel?: string;

  problemTitle?: string;
  problemText?: string;
  solutionTitle?: string;
  solutionText?: string;

  benefits: BenefitItem[];
  process: StepItem[];
  screenshotSlots: ScreenshotSlot[];

  videoSlot?: VideoSlot;
  visualEmphasis?: VisualEmphasis;

  faqs: FAQItem[];
  relatedLinks: LinkItem[];

  /**
   * Page-specific section headings/copy.
   *
   * Use this when a page needs better public-facing section copy than the
   * generic template fallback.
   */
  sections?: TemplateSections;
};

export const commonFaqs: FAQItem[] = [
  {
    question: 'Is FundRaisely only for quiz nights?',
    answer:
      'No. Quiz fundraisers are the most mature product area, but the platform is being structured around digital fundraising games and event formats, ticketing, payment tracking, reports, campaigns and event management.',
  },
  {
    question: 'Can we use our own images and copy?',
    answer:
      'Yes. This marketing template is designed so you can replace placeholders with real FundRaisely screenshots, gameplay images, community event photos and final copy.',
  },
  {
    question: 'Does this marketing site connect to the live app?',
    answer:
      'No. This is a standalone public marketing frontend. It has routes, layout, SEO structure and page templates, but no backend, game, payment or dashboard integrations.',
  },
];

export function statusText(status?: MarketingStatus) {
  if (status === 'live') return 'Available first';
  if (status === 'rolling_out') return 'Rolling out soon';
  if (status === 'coming_soon') return 'Coming soon';
  return undefined;
}
