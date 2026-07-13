import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import svc,{PeerFundraiser} from '../../services/PeerService';

export default function PeerDashboard(){
  const [rows,setRows]=useState<PeerFundraiser[]>([]);
  useEffect(()=>{svc.list().then(r=>setRows(r.fundraisers));},[]);
  return <main className="mx-auto max-w-7xl p-6">
    <div className="flex items-center justify-between gap-4">
      <div><h1 className="text-3xl font-black">Peer-to-Peer Fundraising</h1>
      <p className="mt-2 text-slate-500">Build packs, add participants and track every order.</p></div>
      <Link to="/peer-dashboard/new" className="rounded-2xl bg-orange-500 px-5 py-3 font-black text-white">New peer fundraiser</Link>
    </div>
    <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {rows.map(x=><article key={x.id} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase">{x.status}</span>
        <h2 className="mt-4 text-xl font-black">{x.name}</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">/{x.public_slug}</p>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <Stat label="People" value={x.participant_count||0}/><Stat label="Packs" value={x.pack_count||0}/>
          <Stat label="Raised" value={`€${Number(x.confirmed_total||0).toFixed(0)}`}/>
        </div>
        <Link to={`/peer-dashboard/${x.id}`} className="mt-5 block rounded-2xl bg-slate-950 p-3 text-center font-black text-white">Manage</Link>
      </article>)}
    </section>
  </main>
}
function Stat({label,value}:{label:string,value:any}){return <div className="rounded-xl bg-slate-50 p-3"><b>{value}</b><div className="text-[10px] font-bold uppercase text-slate-400">{label}</div></div>}
