import React from 'react'
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
  BarChart, Bar,
  Legend,
} from 'recharts'
import type { NameType } from 'recharts/types/component/DefaultTooltipContent'
import type { ChartsData } from '../../../hooks/useFundraiserDashboard'

interface Props {
  charts: ChartsData
}

const HOST_COLOR   = '#3bbef5'
const PLAYER_COLOR = '#63ffb4'
const MUTED_COLOR  = '#f5a623'
const GRID_COLOR   = 'rgba(255,255,255,0.05)'
const AXIS_COLOR   = 'rgba(255,255,255,0.25)'

const fmtEur = (n: number) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 1 }).format(n)

const DONUT_COLORS_HOST   = [HOST_COLOR,   'rgba(59,190,245,0.45)',  'rgba(59,190,245,0.2)']
const DONUT_COLORS_PLAYER = [PLAYER_COLOR, 'rgba(99,255,180,0.45)',  'rgba(99,255,180,0.2)']

const tooltipStyle: React.CSSProperties = {
  background: '#13131f',
  border: '0.5px solid rgba(255,255,255,0.12)',
  borderRadius: '10px',
  fontSize: '12px',
  fontFamily: "'DM Mono', monospace",
  color: '#fff',
}

type BadgeType = 'host' | 'player' | 'both'

function ChartSection({ title, badge, children }: { title: string; badge: BadgeType; children: React.ReactNode }) {
  const badgeLabels: Record<BadgeType, string> = { host: 'HOST', player: 'SUPPORTER', both: 'BOTH' }
  return (
    <div className="fl-chart-section">
      <div className="fl-chart-header">
        <span className={`fl-chart-badge fl-chart-badge--${badge}`}>{badgeLabels[badge]}</span>
        <h3 className="fl-chart-title">{title}</h3>
      </div>
      <div className="fl-chart-body">{children}</div>
      <style>{`
        .fl-chart-section { background:#0f0f18; border:0.5px solid rgba(255,255,255,0.07); border-radius:16px; overflow:hidden; }
        .fl-chart-header  { display:flex; align-items:center; gap:10px; padding:1.25rem 1.5rem 0; }
        .fl-chart-badge   { font-family:'DM Mono',monospace; font-size:9px; letter-spacing:0.16em; padding:3px 8px; border-radius:4px; }
        .fl-chart-badge--host   { background:rgba(59,190,245,0.12);  color:#3bbef5; border:0.5px solid rgba(59,190,245,0.25); }
        .fl-chart-badge--player { background:rgba(99,255,180,0.10);  color:#63ffb4; border:0.5px solid rgba(99,255,180,0.22); }
        .fl-chart-badge--both   { background:rgba(245,166,35,0.12);  color:#f5a623; border:0.5px solid rgba(245,166,35,0.25); }
        .fl-chart-title { font-family:'Syne',sans-serif; font-size:14px; font-weight:600; color:rgba(255,255,255,0.7); margin:0; }
        .fl-chart-body  { padding:1rem 1rem 1.25rem; }
      `}</style>
    </div>
  )
}

interface DonutLabelProps {
  viewBox?: { cx: number; cy: number }
  value: number
}

