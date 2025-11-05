import React, { useState } from 'react';
import { Header } from '../components/GeneralSite2/Header';
import  SiteFooter from '../components/GeneralSite2/SiteFooter';
import { SEO } from '../components/SEO';

type UpdateItem = {
  id: number;
  title: string;
  date: string; // human label, e.g. "June 2025"
  description: string;
  image: string; // path under /public
  video?: string | null;
  cta?: { label: string; url: string };
};

// --- helpers ---
function getOrigin(): string {
  const env = (import.meta as any)?.env?.VITE_SITE_ORIGIN as string | undefined;
  if (env) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin.replace(/\/$/, '');
  return 'https://fundraisely.co.uk';
}
function abs(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${getOrigin()}${p}`;
}
function monthYearToISO(d: string): string | undefined {
  // Converts "June 2025" -> "2025-06-01"
  const m = d.trim().toLowerCase().match(/^([a-z]+)\s+(\d{4})$/);
  if (!m) return undefined;
  const months: Record<string, string> = {
    january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
    july: '07', august: '08', september: '09', october: '10', november: '11', december: '12'
  };
  const mm = months[m[1]];
  const yyyy = m[2];
  return mm ? `${yyyy}-${mm}-01` : undefined;
}

const updates: UpdateItem[] = [
  {
    id: 9,
    title: 'Stellar Ireland Hackathon',
    date: 'July 2025',
    description:
      'We are thrilled to announce that we will be participating in the Stellar Ireland Hackathon on July 19th. This event is a fantastic opportunity for us to showcase our platform and connect with the Stellar community. Stay tuned for updates!',
    image: '/images/hack.webp',
    cta: {
      label: 'Connect with Stellar Ireland',
      url: 'https://x.com/Stellar_IE',
    },
  },
  {
    id: 8,
    title: 'SCF Build Award Community Vote',
    date: 'July 2025',
    description:
      'Super cool to be accepted into the SCF Build Award Community Vote. We are looking forward to sharing our progress and getting feedback from the community. Your support means a lot to us!',
    image: '/images/scf.jpg',
    cta: {
      label: 'Check out our submission',
      url: 'https://communityfund.stellar.org/dashboard/submissions/reczxSWIT1rp5ov92',
    },
  },
  {
    id: 7,
    title: 'From Idea to Startup in 4 hours',
    date: 'July 2025',
    description:
      'This workshop, led by Kevin, hosted in WorkIQ Tallagh, sponsored by Superteam Ireland was amazing. For a lean startup, helping clubs and chrities raise funds, learning to use AI tools is a must.  It will save our partners time and money.',
    image: '/images/ai.jpg',
  },
  {
    id: 6,
    title: 'SCF Kickstart Camp',
    date: 'June 2025',
    description:
      'We are excited to be part of the Stellar Kickstart Camp. 5 super intense days of learning, building and networking with the Stellar community. We are looking forward to sharing our learnings and insights from this event.',
    image: '/images/SCF_build.jpg',
  },
  {
    id: 5,
    title: 'Private Beta Open — Clubs & Communities',
    date: 'June 2025',
    description:
      'We are now open for private beta registrations! Clubs and community groups can DM us on X to be included.  Our Quix in a Box event will be ready in July!',
    image: '/images/privatebeta.png',
    cta: {
      label: 'DM us on X',
      url: 'https://twitter.com/messages/compose?recipient_id=YOUR_USER_ID',
    },
  },
  {
    id: 4,
    title: 'Fundraising Quiz Demo: Setup & Go!',
    date: 'June 2025',
    description:
      'A quick demo showing how easy it is to get your fundraising quiz in a box setup and running on FundRaisely.  The build is looking good!',
    image: '/images/quiz.png',
    video: 'https://youtu.be/toRVX6xF-9k',
  },
  {
    id: 3,
    title: 'Start Up Village at Dogpatch Labs',
    date: 'June 2025',
    description:
      'We are excited to be part of the Start Up Village hosted by Superteam Ireland inside Dogpatch Labs from June 9th to 18th. Stay turned as we post updates as the event happens',
    image: '/images/startupvillage.jpg',
  },
  {
    id: 2,
    title: '3rd Place at ETH Dublin Hackathon',
    date: 'May 2025',
    description:
      'Our second hackathon. We ran a live demo of our bingo game with other participants at ETH Dublin and we know the build still needs lots of work, and placed 3rd overall.',
    image: '/images/eth.jpg',
    video: 'https://youtu.be/PA6Oyxh4jjc',
  },
  {
    id: 1,
    title: 'Prizewinner at Solana Superteam Ireland Breakout Hackathon',
    date: 'May 2025',
    description:
      'Our very first hackathon — and our first win! We came 5th place at the Solana Superteam Ireland Breakout Hackathon.',
    image: '/images/solanasuper.jpg',
    video: 'https://youtu.be/9ySA87Kjx8s',
  },
];

const WhatsNew: React.FC = () => {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const origin = getOrigin();

  // ---- JSON-LD (list page) ----
  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
      { '@type': 'ListItem', position: 2, name: "What's New", item: abs('/whats-new') },
    ],
  };

  const collectionPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: "What's New — FundRaisely",
    url: abs('/whats-new'),
    description:
      "Latest updates, features, events and community highlights from FundRaisely's fundraising platform.",
    isPartOf: { '@type': 'WebSite', url: abs('/') },
  };

  // Represent visible cards as an ItemList (use anchors for per-item URLs)
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: updates.map((u, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'CreativeWork',
        name: u.title,
        description: u.description,
        url: `${origin}/whats-new#update-${u.id}`,
        image: `${origin}${u.image}`,
        datePublished: monthYearToISO(u.date),
      },
    })),
  };

  const toggleExpand = (id: number) => setExpandedId(expandedId === id ? null : id);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white pb-20">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-white px-3 py-2 rounded-md shadow"
      >
        Skip to content
      </a>

      <SEO
        title="Inside FundRaisely — Latest Updates"
        description="Stay updated with FundRaisely's latest developments, features, and community achievements. Follow our journey building the future of fundraising for clubs and charities."
        keywords="fundraisely updates, platform news, fundraising innovations, development progress"
        ukKeywords="fundraising platform updates UK, charity software news Britain, nonprofit technology UK"
        ieKeywords="fundraising platform updates Ireland, charity software news Ireland, nonprofit technology Ireland"
        type="update"
        domainStrategy="geographic"
        structuredData={[breadcrumbsJsonLd, collectionPageJsonLd, itemListJsonLd]}
      />

      <header>
        <Header />
      </header>

      <main id="main" className="container mx-auto max-w-6xl px-4 pb-16 pt-16">
        <h1 className="mb-8 text-4xl font-bold text-indigo-700">Inside FundRaisely</h1>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {updates.map((item) => {
            const isExpanded = expandedId === item.id;
            const shortDescription =
              item.description.length > 80 ? item.description.slice(0, 80) + '…' : item.description;
            const iso = monthYearToISO(item.date);

            return (
              <article
                key={item.id}
                id={`update-${item.id}`}
                className="bg-muted flex h-full flex-col rounded-xl border border-gray-100 p-5 shadow-md"
                aria-labelledby={`update-title-${item.id}`}
              >
                <img
                  src={item.image}
                  alt={item.title}
                  loading="lazy"
                  className="mb-4 h-40 w-full rounded-lg object-cover"
                />

                <h2 id={`update-title-${item.id}`} className="mb-1 text-lg font-semibold text-indigo-700">
                  {item.title}
                </h2>

                <p className="text-fg/60 mb-2 text-sm">
                  {iso ? <time dateTime={iso}>{item.date}</time> : item.date}
                </p>

                <p className="text-fg/80 mb-3">
                  {isExpanded ? item.description : shortDescription}
                </p>

                {item.description.length > 80 && (
                  <button
                    onClick={() => toggleExpand(item.id)}
                    className="mb-2 text-sm font-medium text-indigo-600 hover:underline"
                    aria-expanded={isExpanded}
                    aria-controls={`update-desc-${item.id}`}
                  >
                    {isExpanded ? 'Show less' : 'Read more'}
                  </button>
                )}

                {item.video && (
                  <a
                    href={item.video}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-2 font-medium text-indigo-600 hover:underline"
                    aria-label={`Watch video for ${item.title}`}
                  >
                    🎥 Watch video
                  </a>
                )}

                {isExpanded && item.cta && (
                  <a
                    href={item.cta.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700"
                  >
                    {item.cta.label}
                  </a>
                )}
              </article>
            );
          })}
        </div>
      </main>
<SiteFooter />
    </div>
  );
};

export default WhatsNew;







