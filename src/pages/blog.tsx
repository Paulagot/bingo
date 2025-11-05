// src/pages/blog/BlogAndResources.tsx
import type React from 'react';
import { SEO } from '../components/SEO';
import { Header } from '../components/GeneralSite2/Header';
import SiteFooter from '../components/GeneralSite2/SiteFooter';
import { BookOpen, FileText, Megaphone, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Blog & Resources hub
 * - Indexable (unlike legal pages)
 * - JSON-LD: CollectionPage + ItemList (aligned with your SEO strategy v3)
 * - When real posts exist, replace the placeholders in `sections` with live slugs/links.
 */
const BlogAndResources: React.FC = () => {
  // Placeholder content buckets until real posts are published
  const sections = [
    {
      id: 'guides',
      title: 'In-Depth Guides',
      icon: BookOpen,
      blurb:
        'Step-by-step playbooks for planning, running, and optimizing your fundraising events—from first quiz to advanced strategies.',
      items: [
        { title: 'The Ultimate Checklist for a Flawless Quiz Night', href: '#', comingSoon: true },
        { title: 'How to Promote Your Fundraiser and Maximize Turnout', href: '#', comingSoon: true },
        { title: 'Understanding “Games of Skill” and UK Fundraising Compliance', href: '#', comingSoon: true },
        { title: 'Reconciling Cash, Card, and Crypto Payments — A Practical Guide', href: '#', comingSoon: true },
      ],
    },
    {
      id: 'articles',
      title: 'Insightful Articles & Case Studies',
      icon: FileText,
      blurb:
        'Trends, best practices, and real stories from schools, clubs, and charities—plus lessons from our own journey.',
      items: [
        { title: 'From Hackathon Win to Community Impact: The FundRaisely Story', href: '#', comingSoon: true },
        { title: '5 Ways to Boost Engagement at Your Next Fundraising Event', href: '#', comingSoon: true },
        { title: 'Case Study: How a Local School Raised €1,200 in a Single Night', href: '#', comingSoon: true },
        { title: 'The Future of Giving: How Web3 is Transforming Philanthropy', href: '#', comingSoon: true },
      ],
    },
    {
      id: 'updates',
      title: 'Platform News & Updates',
      icon: Megaphone,
      blurb:
        'New features, improvements, and announcements—so you never miss what’s shipping across games, reporting, and compliance.',
      items: [
        { title: 'Now Live: Advanced Reporting & Analytics Dashboard', href: '#', comingSoon: true },
        { title: 'Coming Soon: Full Support for Bingo and Regulated Games', href: '#', comingSoon: true },
        { title: 'Platform Update: Enhanced User Roles & Permissions', href: '#', comingSoon: true },
        { title: 'Our Partnership with Glo Dollar and The Giving Block', href: '#', comingSoon: true },
      ],
    },
  ];

  // JSON-LD helpers (CollectionPage + ItemList with placeholders)
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'FundRaisely Blog & Resources',
      description:
        'Guides, articles, case studies, and platform updates to help schools, clubs, and charities run transparent, compliant, high-impact fundraisers.',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'FundRaisely Blog & Resources — Sections',
      itemListElement: sections.map((section, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: section.title,
        url: `/blog#${section.id}`,
      })),
    },
    // Optional: breadcrumb for hub
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: '/' },
        { '@type': 'ListItem', position: 2, name: 'Blog & Resources', item: '/blog' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <SEO
        title="FundRaisely Blog & Resources: Your Guide to Impactful Fundraising"
        description="Guides, articles, case studies, and platform updates to help schools, clubs, and charities fundraise simply, transparently, and compliantly."
        keywords="fundraising guides, fundraising tips, charity quiz resources, community fundraising best practices"
        type="website"
        // Robots: indexable (default). Hreflang/canonical handled by SEO.tsx per your strategy.
        structuredData={structuredData}
      />

      <Header />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-10 pb-6 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-1">
          <Sparkles className="h-4 w-4 text-indigo-700" />
          <span className="text-xs font-semibold text-indigo-800">Knowledge Hub</span>
        </div>
        <h1 className="mx-auto mb-4 max-w-4xl text-3xl font-bold text-indigo-950 md:text-5xl">
          FundRaisely Blog &amp; Resources: Your Guide to Impactful Fundraising
        </h1>
        <p className="mx-auto max-w-3xl text-indigo-900/80">
          A growing library of guides, articles, and platform updates to help you master fundraising.
          From PTAs and local sports clubs to registered charities—we’re here to empower your mission.
        </p>
      </section>

      {/* Intro copy */}
      <section className="mx-auto max-w-5xl px-4 pb-6">
        <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-2xl font-bold text-indigo-900">Welcome to the FundRaisely Knowledge Hub</h2>
          <p className="text-indigo-900/80">
            Find practical, compliance-aware, and repeatable strategies to turn good intentions into measurable impact.
            Use these resources to plan stellar events, engage your community, and reconcile finances with confidence.
          </p>
        </div>
      </section>

      {/* Sections */}
      <main className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="sr-only">Resource Categories</h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <section
                key={section.id}
                id={section.id}
                className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm"
              >
                <div className="mb-3 flex items-center gap-2">
                  <Icon className="h-5 w-5 text-indigo-700" />
                  <h3 className="text-lg font-semibold text-indigo-900">{section.title}</h3>
                </div>
                <p className="mb-4 text-sm text-indigo-900/80">{section.blurb}</p>

                <ul className="space-y-2">
                  {section.items.map((item, idx) => (
                    <li key={idx} className="group flex items-center justify-between rounded-lg border border-gray-100 p-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-indigo-900">{item.title}</div>
                        {item.comingSoon && (
                          <div className="text-xs text-indigo-900/60">Coming soon</div>
                        )}
                      </div>
                      <Link
                        to={item.href}
                        aria-disabled={item.comingSoon}
                        className={`ml-3 inline-flex items-center rounded-md px-2 py-1 text-sm font-semibold ring-1 ring-indigo-200 transition ${
                          item.comingSoon
                            ? 'pointer-events-none bg-gray-50 text-gray-400'
                            : 'bg-white text-indigo-700 hover:bg-indigo-50'
                        }`}
                      >
                        Read <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        {/* Commitment */}
        <section className="mt-8 rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-2xl font-bold text-indigo-900">Our Commitment to Your Mission</h2>
          <p className="text-indigo-900/80">
            We’re more than a technology provider—we’re your fundraising partner. Explore, share with your team,
            and tell us what topics would help you most. When blog posts go live, we’ll link them here and in
            our updates feed.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/contact"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700"
            >
              Suggest a Topic
            </Link>
            <Link
              to="/quiz/free-trial"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50"
            >
              Start a Free Trial
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default BlogAndResources;
