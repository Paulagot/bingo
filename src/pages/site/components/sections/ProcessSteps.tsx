type Step = { title: string; text: string };

type Props = { eyebrow?: string; title: string; text?: string; steps: Step[] };

export function ProcessSteps({ eyebrow, title, text, steps }: Props) {
  return (
    <section className="section">
      <div className="site-shell">
        <div className="section-heading">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2>{title}</h2>
          {text && <p>{text}</p>}
        </div>
        <ol className="process-list">
          {steps.map((step, index) => (
            <li key={step.title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
