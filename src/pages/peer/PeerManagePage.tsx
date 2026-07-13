import {useEffect,useState} from 'react';
import {useParams} from 'react-router-dom';
import svc from '../../services/PeerService';
import type {PeerFundraiserFormat} from '../../services/PeerService';
import {QRCodeCanvas} from 'qrcode.react';
import PeerPackEditor from '../../components/peer/PeerPackEditor';
import PeerPaymentsTab from '../../components/peer/PeerPaymentsTab';
import PeerReportsTab from '../../components/peer/PeerReportsTab';

const FORMAT_OPTIONS: { value: PeerFundraiserFormat; label: string }[] = [
  { value: 'door_to_door_pack', label: 'Door-to-door pack' },
  { value: 'sponsored_activity', label: 'Sponsored activity' },
  { value: 'personal_fundraising', label: 'Personal fundraising' },
  { value: 'team_fundraising', label: 'Team fundraising' },
  { value: 'custom', label: 'Custom' },
];

const ITEM_TYPE_LABELS: Record<string, string> = {
  game_entry: 'Game Entry',
  quiz_team_ticket: 'Quiz Team Ticket',
  quiz_individual_ticket: 'Quiz Individual Ticket',
  elimination_entry: 'Last Player Standing Entry',
  puzzle_entry: 'Puzzle Entry',
  event_ticket: 'Event Ticket',
  custom: 'Custom',
};

