import type React from 'react';
import { Suspense, lazy } from 'react';
import { SEO } from '../components/SEO';
import { Header } from '../components/GeneralSite2/Header';
import { PlayCircle, Check, Clock, Users, Sparkles, FileText, Shield, CreditCard } from 'lucide-react';

const SiteFooter = lazy(() => import('../components/GeneralSite2/SiteFooter'));

const Step: React.FC<{ icon: React.ReactNode; title: string; desc: string }> = ({ icon, title, desc }) => (
  <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm">
    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50">
      <div className="text-indigo-700" aria-hidden="true">{icon}</div>
    </div>
    <h3 className="text-fg mb-1 text-lg font-semibold">{title}</h3>
    <p className="text-fg/70">{desc}</p>
  </div>
);

// Helpers for absolute URLs
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

const DemoPage: React.FC = () => {
  const origin = getOrigin();
  const videoId = (import.meta as any)?.env?.VITE_DEMO_VIDEO_YT_ID as string | undefined; // e.g. "dQw4w9WgXcQ"
  const embedUrl = videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : undefined;
  const thumbMax = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : undefined;
  const thumbHQ  = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : undefined;

  // ---- JSON-LD ----
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
      'See how to set up a fundraising quiz, invite players, enable fundraising extras, and export audit-ready reports. Collect cash or instant payment links; once admins mark paid + method, reconciliation is automatic.',
    thumbnailUrl: [thumbMax || thumbHQ || `${origin}/fundraisely.png`],
    uploadDate: (import.meta as any)?.env?.VITE_DEMO_UPLOAD_DATE || '2025-09-01',
    duration: (import.meta as any)?.env?.VITE_DEMO_DURATION || 'PT2M',
    embedUrl: embedUrl,
    contentUrl: (import.meta as any)?.env?.VITE_DEMO_CONTENT_URL || undefined, // optional self-hosted MP4
    publisher: {
      '@type': 'Organization',
      name: 'FundRaisely',
      logo: { '@type': 'ImageObject', url: `${origin}/fundraisely.png` }
    }
  };

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to run a fundraising quiz with FundRaisely',
    step: [
      { '@type': 'HowToStep', name: 'Create your quiz', text: 'Use the 4-step wizard to set ticketing, extras, and capacity.' },
      { '@type': 'HowToStep', name: 'Invite players', text: 'Share a link or QR; players join on mobile.' },
      { '@type': 'HowToStep', name: 'Collect payments', text: 'Collect cash or instant link; admins mark paid + method.' },
      { '@type': 'HowToStep', name: 'Run and report', text: 'Live scoring, leaderboards, and audit-ready reconciliation export.' },
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
        description="See the FundRaisely fundraising quiz in action: 4-step setup, templates/custom rounds, in-person payments with automatic reconciliation once marked paid, and audit-ready reports."
        keywords="fundraising quiz demo, quiz fundraiser demo, charity quiz software demo, school quiz fundraiser"
        domainStrategy="geographic"
        type="website"
        structuredData={[breadcrumbsJsonLd, videoJsonLd, howToJsonLd]}
      />

      <header>
        <Header />
      </header>

      {/* Hero */}
      <section className="relative px-4 pt-10 pb-6">
        <div aria-hidden="true" className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-purple-300/30 blur-2xl" />
        <div aria-hidden="true" className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-indigo-300/30 blur-2xl" />
        <div className="container relative z-10 mx-auto max-w-6xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-indigo-700 text-sm font-medium">
            <PlayCircle aria-hidden="true" className="h-4 w-4" /> Product Demo
          </span>
          <h1 className="mt-4 bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent text-4xl md:text-6xl font-bold leading-tight">
            Watch the Fundraising Quiz Demo
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-fg/70 text-lg md:text-xl">
            Create a real in-person fundraising quiz in minutes. Collect cash or instant payment links; once admins mark paid and
            choose the method, reconciliation updates automatically and is audit-ready for export.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a
              href="/free-trial"
              className="rounded-xl bg-indigo-700 px-6 py-3 text-white font-semibold shadow-md hover:bg-indigo-800"
            >
              Start Free Trial
            </a>
                {/* New: Founding Partner CTA */}
              <a
                href="/founding-partners"
                className="rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-8 py-4 text-white font-bold shadow-lg hover:scale-105 hover:shadow-xl transition"
              >
                Become a Founding Partner
              </a>
            <a
              href="/signup?source=demo"
              className="rounded-xl bg-white px-6 py-3 text-indigo-700 font-semibold shadow-md hover:bg-indigo-50"
            >
              Create Free Account
            </a>
          </div>
        </div>
      </section>

      {/* Player */}
      <main id="main">
        <section className="px-4 pb-2">
          <div className="container mx-auto max-w-5xl">
            {embedUrl ? (
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-indigo-100 shadow-sm">
                <iframe
                  title="FundRaisely Fundraising Quiz — Product Demo"
                  src={embedUrl}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            ) : (
              <div
                className="relative aspect-video w-full overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-100 via-white to-purple-100 shadow-sm"
                aria-label="Demo video placeholder"
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
                  <PlayCircle aria-hidden="true" className="h-16 w-16 opacity-80" />
                  <p className="text-fg/80 text-base md:text-lg">Demo video coming soon — we’ll embed it right here.</p>
                  <p className="text-fg/60 text-sm">In the meantime, the walkthrough below shows the flow step-by-step.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Walkthrough */}
        <section className="px-4 pt-8 pb-4">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-6 text-center">
              <h2 className="text-fg mb-2 text-3xl font-bold">How the fundraising quiz works</h2>
              <p className="text-fg/70 mx-auto max-w-2xl">
                A simple, reliable flow for in-person events — with automatic reconciliation once marked paid.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Step
                icon={<Sparkles className="h-5 w-5" />}
                title="1) Create your quiz"
                desc="Use the 4-step wizard. Choose a template or customise, set ticketing, extras, and prizes."
              />
               <Step
                icon={<CreditCard className="h-5 w-5" />}
                title="2) Collect & mark payments"
                desc="Collect cash, card tap or, send an instant payment link (e.g., Revolut). Admins mark paid + method."
              />
              <Step
                icon={<Users className="h-5 w-5" />}
                title="3) Invite players"
                desc="Share a join link or QR. Players connect on mobile; you manage attendance."
              />             
              <Step
                icon={<Check className="h-5 w-5" />}
                title="4) Run & export"
                desc="Live scoring, leaderboards, winner logs — plus audit-ready payment reconciliation export."
              />
            </div>
          </div>
        </section>

        {/* Snapshot benefits */}
        <section className="px-4 pt-6 pb-8">
          <div className="container mx-auto max-w-6xl">
            <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="flex items-start gap-3">
                  <Shield className="mt-1 h-5 w-5 text-indigo-700" aria-hidden="true" />
                  <div>
                    <h3 className="text-fg text-lg font-semibold">Audit-ready by design</h3>
                    <p className="text-fg/70">Once paid + method are marked by an admin, reconciliation updates automatically and is exportable.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="mt-1 h-5 w-5 text-indigo-700" aria-hidden="true" />
                  <div>
                    <h3 className="text-fg text-lg font-semibold">Fast setup</h3>
                    <p className="text-fg/70">Spin up an event in minutes with the guided 4-step wizard and templates.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="mt-1 h-5 w-5 text-indigo-700" aria-hidden="true" />
                  <div>
                    <h3 className="text-fg text-lg font-semibold">Clear reports</h3>
                    <p className="text-fg/70">Gameplay, winners, and payment reconciliation exports — ready for committees.</p>
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

        {/* Transcript (placeholder – add real transcript when video is live) */}
        <section className="px-4 pb-12" aria-labelledby="transcript-heading">
          <div className="container mx-auto max-w-5xl">
            <div className="rounded-2xl bg-indigo-50/60 p-6 md:p-8">
              <h2 id="transcript-heading" className="text-fg mb-2 text-2xl font-bold">Demo transcript</h2>
              <p className="text-fg/70 mb-4">We’ll publish the full transcript here for accessibility and SEO as soon as the video is live.</p>
              <details className="rounded-lg bg-white p-4 shadow-sm">
                <summary className="cursor-pointer text-fg font-semibold">Show placeholder transcript</summary>
                <div className="mt-3 text-fg/80 space-y-3">
                  <p><strong>Intro:</strong> Welcome to FundRaisely’s fundraising quiz. In this demo, we’ll set up an event, invite players, and show reporting.</p>
                  <p><strong>Setup:</strong> The 4-step wizard guides ticketing, extras, and capacity. Choose a template or customise rounds.</p>
                  <p><strong>Payments:</strong> Collect cash or an instant link; admins mark paid and choose method; reconciliation updates automatically.</p>
                  <p><strong>Gameplay & reports:</strong> Live scoring, leaderboards, winner logs, and exportable audit-ready reconciliation.</p>
                </div>
              </details>
            </div>
          </div>
        </section>
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

