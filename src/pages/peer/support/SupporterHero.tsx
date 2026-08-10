// SupporterHero.tsx
// The story hero, borrowed from the sponsorship flow's look (gradient banner +
// overlapping avatar) and fixed to show BOTH stories: when a participant is
// present, their photo/name/message sit ABOVE an "About this cause" divider and
// the cause story — never one instead of the other. Optional cover image and
// optional click-to-play videos at each level. Built standalone (explicit
// props, no page coupling) so it can later replace the sponsorship flow's hero.

import type { ReactNode } from 'react';
import { Heart, User } from 'lucide-react';
import YouTubeEmbed from './YouTubeEmbed';

type Participant = {
  name: string;
  message?: string | null;
  photoUrl?: string | null;
  videoUrl?: string | null;
};

type Props = {
  clubName?: string | null;
  fundraiserName?: string | null;
  causeStory?: string | null;
  coverImageUrl?: string | null;
  causeVideoUrl?: string | null;
  logoUrl?: string | null;
  participant?: Participant | null;
  /** Slot for <ProgressBars/>, so the hero stays layout-only. */
  progress?: ReactNode;
};

export default function SupporterHero({
  clubName,
  fundraiserName,
  causeStory,
  coverImageUrl,
  causeVideoUrl,
  logoUrl,
  participant,
  progress,
}: Props) {
  const avatar = participant?.photoUrl ? (
    <img src={participant.photoUrl} alt={participant.name} className="h-full w-full object-cover" />
  ) : logoUrl ? (
    <img src={logoUrl} alt={`${clubName || 'Club'} logo`} className="h-full w-full object-contain p-2" />
  ) : participant ? (
    <User className="h-10 w-10 text-[var(--fr-primary)]" />
  ) : (
    <Heart className="h-10 w-10 fill-[var(--fr-primary)] text-[var(--fr-primary)]" />
  );

  return (
    <section className="overflow-hidden rounded-[2rem] bg-white/95 shadow-sm ring-1 ring-black/5">
      {/* banner: cover image if provided, otherwise brand gradient */}
      <div className="relative h-36 w-full sm:h-44">
        {coverImageUrl ? (
          <img src={coverImageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[var(--fr-primary)] via-[var(--fr-accent)] to-[var(--fr-primary)]" />
        )}
        {/* overlapping avatar */}
        <div className="absolute -bottom-10 left-6 grid h-24 w-24 place-items-center overflow-hidden rounded-3xl bg-white shadow-md ring-4 ring-white">
          {avatar}
        </div>
      </div>

      <div className="px-6 pb-6 pt-14">
        {clubName && (
          <p className="text-xs font-black uppercase tracking-wide text-[var(--fr-primary)]">{clubName}</p>
        )}
        {fundraiserName && (
          <h1 className="mt-1 break-words text-[clamp(1.35rem,6vw,2rem)] font-black leading-tight tracking-tight text-slate-950">
            {fundraiserName}
          </h1>
        )}

        {participant ? (
          <>
            <p className="mt-3 text-xl font-black text-slate-900">{participant.name}</p>
            {participant.message && (
              <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-6 text-slate-500">
                {participant.message}
              </p>
            )}
            {participant.videoUrl && (
              <div className="mt-4">
                <YouTubeEmbed url={participant.videoUrl} title={`${participant.name}'s video`} />
              </div>
            )}

            {(causeStory || causeVideoUrl) && (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">About this cause</p>
                {causeStory && (
                  <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-6 text-slate-500">
                    {causeStory}
                  </p>
                )}
                {causeVideoUrl && (
                  <div className="mt-4">
                    <YouTubeEmbed url={causeVideoUrl} title={`${fundraiserName || 'Cause'} video`} />
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {causeStory && (
              <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-6 text-slate-500">
                {causeStory}
              </p>
            )}
            {causeVideoUrl && (
              <div className="mt-4">
                <YouTubeEmbed url={causeVideoUrl} title={`${fundraiserName || 'Cause'} video`} />
              </div>
            )}
          </>
        )}

        {progress && <div className="mt-5">{progress}</div>}
      </div>
    </section>
  );
}