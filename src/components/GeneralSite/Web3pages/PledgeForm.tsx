import React, { useState } from 'react';

type Props = { compactTitle?: string };
export const PledgeForm: React.FC<Props> = ({ compactTitle = 'Tell Us About Your Community' }) => {
  const [communityName, setCommunityName] = useState('');
  const [contactMethod, setContactMethod] = useState('Email');
  const [contactInfo, setContactInfo] = useState('');
  const [userName, setUserName] = useState('');
  const [ecosystem, setEcosystem] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const submit = async () => {
    if (!communityName || !contactInfo || !userName || !ecosystem) {
      setSubmitMessage('❌ Please fill in all required fields');
      return;
    }
    setIsSubmitting(true); setSubmitMessage('');
    try {
      const res = await fetch('/quiz/api/impactcampaign/pledge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communityName, contactMethod, contactInfo, userName, ecosystem })
      });
      const raw = await res.text(); let data:any=null; if (raw) try { data = JSON.parse(raw); } catch {}
      if (!res.ok) return setSubmitMessage(`❌ Error: ${data?.error || data?.message || raw || res.status}`);
      setSubmitMessage('✅ Community registration submitted successfully! We will be in touch soon.');
      setCommunityName(''); setContactInfo(''); setUserName(''); setContactMethod('Email'); setEcosystem('');
    } catch {
      setSubmitMessage('❌ Network error. Please try again later.');
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="bg-muted border-border rounded-2xl border p-6 shadow-2xl">
      <div className="mb-6 text-center">
        <h2 className="text-fg mb-2 text-lg font-bold">{compactTitle}</h2>
        <p className="text-fg/70 text-sm">We’ll reach out with next steps and get you launch-ready.</p>
      </div>
      {submitMessage && (
        <div className={`mb-4 rounded-lg p-3 text-sm ${
          submitMessage.includes('✅') ? 'border border-green-200 bg-green-50 text-green-700' : 'border border-red-200 bg-red-50 text-red-700'
        }`}>{submitMessage}</div>
      )}
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input className="rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
            placeholder="Your name/alias *" value={userName} onChange={e=>setUserName(e.target.value)} disabled={isSubmitting} />
          <input className="rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
            placeholder="Community name *" value={communityName} onChange={e=>setCommunityName(e.target.value)} disabled={isSubmitting} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select value={contactMethod} onChange={e=>setContactMethod(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500" disabled={isSubmitting}>
            <option>Email</option><option>Telegram</option><option>X (Twitter)</option>
          </select>
          <input className="rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
            placeholder="Contact info *" value={contactInfo} onChange={e=>setContactInfo(e.target.value)} disabled={isSubmitting}/>
          <input className="rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
            placeholder="Chain *" value={ecosystem} onChange={e=>setEcosystem(e.target.value)} disabled={isSubmitting}/>
        </div>
        <button onClick={submit} disabled={isSubmitting}
          className="flex w-full items-center justify-center space-x-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 font-semibold text-white transition-all hover:scale-105 hover:shadow-lg disabled:opacity-50">
          <span>{isSubmitting ? 'Submitting…' : 'Submit'}</span>
        </button>
      </div>
    </div>
  );
};
