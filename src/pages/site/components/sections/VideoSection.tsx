import { Link } from 'react-router-dom';
import { images, type ImageKey } from '../../config/imageConfig';

type VideoSectionProps = {
  eyebrow?: string;
  title: string;
  text: string;
  imageKey: ImageKey;
  videoLabel?: string;
  transcriptTitle?: string;
  transcript?: string;
  cta?: { label: string; to: string };
};

export function VideoSection({
  eyebrow = 'Video demo',
  title,
  text,
  imageKey,
  videoLabel = 'Video placeholder',
  transcriptTitle = 'What this video should cover',
  transcript,
  cta,
}: VideoSectionProps) {
  const image = images[imageKey];

  return (
    <section className="section section--video">
      <div className="site-shell video-section">
        <div className="video-section__copy">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2>{title}</h2>
          <p>{text}</p>
          {cta && <Link className="button button--outline-dark" to={cta.to}>{cta.label}</Link>}
        </div>

        <article className="video-card" aria-label={videoLabel}>
          <div className="video-card__media">
            <img src={image.src} alt={image.alt} />
            <span className="video-card__play" aria-hidden="true">▶</span>
          </div>
          <div className="video-card__body">
            <h3>{videoLabel}</h3>
            <p>{transcript ?? 'Replace this placeholder with an embedded demo video or a clickable video thumbnail. Keep a short written summary nearby so the page still works for search engines and visitors who do not watch the video.'}</p>
          </div>
        </article>

        {/* <div className="video-section__note">
          <h3>{transcriptTitle}</h3>
          <p>{transcript ?? 'Use this space for a short explanation of the demo: what the organiser sees, what the supporter sees, and what the viewer should understand after watching.'}</p>
        </div> */}
      </div>
    </section>
  );
}
