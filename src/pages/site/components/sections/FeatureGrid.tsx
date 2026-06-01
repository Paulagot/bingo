import { Link } from 'react-router-dom';

type GridItem = {
  title: string;
  text: string;
  to?: string;
  label?: string;
};

type Props = {
  eyebrow?: string;
  title: string;
  text?: string;
  items: GridItem[];
  columns?: 'three' | 'four';
};

export function FeatureGrid({ eyebrow, title, text, items, columns = 'three' }: Props) {
  return (
    <section className="section">
      <div className="site-shell">
        <div className="section-heading">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2>{title}</h2>
          {text && <p>{text}</p>}
        </div>
        <div className={`card-grid card-grid--${columns}`}>
          {items.map((item) => (
            <article className="info-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              {item.to && <Link to={item.to}>{item.label ?? 'Learn more'}</Link>}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
