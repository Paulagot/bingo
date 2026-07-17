import {useEffect,useState} from 'react';
import svc from '../../services/PeerService';
export default function PeerReportsTab({fundraiserId}:{fundraiserId:string}){
 const [r,setR]=useState<any>(null);useEffect(()=>{svc.report(fundraiserId).then(setR)},[fundraiserId]);if(!r)return <p>Loading report…</p>;
 const confirmed=Number(r.totals.find((x:any)=>x.payment_status==='confirmed')?.total||0);
 return <div><div className="grid gap-4 md:grid-cols-3"><Card t="Confirmed" v={`€${confirmed.toFixed(2)}`}/><Card t="Participants" v={r.participants.length}/><Card t="Rooms" v={r.rooms.length}/></div>
 <h3 className="mt-7 text-lg font-black">By participant</h3><div className="mt-3 space-y-2">{r.participants.map((x:any)=><div className="flex justify-between rounded-xl bg-slate-50 p-3" key={x.participant_id||'general'}><span>{x.participant_name||'General link'}</span><b>€{Number(x.confirmed_total||0).toFixed(2)}</b></div>)}</div></div>
}
function Card({t,v}:{t:string,v:any}){return <div className="rounded-2xl bg-slate-50 p-5"><p className="text-xs font-black uppercase text-slate-400">{t}</p><p className="mt-2 text-2xl font-black">{v}</p></div>}