export default function PeerManagePage(){
  const {peerFundraiserId:id=''}=useParams(); const [f,setF]=useState<any>(null); const [tab,setTab]=useState('overview');
  const [participants,setParticipants]=useState<any[]>([]); const [packs,setPacks]=useState<any[]>([]);
  const [orders,setOrders]=useState<any[]>([]); const [rooms,setRooms]=useState<any[]>([]);
  const [person,setPerson]=useState('');
  const [personTarget,setPersonTarget]=useState(''); const [personMessage,setPersonMessage]=useState(''); const [personPhoto,setPersonPhoto]=useState('');
  const [editingParticipant,setEditingParticipant]=useState<any>(null);
  const [editorOpen,setEditorOpen]=useState(false); const [editingPack,setEditingPack]=useState<any>(null);
  const [saving,setSaving]=useState(false); const [applyingTemplate,setApplyingTemplate]=useState(false);
  const [editingFundraiser,setEditingFundraiser]=useState(false);
  const [editName,setEditName]=useState(''); const [editDescription,setEditDescription]=useState('');
  const [editTarget,setEditTarget]=useState(''); const [editFormat,setEditFormat]=useState<PeerFundraiserFormat>('door_to_door_pack');
  async function load(){const [fr,ps,pks,os,rs]=await Promise.all([svc.get(id),svc.participants(id),svc.packs(id),svc.orders(id),svc.rooms(id)]);
    setF(fr.fundraiser);setParticipants(ps.participants);setPacks(pks.packs);setOrders(os.orders);setRooms(rs.rooms);}
  useEffect(()=>{load();},[id]);
  if(!f)return <main className="p-8 font-bold">Loading…</main>;
  // f.club_slug now comes from the API (getFundraiser joins the clubs
  // table) — previously this always read a localStorage key that was
  // never actually set, so every generated URL showed the literal
  // string "your-club" instead of the club's real slug.
  const clubSlug=f.club_slug||localStorage.getItem('club_slug')||'your-club';
  const base=`${window.location.origin}/fundraise/${clubSlug}/${f.public_slug}`;
  const resetPersonForm=()=>{setPerson('');setPersonTarget('');setPersonMessage('');setPersonPhoto('');setEditingParticipant(null);};
  const addPerson=async()=>{
    if(!person.trim())return;
    await svc.addParticipant(id,{
      participantName:person.trim(),
      personalTarget:personTarget?Number(personTarget):null,
      personalMessage:personMessage.trim()||null,
      profileImageUrl:personPhoto.trim()||null,
    });
    resetPersonForm(); load();
  };
  const startEditPerson=(p:any)=>{
    setEditingParticipant(p);
    setPerson(p.participant_name);
    setPersonTarget(p.personal_target!=null?String(p.personal_target):'');
    setPersonMessage(p.personal_message||'');
    setPersonPhoto(p.profile_image_url||'');
  };
  const saveEditPerson=async()=>{
    if(!editingParticipant||!person.trim())return;
    await svc.updateParticipant(id,editingParticipant.id,{
      participantName:person.trim(),
      personalTarget:personTarget?Number(personTarget):null,
      personalMessage:personMessage.trim()||null,
      profileImageUrl:personPhoto.trim()||null,
    });
    resetPersonForm(); load();
  };
  const removePerson=async(p:any)=>{
    if(!confirm(`Remove ${p.participant_name}? If they already have orders, they'll be deactivated instead of deleted.`))return;
    await svc.deleteParticipant(id,p.id); load();
  };

  // Overview tab previously had no edit affordance at all — name,
  // description and target could only ever be set once, at creation.
  const startEditFundraiser=()=>{
    setEditName(f.name); setEditDescription(f.description||'');
    setEditTarget(String(f.target_amount)); setEditFormat(f.format_type);
    setEditingFundraiser(true);
  };
  const saveFundraiserEdits=async()=>{
    if(!editName.trim())return;
    const r=await svc.update(id,{
      name:editName.trim(),
      description:editDescription.trim()||null,
      targetAmount:Number(editTarget||0),
      formatType:editFormat,
    });
    setF(r.fundraiser); setEditingFundraiser(false);
  };

  const handlePublish=async()=>{
    // Soft warning only, consistent with no hard gates at this level —
    // just make sure the club doesn't publish into a state where
    // supporters land on a page with literally no way to pay.
    try{
      const pm=await svc.paymentMethods(id);
      if(!pm.linkedMethodIds?.length){
        if(!confirm("No payment methods are linked yet — supporters won't be able to pay online. Publish anyway?")) return;
      }
    }catch{/* non-fatal — don't block publish if this check itself fails */}
    const r=await svc.update(id,{status:'published'});
    setF(r.fundraiser);
  };

  const savePack=async(payload:any)=>{
    setSaving(true);
    try{
      if(editingPack) await svc.updatePack(id,editingPack.id,payload);
      else await svc.addPack(id,payload);
      setEditorOpen(false); setEditingPack(null); await load();
    }catch(err:any){ alert(`Save failed: ${err.message}`); }
    finally{ setSaving(false); }
  };
  const hidePack=async(pack:any)=>{
    if(!confirm(`Hide "${pack.name}"? It will no longer be visible to supporters.`)) return;
    try{ await svc.hidePack(id,pack.id); await load(); }
    catch(err:any){ alert(`Failed to hide: ${err.message}`); }
  };
  const duplicatePack=async(pack:any)=>{
    try{ await svc.duplicatePack(id,pack.id); await load(); }
    catch(err:any){ alert(`Failed to duplicate: ${err.message}`); }
  };
  const applyTemplate=async(key:'door_to_door'|'quiz_only'|'puzzle_campaign')=>{
    setApplyingTemplate(true);
    try{ await svc.applyTemplate(id,key); await load(); }
    catch(err:any){ alert(`Template failed: ${err.message}`); }
    finally{ setApplyingTemplate(false); }
  };

  return <main className="mx-auto max-w-7xl p-6">
    <div className="flex items-start justify-between"><div><h1 className="text-3xl font-black">{f.name}</h1><p className="mt-1 text-sm text-slate-500">{base}</p></div>
    {f.status!=='published'&&<button onClick={handlePublish} className="rounded-xl bg-green-600 px-4 py-3 font-black text-white">Publish</button>}</div>
    <nav className="mt-7 flex gap-2 border-b">{['overview','participants','packs','orders','payments','report'].map(t=><button key={t} onClick={()=>setTab(t)} className={`px-4 py-3 font-black capitalize ${tab===t?'border-b-2 border-orange-500 text-orange-600':'text-slate-500'}`}>{t}</button>)}</nav>
    <section className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-slate-200">
      {tab==='overview'&&(editingFundraiser?(
        <div className="max-w-xl space-y-3">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Name</label>
            <input className="w-full rounded-xl border p-3" value={editName} onChange={e=>setEditName(e.target.value)} placeholder="Name"/>
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Description</label>
            <textarea className="w-full rounded-xl border p-3" value={editDescription} onChange={e=>setEditDescription(e.target.value)} placeholder="Description"/>
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Overall target</label>
            <input className="w-full rounded-xl border p-3" type="number" value={editTarget} onChange={e=>setEditTarget(e.target.value)} placeholder="Overall target"/>
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Format</label>
            <select className="w-full rounded-xl border p-3" value={editFormat} onChange={e=>setEditFormat(e.target.value as PeerFundraiserFormat)}>
              {FORMAT_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={saveFundraiserEdits} className="rounded-xl bg-orange-500 px-5 py-3 font-black text-white">Save changes</button>
            <button onClick={()=>setEditingFundraiser(false)} className="rounded-xl border px-5 py-3 font-black text-slate-700">Cancel</button>
          </div>
        </div>
      ):(
        <div>
          <div className="grid gap-4 md:grid-cols-3"><Card t="Status" v={f.status}/><Card t="Target" v={`€${Number(f.target_amount).toFixed(2)}`}/><Card t="Format" v={f.format_type}/></div>
          {f.description&&<p className="mt-4 text-sm font-semibold text-slate-600">{f.description}</p>}
          <button onClick={startEditFundraiser} className="mt-4 rounded-xl border px-4 py-2 text-sm font-black">Edit details</button>
        </div>
      ))}
      {tab==='participants'&&<>
        <div className="rounded-2xl border border-slate-200 p-4">
          <h3 className="text-sm font-black text-slate-700">{editingParticipant?`Editing ${editingParticipant.participant_name}`:'Add a participant'}</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input className="rounded-xl border p-3" value={person} onChange={e=>setPerson(e.target.value)} placeholder="Participant name"/>
            <input className="rounded-xl border p-3" type="number" value={personTarget} onChange={e=>setPersonTarget(e.target.value)} placeholder="Personal target (optional)"/>
            <input className="rounded-xl border p-3" value={personPhoto} onChange={e=>setPersonPhoto(e.target.value)} placeholder="Photo URL (optional)"/>
            <textarea className="rounded-xl border p-3 md:col-span-2" value={personMessage} onChange={e=>setPersonMessage(e.target.value)} placeholder="Personal message shown on their page (optional)"/>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={editingParticipant?saveEditPerson:addPerson} className="rounded-xl bg-orange-500 px-5 py-3 font-black text-white">{editingParticipant?'Save changes':'Add'}</button>
            {editingParticipant&&<button onClick={resetPersonForm} className="rounded-xl border px-5 py-3 font-black text-slate-700">Cancel</button>}
          </div>
        </div>
        <div className="mt-5 space-y-3">{participants.map(p=>{const url=`${base}/${p.participant_slug}`;return <article key={p.id} className={`flex items-center gap-4 rounded-2xl border p-4 ${p.is_active===0?'opacity-50':''}`}><QRCodeCanvas value={url} size={72}/><div className="min-w-0 flex-1"><b>{p.participant_name}</b>{p.is_active===0&&<span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-500">Inactive</span>}<p className="truncate text-sm text-slate-500">{url}</p>{p.personal_target!=null&&<p className="text-xs font-bold text-slate-400">Target: €{Number(p.personal_target).toFixed(2)}</p>}<p className="text-sm font-bold text-green-700">€{Number(p.confirmed_total||0).toFixed(2)}</p></div><div className="flex shrink-0 gap-2"><button onClick={()=>navigator.clipboard.writeText(url)} className="rounded-xl border px-3 py-2 text-sm font-black">Copy</button><button onClick={()=>startEditPerson(p)} className="rounded-xl border px-3 py-2 text-sm font-black">Edit</button><button onClick={()=>removePerson(p)} className="rounded-xl border border-red-200 px-3 py-2 text-sm font-black text-red-600">Remove</button></div></article>})}</div>
      </>}
      {tab==='packs'&&<>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Packs</h2>
            <p className="text-sm text-slate-500">Build a bundle from your club's events, or start from a template.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              disabled={applyingTemplate}
              onChange={e=>{const key=e.target.value as any; e.target.value=''; if(key) applyTemplate(key);}}
              className="rounded-xl border p-3 font-bold"
              defaultValue=""
            >
              <option value="" disabled>{applyingTemplate?'Applying…':'Use a template'}</option>
              <option value="door_to_door">Door to door pack</option>
              <option value="quiz_only">Quiz only</option>
              <option value="puzzle_campaign">Puzzle campaign</option>
            </select>
            <button onClick={()=>{setEditingPack(null);setEditorOpen(true);}} className="rounded-xl bg-orange-500 px-5 py-3 font-black text-white">+ Create pack</button>
          </div>
        </div>
        {packs.length===0&&<p className="mt-5 text-sm font-semibold text-slate-500">No packs yet — use a template above or create one manually.</p>}
        <div className="mt-5 grid gap-4 md:grid-cols-2">{packs.filter((p:any)=>p.is_active!==0).map((p:any)=><article key={p.id} className="rounded-2xl border p-5">
          <div className="flex justify-between"><b>{p.name}</b><b>€{Number(p.price).toFixed(2)}</b></div>
          {p.is_featured?<span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-700">{p.badge_label||'Featured'}</span>:null}
          <ul className="mt-3 text-sm text-slate-500">{p.items.map((i:any)=>{
            const room=rooms.find((r:any)=>r.room_id===i.target_room_id);
            return <li key={i.id}>{i.quantity} × {ITEM_TYPE_LABELS[i.item_type]||i.item_type} · {room?.name||i.target_room_id}</li>;
          })}</ul>
          <div className="mt-4 flex gap-2">
            <button onClick={()=>{setEditingPack(p);setEditorOpen(true);}} className="rounded-xl border px-3 py-2 text-sm font-black">Edit</button>
            <button onClick={()=>duplicatePack(p)} className="rounded-xl border px-3 py-2 text-sm font-black">Duplicate</button>
            <button onClick={()=>hidePack(p)} className="rounded-xl border border-red-200 px-3 py-2 text-sm font-black text-red-600">Hide</button>
          </div>
        </article>)}</div>
        {editorOpen&&<PeerPackEditor pack={editingPack} rooms={rooms} defaultCurrency={f.currency||'EUR'} saving={saving} onSave={savePack} onClose={()=>{setEditorOpen(false);setEditingPack(null);}}/>}
      </>}
      {tab==='orders'&&<div className="space-y-3">{orders.map(o=><article key={o.id} className="flex items-center gap-4 rounded-2xl border p-4"><div className="flex-1"><b>{o.supporter_name}</b><p className="text-sm text-slate-500">{o.participant_name||'General link'}</p></div><b>€{Number(o.total_amount).toFixed(2)}</b><span className="text-xs font-black uppercase">{o.payment_status}</span><div className="flex gap-2">
        {['pending','claimed'].includes(o.payment_status)&&<button onClick={async()=>{await svc.confirm(id,o.id);load();}} className="rounded-xl bg-green-600 px-3 py-2 font-black text-white">Confirm</button>}
        {['pending','claimed','confirmed'].includes(o.payment_status)&&<button onClick={async()=>{const verb=o.payment_status==='confirmed'?'Undo confirmation of':'Reject'; const reason=window.prompt(`Reason for ${verb.toLowerCase()} this order (optional):`)||undefined;if(o.payment_status==='confirmed'&&!confirm('This order was already confirmed — real tickets exist for it. Cancelling will block those tickets. Continue?'))return;await svc.rejectOrder(id,o.id,reason);load();}} className="rounded-xl bg-red-600 px-3 py-2 font-black text-white">{o.payment_status==='confirmed'?'Undo':'Reject'}</button>}
      </div></article>)}</div>}
      {tab==='payments'&&<PeerPaymentsTab fundraiserId={id}/>}
      {tab==='report'&&<PeerReportsTab fundraiserId={id}/>}
    </section>
  </main>
}
function Card({t,v}:{t:string,v:string}){return <div className="rounded-2xl bg-slate-50 p-5"><p className="text-xs font-black uppercase text-slate-400">{t}</p><p className="mt-2 text-xl font-black capitalize">{v.replaceAll('_',' ')}</p></div>}