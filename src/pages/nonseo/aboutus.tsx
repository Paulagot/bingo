// src/pages/about/AboutFundRaisely.tsx
import type React from 'react';
import { SEO } from '../../components/SEO';
import { Header } from '../../components/GeneralSite2/Header';
import SiteFooter from '../../components/GeneralSite2/SiteFooter';
import { Sparkles, Target, Shield, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const AboutFundRaisely: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <SEO
        title="About FundRaisely — Your Partner in Community Fundraising"
        description="FundRaisely makes fundraising simple, transparent, and impactful for schools, clubs, and charities. Learn our mission, story, team, and values."
        keywords="about FundRaisely, community fundraising, transparent fundraising, compliant fundraising platform"
        type="about"
      />

      <Header />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-10 pb-8 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-1">
          <Sparkles className="h-4 w-4 text-indigo-700" />
          <span className="text-xs font-semibold text-indigo-800">About FundRaisely</span>
        </div>
        <h1 className="mx-auto mb-4 max-w-3xl text-3xl font-bold text-indigo-950 md:text-5xl">
          About FundRaisely: Your Partner in Community Fundraising
        </h1>
        <p className="mx-auto mb-8 max-w-3xl text-indigo-900/80">
          Frictionless Fundraising. Built for Impact.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/quiz/free-trial"
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-700"
          >
            Start Free Trial
          </Link>
          <Link
            to="/pricing"
            className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50"
          >
            See Pricing
          </Link>
          <Link
            to="/contact"
            className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50"
          >
            Talk to Us
          </Link>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 pb-16">
        {/* Mission */}
        <section className="mb-12 rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-2xl font-bold text-indigo-900">
            Our Mission: To Empower Every Cause with Simple, Transparent, and Impactful Fundraising
          </h2>
          <p className="text-indigo-900/80">
            FundRaisely was born from a simple observation: too many schools, clubs, and charities
            struggle with fundraising tools that are complex, opaque, and outdated. We saw dedicated
            volunteers spending more time on administration than on their mission. We knew there had to be a better way.
          </p>
          <p className="mt-3 text-indigo-900/80">
            Our mission is to transform the fundraising landscape by providing an intuitive, powerful, and
            transparent platform that turns good intentions into measurable impact. We empower organizations
            of all sizes to host engaging, legally compliant, and highly successful fundraising events. By
            simplifying the process, we help unlock the full potential of community generosity.
          </p>
        </section>

        {/* Who We Are */}
        <section className="mb-12 rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold text-indigo-900">Who We Are</h2>
          <p className="text-indigo-900/80">
            At its core, FundRaisely is a founder-led team.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-100 bg-indigo-50/40 p-4">
              <h3 className="text-lg font-semibold text-indigo-900">Paula Guilfoyle — Founder &amp; CTO</h3>
              <p className="mt-1 text-sm text-indigo-900/80">
                A seasoned technologist and innovator, Paula leads product vision and development. With experience
                spanning AI, blockchain, and community-driven projects, she ensures FundRaisely is technically robust,
                user-friendly, and future-proof.
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-indigo-50/40 p-4">
              <h3 className="text-lg font-semibold text-indigo-900">Simon Dyer — Co-Founder &amp; CEO/COO</h3>
              <p className="mt-1 text-sm text-indigo-900/80">
                With 25+ years in financial services and a proven track record in building businesses, Simon brings
                expertise in compliance, finance, and operations. He has led successful ventures in both TradFi and Web3,
                and is passionate about making technology accessible for everyday users.
              </p>
            </div>
          </div>

          <p className="mt-4 text-indigo-900/80">
            Together, we combine financial acumen with technical excellence—backed by a network of advisors, partners,
            and a growing community of users who shape the platform’s evolution. Our journey began with a shared vision:
            a fundraising solution that’s both technologically advanced and deeply human-centered.
          </p>

          {/* Founding Story */}
          <div className="mt-6 rounded-xl border border-indigo-100 bg-white p-5">
            <h3 className="mb-2 text-lg font-semibold text-indigo-900">Company Founding Story</h3>
            <p className="text-indigo-900/80">
              FundRaisely was founded in 2025 by Paula Guilfoyle and Simon Dyer, two entrepreneurs with a shared passion
              for using technology to solve real-world problems. Both had seen first-hand how schools, clubs, and charities
              were struggling with outdated fundraising models—lots of effort, little reward, and limited transparency.
            </p>
            <p className="mt-2 text-indigo-900/80">
              The breakthrough came during a series of hackathons, where we built award-winning prototypes showing how
              fundraising could be simpler, more engaging, and provably transparent. From those early experiments, the
              vision for FundRaisely was born: reimagine grassroots fundraising with tools that combine compliance,
              creativity, and community impact.
            </p>
            <p className="mt-2 text-indigo-900/80">
              What began as a fast prototype quickly grew into a full platform—giving local causes the sophistication
              of larger organisations without the complexity or cost.
            </p>
          </div>
        </section>

        {/* Team Overview */}
        <section className="mb-12 rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-2xl font-bold text-indigo-900">Our Team</h2>
          <p className="text-indigo-900/80">
            We bring together expertise in technology, finance, and non-profit management—united by a commitment to our users’ success.
            We’re lean and agile, which means fast iteration, hands-on support, and staying close to the needs of
            grassroots clubs through to national charities.
          </p>
          <p className="mt-3 text-indigo-900/80">
            As FundRaisely grows, we’ll continue to expand our team with creators, developers, and community leaders who
            share our belief: when fundraising is fun, regenerative, and accessible to all—everyone wins.
          </p>
        </section>

        {/* Values */}
        <section className="mb-12 rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold text-indigo-900">What We Stand For</h2>
          <p className="mb-5 text-indigo-900/80">
            Our values guide our product development, customer interactions, and long-term vision.
            The mission statement for FundRaisely is <span className="font-semibold">“Frictionless Fundraising. Built for Impact.”</span>
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-100 bg-indigo-50/40 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo-700" />
                <h3 className="font-semibold text-indigo-900">1. Transparency</h3>
              </div>
              <p className="text-sm text-indigo-900/80">
                Trust is the foundation of fundraising. We provide real-time financial reconciliation and
                audit-ready reports so organisers and donors can clearly see how funds are raised and managed.
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 bg-indigo-50/40 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Target className="h-4 w-4 text-indigo-700" />
                <h3 className="font-semibold text-indigo-900">2. Compliance</h3>
              </div>
              <p className="text-sm text-indigo-900/80">
                We prioritise compliance so you can fundraise confidently and ethically. By focusing on games of skill
                and building compliance-aware features, we help you navigate the legal landscape.
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 bg-indigo-50/40 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4 text-indigo-700" />
                <h3 className="font-semibold text-indigo-900">3. Innovation</h3>
              </div>
              <p className="text-sm text-indigo-900/80">
                From award-winning hackathon concepts to modern Web3 integrations, we push what’s possible to make
                fundraising more efficient, engaging, and impactful.
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 bg-indigo-50/40 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-700" />
                <h3 className="font-semibold text-indigo-900">4. Simplicity</h3>
              </div>
              <p className="text-sm text-indigo-900/80">
                Powerful technology shouldn’t be complicated. We obsess over a setup-in-minutes experience, so you can
                focus on your mission, not the tooling.
              </p>
            </div>
          </div>
        </section>

        {/* CTA / Join Us */}
        <section className="rounded-2xl border border-indigo-100 bg-white p-6 text-center shadow-sm">
          <h2 className="mb-3 text-2xl font-bold text-indigo-900">Join Us on Our Journey</h2>
          <p className="mx-auto mb-6 max-w-3xl text-indigo-900/80">
            We’re proud of what we’ve built—and we’re just getting started. Start your free trial and experience the
            FundRaisely difference. Together, we can transform fundraising and build stronger communities.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/quiz/free-trial"
              className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-700"
            >
              Run a Free Trial Quiz
            </Link>
            <Link
              to="/founding-partners"
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50"
            >
              Become a Founding Partner
            </Link>
            <Link
              to="/pricing"
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50"
            >
              See Pricing
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default AboutFundRaisely;
