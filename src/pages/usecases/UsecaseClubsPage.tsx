import type React from 'react';
import { SEO } from '../../components/SEO';
import { Header } from '../../components/GeneralSite/Header';
import SiteFooter from '../../components/GeneralSite2/SiteFooter';
import { Sparkles,  Check, QrCode, CreditCard, FileText, PlayCircle } from 'lucide-react';

function getOrigin(): string {
  const env = (import.meta as any)?.env?.VITE_SITE_ORIGIN as string | undefined;
  if (env) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin.replace(/\/$/, '');
  return 'https://fundraisely.ie';
}
function abs(path: string) { const p = path.startsWith('/') ? path : `/${path}`; return `${getOrigin()}${p}`; }

const Bullet: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-3"><Check className="mt-1 h-5 w-5 flex-shrink-0 text-green-600" /><span className="text-indigo-900/80">{children}</span></li>
);

const UsecaseSchoolPage: React.FC = () => {
  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
      { '@type': 'ListItem', position: 2, name: 'Use Cases', item: abs('/quiz/use-cases') },
      { '@type': 'ListItem', position: 3, name: 'Schools & PTAs', item: abs('/quiz/use-case/schools') },
    ],
  };
  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'Is the quiz suitable for families?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Mix General rounds with tiebreakers; add extras like Clue or Freeze to keep it fun for all ages.' } },
      { '@type': 'Question', name: 'How do payments work at a school event?', acceptedAnswer: { '@type': 'Answer', text: 'Collect cash or share an instant link (e.g., Revolut). Admins mark paid + method; reconciliation updates automatically with an audit-ready export.' } },
      { '@type': 'Question', name: 'How big can we go on the free trial?', acceptedAnswer: { '@type': 'Answer', text: 'Up to 20 connected player devices. Upgrade options will expand capacity and admin seats.' } },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <SEO
        title="Use Case — Schools & PTAs | FundRaisely Fundraising Quiz"
        description="Run a family-friendly school quiz night. Simple setup, mobile play, and automatic reconciliation once paid + method are marked."
        keywords="PTA quiz night, school quiz fundraiser, family quiz fundraiser"
        domainStrategy="geographic"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <Header />

      <section className="relative px-4 pt-12 pb-8">
        <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-purple-300/30 blur-2xl" />
        <div className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-indigo-300/30 blur-2xl" />
        <div className="container relative z-10 mx-auto max-w-6xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-indigo-700 text-sm font-medium">
            <Sparkles className="h-4 w-4" /> Schools & PTAs
          </span>
          <h1 className="mt-4 bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent text-4xl md:text-6xl font-bold">School Quiz Fundraisers</h1>
          <p className="mt-4 max-w-3xl text-indigo-900/70 text-lg md:text-xl">
            Raise for classroom resources, trips, and sports kits. Players join by link or <span className="inline-flex items-center gap-1"><QrCode className="h-4 w-4" /> QR</span>; you collect payments, mark paid + method, and reconciliation updates automatically with an audit-ready export.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="/free-trial" className="rounded-xl bg-indigo-700 px-6 py-3 text-white font-semibold shadow-md hover:bg-indigo-800">Start Free Trial</a>
            <a href="/quiz/demo" className="rounded-xl bg-white px-6 py-3 text-indigo-700 font-semibold shadow-md hover:bg-indigo-50 inline-flex items-center gap-2"><PlayCircle className="h-5 w-5" /> Watch the Demo</a>
          </div>
        </div>
      </section>

      <section className="px-4 pt-6 pb-10">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
            <h2 className="text-indigo-900 text-2xl font-bold">Why schools love it</h2>
            <ul className="mt-3 grid gap-2 md:grid-cols-2">
              <Bullet>Family-friendly rounds (General, Wipeout, Speed) + tiebreakers</Bullet>
              <Bullet>Fundraising extras: Clue, Freeze, RobinHood (RobPoints), Restore</Bullet>
              <Bullet>QR join + mobile play; live scoring & leaderboards</Bullet>
              <Bullet>Automatic reconciliation once marked paid; exportable reports</Bullet>
            </ul>
          </div>
        </div>
      </section>

      {/* Quick flow */}
      <section className="px-4 pb-12">
        <div className="container mx-auto max-w-6xl">
          <div className="grid gap-6 md:grid-cols-4">
            <div className="rounded-xl border border-indigo-100 bg-white p-5 shadow-sm">
              <h3 className="text-indigo-900 text-lg font-semibold">1) Set up</h3>
              <ul className="mt-2 space-y-2">
                <Bullet>4-step wizard; templates or custom</Bullet>
                <Bullet>Choose extras & capacity</Bullet>
              </ul>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-white p-5 shadow-sm">
              <h3 className="text-indigo-900 text-lg font-semibold">2) Invite</h3>
              <ul className="mt-2 space-y-2">
                <Bullet>Share link/QR; manage teams</Bullet>
                <Bullet>Mobile play for students/parents</Bullet>
              </ul>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-white p-5 shadow-sm">
              <h3 className="text-indigo-900 text-lg font-semibold">3) Collect</h3>
              <ul className="mt-2 space-y-2">
                <Bullet>Cash or instant link (e.g., Revolut)</Bullet>
                <Bullet><CreditCard className="inline h-4 w-4 mr-1" /> Admins mark paid + method</Bullet>
              </ul>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-white p-5 shadow-sm">
              <h3 className="text-indigo-900 text-lg font-semibold">4) Report</h3>
              <ul className="mt-2 space-y-2">
                <Bullet>Live scores, winners</Bullet>
                <Bullet><FileText className="inline h-4 w-4 mr-1" /> Auto reconciliation export</Bullet>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default UsecaseSchoolPage;
