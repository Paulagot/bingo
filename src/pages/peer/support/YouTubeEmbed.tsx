// YouTubeEmbed.tsx
// Click-to-play YouTube embed: shows the poster first and only loads the iframe
// on tap, so the page stays fast on mobile (no third-party JS until asked for).
// Renders nothing when the URL can't be parsed, so it's safe to always mount.

import { useState } from 'react';
import { Play } from 'lucide-react';
import { parseYouTubeId, youTubeThumb, youTubeEmbedUrl } from './youtube';

type Props = {
  url: string | null | undefined;
  title?: string;
  className?: string;
};

export default function YouTubeEmbed({ url, title = 'Video', className = '' }: Props) {
  const [playing, setPlaying] = useState(false);
  const id = parseYouTubeId(url);
  if (!id) return null;

  return (
    <div
      style={{ aspectRatio: '16 / 9' }}
      className={`relative aspect-video w-full overflow-hidden rounded-2xl bg-slate-950 shadow-sm ring-1 ring-black/5 ${className}`}
    >
      {playing ? (
        <iframe
          src={youTubeEmbedUrl(id, true)}
          title={title}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play ${title}`}
          className="group absolute inset-0 h-full w-full"
        >
          <img
            src={youTubeThumb(id, 'maxres')}
            alt=""
            loading="lazy"
            onError={event => {
              // maxres isn't always generated; fall back to hq which always exists.
              (event.currentTarget as HTMLImageElement).src = youTubeThumb(id, 'hq');
            }}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
          />
          <span className="absolute inset-0 bg-black/15 transition group-hover:bg-black/25" />
          <span className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-red-600 text-white shadow-lg transition group-hover:scale-110">
            <Play className="ml-1 h-7 w-7 fill-white" />
          </span>
        </button>
      )}
    </div>
  );
}