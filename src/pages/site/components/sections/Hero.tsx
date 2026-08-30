//src/pages/site/components/sections/Hero.tsx
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
  priority?: boolean; // ✅ NEW: marks this as the LCP image
};

export function Hero({
  eyebrow,
  title,
  description,
  primaryCta,
  secondaryCta,
  image,
  status,
  variant = 'standard',
  priority = false, // ✅ default false - only set true on the home hero
}: HeroProps) {
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
              {primaryCta && (
                <Link className="button button--primary" to={primaryCta.to}>
                  {primaryCta.label}
                </Link>
              )}
              {secondaryCta && (
                <Link className="button button--secondary" to={secondaryCta.to}>
                  {secondaryCta.label}
                </Link>
              )}
            </div>
          )}
        </div>

        {image && (
          <figure className="hero__media">
            {/*
              ✅ LCP IMAGE OPTIMISATION:
              - fetchPriority="high"  → browser fetches this before other images
              - loading="eager"       → never lazy-load the LCP image
              - srcSet + sizes        → browser picks the right size for the screen
              - width/height          → prevents layout shift (CLS)
              - WebP with PNG fallback via <picture>
            */}
            {priority ? (
              <picture>
                <source
                  srcSet={image.srcSet ?? image.src}
                  type="image/webp"
                  sizes="(max-width: 600px) 490px, (max-width: 1200px) 980px, 1672px"
                />
                <img
                  src={image.src}
                  alt={image.alt}
                  className="hero__image"
                  fetchPriority="high"
                  loading="eager"
                  width={image.width ?? 1672}
                  height={image.height ?? 938}
                />
              </picture>
            ) : (
              <img
                src={image.src}
                alt={image.alt}
                className="hero__image"
                loading="lazy"
                width={image.width ?? 1400}
                height={image.height ?? 900}
              />
            )}
            {image.caption && <figcaption>{image.caption}</figcaption>}
          </figure>
        )}
      </div>
    </section>
  );
}
