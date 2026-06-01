import { images } from '../../config/imageConfig';
import type { ScreenshotSlot } from '../../content/types';

type Props = {
  eyebrow?: string;
  title: string;
  text?: string;
  slots: ScreenshotSlot[];
};

const allowedVariants = ['featured', 'desktop', 'wide', 'mobile', 'standard'] as const;

type ScreenshotVariant = (typeof allowedVariants)[number];

function getSlotVariant(slot: ScreenshotSlot, index: number): ScreenshotVariant {
  const variant = slot.variant as ScreenshotVariant | undefined;

  if (variant && allowedVariants.includes(variant)) {
    return variant;
  }

  // Sensible fallback:
  // first image gets the large treatment unless explicitly set otherwise
  return index === 0 ? 'featured' : 'standard';
}

function getImageDisplayMode(slot: ScreenshotSlot): 'contain' | 'cover' {
  // This lets you optionally add displayMode later without breaking current data.
  // Screenshots should usually be contain so UI is not cropped.
  return slot.displayMode === 'cover' ? 'cover' : 'contain';
}

export function ScreenshotShowcase({ eyebrow, title, text, slots }: Props) {
  if (!slots.length) return null;

  return (
    <section className="section section--screens">
      <div className="site-shell">
        <div className="section-heading">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2>{title}</h2>
          {text && <p>{text}</p>}
        </div>

        <div className="screenshot-showcase">
          {slots.map((slot, index) => {
            const image = images[slot.imageKey];
            const variant = getSlotVariant(slot, index);
            const displayMode = getImageDisplayMode(slot);

            if (!image) {
              return null;
            }

            return (
              <article
                className={[
                  'screenshot-card',
                  `screenshot-card--${variant}`,
                  `screenshot-card--image-${displayMode}`,
                ].join(' ')}
                key={`${slot.imageKey}-${slot.title}`}
              >
                <div className="screenshot-card__media">
                  <img src={image.src} alt={image.alt} />
                </div>

                <div className="screenshot-card__body">
                  <h3>{slot.title}</h3>
                  <p>{slot.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
