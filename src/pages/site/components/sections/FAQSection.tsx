export type FAQItem = { question: string; answer: string };

type Props = {
  title?: string;
  intro?: string;
  items: FAQItem[];
};

export function FAQSection({ title = 'Frequently asked questions', intro, items }: Props) {
  return (
    <section className="section section--muted">
      <div className="site-shell faq-layout">
        <div className="section-heading section-heading--side">
          <p className="eyebrow">FAQ</p>
          <h2>{title}</h2>
          {intro && <p>{intro}</p>}
        </div>
        <div className="faq-list">
          {items.map((item) => (
            <details className="faq-item" key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
