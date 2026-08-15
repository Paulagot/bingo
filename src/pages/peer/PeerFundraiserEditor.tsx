import {useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Check} from 'lucide-react';
import svc from '../../services/PeerService';
import type {ClubPaymentMethod} from '../../services/PeerService';

// Format type is NOT asked here on purpose. It's stored on the fundraiser
// and can still be set later via the Overview tab edit form, but nothing
// in the app currently branches on it - no different landing page, no
// different behavior - so asking the club to choose between 5 options at
// creation time is a decision with no payoff yet. Once format-specific
// landing pages exist, revisit whether this belongs back here.

export default function PeerFundraiserEditor(){
  const nav=useNavigate(); const [name,setName]=useState(''); const [description,setDescription]=useState('');
  const [target,setTarget]=useState('');
  const [methods,setMethods]=useState<ClubPaymentMethod[]>([]); const [selectedMethodIds,setSelectedMethodIds]=useState<number[]>([]);
  const [methodsLoaded,setMethodsLoaded]=useState(false);

  useEffect(()=>{
    // Payment methods ARE picked here, at creation time - unlike format,
    // this genuinely matters immediately: a club can't meaningfully set up
    // a fundraiser (or an event) without knowing how supporters will pay.
    svc.getAvailablePaymentMethods()
      .then(r=>setMethods(r.availableMethods))
      .finally(()=>setMethodsLoaded(true));
  },[]);

  const toggleMethod=(id:number)=>setSelectedMethodIds(x=>x.includes(id)?x.filter(i=>i!==id):[...x,id]);

  async function save(e:React.FormEvent){
    e.preventDefault();
    const r=await svc.create({
      name,description,targetAmount:Number(target||0),status:'draft',
      paymentMethodIds:selectedMethodIds,
    });
    nav(`/peer-dashboard/${r.fundraiser.id}`);
  }

  return <main className="mx-auto max-w-2xl p-6"><h1 className="text-3xl font-black">Create peer fundraiser</h1>
    <form onSubmit={save} className="mt-6 space-y-4 rounded-3xl bg-white p-6 ring-1 ring-slate-200">
      <input className="w-full rounded-xl border p-3" value={name} onChange={e=>setName(e.target.value)} placeholder="Christmas Pack"/>
      <textarea className="w-full rounded-xl border p-3" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Description"/>
      <input className="w-full rounded-xl border p-3" type="number" value={target} onChange={e=>setTarget(e.target.value)} placeholder="Overall target"/>

      <div>
        <label className="mb-2 block text-sm font-black text-slate-700">Payment methods</label>
        <p className="mb-2 text-xs font-semibold text-slate-500">
          Choose which of your club's payment methods supporters can use here. You can change this later too.
        </p>
        {methodsLoaded && methods.length===0 && (
          <p className="rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800 ring-1 ring-amber-100">
            No payment methods are set up for your club yet - you can add them afterward and link them from the Payments tab.
          </p>
        )}
        <div className="space-y-2">
          {methods.map(m => {
            const selected = selectedMethodIds.includes(m.id);
            return (
              <button
                type="button"
                key={m.id}
                onClick={() => toggleMethod(m.id)}
                className={`flex w-full items-center justify-between rounded-xl border p-3 text-left ${selected ? 'border-orange-500 bg-orange-50' : 'border-slate-200'}`}
              >
                <div>
                  <b>{m.methodLabel}</b>
                  <p className="text-xs font-semibold text-slate-500">{m.providerName || m.methodCategory}</p>
                </div>
                {selected && <Check className="h-4 w-4 text-orange-600" />}
              </button>
            );
          })}
        </div>
      </div>

      <button className="w-full rounded-2xl bg-orange-500 p-4 font-black text-white">Create</button>
    </form></main>
}
