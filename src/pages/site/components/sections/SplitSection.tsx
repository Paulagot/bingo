import { Link } from 'react-router-dom';
import type { SiteImage } from '../../config/imageConfig';
import type { CTA } from './Hero';

type Props = {
  eyebrow?: string;
  title: string;
  text: string;
  bullets?: string[];
  image?: SiteImage;
  cta?: CTA;
  reverse?: boolean;
};

export function SplitSection({ eyebrow, title, text, bullets, image, cta, reverse = false }: Props) {
  return (
    <section className="section">
      <div className={`site-shell split ${reverse ? 'split--reverse' : ''}`}>
        <div className="split__content">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2>{title}</h2>
          <p>{text}</p>
          {bullets && <ul className="check-list">{bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
          {cta && <Link className="text-link" to={cta.to}>{cta.label}</Link>}
        </div>
        {image && <img className="split__image" src={image.src} alt={image.alt} />}
      </div>
    </section>
  );
}
