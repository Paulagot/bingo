import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Megaphone,
  Video,
  Trophy,
  ExternalLink,
  ChevronRight,
  DollarSign
} from 'lucide-react';

type NotificationItem = {
  id: string;
  text: string;
  href: string;
  kind: 'external' | 'internal';
  icon?: React.ReactNode;
};

interface NotificationsTickerProps {
  items?: NotificationItem[];
  className?: string;
}

const DEFAULT_ITEMS: NotificationItem[] = [
  {
    id: 'weekly-zoom',
    text: 'Join our weekly live zoom for fundraising chats and FundRaisely training',
    href: 'https://www.meetup.com/fundraisely/',
    kind: 'external',
    icon: <Video className="h-4.5 w-4.5 text-red-700" />,
  },
  {
    id: 'clubs-league',
    text: 'Win Funds for your Club - join the Junior Sports Clubs Quiz League',
    href: '/campaigns/clubs-league',
    kind: 'internal',
    icon: <Trophy className="h-4.5 w-4.5 text-yellow-700" />,
  },
  {
    id: 'founding-partners',
    text: 'Get lifetime access at our lowest-ever rate - Join as a Founding Partner',
    href: '/founding-partners',
    kind: 'internal',
    icon: <DollarSign className="h-4.5 w-4.5 text-green-700" />,
  },
];

export default function NotificationsTicker({ items, className }: NotificationsTickerProps) {
  const navigate = useNavigate();

  const srcItems = useMemo(() => {
    const base = items && items.length ? items : DEFAULT_ITEMS;
    // Duplicate so the loop feels continuous
    return [...base, ...base];
  }, [items]);

  const handleClick = (item: NotificationItem) => {
    if (item.kind === 'external') {
      window.open(item.href, '_blank', 'noopener,noreferrer');
      return;
    }
    navigate(item.href);
  };

  return (
    <div
      className={[
        'relative w-full overflow-hidden rounded-xl border border-gray-200',
        'bg-white/90 shadow-sm',
        className || '',
      ].join(' ')}
      aria-label="Notifications"
    >
      {/* soft edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white to-transparent" />

      <div className="flex items-center gap-3 px-5 py-3">
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100">
            <Megaphone className="h-5 w-5 text-indigo-700" />
          </span>
          <span className="text-sm font-semibold text-gray-900">Notifications</span>
        </div>

        {/* marquee lane */}
        <div className="relative flex-1 overflow-hidden">
          <div className="ticker group flex w-max items-center gap-12 will-change-transform">
            {srcItems.map((item, idx) => (
              <button
                key={`${item.id}-${idx}`}
                type="button"
                onClick={() => handleClick(item)}
                className="flex items-center gap-3 whitespace-nowrap rounded-full border border-gray-200 bg-white px-4 py-2
                           text-sm font-semibold text-gray-900 shadow-sm
                           hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-700 transition"
                title={item.text}
              >
                <span className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 border border-indigo-100">
                    {item.icon ?? <ChevronRight className="h-4 w-4 text-indigo-700" />}
                  </span>
                  <span className="underline underline-offset-2 decoration-indigo-200 hover:decoration-indigo-500">
                    {item.text}
                  </span>
                </span>

                {item.kind === 'external' ? (
                  <ExternalLink className="h-4 w-4 opacity-70" />
                ) : (
                  <ChevronRight className="h-5 w-5 opacity-70" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .ticker {
          animation: ticker-marquee 40s linear infinite;
        }
        .group:hover .ticker {
          animation-play-state: paused;
        }
        @keyframes ticker-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ticker { animation: none; }
        }
      `}</style>
    </div>
  );
}

