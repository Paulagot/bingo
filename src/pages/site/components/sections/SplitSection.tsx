import { Link } from 'react-router-dom';
import type { SiteImage } from '../../config/imageConfig';
import type { CTA } from './Hero';

export type SplitSectionImageVariant =
  | 'standard'
  | 'mobile'
  | 'wide'
  | 'desktop'
  | 'contain'
  | 'cover'
  | 'small';

type Props = {
  eyebrow?: string;
  title: string;
  text: string;
  bullets?: string[];
  image?: SiteImage;
  cta?: CTA;
  reverse?: boolean;
  imageVariant?: SplitSectionImageVariant;
};

export function SplitSection({
  eyebrow,
  title,
  text,
  bullets,
  image,
  cta,
  reverse = false,
  imageVariant = 'standard',
}: Props) {
  return (
    <section className="section">
      <div
        className={[
          'site-shell',
          'split',
          reverse ? 'split--reverse' : '',
          `split--image-${imageVariant}`,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="split__content">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}

          <h2>{title}</h2>

          <p>{text}</p>

          {bullets && (
            <ul className="check-list">
              {bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          )}

          {cta && (
            <Link className="text-link" to={cta.to}>
              {cta.label}
            </Link>
          )}
        </div>

        {image && (
          <img
            className="split__image"
            src={image.src}
            alt={image.alt}
            loading="lazy"
          />
        )}
      </div>
    </section>
  );
}