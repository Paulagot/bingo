import React, { useState } from 'react';
import { Header } from '../components/GeneralSite2/Header';
import  SiteFooter from '../components/GeneralSite2/SiteFooter';
import { SEO } from '../components/SEO';
import { Sparkles, Calendar, ExternalLink, Play, ArrowRight, Megaphone, Trophy, Rocket, Code } from 'lucide-react';

type UpdateItem = {
  id: number;
  title: string;
  date: string; // human label, e.g. "June 2025"
  description: string;
  image: string; // path under /public
  video?: string | null;
  cta?: { label: string; url: string };
  category?: 'feature' | 'event' | 'achievement' | 'announcement';
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
    id: 15,
    title: 'Announcing the First Annual Web3 Impact Campaign',
    date: 'November 2025',
    description:
      'It\'s official! The First Annual Web3 Impact Campaign dates TBC. Clubs, charities, DAOs and communities can host fundraising quizzes, rally supporters, and showcase on-chain impact.',
    image: '/images/impact.jpg',
    category: 'announcement',
    cta: {
      label: 'Learn about the campaign',
      url: '/impact-campaign',
    },
  },
  {
    id: 14,
    title: 'Web3 Impact Chains for 2025: Base, Solana & Avalanche',
    date: 'November 2025',
    description:
      'For 2025, our Web3 Impact Campaign will spotlight three chains: Base, Solana, and Avalanche. Hosts can choose the ecosystem that best fits their community while keeping setup simple and payouts transparent.',
    image: '/images/chains.jpg',
    category: 'announcement',
  },
  {
    id: 13,
    title: 'Privacy-Protecting Fundraising Portal — Solana Colosseum Hackathon',
    date: 'September 2025',
    description:
      'We built a privacy-preserving donation portal for the Solana Colosseum hackathon: Solana Pay flows, Arcium MPC-backed receipts, and tiered donor commitments — all designed to protect donor privacy while proving impact.',
    image: '/images/colosseum.jpg',
    category: 'event',
    cta: {
      label: 'Visit the live demo',
      url: 'https://cypherpunk-tipjar-web-production.up.railway.app/',
    },
  },
  {
    id: 12,
    title: 'Leaderboard Extras & Scoring: robPoints + Wipeout Restores',
    date: 'August 2025',
    description:
      'Shipped global extras on the leaderboard (e.g., robPoints to steal 5 points) and added Wipeout restorePoints with carry-forward caps. Frontend now displays playerResults from the backend for clear, per-question scoring.',
    image: '/images/leaderboard-extras.jpg',
    category: 'feature',
  },
  {
    id: 11,
    title: 'FreezeOutTeam Logic Fix & Speed Round UX',
    date: 'August 2025',
    description:
      'Fixed FreezeOutTeam so it only applies to the next question (not the current one) and tightened Speed Round UI timing/flash effects to avoid accidental double blocks.',
    image: '/images/freeze-fix.jpg',
    category: 'feature',
  },
  {
    id: 10,
    title: 'Admin-Only Flow, Template Gating & Hardening',
    date: 'August 2025',
    description:
      'Simplified roles to Admin-only (removed Host toggle), added dev-only demo template gating, and hardened CORS/CSP + Reown allowlist for local, staging, and prod. Also improved Payment Reconciliation to include extras and mixed payment methods.',
    image: '/images/admin-gating.jpg',
    category: 'feature',
  },
  {
    id: 9,
    title: 'Stellar Ireland Hackathon',
    date: 'July 2025',
    description:
      'We are thrilled to announce that we will be participating in the Stellar Ireland Hackathon on July 19th. This event is a fantastic opportunity for us to showcase our platform and connect with the Stellar community. Stay tuned for updates!',
    image: '/images/hack.webp',
    category: 'event',
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
    category: 'achievement',
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
    category: 'event',
  },
  {
    id: 6,
    title: 'SCF Kickstart Camp',
    date: 'June 2025',
    description:
      'We are excited to be part of the Stellar Kickstart Camp. 5 super intense days of learning, building and networking with the Stellar community. We are looking forward to sharing our learnings and insights from this event.',
    image: '/images/SCF_build.jpg',
    category: 'event',
  },
  {
    id: 5,
    title: 'Private Beta Open — Clubs & Communities',
    date: 'June 2025',
    description:
      'We are now open for private beta registrations! Clubs and community groups can DM us on X to be included.  Our Quix in a Box event will be ready in July!',
    image: '/images/privatebeta.png',
    category: 'announcement',
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
    category: 'feature',
    video: 'https://youtu.be/toRVX6xF-9k',
  },
  {
    id: 3,
    title: 'Start Up Village at Dogpatch Labs',
    date: 'June 2025',
    description:
      'We are excited to be part of the Start Up Village hosted by Superteam Ireland inside Dogpatch Labs from June 9th to 18th. Stay turned as we post updates as the event happens',
    image: '/images/startupvillage.jpg',
    category: 'event',
  },
  {
    id: 2,
    title: '3rd Place at ETH Dublin Hackathon',
    date: 'May 2025',
    description:
      'Our second hackathon. We ran a live demo of our bingo game with other participants at ETH Dublin and we know the build still needs lots of work, and placed 3rd overall.',
    image: '/images/eth.jpg',
    category: 'achievement',
    video: 'https://youtu.be/PA6Oyxh4jjc',
  },
  {
    id: 1,
    title: 'Prizewinner at Solana Superteam Ireland Breakout Hackathon',
    date: 'May 2025',
    description:
      'Our very first hackathon — and our first win! We came 5th place at the Solana Superteam Ireland Breakout Hackathon.',
    image: '/images/solanasuper.jpg',
    category: 'achievement',
    video: 'https://youtu.be/9ySA87Kjx8s',
  },
];

