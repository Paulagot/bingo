import { Link } from "react-router-dom";
import {
  HeartHandshake,
  Shield,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";

export default function AboutPage() {
  return (
    <>
      <title>About FundRaisely</title>
      <meta
        name="description"
        content="Learn about FundRaisely and its mission to make community fundraising easier to organise, run and report on."
      />

      <main>
        <section className="hero hero--compact">
          <div className="site-shell hero__inner">
            <div className="hero__content">
              <div className="hero__meta-row">
                <p className="hero__eyebrow">About FundRaisely</p>
                <span className="status-pill">
                  Frictionless fundraising. Built for impact.
                </span>
              </div>

              <h1 className="hero__title">
                Built for community fundraising, not generic events
              </h1>

              <p className="hero__description">
                FundRaisely helps schools, clubs, charities and community groups
                run engaging fundraising activities with simpler setup, clearer
                payment tracking and practical reporting.
              </p>

              <div className="hero__actions">
                <Link to="/features" className="button button--primary">
                  See features
                </Link>

                <Link to="/contact" className="button button--outline-light">
                  Talk to us
                </Link>
              </div>
            </div>

            <figure className="hero__media about-hero-card">
              <div className="about-hero-card__inner">
                <Sparkles aria-hidden="true" />
                <h2>Your partner in community fundraising</h2>
                <p>
                  Practical tools for event organisers who need more than ticket
                  sales: games, activities, payments, reconciliation, sponsor
                  support and reports.
                </p>
              </div>
            </figure>
          </div>
        </section>

        <section className="section section--muted">
          <div className="site-shell split">
            <div className="split__content">
              <p className="eyebrow">Our mission</p>

              <h2>
                To empower every cause with simple, transparent and impactful
                fundraising
              </h2>

              <p>
                FundRaisely was born from a simple observation: too many
                schools, clubs and charities struggle with fundraising tools
                that are complex, opaque and outdated.
              </p>

              <p>
                Dedicated volunteers often spend more time on administration
                than on their actual mission. We knew there had to be a better
                way.
              </p>

              <p>
                Our mission is to make fundraising easier to organise, more
                transparent to report on and more rewarding for the communities
                it supports.
              </p>
            </div>

            <div className="status-panel about-status-panel">
              <div>
                <p className="eyebrow">Impact-led by design</p>
                <h3>Technology should help more money reach good causes</h3>
                <p>
                  FundRaisely is being built with a social-impact mindset. We
                  want community groups to spend less time fighting spreadsheets,
                  chasing payments and piecing together reports, and more time
                  raising funds for the people, places and causes they care
                  about.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="site-shell">
            <div className="section-heading">
              <p className="eyebrow">Who we are</p>

              <h2>
                A founder-led platform combining technology, finance and
                community impact
              </h2>

              <p>
                FundRaisely brings together financial experience, product
                development and a practical understanding of the pressure placed
                on community organisers.
              </p>
            </div>

            <div className="card-grid card-grid--two about-founder-grid">
              <article className="info-card">
                <h3>Paula Guilfoyle</h3>
                <p>
                  Founder and CTO. Paula leads product vision and development,
                  bringing experience across technology, finance, AI, blockchain
                  and community-focused projects.
                </p>
                <p>
                  Her focus is making FundRaisely technically robust,
                  user-friendly and practical for everyday organisers.
                </p>
              </article>

              <article className="info-card">
                <h3>Simon Dyer</h3>
                <p>
                  Simon supports FundRaisely with experience across financial
                  services, compliance, finance and operations.
                </p>
                <p>
                  His background helps shape the platform around trust,
                  practical governance and systems that can support real-world
                  fundraising at scale.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="section section--muted">
          <div className="site-shell split split--reverse">
            <div className="split__content">
              <p className="eyebrow">Founding story</p>

              <h2>From a test games app to a broader fundraising platform</h2>

              <p>
                FundRaisely began with Paula Guilfoyle, who had seen first-hand
                how difficult fundraising could be for schools, clubs, charities
                and community groups: lots of effort, limited tools, poor
                visibility and too much manual admin.
              </p>

              <p>
                The first version started as a test games app that could be used
                for fundraising. The idea quickly gained momentum, becoming a
                prize-winning concept across three hackathons and proving that
                fundraising could be more engaging, more transparent and easier
                to manage.
              </p>

              <p>
                What began as a fast prototype grew into a broader platform:
                giving local causes the kind of practical tools usually
                available to larger organisations, without the complexity or
                cost.
              </p>
            </div>

            <div className="about-story-card">
              <p className="eyebrow">Why it matters</p>

              <h3>Grassroots organisers deserve better tools</h3>

              <p>
                Fundraising should feel organised, accountable and achievable,
                even when it is being run by volunteers after work, parents at a
                school, a sports club committee or a small charity team.
              </p>

              <p>
                We believe better tools can help small organisations raise more,
                waste less time and build stronger relationships with the people
                who support them.
              </p>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="site-shell">
            <div className="section-heading">
              <p className="eyebrow">Our team</p>

              <h2>Lean, practical and close to the users we build for</h2>

              <p>
                We bring together expertise in technology, finance and
                fundraising operations, united by a commitment to helping
                organisers succeed.
              </p>
            </div>

            <div className="problem-solution">
              <article>
                <h2>Hands-on support</h2>
                <p>
                  We are close to the clubs, schools, charities and organisers
                  using the platform. That means faster learning, better product
                  decisions and features shaped by real fundraising workflows.
                </p>
              </article>

              <article>
                <h2>Built to grow</h2>
                <p>
                  As FundRaisely grows, we will continue to expand with
                  developers, creators and community leaders who believe
                  fundraising should be fun, accessible and easier to manage.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="section section--muted">
          <div className="site-shell">
            <div className="section-heading">
              <p className="eyebrow">What we stand for</p>

              <h2>Values that shape the platform</h2>

              <p>
                Our values guide how we build the product, support organisers
                and think about the future of fundraising.
              </p>
            </div>

            <div className="card-grid card-grid--three about-values-grid">
              <article className="info-card about-value-card">
                <HeartHandshake aria-hidden="true" />
                <h3>Community impact</h3>
                <p>
                  We are building FundRaisely to help more money reach the
                  causes, clubs and communities that need it. Success for us is
                  not only platform growth, but the real-world impact our users
                  can create.
                </p>
              </article>

              <article className="info-card about-value-card">
                <Shield aria-hidden="true" />
                <h3>Transparency</h3>
                <p>
                  Trust is the foundation of fundraising. We focus on clear
                  payment tracking, reconciliation and audit-ready reports so
                  organisers can show what was raised and how it was handled.
                </p>
              </article>

              <article className="info-card about-value-card">
                <Target aria-hidden="true" />
                <h3>Compliance</h3>
                <p>
                  We help organisers fundraise more confidently by building
                  around practical, compliance-aware workflows and clearer event
                  records.
                </p>
              </article>

              <article className="info-card about-value-card">
                <Zap aria-hidden="true" />
                <h3>Innovation</h3>
                <p>
                  From digital games to modern payment flows and Web3-enabled
                  receipts, we explore new tools where they make fundraising
                  better, simpler or more transparent.
                </p>
              </article>

              <article className="info-card about-value-card">
                <Users aria-hidden="true" />
                <h3>Accessibility</h3>
                <p>
                  Smaller organisations should not be locked out of good
                  fundraising systems. We want practical tools to be available to
                  grassroots groups, not just large organisations with big
                  budgets.
                </p>
              </article>

              <article className="info-card about-value-card">
                <Sparkles aria-hidden="true" />
                <h3>Simplicity</h3>
                <p>
                  Powerful technology should not feel complicated. We aim for
                  setup-in-minutes tools that real organisers can actually use.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="site-shell">
            <div className="cta-panel">
              <div>
                <p className="eyebrow">Explore FundRaisely</p>

                <h2>Find the right fundraising activity for your community</h2>

                <p>
                  Explore the event formats FundRaisely supports, see how the
                  platform works or get in touch if you want to talk through an
                  idea for your club, charity, school or community group.
                </p>
              </div>

              <div className="cta-panel__actions">
                <Link to="/event-formats" className="button button--primary">
                  Event formats
                </Link>

                <Link to="/features" className="button button--outline-light">
                  See features
                </Link>

                <Link to="/contact" className="button button--secondary">
                  Talk to us
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}