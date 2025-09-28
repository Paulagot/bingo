import type React from 'react';
import { SEO } from '../components/SEO';
import { Header } from '../components/GeneralSite/Header';
import SiteFooter from '../components/GeneralSite2/SiteFooter';
import { Sparkles, School, Dumbbell, HeartHandshake, Users, Check, PlayCircle } from 'lucide-react';

/** Absolute URL helpers */
function getOrigin(): string {
  const env = (import.meta as any)?.env?.VITE_SITE_ORIGIN as string | undefined;
  if (env) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin.replace(/\/$/, '');
  return 'https://fundraisely.ie';
}
function abs(path: string) { const p = path.startsWith('/') ? path : `/${path}`; return `${getOrigin()}${p}`; }

const Card: React.FC<{ icon: React.ReactNode; title: string; desc: string; href: string }> = ({ icon, title, desc, href }) => (
  <a href={href} className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm hover:shadow-md transition block">
    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-700">{icon}</div>
    <h3 className="text-indigo-900 text-lg font-semibold">{title}</h3>
    <p className="text-indigo-900/70 mt-1">{desc}</p>
  </a>
);

const Bullet: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-3">
    <Check className="mt-1 h-5 w-5 flex-shrink-0 text-green-600" />
    <span className="text-indigo-900/80">{children}</span>
  </li>
);

const QuizUsecaseIndexPage: React.FC = () => {
  // JSON-LD
  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
      { '@type': 'ListItem', position: 2, name: 'Use Cases', item: abs('/quiz/use-cases') },
    ],
  };
  const collectionPageJsonLd = {
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: 'Fundraising Quiz — Use Cases', url: abs('/quiz/use-cases'),
    description: 'Popular ways schools, clubs, charities, and community groups run in-person quiz fundraisers with FundRaisely.',
    isPartOf: abs('/'),
  };
  const itemListJsonLd = {
    '@context': 'https://schema.org', '@type': 'ItemList', name: 'Fundraising Quiz Use Cases',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Schools & PTAs', url: abs('/quiz/use-cases/schools') },
      { '@type': 'ListItem', position: 2, name: 'Sports Clubs', url: abs('/quiz/use-cases/clubs') },
      { '@type': 'ListItem', position: 3, name: 'Charities & Nonprofits', url: abs('/quiz/use-cases/charities') },
      { '@type': 'ListItem', position: 4, name: 'Community Groups', url: abs('/quiz/use-cases/community-groups') },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <SEO
        title="Fundraising Quiz — Use Cases | FundRaisely"
        description="See how schools, clubs, charities, and community groups run in-person quiz fundraisers with FundRaisely. Simple setup, engaging rounds, and automatic reconciliation once paid is marked."
        keywords="quiz fundraiser use cases, PTA quiz night, sports club quiz fundraiser, charity quiz ideas, community quiz"
        domainStrategy="geographic"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />

      <Header />

      {/* Hero */}
      <section className="relative px-4 pt-12 pb-8">
        <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-purple-300/30 blur-2xl" />
        <div className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-indigo-300/30 blur-2xl" />
        <div className="container relative z-10 mx-auto max-w-6xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-indigo-700 text-sm font-medium">
            <Sparkles className="h-4 w-4" /> Real-world ways to fundraise
          </span>
          <h1 className="mt-4 bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent text-4xl md:text-6xl font-bold">
            Fundraising Quiz — Use Cases
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-indigo-900/70 text-lg md:text-xl">
            Run lively in-person quiz nights for schools, clubs, charities, and community groups. Collect payments on the night; once admins mark paid + method, reconciliation updates automatically and exports audit-ready.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a href="/free-trial" className="rounded-xl bg-indigo-700 px-6 py-3 text-white font-semibold shadow-md hover:bg-indigo-800">Start Free Trial</a>
            <a href="/quiz/demo" className="rounded-xl bg-white px-6 py-3 text-indigo-700 font-semibold shadow-md hover:bg-indigo-50 inline-flex items-center gap-2">
              <PlayCircle className="h-5 w-5" /> Watch the Demo
            </a>
          </div>
        </div>
      </section>

      {/* Cards */}
      <section className="px-4 pt-6 pb-10">
        <div className="container mx-auto max-w-6xl">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card icon={<School className="h-5 w-5" />} title="Schools & PTAs" desc="Raise for classroom resources, trips, or sports kits with a family-friendly quiz night." href="/quiz/use-cases/schools" />
            <Card icon={<Dumbbell className="h-5 w-5" />} title="Sports Clubs" desc="Back kits, travel, and facilities with a high-energy clubhouse quiz." href="/quiz/use-cases/clubs" />
            <Card icon={<HeartHandshake className="h-5 w-5" />} title="Charities" desc="Engage supporters and volunteers while raising for campaigns." href="/quiz/use-cases/charities" />
            <Card icon={<Users className="h-5 w-5" />} title="Community Groups" desc="Bring people together and fund local projects the fun way." href="/quiz/use-cases/community-groups" />
          </div>

          {/* Quick reassurance row */}
          <div className="mt-10 rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
            <h2 className="text-indigo-900 text-2xl font-bold mb-1">Why it works</h2>
            <ul className="mt-2 grid gap-2 md:grid-cols-3">
              <Bullet>Fast to set up — 4-step wizard, templates or custom</Bullet>
              <Bullet>Engaging gameplay — General/Wipeout/Speed + tiebreakers</Bullet>
              <Bullet>Payments recorded — mark paid + method → auto reconciliation</Bullet>
            </ul>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default QuizUsecaseIndexPage;

