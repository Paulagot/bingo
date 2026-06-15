// src/components/mgtsystem/components/progress/DashboardFundraisingSummary.tsx

import { useEffect, useMemo, useRef, useState } from 'react';
import { TrendingUp, Target, CheckCircle, ChevronDown, Sparkles } from 'lucide-react';
import { useCurrency } from '../../hooks/useCurrency';
import type { RoomStats } from '../../services/quizRoomServices';
import type { Event } from '../../types/event';

interface LinkedActivity {
  room_id: string;
  game_type: 'quiz' | 'elimination' | 'ticketed_event';
  status: 'scheduled' | 'open' | 'live' | 'completed' | 'cancelled';
}

export interface DashboardFundraisingSummaryProps {
  events: Event[];
  activityMap: Record<string, LinkedActivity>;
  roomStatsMap: Record<string, RoomStats>;
  /** Daily confirmed income series from /quiz/web2/rooms/income-series */
  incomeSeries?: { date: string; total: number }[];
}

function confirmedForEvent(
  event: Event,
  activity: LinkedActivity | undefined,
  roomStatsMap: Record<string, RoomStats>
): number {
  const stats = activity ? roomStatsMap[activity.room_id] : undefined;
  return Math.max(stats?.totalIncome ?? 0, Number(event.actual_amount || 0));
}

let chartJsPromise: Promise<any> | null = null;
function loadChartJs(): Promise<any> {
  if ((window as any).Chart) return Promise.resolve((window as any).Chart);
  if (chartJsPromise) return chartJsPromise;
  chartJsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
    script.onload  = () => resolve((window as any).Chart);
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return chartJsPromise;
}

