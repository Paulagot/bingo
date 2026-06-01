import { Link } from 'react-router-dom';
import type { CTA } from './Hero';

type Props = {
  title: string;
  text: string;
  primaryCta: CTA;
  secondaryCta?: CTA;
};

export function CTASection({ title, text, primaryCta, secondaryCta }: Props) {
  return (
    <section className="section section--cta">
      <div className="site-shell cta-panel">
        <div>
          <h2>{title}</h2>
          <p>{text}</p>
        </div>
        <div className="cta-panel__actions">
          <Link className="button button--primary" to={primaryCta.to}>{primaryCta.label}</Link>
          {secondaryCta && <Link className="button button--outline-light" to={secondaryCta.to}>{secondaryCta.label}</Link>}
        </div>
      </div>
    </section>
  );
}
