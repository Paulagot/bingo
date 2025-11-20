import type React from 'react';
import { Suspense, lazy } from 'react';
import { SEO } from '../components/SEO';
import { Header } from '../components/GeneralSite2/Header';
import {
  PlayCircle,
  Check,
  Clock,
  Users,
  Sparkles,
  FileText,
  Shield,
  CreditCard,
} from 'lucide-react';

const SiteFooter = lazy(() => import('../components/GeneralSite2/SiteFooter'));

/** -----------------------------------------------------------
 *  INLINE YouTubeBlock (same pattern as FundraisingQuizPage)
 * ------------------------------------------------------------*/
type YouTubeBlockProps = {
  title: string;
  youtubeUrlOrId: string;
  className?: string;
};

const YouTubeBlock: React.FC<YouTubeBlockProps> = ({
  title,
  youtubeUrlOrId,
  className,
}) => {
  // Extract ID from full URLs or accept raw ID
  const idMatch = youtubeUrlOrId.match(
    /(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/
  );
  const id = idMatch ? idMatch[1] : youtubeUrlOrId;

  const embed = `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
  const poster = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

  return (
    <div className={`relative w-full ${className ?? ''}`}>
      {/* Maintain 16:9 ratio */}
      <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
        <iframe
          title={title}
          loading="lazy"
          src={embed}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="absolute inset-0 h-full w-full rounded-2xl"
        />
      </div>

      {/* noscript SEO fallback */}
      <noscript>
        <a href={`https://www.youtube.com/watch?v=${id}`} aria-label={title}>
          <img src={poster} alt={title} className="h-full w-full object-contain" />
        </a>
      </noscript>
    </div>
  );
};

/** -----------------------------------------------------------
 *  Step component
 * ------------------------------------------------------------*/
const Step: React.FC<{ icon: React.ReactNode; title: string; desc: string }> = ({
  icon,
  title,
  desc,
}) => (
  <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm">
    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50">
      <div className="text-indigo-700" aria-hidden="true">
        {icon}
      </div>
    </div>
    <h3 className="text-fg mb-1 text-lg font-semibold">{title}</h3>
    <p className="text-fg/70">{desc}</p>
  </div>
);

