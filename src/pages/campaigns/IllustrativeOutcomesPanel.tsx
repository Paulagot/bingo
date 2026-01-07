import React from 'react';
import {  Users, Receipt, Info, Target, Sparkles } from 'lucide-react';

type Props = {
  ticketPrice?: number; // default 25
  leagueFee?: number;   // default 200
  maxExtrasPerFamily?: number; // default 10
  // Assumption: % of families who buy all extras (for illustration)
  extrasAttachRate?: number; // default 0.6 (60%)
};

const StatCard: React.FC<{ label: string; value: string; sub?: string; tone?: 'plain' | 'success' }> = ({
  label,
  value,
  sub,
  tone = 'plain',
}) => (
  <div
    className={`rounded-2xl border p-5 shadow-sm ${
      tone === 'success'
        ? 'border-emerald-200 bg-emerald-50/60'
        : 'border-indigo-100 bg-white'
    }`}
  >
    <div className="text-xs font-semibold text-indigo-700">{label}</div>
    <div className="mt-1 text-2xl font-bold text-indigo-900">{value}</div>
    {sub && <div className="mt-1 text-sm text-indigo-900/70">{sub}</div>}
  </div>
);

export const IllustrativeOutcomesPanel: React.FC<Props> = ({
  ticketPrice = 25,
  leagueFee = 200,
  maxExtrasPerFamily = 10,
  extrasAttachRate = 0.6,
}) => {
  // Core “achievable structure” numbers
  const teams = 4;
  const familiesPerTeam = 12;
  const turnout = 0.75;
  const families = Math.round(teams * familiesPerTeam * turnout); // 36

  // Ticket-only
  const ticketGross = families * ticketPrice;

  // Extras uplift (illustrative)
  // Example: 60% of families buy all extras at +€10
  const extrasFamilies = Math.round(families * extrasAttachRate);
  const extrasGross = extrasFamilies * maxExtrasPerFamily;

  // Totals
  const totalGross = ticketGross + extrasGross;

  const netTicketOnly = Math.max(0, ticketGross - leagueFee);
  const netWithExtras = Math.max(0, totalGross - leagueFee);

  return (
    <section className="px-4 py-12 bg-gradient-to-r from-indigo-50 to-purple-50">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-8">
          <h2 className="text-indigo-900 text-3xl md:text-4xl font-bold mb-3"> What success could look like for clubs</h2>
          <p className="text-indigo-900/70 text-lg max-w-3xl mx-auto leading-relaxed">
            This is a fundraising event for your club, you keep all funds raised on the night. These are example scenarios -
            actual results depend on turnout and extras uptake. Extras are optional game purcahses like hints and freezing out other teams.
          </p>
        </div>

        <div className="rounded-2xl border border-indigo-100 bg-white p-6 md:p-8 shadow-sm">
          {/* Assumptions chips */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-indigo-700 text-sm font-medium">
              <Receipt className="h-4 w-4" />
              Family ticket: <strong className="ml-1">€{ticketPrice}</strong>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-indigo-700 text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              Extras (max): <strong className="ml-1">+€{maxExtrasPerFamily} / family</strong>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-indigo-700 text-sm font-medium">
              <Target className="h-4 w-4" />
              League fee: <strong className="ml-1">€{leagueFee}</strong>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-amber-800 text-sm">
              <Info className="h-4 w-4" />
              Clubs keep quiz income — FundRaisely does not take a %.
            </div>
          </div>

          {/* Main calculation panel */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-6">
              <div className="mb-2 text-sm font-semibold text-indigo-900">Typical club night (example)</div>

              <div className="flex items-center gap-2 text-indigo-900/80">
                <Users className="h-4 w-4 text-indigo-600" />
                <span>
                  Estimated turnout: <strong>{families}</strong> families
                </span>
              </div>

              <div className="mt-4 grid gap-4">
                <StatCard
                  label="Ticket-only gross raised"
                  value={`€${ticketGross.toLocaleString()}`}
                  sub={`${families} families × €${ticketPrice}`}
                />
                <StatCard
                  label="Ticket-only net to club (after league fee)"
                  value={`€${netTicketOnly.toLocaleString()}`}
                  sub={`€${ticketGross.toLocaleString()} − €${leagueFee}`}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6">
              <div className="mb-2 text-sm font-semibold text-indigo-900">With in-game extras (optional uplift)</div>

              <div className="text-sm text-indigo-900/80 leading-relaxed">
                Example assumption: <strong>{Math.round(extrasAttachRate * 100)}%</strong> of families choose all extras
                (up to <strong>+€{maxExtrasPerFamily}</strong> each).
              </div>

              <div className="mt-4 grid gap-4">
                <StatCard
                  label="Extras gross raised"
                  value={`€${extrasGross.toLocaleString()}`}
                  sub={`${extrasFamilies} families × €${maxExtrasPerFamily}`}
                />
                <StatCard
                  label="Total gross (tickets + extras)"
                  value={`€${totalGross.toLocaleString()}`}
                  sub={`€${ticketGross.toLocaleString()} + €${extrasGross.toLocaleString()}`}
                />
                <StatCard
                  label="Net to club (after league fee)"
                  value={`€${netWithExtras.toLocaleString()}`}
                  sub={`€${totalGross.toLocaleString()} − €${leagueFee}`}
                  tone="success"
                />
              </div>
            </div>
          </div>

          {/* Tip with exact structure */}
          <div className="mt-6 rounded-xl border border-indigo-100 bg-white p-4 text-sm text-indigo-900/70 leading-relaxed">
            <strong className="text-indigo-900">Why these numbers are achievable:</strong> A typical club setup is{' '}
            <strong>
              {teams} teams × {familiesPerTeam} families × {Math.round(turnout * 100)}% turnout = {families} families
            </strong>
            . Younger age groups often bring siblings and extra supporters, and extras can lift totals further without
            increasing ticket price.
          </div>
        </div>
      </div>
    </section>
  );
};

