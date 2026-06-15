import { Link } from 'react-router-dom';

type Props = { title: string; text: string; links?: { label: string; to: string }[] };

export function StatusPanel({ title, text, links = [] }: Props) {
  return (
    <section className="section section--compact">
      <div className="site-shell status-panel">
        <div>
          <p className="eyebrow">Availability</p>
          <h2>{title}</h2>
          <p>{text}</p>
        </div>
        {links.length > 0 && <div>{links.map((link) => <Link key={link.to} className="button button--outline-dark" to={link.to}>{link.label}</Link>)}</div>}
      </div>
    </section>
  );
}
