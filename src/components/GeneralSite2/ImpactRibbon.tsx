import type React from 'react';
import { Globe, Users, Target, Trophy, Calendar, ArrowRight } from 'lucide-react';

type CampaignCardProps = {
  badge: string;
  title: string;
  subtitle: string;
  bullets: { icon: React.ReactNode; text: string }[];
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
};

const CampaignCard: React.FC<CampaignCardProps> = ({
  badge,
  title,
  subtitle,
  bullets,
  primaryCta,
  secondaryCta,
}) => (
  <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md p-6 shadow-xl">
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
        {badge}
      </span>
    </div>

    <h3 className="mt-4 text-xl md:text-2xl font-bold text-white">{title}</h3>
    <p className="mt-2 text-white/85 leading-relaxed">{subtitle}</p>

    <div className="mt-5 space-y-3">
      {bullets.map((b, idx) => (
        <div
          key={idx}
          className="flex items-start gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3"
        >
          <div className="mt-0.5">{b.icon}</div>
          <div className="text-sm text-white/90">{b.text}</div>
        </div>
      ))}
    </div>

    <div className="mt-6 flex flex-wrap gap-3">
      <a
        href={primaryCta.href}
        className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-indigo-700 shadow-lg hover:bg-indigo-50 hover:scale-[1.02] transition-all"
      >
        {primaryCta.label}
        <ArrowRight className="h-4 w-4" />
      </a>

      {secondaryCta && (
        <a
          href={secondaryCta.href}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-900/20 px-5 py-3 text-sm font-semibold text-white border border-white/20 hover:bg-indigo-900/30 hover:scale-[1.02] transition-all"
        >
          {secondaryCta.label}
        </a>
      )}
    </div>
  </div>
);

const ImpactRibbon: React.FC = () => (
  <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-700 to-purple-600 py-20">
    {/* Background decorative elements */}
    <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-pink-400/20 blur-3xl" />
    <div className="absolute -right-16 top-32 h-56 w-56 rounded-full bg-indigo-400/20 blur-3xl" />
    <div className="absolute bottom-10 left-1/2 h-32 w-32 rounded-full bg-purple-400/20 blur-3xl" />

    {/* Geometric background pattern */}
    <div className="absolute inset-0 opacity-5">
      <div className="absolute top-20 left-1/4 h-2 w-2 bg-white rotate-45" />
      <div className="absolute top-40 right-1/3 h-3 w-3 bg-white/60 rotate-12" />
      <div className="absolute bottom-32 left-1/3 h-2 w-2 bg-white rotate-45" />
      <div className="absolute bottom-20 right-1/4 h-3 w-3 bg-white/40 rotate-12" />
    </div>

    <div className="container mx-auto max-w-6xl px-4 relative z-10">
      <div className="text-center text-white">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-2 text-white/90 text-sm font-medium border border-white/20 mb-6">
          <Target className="h-4 w-4" /> Campaigns you can run with FundRaisely
        </span>

        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Pick a campaign that fits your community —{' '}
          <span className="bg-gradient-to-r from-pink-300 to-yellow-300 bg-clip-text text-transparent">
            local leagues or global Web3 impact
          </span>
        </h2>

        <p className="mx-auto max-w-2xl text-white/85 text-lg mb-10">
          FundRaisely campaigns are designed to make fundraising feel exciting again — with clear goals,
          simple setup, and memorable events your community actually wants to show up for.
        </p>

        {/* Two-campaign grid */}
        <div className="grid gap-6 md:grid-cols-2 text-left">
          <CampaignCard
            badge="Web3 • Annual"
            title="Web3 Impact Campaign"
            subtitle="For DAOs, crypto communities, and Web3 teams who want transparent, verifiable fundraising for real-world causes."
            bullets={[
              {
                icon: <Globe className="h-5 w-5 text-purple-200" />,
                text: 'On-chain transparency + verifiable impact reporting',
              },
              {
                icon: <Users className="h-5 w-5 text-indigo-200" />,
                text: 'Community leaderboard + campaign momentum over time',
              },
              {
                icon: <Target className="h-5 w-5 text-pink-200" />,
                text: 'Built for high-energy online + hybrid events',
              },
            ]}
            primaryCta={{ label: 'Explore Web3 Impact Campaign', href: '/web3/impact-campaign' }}
            secondaryCta={{ label: 'Web3 Fundraising Hub', href: '/web3' }}
          />

          <CampaignCard
            badge="Clubs •  2026"
            title="Junior Clubs Fundraising Quiz League"
            subtitle="For sports clubs running a family-friendly quiz night for U8 to U10 teams — raise funds locally and compete for prizes."
            bullets={[
              {
                icon: <Calendar className="h-5 w-5 text-yellow-200" />,
                text: 'Run 1 club quiz night during Dates TBC (limited to 50 clubs)',
              },
              {
                icon: <Trophy className="h-5 w-5 text-emerald-200" />,
                text: 'Prizes + national final + €2,000 club grant (subject to entries)',
              },
              {
                icon: <Users className="h-5 w-5 text-indigo-200" />,
                text: 'Designed for busy coaches: simple setup + event pack included',
              },
            ]}
            primaryCta={{ label: 'View Junior Clubs League', href: '/campaigns/clubs-league' }}
            secondaryCta={{ label: 'FundRaisely for Clubs', href: '/quiz/use-cases/clubs' }}
          />
        </div>

        {/* Optional small footer note */}
        <p className="mt-8 text-sm text-white/70">
          Want your campaign featured here? We can build seasonal campaigns for clubs, schools, and community groups.
        </p>
      </div>
    </div>
  </section>
);

export default ImpactRibbon;

