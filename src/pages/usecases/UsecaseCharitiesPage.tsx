import type React from 'react';
import { SEO } from '../../components/SEO';
import { Header } from '../../components/GeneralSite/Header';
import SiteFooter from '../../components/GeneralSite2/SiteFooter';
import { Sparkles,  Check,  PlayCircle } from 'lucide-react';

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

const UsecaseCharitiesPage: React.FC = () => {
  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
      { '@type': 'ListItem', position: 2, name: 'Use Cases', item: abs('/quiz/use-cases') },
      { '@type': 'ListItem', position: 3, name: 'Charities & Nonprofits', item: abs('/quiz/use-cases/charities') },
    ],
  };
  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'Is this compliant for fundraisers?', acceptedAnswer: { '@type': 'Answer', text: 'Quizzes are games of skill. We provide best-practice guidance and clear reporting to support compliance and audit needs.' } },
      { '@type': 'Question', name: 'How are payments tracked?', acceptedAnswer: { '@type': 'Answer', text: 'Collect cash or instant links; admins mark paid + method. Reconciliation then updates automatically and exports in an audit-ready format.' } },
      { '@type': 'Question', name: 'Can volunteers run it easily?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. The 4-step wizard and QR join links make setup and running simple — even for first-time organisers.' } },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <SEO
        title="Use Case — Charities & Nonprofits | FundRaisely Fundraising Quiz"
        description="Engage supporters with a fun, in-person quiz fundraiser. Simple setup, extras, and audit-ready reconciliation once paid is marked."
        keywords="charity quiz fundraiser, nonprofit quiz night, fundraising quiz for charities"
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
            <Sparkles className="h-4 w-4" /> Charities & Nonprofits
          </span>
          <h1 className="mt-4 bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent text-4xl md:text-6xl font-bold">Charity Quiz Fundraisers</h1>
          <p className="mt-4 max-w-3xl text-indigo-900/70 text-lg md:text-xl">
            Engage supporters, volunteers, and partners. Collect payments in person; once admins mark paid + method, reconciliation updates automatically and exports audit-ready for your finance team.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="/free-trial" className="rounded-xl bg-indigo-700 px-6 py-3 text-white font-semibold shadow-md hover:bg-indigo-800">Start Free Trial</a>
            <a href="/quiz/demo" className="rounded-xl bg-white px-6 py-3 text-indigo-700 font-semibold shadow-md hover:bg-indigo-50 inline-flex items-center gap-2"><PlayCircle className="h-5 w-5" /> Watch the Demo</a>
          </div>
        </div>
      </section>

      <section className="px-4 pt-6 pb-12">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
            <h2 className="text-indigo-900 text-2xl font-bold">Why charities choose it</h2>
            <ul className="mt-3 grid gap-2 md:grid-cols-2">
              <Bullet>Clear reports for committees and audits</Bullet>
              <Bullet>Engaging extras: Clue, Freeze, RobinHood (RobPoints), Restore</Bullet>
              <Bullet>Simple volunteer-friendly setup</Bullet>
              <Bullet>Automatic reconciliation once marked paid</Bullet>
            </ul>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default UsecaseCharitiesPage;
