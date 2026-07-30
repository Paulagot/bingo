import { useEffect, useState } from 'react';
import { Calendar, Footprints, Heart, Clock, Wallet, Users, AlertCircle } from 'lucide-react';
import type { Web2RoomListItem as Room } from '../../../../../shared/api/quiz.api';
import sponsoredActivityMgmtService, { type SponsoredContributionSummary } from '../../../services/SponsoredActivityMgmtService';
import { useCurrency } from '../../../hooks/useCurrency';

export default function OverviewTabSponsoredActivity({ room, config, linkedEventTitle }: { room: Room; config?: any; linkedEventTitle?: string | null }) {
  const [summary, setSummary] = useState<SponsoredContributionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { fmt } = useCurrency(config);
  useEffect(() => { sponsoredActivityMgmtService.getSummary(room.room_id).then(r => setSummary(r.summary)).catch(e => setError(e?.message || 'Failed to load totals')); }, [room.room_id]);
  const activity = config?.activityKind === 'other' ? config?.customActivityLabel : config?.activityKind;
  const dt = (v?: string | null) => v ? new Date(v).toLocaleString('en-IE', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not set';
  return <div className="space-y-5 p-5">
    {error && <div className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle className="h-4 w-4" />{error}</div>}
    <div className="rounded-2xl border p-5" style={{ borderColor: 'rgba(21,127,133,.25)', background: 'rgba(21,127,133,.05)' }}>
      <div className="flex items-center gap-3"><Footprints className="h-6 w-6 text-[#157f85]"/><div><p className="text-xs font-bold uppercase tracking-wide text-[#157f85]">Sponsored Activity</p><h3 className="text-lg font-black text-[#102532]">{linkedEventTitle || 'Sponsored activity'}</h3><p className="text-sm capitalize text-[#52636f]">{activity || 'Activity'}</p></div></div>
    </div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[['Confirmed', summary ? fmt(summary.confirmedTotal) : '-', <Heart className="h-4 w-4"/>], ['Contributions', summary?.confirmedCount ?? '-', <Users className="h-4 w-4"/>], ['Awaiting', summary ? fmt(summary.pendingTotal) : '-', <Clock className="h-4 w-4"/>], ['Average', summary ? fmt(summary.averageConfirmed) : '-', <Wallet className="h-4 w-4"/>]].map(([l,v,i]: any)=><div key={l} className="rounded-xl border border-[#dce1df] bg-white p-4"><div className="text-[#157f85]">{i}</div><p className="mt-2 text-xs font-semibold uppercase text-[#52636f]">{l}</p><p className="mt-1 text-xl font-black text-[#102532]">{v}</p></div>)}
    </div>
    <div className="rounded-xl border border-[#dce1df] bg-white p-4 text-sm">
      <div className="grid gap-3 sm:grid-cols-2"><div><p className="text-xs text-[#52636f]">Sponsorship opens</p><p className="font-semibold text-[#102532]"><Calendar className="mr-1 inline h-4 w-4 text-[#157f85]"/>{dt((room as any).scheduled_at)}</p></div><div><p className="text-xs text-[#52636f]">Sponsorship closes</p><p className="font-semibold text-[#102532]"><Calendar className="mr-1 inline h-4 w-4 text-[#157f85]"/>{dt((room as any).ended_at)}</p></div></div>
      <div className="mt-4"><p className="text-xs text-[#52636f]">Suggested amounts</p><div className="mt-2 flex flex-wrap gap-2">{(config?.suggestedAmounts || []).map((n:number)=><span key={n} className="rounded-full bg-[#f6f1e8] px-3 py-1 text-xs font-semibold text-[#102532]">{fmt(n)}</span>)}</div></div>
    </div>
  </div>;
}