export function DashboardFundraisingSummary({
  events,
  activityMap,
  roomStatsMap,
  incomeSeries = [],
}: DashboardFundraisingSummaryProps) {
  const { fmt: formatMoney } = useCurrency();
  const [open, setOpen]   = useState(false);
  const chartsBuilt       = useRef(false);
  const donutRef          = useRef<HTMLCanvasElement>(null);
  const lineRef           = useRef<HTMLCanvasElement>(null);
  const donutChart        = useRef<any>(null);
  const lineChart         = useRef<any>(null);

  // ── Totals from events + stats ─────────────────────────────────────────────
  const totals = useMemo(() => {
    let totalGoal     = 0;
    let totalIncome   = 0;
    let eventsOnTrack = 0;
    let eventsWithGoal = 0;

    for (const event of events) {
      const goal = Number(event.goal_amount || 0);
      if (goal <= 0) continue;
      eventsWithGoal++;
      totalGoal += goal;
      const activity  = activityMap[event.id];
      const confirmed = confirmedForEvent(event, activity, roomStatsMap);
      totalIncome += confirmed;
      if (confirmed / goal >= 0.5) eventsOnTrack++;
    }

    const overallProgress = totalGoal > 0
      ? Math.min(Math.round((totalIncome / totalGoal) * 100), 100)
      : 0;

    return { totalGoal, totalIncome, overallProgress, eventsWithGoal, eventsOnTrack };
  }, [events, activityMap, roomStatsMap]);

  // ── Donut data — two slices ────────────────────────────────────────────────
  const donutData = useMemo(() => {
    const raised    = Math.round(totals.totalIncome);
    const remaining = Math.max(Math.round(totals.totalGoal - totals.totalIncome), 0);
    return {
      labels: ['Raised', 'Remaining'],
      values: raised > 0 ? [raised, remaining] : [0.01, totals.totalGoal],
      colors: ['#157f85', '#e8eeec'],
    };
  }, [totals]);

  // ── Line data — cumulative from income series ──────────────────────────────
  // Uses real confirmed_at dates from the ledger via the income-series endpoint.
  // Falls back to per-event income plotted at event dates if series is empty.
  const lineData = useMemo(() => {
    if (incomeSeries.length > 0) {
      // Sort by date, build cumulative
      const sorted = [...incomeSeries].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      let running = 0;
      const labels: string[] = [];
      const values: number[] = [];
      for (const row of sorted) {
        const d = new Date(row.date);
        labels.push(d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }));
        running += row.total;
        values.push(Math.round(running));
      }
      return { labels, values, isCumulative: true };
    }

    // Fallback — per-event income at event dates, sorted chronologically
    const eventsWithIncome = events
      .filter(e => Number(e.goal_amount || 0) > 0)
      .map(e => {
        const activity  = activityMap[e.id];
        const confirmed = confirmedForEvent(e, activity, roomStatsMap);
        const d = new Date(e.start_datetime || e.event_date || Date.now());
        return { d, confirmed, label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) };
      })
      .sort((a, b) => a.d.getTime() - b.d.getTime());

    return {
      labels: eventsWithIncome.map(e => e.label),
      values: eventsWithIncome.map(e => Math.round(e.confirmed)),
      isCumulative: false,
    };
  }, [incomeSeries, events, activityMap, roomStatsMap]);

  // ── Build / rebuild charts ─────────────────────────────────────────────────
  useEffect(() => {
    if (!open || chartsBuilt.current) return;

    loadChartJs().then((Chart) => {
      chartsBuilt.current = true;
      const isDark    = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
      const tickColor = isDark ? 'rgba(255,255,255,0.4)'  : '#52636f';

      // ── Donut ──────────────────────────────────────────────────────────────
      if (donutRef.current) {
        donutChart.current = new Chart(donutRef.current, {
          type: 'doughnut',
          data: {
            labels: donutData.labels,
            datasets: [{
              data: donutData.values,
              backgroundColor: donutData.colors,
              borderColor: isDark ? '#1a2e3a' : '#ffffff',
              borderWidth: 3,
              hoverOffset: 4,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '72%',
            layout: { padding: 4 },
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx: any) => {
                    if (ctx.label === 'Raised')     return ` Raised: ${formatMoney(ctx.raw)}`;
                    if (ctx.label === 'Remaining')  return ` Still needed: ${formatMoney(ctx.raw)}`;
                    return '';
                  },
                },
              },
            },
          },
          plugins: [{
            id: 'centreLabel',
            afterDraw(chart: any) {
              const { ctx, chartArea } = chart;
              if (!chartArea) return;
              const cx = (chartArea.left + chartArea.right) / 2;
              const cy = (chartArea.top + chartArea.bottom) / 2;
              ctx.save();
              ctx.textAlign    = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle    = isDark ? 'rgba(255,255,255,0.9)' : '#102532';
              ctx.font         = `700 20px system-ui, sans-serif`;
              ctx.fillText(`${totals.overallProgress}%`, cx, cy - 10);
              ctx.fillStyle = isDark ? 'rgba(255,255,255,0.4)' : '#8a9bab';
              ctx.font      = `400 11px system-ui, sans-serif`;
              ctx.fillText('of goal', cx, cy + 10);
              ctx.restore();
            },
          }],
        });
      }

      // ── Line / cumulative ──────────────────────────────────────────────────
      if (lineRef.current && lineData.labels.length > 0) {

        // Inline plugin: draws a pill-shaped label above each data point.
        const pointLabelPlugin = {
          id: 'pointLabels',
          afterDatasetsDraw(chart: any) {
            const { ctx, data, scales } = chart;
            const dataset = data.datasets[0];
            const values: number[] = dataset.data;
            const total = values.length;
            const step = total <= 8 ? 1 : 2;
            ctx.save();
            ctx.font = `600 10px system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            values.forEach((val: number, i: number) => {
              if (i % step !== 0) return;
              const x = scales.x.getPixelForValue(i);
              const y = scales.y.getPixelForValue(val);
              const label = val >= 1000
                ? `€${(val / 1000).toFixed(1)}k`
                : `€${val}`;
              const measured = ctx.measureText(label).width;
              const padX = 5;
              const padY = 3;
              const pillW = measured + padX * 2;
              const pillH = 14 + padY * 2;
              const pillX = x - pillW / 2;
              const pillY = y - 22 - pillH / 2;
              const r = pillH / 2;
              // Pill background
              ctx.beginPath();
              ctx.moveTo(pillX + r, pillY);
              ctx.lineTo(pillX + pillW - r, pillY);
              ctx.arcTo(pillX + pillW, pillY, pillX + pillW, pillY + pillH, r);
              ctx.lineTo(pillX + pillW, pillY + pillH - r);
              ctx.arcTo(pillX + pillW, pillY + pillH, pillX + pillW - r, pillY + pillH, r);
              ctx.lineTo(pillX + r, pillY + pillH);
              ctx.arcTo(pillX, pillY + pillH, pillX, pillY + pillH - r, r);
              ctx.lineTo(pillX, pillY + r);
              ctx.arcTo(pillX, pillY, pillX + r, pillY, r);
              ctx.closePath();
              ctx.fillStyle = isDark ? '#1e3a4a' : '#102532';
              ctx.fill();
              // Label text
              ctx.fillStyle = '#ffffff';
              ctx.fillText(label, x, pillY + pillH / 2);
            });
            ctx.restore();
          },
        };

        lineChart.current = new Chart(lineRef.current, {
          type: 'line',
          data: {
            labels: lineData.labels,
            datasets: [{
              label: lineData.isCumulative ? 'Cumulative income' : 'Income per event',
              data: lineData.values,
              borderColor: '#157f85',
              backgroundColor: 'rgba(21,127,133,0.12)',
              borderWidth: 2.5,
              fill: true,
              tension: lineData.isCumulative ? 0.1 : 0.3,
              pointRadius: 5,
              pointBackgroundColor: '#157f85',
              pointBorderColor: isDark ? '#1a2e3a' : '#ffffff',
              pointBorderWidth: 2,
              pointHoverRadius: 7,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            // Extra top padding so point labels above the highest point aren't clipped
            layout: { padding: { top: 28, right: 8, bottom: 4, left: 4 } },
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx: any) => ` ${formatMoney(ctx.parsed.y)}`,
                },
              },
            },
            scales: {
              x: {
                ticks: {
                  font: { size: 11, weight: '500' },
                  color: tickColor,
                  maxRotation: 35,
                  minRotation: 0,
                  autoSkip: lineData.labels.length > 12,
                  maxTicksLimit: 10,
                  padding: 6,
                },
                grid: { display: false },
                border: {
                  display: true,
                  color: isDark ? 'rgba(255,255,255,0.15)' : '#c8d4d0',
                },
              },
              y: {
                beginAtZero: true,
                ticks: {
                  font: { size: 10 },
                  color: tickColor,
                  padding: 6,
                  callback: (v: any) => v >= 1000 ? `€${(v / 1000).toFixed(1)}k` : `€${v}`,
                },
                grid: {
                  color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  drawTicks: false,
                },
                border: {
                  display: true,
                  dash: [3, 3],
                  color: isDark ? 'rgba(255,255,255,0.1)' : '#dce1df',
                },
              },
            },
          },
          plugins: [pointLabelPlugin],
        });
      }
    }).catch(console.error);

    return () => {
      donutChart.current?.destroy();
      lineChart.current?.destroy();
      donutChart.current  = null;
      lineChart.current   = null;
      chartsBuilt.current = false;
    };
  }, [open, donutData, lineData]);

  // ── Guard ──────────────────────────────────────────────────────────────────
  if (totals.eventsWithGoal === 0) return null;

  const isComplete = totals.overallProgress >= 100;
  const remaining  = Math.max(totals.totalGoal - totals.totalIncome, 0);

  return (
    <div className="mb-6">

      {/* ── Strip ─────────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="w-full text-left px-5 py-4 shadow-sm transition-colors"
        style={{
          background: '#102532',
          borderTop: '1px solid #1e4060',
          borderLeft: '1px solid #1e4060',
          borderRight: '1px solid #1e4060',
          borderBottom: open ? 'none' : '1px solid #1e4060',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px',
          borderBottomLeftRadius: open ? 0 : '12px',
          borderBottomRightRadius: open ? 0 : '12px',
        }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">

          <div className="flex-shrink-0">
            <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#7aacb5' }}>
              Total raised
            </p>
            <div className="flex items-end gap-2">
              <span className="text-2xl sm:text-3xl font-bold" style={{ color: '#ffffff' }}>
                {formatMoney(totals.totalIncome)}
              </span>
              {isComplete && <Sparkles className="h-5 w-5 mb-1 flex-shrink-0" style={{ color: '#f59e0b' }} />}
            </div>
          </div>

          <div className="hidden sm:block w-px self-stretch flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="flex items-center gap-1.5 font-semibold" style={{ color: '#7aacb5' }}>
                <Target className="h-3.5 w-3.5" />
                {formatMoney(totals.totalGoal)} total goal
              </span>
              <span className="flex items-center gap-1 font-bold text-sm"
                style={{ color: isComplete ? '#4ade80' : '#f0c96b' }}>
                {isComplete ? <CheckCircle className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
                {totals.overallProgress}%
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div
                className="h-2.5 rounded-full transition-all duration-700"
                style={{
                  width: `${totals.overallProgress}%`,
                  background: isComplete
                    ? 'linear-gradient(90deg,#22c55e,#4ade80)'
                    : 'linear-gradient(90deg,#157f85,#1eb8c0)',
                }}
              />
            </div>
            <p className="mt-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {isComplete ? 'All goals reached!' : `${formatMoney(remaining)} remaining across all events`}
            </p>
          </div>

          <div className="hidden sm:block w-px self-stretch flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }} />

          <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-1">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#7aacb5' }}>On track</p>
              <p className="text-2xl font-bold" style={{ color: '#ffffff' }}>
                {totals.eventsOnTrack}
                <span className="text-sm font-medium ml-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  / {totals.eventsWithGoal}
                </span>
              </p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>events ≥ 50%</p>
            </div>
            <span
              className="inline-flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)', border: '0.5px solid rgba(255,255,255,0.15)' }}
            >
              {open ? 'Hide charts' : 'Show charts'}
              <ChevronDown
                className="h-3.5 w-3.5 transition-transform duration-200"
                style={{ transform: open ? 'rotate(180deg)' : 'none' }}
              />
            </span>
          </div>

        </div>
      </button>

      {/* ── Charts panel ──────────────────────────────────────────────────── */}
      <div
        className="overflow-hidden transition-all duration-300"
        style={{
          maxHeight: open ? '600px' : '0px',
          background: '#f6f1e8',
          borderLeft: open ? '1px solid #dce1df' : 'none',
          borderRight: open ? '1px solid #dce1df' : 'none',
          borderBottom: open ? '1px solid #dce1df' : 'none',
          borderBottomLeftRadius: '12px',
          borderBottomRightRadius: '12px',
        }}
        aria-hidden={!open}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">

          {/* ── Donut ── */}
          <div className="rounded-xl p-4" style={{ background: '#ffffff', border: '1px solid #dce1df' }}>
            <p className="text-xs font-semibold mb-4" style={{ color: '#52636f' }}>Goal progress</p>

            {/* Donut centred above legend */}
            <div className="flex flex-col items-center gap-4">
              <div style={{ width: '150px', height: '150px' }}>
                <canvas
                  ref={donutRef}
                  role="img"
                  aria-label={`${totals.overallProgress}% of fundraising goal reached`}
                />
              </div>

              {/* Legend below donut */}
              <div className="w-full flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: '#157f85' }} />
                    <span className="text-xs font-medium" style={{ color: '#52636f' }}>Raised</span>
                  </div>
                  <span className="text-xs font-bold" style={{ color: '#102532' }}>
                    {formatMoney(totals.totalIncome)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: '#e8eeec', border: '1px solid #dce1df' }} />
                    <span className="text-xs font-medium" style={{ color: '#52636f' }}>Still needed</span>
                  </div>
                  <span className="text-xs font-bold" style={{ color: '#8a9bab' }}>
                    {formatMoney(remaining)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid #f1f0ee' }}>
                  <span className="text-xs font-medium" style={{ color: '#52636f' }}>Total goal</span>
                  <span className="text-xs font-bold" style={{ color: '#102532' }}>
                    {formatMoney(totals.totalGoal)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Line chart ── */}
          <div className="rounded-xl p-4" style={{ background: '#ffffff', border: '1px solid #dce1df' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold" style={{ color: '#52636f' }}>
                {lineData.isCumulative ? 'Cumulative income over time' : 'Income by event date'}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#157f85' }} />
                <span className="text-[11px]" style={{ color: '#8a9bab' }}>
                  {lineData.isCumulative ? 'Cumulative' : 'Per event'}
                </span>
              </div>
            </div>
            <div style={{ position: 'relative', width: '100%', height: '240px' }}>
              <canvas
                ref={lineRef}
                role="img"
                aria-label={lineData.isCumulative
                  ? 'Area chart showing cumulative confirmed income over time'
                  : 'Line chart showing confirmed income per event by date'}
              >
                {lineData.labels.map((l, i) => `${l}: ${formatMoney(lineData.values[i] ?? 0)}`).join('. ')}
              </canvas>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default DashboardFundraisingSummary;