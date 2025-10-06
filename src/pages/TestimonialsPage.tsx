import type React from 'react';
import { Suspense, lazy } from 'react';
import { SEO } from '../components/SEO';
import { Header } from '../components/GeneralSite2/Header';
import { Quote, Users, Trophy, Target, CalendarClock, Sparkles } from 'lucide-react';

const SiteFooter = lazy(() => import('../components/GeneralSite2/SiteFooter'));

/** Absolute-URL helpers (safe even if env not set) */
function getOrigin(): string {
  const env = (import.meta as any)?.env?.VITE_SITE_ORIGIN as string | undefined;
  if (env) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin.replace(/\/$/, '');
  return 'https://fundraisely.ie';
}
function abs(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${getOrigin()}${p}`;
}

const TestimonialCard: React.FC<{
  quote: string;
  name: string;
  role: string;
  org: string;
}> = ({ quote, name, role, org }) => (
  <article className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm hover:shadow-md transition">
    <Quote className="h-6 w-6 text-indigo-600 mb-3" aria-hidden="true" />
    <p className="text-indigo-900/90 text-base leading-relaxed">“{quote}”</p>
    <footer className="mt-4 text-sm">
      <div className="font-semibold text-indigo-900">{name}</div>
      <div className="text-indigo-900/70">{role}</div>
      <div className="text-indigo-900/60">{org}</div>
    </footer>
  </article>
);

const Stat: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="rounded-xl border border-indigo-100 bg-white p-5 shadow-sm">
    <div className="flex items-center gap-3">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-700" aria-hidden="true">
        {icon}
      </div>
      <div>
        <div className="text-indigo-900 text-2xl font-extrabold">{value}</div>
        <div className="text-indigo-900/70 text-sm">{label}</div>
      </div>
    </div>
  </div>
);

const TestimonialsPage: React.FC = () => {
  // --------- JSON-LD (no Review/AggregateRating; self-serving reviews aren’t eligible) ----------
  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
      { '@type': 'ListItem', position: 2, name: 'Testimonials', item: abs('/testimonials') },
    ],
  };

  const collectionPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Testimonials — FundRaisely Fundraising Quiz',
    url: abs('/testimonials'),
    description:
      'Read testimonials and stories from schools, clubs, and charities using FundRaisely’s fundraising quiz for in-person events.',
    isPartOf: { '@type': 'WebSite', url: abs('/') },
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
        title="Testimonials — FundRaisely Fundraising Quiz"
        description="What schools, clubs, and charities say about running in-person quiz fundraisers with FundRaisely. Real stories, outcomes, and tips."
        keywords="fundraising quiz testimonials, quiz fundraiser case studies, charity quiz reviews, school quiz success stories"
        domainStrategy="geographic"
        type="website"
        structuredData={[breadcrumbsJsonLd, collectionPageJsonLd]}
      />

      <header>
        <Header />
      </header>

      {/* Hero */}
      <section className="relative px-4 pt-12 pb-8">
        <div aria-hidden="true" className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-purple-300/30 blur-2xl" />
        <div aria-hidden="true" className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-indigo-300/30 blur-2xl" />

        <div className="container relative z-10 mx-auto max-w-6xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-indigo-700 text-sm font-medium">
            <Sparkles className="h-4 w-4" aria-hidden="true" /> Success Stories
          </span>

          <h1 className="mt-4 bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent text-4xl md:text-6xl font-bold">
            Testimonials & Stories
          </h1>

          <p className="mx-auto mt-4 max-w-3xl text-indigo-900/70 text-lg md:text-xl">
            Real outcomes from <strong>schools, PTAs, sports clubs, and charities</strong> running in-person quiz nights with
            FundRaisely — simple setup, engaging gameplay, and audit-ready reconciliation once paid + method are marked.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a href="/free-trial" className="rounded-xl bg-indigo-700 px-6 py-3 text-white font-semibold shadow-md hover:bg-indigo-800">
              Start Free Trial
            </a>
            <a
              href="/quiz/demo"
              className="rounded-xl bg-white px-6 py-3 text-indigo-700 font-semibold shadow-md hover:bg-indigo-50"
            >
              Watch the Demo
            </a>
          </div>
        </div>
      </section>

      <main id="main">
        {/* Logo strip (placeholders) */}
        <section className="px-4 pt-2" aria-labelledby="trusted-heading">
          <div className="container mx-auto max-w-6xl">
            <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
              <h2 id="trusted-heading" className="sr-only">Trusted by community groups</h2>
              <p className="text-center text-indigo-900/60 text-sm">Trusted by community groups across Ireland &amp; the UK</p>
              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 rounded-md bg-gradient-to-br from-indigo-50 to-white border border-indigo-100"
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials grid */}
        <section className="px-4 pt-10" aria-labelledby="testimonials-heading">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-6 text-center">
              <h2 id="testimonials-heading" className="text-indigo-900 text-3xl font-bold">What organisers are saying</h2>
              <p className="text-indigo-900/70 mx-auto max-w-2xl">
                Swap these placeholders with your real quotes and org names when ready.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <TestimonialCard
                quote="Set up in one evening. We raised more than our raffle last year and the leaderboard kept the room buzzing."
                name="Aoife M."
                role="Fundraising Lead"
                org="St. Brigid’s Primary School PTA"
              />
              <TestimonialCard
                quote="Marking payments was straightforward — once we marked paid + method, the reconciliation report just worked."
                name="Gavin R."
                role="Club Treasurer"
                org="Riverside Athletics Club"
              />
              <TestimonialCard
                quote="The extras added fun! Freeze and RobinHood had everyone laughing — we’ll run it again next term."
                name="Niamh K."
                role="Events Volunteer"
                org="Westside Youth Charity"
              />
              <TestimonialCard
                quote="The 4-step wizard made it easy. Our committee loved the exportable reports for the minutes."
                name="Paul D."
                role="Committee Chair"
                org="Liffey Rowing Club"
              />
              <TestimonialCard
                quote="Players joined on their phones, and we ran a full event with 18 teams without any fuss."
                name="Sinead T."
                role="Teacher & Organiser"
                org="Oakview Secondary"
              />
              <TestimonialCard
                quote="Clear, simple, and perfect for in-person fundraising nights. The audit trail is a lifesaver."
                name="Mark O."
                role="Volunteer Coordinator"
                org="Northside Community Hub"
              />
            </div>
          </div>
        </section>

        {/* Mini case snapshot (placeholder metrics) */}
        <section className="px-4 pt-10 pb-4" aria-labelledby="case-snapshot-heading">
          <div className="container mx-auto max-w-6xl">
            <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
              <div className="mb-6 text-center">
                <h3 id="case-snapshot-heading" className="text-indigo-900 text-2xl font-bold">Case snapshot</h3>
                <p className="text-indigo-900/70">Replace these sample numbers with your real outcomes.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <Stat icon={<Users className="h-5 w-5" />} label="Players" value="120" />
                <Stat icon={<Trophy className="h-5 w-5" />} label="Funds raised" value="€2,450" />
                <Stat icon={<Target className="h-5 w-5" />} label="Goal achieved" value="122%" />
                <Stat icon={<CalendarClock className="h-5 w-5" />} label="Setup time" value="< 30 min" />
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 pt-10 pb-14" aria-labelledby="cta-heading">
          <div className="container mx-auto max-w-6xl text-center">
            <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white shadow-md">
              <h3 id="cta-heading" className="text-2xl font-bold mb-2">Ready to run your quiz night?</h3>
              <p className="text-white/90 mb-6">
                Start free today — in-person events with automatic reconciliation once paid + method are marked.
              </p>
              <a
                href="/free-trial"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-indigo-700 font-bold shadow-lg hover:bg-indigo-50"
              >
                Start Free Trial
              </a>
              <a
                href="/quiz/demo"
                className="ml-3 inline-flex items-center gap-2 rounded-xl bg-white/10 px-8 py-4 text-white font-bold border border-white/30 hover:bg-white/20"
              >
                Watch the Demo
              </a>
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

export default TestimonialsPage;