function DonutLabel({ viewBox, value }: DonutLabelProps) {
  const cx = viewBox?.cx ?? 0
  const cy = viewBox?.cy ?? 0
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
      <tspan x={cx} dy="-0.3em" style={{ fontFamily: 'Syne,sans-serif', fontSize: '18px', fontWeight: 700, fill: '#fff' }}>
        {fmtEur(value)}
      </tspan>
      <tspan x={cx} dy="1.4em" style={{ fontFamily: 'DM Mono,monospace', fontSize: '9px', fill: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>
        TOTAL
      </tspan>
    </text>
  )
}

const legendFormatter = (value: NameType) => (
  <span style={{ fontFamily: 'DM Mono,monospace', fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>
    {String(value)}
  </span>
)

function EmptyChart() {
  return (
    <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: 'DM Mono,monospace', fontSize: '11px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>
        NO DATA YET
      </span>
    </div>
  )
}

export function FundraiserImpactCharts({ charts }: Props) {
  const { raisedOverTime, revenueMix, contributionMix, chainUsage, payoutsOverTime, charitiesBreakdown } = charts

  const revenueMixTotal = revenueMix.reduce((s, d)      => s + (d.value ?? 0), 0)
  const contribMixTotal = contributionMix.reduce((s, d) => s + (d.value ?? 0), 0)

  const fmtDate = (v: string) =>
    v ? new Date(v).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' }) : ''

  return (
    <div className="fl-charts-root">

      <div className="fl-charts-row fl-charts-row--3">
        <div className="fl-charts-row--span2">
          <ChartSection title="Charity raised over time" badge="host">
            {raisedOverTime.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={raisedOverTime} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                  <XAxis dataKey="period_start" tick={{ fontSize: 10, fill: AXIS_COLOR, fontFamily: 'DM Mono,monospace' }} axisLine={false} tickLine={false} tickFormatter={(v: string) => fmtDate(v)} />
                  <YAxis tick={{ fontSize: 10, fill: AXIS_COLOR, fontFamily: 'DM Mono,monospace' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtEur(v)} width={52} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: unknown) => [fmtEur(Number(value ?? 0)), 'Charity'] as [string, string]} />
                  <Line type="monotone" dataKey="charity_eur" stroke={HOST_COLOR} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: HOST_COLOR }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartSection>
        </div>

        <ChartSection title="Revenue mix" badge="host">
          {revenueMixTotal === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={revenueMix} cx="50%" cy="50%" innerRadius={52} outerRadius={72} paddingAngle={3} dataKey="value">
                  {revenueMix.map((_, i) => <Cell key={i} fill={DONUT_COLORS_HOST[i % DONUT_COLORS_HOST.length]} stroke="none" />)}
                  <DonutLabel value={revenueMixTotal} />
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(value: unknown) => [fmtEur(Number(value ?? 0))] as [string]} />
                <Legend iconType="circle" iconSize={7} formatter={legendFormatter} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartSection>
      </div>

      <div className="fl-charts-row fl-charts-row--3">
        <ChartSection title="My contributions" badge="player">
          {contribMixTotal === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={contributionMix} cx="50%" cy="50%" innerRadius={52} outerRadius={72} paddingAngle={3} dataKey="value">
                  {contributionMix.map((_, i) => <Cell key={i} fill={DONUT_COLORS_PLAYER[i % DONUT_COLORS_PLAYER.length]} stroke="none" />)}
                  <DonutLabel value={contribMixTotal} />
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(value: unknown) => [fmtEur(Number(value ?? 0))] as [string]} />
                <Legend iconType="circle" iconSize={7} formatter={legendFormatter} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartSection>

        <ChartSection title="Activity by chain" badge="both">
          {chainUsage.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chainUsage} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                <XAxis dataKey="chain" tick={{ fontSize: 10, fill: AXIS_COLOR, fontFamily: 'DM Mono,monospace' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: AXIS_COLOR, fontFamily: 'DM Mono,monospace' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="hosted_rooms" name="Hosted" fill={HOST_COLOR}   radius={[4, 4, 0, 0] as [number,number,number,number]} />
                <Bar dataKey="rooms_joined" name="Joined"  fill={PLAYER_COLOR} radius={[4, 4, 0, 0] as [number,number,number,number]} />
                <Legend iconType="circle" iconSize={7} formatter={legendFormatter} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartSection>

        <ChartSection title="Charities breakdown" badge="host">
          {charitiesBreakdown.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={charitiesBreakdown} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: AXIS_COLOR, fontFamily: 'DM Mono,monospace' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtEur(v)} />
                <YAxis type="category" dataKey="charity_name" tick={{ fontSize: 10, fill: AXIS_COLOR, fontFamily: 'DM Mono,monospace' }} axisLine={false} tickLine={false} width={90} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: unknown) => [fmtEur(Number(value ?? 0)), 'Raised'] as [string, string]} />
                <Bar dataKey="total_eur" name="Total raised" fill={HOST_COLOR} radius={[0, 4, 4, 0] as [number,number,number,number]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartSection>
      </div>

      {payoutsOverTime.length > 0 && (
        <ChartSection title="Prize payouts sent from hosted rooms" badge="host">
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={payoutsOverTime} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
              <XAxis dataKey="period_start" tick={{ fontSize: 10, fill: AXIS_COLOR, fontFamily: 'DM Mono,monospace' }} axisLine={false} tickLine={false} tickFormatter={(v: string) => fmtDate(v)} />
              <YAxis tick={{ fontSize: 10, fill: AXIS_COLOR, fontFamily: 'DM Mono,monospace' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtEur(v)} width={52} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: unknown) => [fmtEur(Number(value ?? 0)), 'Payouts'] as [string, string]} />
              <Line type="monotone" dataKey="payout_eur" stroke={MUTED_COLOR} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: MUTED_COLOR }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartSection>
      )}

      <style>{`
        .fl-charts-root { display:flex; flex-direction:column; gap:12px; }
        .fl-charts-row  { display:grid; gap:12px; }
        .fl-charts-row--3     { grid-template-columns:repeat(3,minmax(0,1fr)); }
        .fl-charts-row--span2 { grid-column:span 2; }
        @media(max-width:900px){
          .fl-charts-row--3     { grid-template-columns:1fr; }
          .fl-charts-row--span2 { grid-column:span 1; }
        }
      `}</style>
    </div>
  )
}