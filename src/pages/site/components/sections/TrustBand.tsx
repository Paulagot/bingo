type Props = { items: string[] };

export function TrustBand({ items }: Props) {
  return (
    <section className="trust-band" aria-label="Platform highlights">
      <div className="site-shell trust-band__inner">
        {items.map((item) => <span key={item}>{item}</span>)}
      </div>
    </section>
  );
}
