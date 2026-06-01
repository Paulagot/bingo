import { Link } from 'react-router-dom';
import type { SiteImage } from '../../config/imageConfig';

export type CTA = { label: string; to: string };

type HeroProps = {
  eyebrow?: string;
  title: string;
  description: string;
  primaryCta?: CTA;
  secondaryCta?: CTA;
  image?: SiteImage;
  status?: string;
  variant?: 'home' | 'standard' | 'compact';
};

export function Hero({ eyebrow, title, description, primaryCta, secondaryCta, image, status, variant = 'standard' }: HeroProps) {
  return (
    <section className={`hero hero--${variant}`}>
      <div className="hero__inner site-shell">
        <div className="hero__content">
          <div className="hero__meta-row">
            {eyebrow && <p className="hero__eyebrow">{eyebrow}</p>}
            {status && <span className="status-pill">{status}</span>}
          </div>
          <h1 className="hero__title">{title}</h1>
          <p className="hero__description">{description}</p>
          {(primaryCta || secondaryCta) && (
            <div className="hero__actions">
              {primaryCta && <Link className="button button--primary" to={primaryCta.to}>{primaryCta.label}</Link>}
              {secondaryCta && <Link className="button button--secondary" to={secondaryCta.to}>{secondaryCta.label}</Link>}
            </div>
          )}
        </div>
        {image && (
          <figure className="hero__media">
            <img src={image.src} alt={image.alt} className="hero__image" />
            {image.caption && <figcaption>{image.caption}</figcaption>}
          </figure>
        )}
      </div>
    </section>
  );
}