// Helpers
function getOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  return 'https://fundraisely.co.uk';
}
function abs(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${getOrigin()}${p}`;
}

const DemoPage: React.FC = () => {
  const origin = getOrigin();

  /** HARD-CODED YouTube ID (no env vars needed) */
  const DEMO_VIDEO_ID = 'Svgooj8Yq_0';

  const thumbMax = `https://img.youtube.com/vi/${DEMO_VIDEO_ID}/maxresdefault.jpg`;
  const thumbHQ = `https://img.youtube.com/vi/${DEMO_VIDEO_ID}/hqdefault.jpg`;

  /** JSON-LD */
  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
      { '@type': 'ListItem', position: 2, name: 'Demo', item: abs('/quiz/demo') },
    ],
  };

  const videoJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: 'FundRaisely Fundraising Quiz — Product Demo',
    description:
      'See how to set up a fundraising quiz, invite players, enable fundraising extras, and export audit-ready reports.',
    thumbnailUrl: [thumbMax, thumbHQ],
    uploadDate: '2025-01-01',
    duration: 'PT3M12S',
    embedUrl: `https://www.youtube-nocookie.com/embed/${DEMO_VIDEO_ID}`,
    publisher: {
      '@type': 'Organization',
      name: 'FundRaisely',
      logo: { '@type': 'ImageObject', url: `${origin}/fundraisely.png` },
    },
  };

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to run a fundraising quiz with FundRaisely',
    step: [
      { '@type': 'HowToStep', name: 'Create your quiz', text: 'Use the 4-step wizard.' },
      { '@type': 'HowToStep', name: 'Invite players', text: 'Share link or QR.' },
      { '@type': 'HowToStep', name: 'Collect payments', text: 'Cash, tap, instant link.' },
      { '@type': 'HowToStep', name: 'Run & report', text: 'Live scoring & exports.' },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-white px-3 py-2 rounded-md shadow"
      >
        Skip to content
      </a>

      <SEO
        title="Fundraising Quiz Demo — Watch How FundRaisely Works"
        description="See the fundraising quiz in action: 4-step setup, templates/custom rounds, in-person payments, and audit-ready reports."
        keywords="fundraising quiz demo, quiz fundraiser software"
        domainStrategy="geographic"
        type="website"
        structuredData={[breadcrumbsJsonLd, videoJsonLd, howToJsonLd]}
      />

      <header>
        <Header />
      </header>

      {/* HERO */}
      <section className="relative px-4 pt-10 pb-6">
        <div aria-hidden="true" className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-purple-300/30 blur-2xl" />
        <div aria-hidden="true" className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-indigo-300/30 blur-2xl" />

        <div className="container relative z-10 mx-auto max-w-6xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-indigo-700 text-sm font-medium">
            <PlayCircle aria-hidden="true" className="h-4 w-4" /> Product Demo
          </span>

          <h1 className="mt-4 bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent text-4xl md:text-6xl font-bold">
            Watch the Fundraising Quiz Demo
          </h1>

          <p className="mx-auto mt-4 max-w-3xl text-fg/70 text-lg md:text-xl">
            Learn how to launch a quiz night, collect payments, and export audit-ready
            reconciliation.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a href="/free-trial" className="rounded-xl bg-indigo-700 px-6 py-3 text-white font-semibold shadow-md hover:bg-indigo-800">
              Start Free Trial
            </a>
            <a href="/founding-partners" className="rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-8 py-4 text-white font-bold shadow-lg hover:scale-105 transition">
              Become a Founding Partner
            </a>
            <a href="/signup?source=demo" className="rounded-xl bg-white px-6 py-3 text-indigo-700 font-semibold shadow-md hover:bg-indigo-50">
              Create Free Account
            </a>
          </div>
        </div>
      </section>

      {/* VIDEO */}
      <main id="main">
        <section className="px-4 pb-2">
          <div className="container mx-auto max-w-5xl">
            <YouTubeBlock
              title="FundRaisely Fundraising Quiz — Product Demo"
              youtubeUrlOrId={DEMO_VIDEO_ID}
              className="rounded-2xl border border-indigo-100 shadow-sm"
            />
          </div>
        </section>

        {/* WALKTHROUGH */}
        <section className="px-4 pt-8 pb-4">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-6 text-center">
              <h2 className="text-fg mb-2 text-3xl font-bold">How the fundraising quiz works</h2>
              <p className="text-fg/70 mx-auto max-w-2xl">
                A simple, reliable flow for in-person events.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Step icon={<Sparkles className="h-5 w-5" />} title="1) Create your quiz" desc="Use the 4-step wizard with templates." />
              <Step icon={<CreditCard className="h-5 w-5" />} title="2) Invite players" desc="Share join link or QR." />
              <Step icon={<Users className="h-5 w-5" />} title="3)  Collect & mark payments " desc="Cash, tap or instant payment link (Revolut etc.)." />
              <Step icon={<Check className="h-5 w-5" />} title="4) Run & export" desc="Questions, reviews, leaderboard, Live scoring + audit-ready export." />
            </div>
          </div>
        </section>

        {/* BENEFITS */}
        <section className="px-4 pt-6 pb-8">
          <div className="container mx-auto max-w-6xl">
            <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="flex items-start gap-3">
                  <Shield className="mt-1 h-5 w-5 text-indigo-700" />
                  <div>
                    <h3 className="text-fg text-lg font-semibold">Audit-ready</h3>
                    <p className="text-fg/70">Reconciliation updates once paid + method are marked.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="mt-1 h-5 w-5 text-indigo-700" />
                  <div>
                    <h3 className="text-fg text-lg font-semibold">Fast setup</h3>
                    <p className="text-fg/70">Launch an event in minutes.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FileText className="mt-1 h-5 w-5 text-indigo-700" />
                  <div>
                    <h3 className="text-fg text-lg font-semibold">Clear reports</h3>
                    <p className="text-fg/70">Gameplay + reconciliation exports.</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center">
                <a href="/free-trial" className="rounded-xl bg-indigo-700 px-6 py-3 text-white font-semibold shadow-md hover:bg-indigo-800">
                  Try it free
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* TRANSCRIPT */}
        {/* <section className="px-4 pb-12" aria-labelledby="transcript-heading">
          <div className="container mx-auto max-w-5xl">
            <div className="rounded-2xl bg-indigo-50/60 p-6 md:p-8">
              <h2 id="transcript-heading" className="text-fg mb-2 text-2xl font-bold">
                Demo transcript
              </h2>

              <p className="text-fg/70 mb-4">
                We’ll publish the full transcript here when the final video is live.
              </p>

              <details className="rounded-lg bg-white p-4 shadow-sm">
                <summary className="cursor-pointer text-fg font-semibold">Show placeholder transcript</summary>

                <div className="mt-3 text-fg/80 space-y-3">
                  <p><strong>Intro:</strong> Welcome to FundRaisely’s fundraising quiz demo…</p>
                  <p><strong>Setup:</strong> 4-step wizard covering ticketing, extras, prizes…</p>
                  <p><strong>Payments:</strong> Mark paid + method and reconciliation updates…</p>
                  <p><strong>Gameplay:</strong> Leaderboards, winners, and clear exports…</p>
                </div>
              </details>
            </div>
          </div>
        </section> */}
      </main>

      <footer>
        <Suspense fallback={null}>
          <SiteFooter />
        </Suspense>
      </footer>
    </div>
  );
};

export default DemoPage;