// Category color schemes
const categoryStyles: Record<string, { bg: string; text: string; icon: any }> = {
  feature: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Code },
  event: { bg: 'bg-purple-100', text: 'text-purple-700', icon: Calendar },
  achievement: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Trophy },
  announcement: { bg: 'bg-green-100', text: 'text-green-700', icon: Megaphone },
};

const WhatsNew: React.FC = () => {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
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

  // Filter updates by category
  const filteredUpdates = selectedCategory === 'all' 
    ? updates 
    : updates.filter(u => u.category === selectedCategory);

  // Get unique categories with counts
  const categories = [
    { id: 'all', label: 'All Updates', count: updates.length },
    { id: 'feature', label: 'Features', count: updates.filter(u => u.category === 'feature').length },
    { id: 'event', label: 'Events', count: updates.filter(u => u.category === 'event').length },
    { id: 'achievement', label: 'Achievements', count: updates.filter(u => u.category === 'achievement').length },
    { id: 'announcement', label: 'Announcements', count: updates.filter(u => u.category === 'announcement').length },
  ].filter(cat => cat.count > 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
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

      <Header />

      {/* Hero Section */}
      <section className="relative px-4 pt-12 pb-8">
        <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-purple-300/30 blur-2xl" />
        <div className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-indigo-300/30 blur-2xl" />
        <div className="container relative z-10 mx-auto max-w-6xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-indigo-700 text-sm font-medium">
            <Sparkles className="h-4 w-4" /> Latest Updates
          </span>
          <h1 className="mt-4 bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent text-4xl md:text-6xl font-bold">
            Inside FundRaisely
          </h1>
          <p className="mx-auto mt-4 max-w-4xl text-indigo-900/70 text-lg md:text-xl leading-relaxed">
            Stay updated with our latest developments, features, and community achievements. Follow our journey building the future of fundraising for clubs and charities.
          </p>
        </div>
      </section>

      {/* Category Filter */}
      <section className="px-4 pb-8">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {categories.map(category => {
              const isActive = selectedCategory === category.id;
              const style = categoryStyles[category.id] || { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: Sparkles };
              const Icon = style.icon;
              
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 font-semibold transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg scale-105'
                      : `bg-white ${style.text} border border-indigo-100 hover:shadow-md hover:scale-102`
                  }`}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  <span>{category.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    isActive ? 'bg-white/20 text-white' : `${style.bg} ${style.text}`
                  }`}>
                    {category.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <main id="main" className="container mx-auto max-w-6xl px-4 pb-16">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredUpdates.map((item) => {
            const isExpanded = expandedId === item.id;
            const shortDescription =
              item.description.length > 120 ? item.description.slice(0, 120) + '…' : item.description;
            const iso = monthYearToISO(item.date);
            const categoryStyle = categoryStyles[item.category || 'announcement'];
            const CategoryIcon = categoryStyle.icon;

            return (
              <article
                key={item.id}
                id={`update-${item.id}`}
                className="group rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 flex flex-col"
                aria-labelledby={`update-title-${item.id}`}
              >
                {/* Image */}
                <div className="relative mb-4 overflow-hidden rounded-xl">
                  <img
                    src={item.image}
                    alt={item.title}
                    loading="lazy"
                    className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  {/* Category Badge Overlay */}
                  <div className={`absolute top-3 right-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${categoryStyle.bg} ${categoryStyle.text} shadow-md`}>
                    <CategoryIcon className="h-3 w-3" />
                    {item.category}
                  </div>
                </div>

                {/* Date */}
                <div className="mb-2 flex items-center gap-1 text-xs text-indigo-900/60">
                  <Calendar className="h-3 w-3" />
                  {iso ? <time dateTime={iso}>{item.date}</time> : item.date}
                </div>

                {/* Title */}
                <h2 id={`update-title-${item.id}`} className="mb-3 text-lg font-semibold text-indigo-900 group-hover:text-indigo-700 transition-colors">
                  {item.title}
                </h2>

                {/* Description */}
                <p className="text-indigo-900/70 text-sm mb-4 flex-grow">
                  {isExpanded ? item.description : shortDescription}
                </p>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 mt-auto">
                  {item.description.length > 120 && (
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                      aria-expanded={isExpanded}
                      aria-controls={`update-desc-${item.id}`}
                    >
                      {isExpanded ? 'Show less' : 'Read more'}
                      <ArrowRight className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                  )}

                  {item.video && (
                    <a
                      href={item.video}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                      aria-label={`Watch video for ${item.title}`}
                    >
                      <Play className="h-4 w-4" />
                      Watch Video
                    </a>
                  )}
                </div>

                {/* CTA Button */}
                {isExpanded && item.cta && (
                  <a
                    href={item.cta.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700 hover:shadow-lg"
                  >
                    {item.cta.label}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </article>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredUpdates.length === 0 && (
          <div className="rounded-2xl border border-indigo-100 bg-white p-12 text-center shadow-sm">
            <Rocket className="h-12 w-12 text-indigo-300 mx-auto mb-4" />
            <p className="text-indigo-900/70 text-lg">No updates in this category yet.</p>
          </div>
        )}
      </main>

      {/* CTA Section */}
      <section className="px-4 py-12">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-700 to-purple-600 p-8 md:p-12 shadow-lg text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Join Our Journey</h2>
            <p className="text-lg max-w-3xl mx-auto leading-relaxed mb-8 text-indigo-100">
              Be part of the FundRaisely community. Follow our progress, share your feedback, and help us build the future of fundraising together.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="/free-trial"
                className="rounded-xl bg-white px-8 py-4 text-indigo-700 font-semibold shadow-md hover:bg-indigo-50 transition-colors text-lg"
              >
                Start Free Trial
              </a>
              <a
                href="/contact"
                className="rounded-xl bg-indigo-800 px-8 py-4 text-white font-semibold shadow-md hover:bg-indigo-900 border border-indigo-600 transition-colors text-lg"
              >
                Get in Touch
              </a>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default WhatsNew;








