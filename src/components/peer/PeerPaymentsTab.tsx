import {useEffect,useMemo,useState} from 'react';
import {Check,Loader2} from 'lucide-react';
import svc from '../../services/PeerService';
export default function PeerPaymentsTab({fundraiserId}:{fundraiserId:string}){
  const [methods,setMethods]=useState<any[]>([]),[selected,setSelected]=useState<number[]>([]),[original,setOriginal]=useState<number[]>([]);
  const [saving,setSaving]=useState(false); const [justSaved,setJustSaved]=useState(false);
  useEffect(()=>{svc.paymentMethods(fundraiserId).then((r:any)=>{setMethods(r.availableMethods);setSelected(r.linkedMethodIds);setOriginal(r.linkedMethodIds);});},[fundraiserId]);
  const changed=useMemo(()=>JSON.stringify([...selected].sort())!==JSON.stringify([...original].sort()),[selected,original]);
  const handleSave=async()=>{
    setSaving(true);
    try{
      await svc.savePaymentMethods(fundraiserId,selected);
      setOriginal(selected);
      setJustSaved(true);
      setTimeout(()=>setJustSaved(false),2500);
    }finally{ setSaving(false); }
  };
  return <div><p className="mb-4 font-semibold text-slate-600">Choose the club payment methods supporters can use.</p>
    <div className="space-y-3">{methods.map(m=><button key={m.id} onClick={()=>{setSelected(x=>x.includes(m.id)?x.filter(i=>i!==m.id):[...x,m.id]);setJustSaved(false);}} className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left ${selected.includes(m.id)?'border-orange-500 bg-orange-50':'border-slate-200'}`}><div><b>{m.methodLabel}</b><p className="text-sm text-slate-500">{m.providerName||m.methodCategory}</p></div><span>{selected.includes(m.id)?'✓':''}</span></button>)}</div>
    <div className="mt-5 flex items-center gap-3">
      <button disabled={!changed||saving} onClick={handleSave} className="rounded-xl bg-orange-500 px-5 py-3 font-black text-white disabled:opacity-40">
        {saving?<><Loader2 className="mr-2 inline h-4 w-4 animate-spin"/>Saving…</>:'Save payment methods'}
      </button>
      {justSaved&&!changed&&<span className="flex items-center gap-1 text-sm font-black text-green-600"><Check className="h-4 w-4"/>Saved</span>}
    </div>
  </div>
}
