import { Link } from 'react-router-dom';

type RelatedLink = { label: string; to: string; description?: string };

type Props = { title?: string; links: RelatedLink[] };

export function RelatedLinks({ title = 'Related pages', links }: Props) {
  return (
    <section className="section section--compact">
      <div className="site-shell related-links">
        <h2>{title}</h2>
        <div>
          {links.map((link) => (
            <Link key={link.to} to={link.to}>
              <strong>{link.label}</strong>
              {link.description && <span>{link.description}</span>}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
