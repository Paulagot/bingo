// src/pages/peer/PeerSignupPage.tsx
// Public peer fundraiser page request — no auth required.
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Camera, Video, ChevronDown, ChevronUp, Heart, Share2,
  CheckCircle2, UserRound, ArrowRight,
} from 'lucide-react';

interface PublicFundraiser {
  id: string;
  name: string;
  description: string | null;
  club_name: string;
  club_logo_url: string | null;
  cover_image_url: string | null;
  primary_colour: string | null;
  currency: string;
  end_date?: string | null;
  status: string;
}
type Stage = 'form' | 'submitting' | 'success' | 'closed' | 'error';
const field = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20';

function MediaHelp({ accent }: { accent: string }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <button type="button" aria-expanded={open} onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-gray-50">
        <span className="flex items-center gap-3">
          <span className="rounded-lg p-2" style={{ backgroundColor: `${accent}14`, color: accent }}><Camera size={19} /></span>
          <span>
            <span className="block text-sm font-semibold text-gray-900">Before you begin</span>
            <span className="block text-xs text-gray-500">Get your optional photo and video links ready before applying</span>
          </span>
        </span>
        {open ? <ChevronUp size={18} className="shrink-0 text-gray-400" /> : <ChevronDown size={18} className="shrink-0 text-gray-400" />}
      </button>
      {open && (
        <div className="space-y-4 border-t border-gray-100 px-4 pb-4 pt-3 text-xs leading-relaxed text-gray-600">
          <p>You don't need a photo or video to apply. If you'd like to add them, please prepare public links before you submit.</p>
          <div className="flex gap-3">
            <Camera className="mt-0.5 shrink-0" size={18} style={{ color: accent }} />
            <p><strong className="text-gray-800">Profile photo:</strong> Upload a photo to <a href="https://imgur.com" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: accent }}>Imgur</a> or Google Drive (set sharing to “Anyone with the link”), then paste the public image link below. Note: Google Drive sharing links may not display directly as images on all sites.</p>
          </div>
          <div className="flex gap-3">
            <Video className="mt-0.5 shrink-0" size={18} style={{ color: accent }} />
            <p><strong className="text-gray-800">Personal video:</strong> Upload a short message to <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: accent }}>YouTube</a> and set the video to <strong>Unlisted</strong>. Paste its URL below.</p>
          </div>
          <p className="rounded-lg bg-gray-50 p-3">Not ready? Leave both fields blank. You can ask the organiser to add these later.</p>
        </div>
      )}
    </div>
  );
}

export default function PeerSignupPage() {
  const { clubSlug, fundraiserSlug } = useParams<{ clubSlug: string; fundraiserSlug: string }>();
  const [fundraiser, setFundraiser] = useState<PublicFundraiser | null>(null);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState<Stage>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [target, setTarget] = useState('');
  const [message, setMessage] = useState('');
  const [photo, setPhoto] = useState('');
  const [video, setVideo] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submittedPhoto, setSubmittedPhoto] = useState('');
  const [submittedVideo, setSubmittedVideo] = useState('');
  const [heroImageIndex, setHeroImageIndex] = useState(0);

  useEffect(() => {
    if (!clubSlug || !fundraiserSlug) { setStage('error'); setLoading(false); return; }
    let active = true;
    fetch(`/api/public/fundraisers/${encodeURIComponent(clubSlug)}/${encodeURIComponent(fundraiserSlug)}`)
      .then(async r => { if (!r.ok) throw new Error('Request failed'); return r.json(); })
      .then((data: { fundraiser?: PublicFundraiser }) => {
        if (!active) return;
        if (!data.fundraiser) { setStage('error'); return; }
        setFundraiser(data.fundraiser);
        setHeroImageIndex(0);
        if (data.fundraiser.status !== 'published') setStage('closed');
      })
      .catch(() => { if (active) setStage('error'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [clubSlug, fundraiserSlug]);

  const accent = fundraiser?.primary_colour || '#137f85';
  const heroImages = [fundraiser?.cover_image_url, fundraiser?.club_logo_url].filter(
    (value): value is string => Boolean(value?.trim())
  );
  const heroImage = heroImages[heroImageIndex];
  const isLogoFallback = heroImageIndex > 0 || (!fundraiser?.cover_image_url && Boolean(fundraiser?.club_logo_url));
  const currency = fundraiser?.currency || 'EUR';
  const symbol = ({ EUR: '€', GBP: '£', USD: '$' } as Record<string, string>)[currency] || currency;

  function validate() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Please enter your name.';
    if (!email.trim()) next.email = 'Please enter your email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Please enter a valid email address.';
    if (target && (!Number.isFinite(Number(target)) || Number(target) <= 0)) next.target = 'Enter a target greater than zero, or leave this blank.';
    if (!consent) next.consent = 'Please agree to the privacy policy.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    if (!fundraiser || stage !== 'form' || !validate()) return;
    setStage('submitting');
    setErrors({});
    try {
      const res = await fetch(`/api/public/fundraisers/${fundraiser.id}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantName: name.trim(), email: email.trim().toLowerCase(),
          phone: phone.trim() || null, personalTarget: target ? Number(target) : null,
          personalMessage: message.trim() || null, profileImageUrl: photo.trim() || null,
          videoUrl: video.trim() || null, consentGiven: true,
        }),
      });
      if (res.status === 409) {
        setErrors({ submit: `This email has already been used to request a page for this fundraiser. Please contact ${fundraiser.club_name} if you need help.` });
        setStage('form');
        return;
      }
      if (!res.ok) throw new Error('Request failed');
      setSubmittedPhoto(photo.trim());
      setSubmittedVideo(video.trim());
      setStage('success');
    } catch {
      setErrors({ submit: 'Something went wrong. Please try again.' });
      setStage('form');
    }
  }

  const shell = (children: React.ReactNode) => (
    <main className="min-h-screen bg-[#f6f8f8] text-gray-900">
      <div className="h-1.5 w-full" style={{ backgroundColor: accent }} />
      <div className="mx-auto max-w-2xl px-4 pb-12 pt-5 sm:pt-8">
        <header className="mb-5 flex items-center gap-3">
          {fundraiser?.club_logo_url ? (
            <img src={fundraiser.club_logo_url} alt="" className="h-11 w-11 rounded-full border border-gray-200 bg-white object-cover" />
          ) : (
            <span className="flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold text-white" style={{ backgroundColor: accent }}>
              {fundraiser?.club_name?.charAt(0).toUpperCase() || <Heart size={20} />}
            </span>
          )}
          <span className="min-w-0">
            <span className="block text-xs font-medium uppercase tracking-wide text-gray-500">Fundraising for</span>
            <span className="block truncate text-sm font-bold text-gray-900">{fundraiser?.club_name || 'Community fundraising'}</span>
          </span>
        </header>
        {fundraiser && stage !== 'error' && (
          <section className="mb-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
            <div className="relative h-44 overflow-hidden sm:h-56" style={{ background: `linear-gradient(120deg, ${accent}, #0d3d47)` }}>
              {heroImage ? (
                <img
                  key={heroImage}
                  src={heroImage}
                  alt={isLogoFallback ? `${fundraiser.club_name} logo` : `${fundraiser.name} fundraiser`}
                  className={`h-full w-full ${isLogoFallback ? 'object-contain p-8' : 'object-cover'}`}
                  onError={() => setHeroImageIndex(index => index + 1)}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-white">
                  <span className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-white/30 text-5xl font-bold">
                    {fundraiser.club_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="p-5 sm:p-7">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: accent }}>Your chance to make a difference</p>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Become a fundraiser!</h1>
              <p className="mt-3 text-base leading-relaxed text-gray-700">
                I'd like to raise funds for <strong>{fundraiser.name}</strong>, supporting <strong>{fundraiser.club_name}</strong>.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">Get your own personal fundraising page, set a target and share your story with friends and family.</p>
              {fundraiser.description && <p className="mt-3 border-l-2 pl-3 text-sm leading-relaxed text-gray-600" style={{ borderColor: accent }}>{fundraiser.description}</p>}
            </div>
          </section>
        )}
        {children}
        <p className="mt-7 text-center text-xs text-gray-400">Powered by Fundraisely</p>
      </div>
    </main>
  );

  if (loading) return shell(<div className="flex justify-center rounded-2xl bg-white py-14"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200" style={{ borderTopColor: accent }}/></div>);
  if (stage === 'error') return shell(<div className="rounded-2xl bg-white p-10 text-center"><h2 className="text-lg font-bold">Fundraiser not found</h2><p className="mt-2 text-sm text-gray-500">Please check the link and try again.</p></div>);
  if (stage === 'closed') return shell(<div className="rounded-2xl bg-white p-10 text-center"><h2 className="text-lg font-bold">This fundraiser isn't accepting applications right now</h2><p className="mt-2 text-sm text-gray-500">Contact {fundraiser?.club_name} for more information.</p></div>);
  if (stage === 'success') return shell(
    <section className="rounded-2xl bg-white px-5 py-10 text-center shadow-sm sm:px-10">
      <CheckCircle2 className="mx-auto" size={56} style={{ color: accent }} />
      <h2 className="mt-4 text-2xl font-bold">Your request has been sent!</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-gray-600">
        Thanks for offering to fundraise for <strong>{fundraiser?.name}</strong>. <strong>{fundraiser?.club_name}</strong> will review your request before your personal fundraising page goes live.
      </p>
      {(!submittedPhoto || !submittedVideo) && (
        <div className="mx-auto mt-6 max-w-md rounded-xl bg-gray-50 p-4 text-left text-sm text-gray-600">
          <strong className="block text-gray-900">One more idea for your page</strong>
          <p className="mt-1">{!submittedPhoto && !submittedVideo ? 'A profile photo or personal video' : !submittedPhoto ? 'A profile photo' : 'A personal video'} can help bring your fundraising story to life. You can share a link with the organiser later if you wish.</p>
        </div>
      )}
    </section>
  );

  return shell(
    <div className="space-y-5">
      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-7">
        <MediaHelp accent={accent}/>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-bold text-gray-900">How it works</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            { icon: UserRound, label: '1. Apply', desc: 'Tell us about yourself.' },
            { icon: CheckCircle2, label: '2. Get approved', desc: 'The organiser reviews your request.' },
            { icon: Share2, label: '3. Share your page', desc: 'Invite friends and family to support you.' },
          ].map(step => <div className="flex gap-3 sm:block" key={step.label}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ color: accent, backgroundColor: `${accent}14` }}><step.icon size={19} /></span>
            <span className="sm:mt-2 sm:block"><strong className="block text-sm">{step.label}</strong><span className="block text-xs leading-relaxed text-gray-500">{step.desc}</span></span>
          </div>)}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-bold">Request your fundraising page</h2>
        <p className="mt-1 text-sm text-gray-600">Complete the form below to ask {fundraiser?.club_name} for your own page.</p>
        <form className="mt-6 space-y-5" onSubmit={e => { e.preventDefault(); void submit(); }} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><label htmlFor="peer-name" className="mb-1.5 block text-sm font-semibold">Your full name <span className="text-red-600">*</span></label><input id="peer-name" autoComplete="name" className={field} value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" aria-invalid={!!errors.name}/>{errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}</div>
            <div><label htmlFor="peer-email" className="mb-1.5 block text-sm font-semibold">Email address <span className="text-red-600">*</span></label><input id="peer-email" type="email" autoComplete="email" className={field} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" aria-invalid={!!errors.email}/>{errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}</div>
            <div><label htmlFor="peer-phone" className="mb-1.5 block text-sm font-semibold">Phone <span className="font-normal text-gray-400">(optional)</span></label><input id="peer-phone" type="tel" autoComplete="tel" className={field} value={phone} onChange={e => setPhone(e.target.value)} placeholder="Your phone number"/></div>
            <div className="sm:col-span-2"><label htmlFor="peer-target" className="mb-1.5 block text-sm font-semibold">Your fundraising target <span className="font-normal text-gray-400">(optional)</span></label><div className="relative"><span className="absolute left-3 top-3 text-sm font-medium text-gray-500">{symbol}</span><input id="peer-target" type="number" min="1" step="1" className={`${field} pl-10`} value={target} onChange={e => setTarget(e.target.value)} placeholder="500"/></div>{errors.target && <p className="mt-1 text-xs text-red-600">{errors.target}</p>}<p className="mt-1 text-xs text-gray-500">How much would you like to raise? It's fine to leave this blank.</p></div>
            <div className="sm:col-span-2"><label htmlFor="peer-message" className="mb-1.5 block text-sm font-semibold">Your fundraising story <span className="font-normal text-gray-400">(optional)</span></label><textarea id="peer-message" rows={4} className={`${field} resize-y`} value={message} onChange={e => setMessage(e.target.value)} placeholder="I'm taking part because…"/><p className="mt-1 text-xs text-gray-500">This message can appear on your personal fundraising page.</p></div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor="peer-photo" className="mb-1.5 block text-sm font-semibold">Profile photo link <span className="font-normal text-gray-400">(optional)</span></label><input id="peer-photo" type="url" className={field} value={photo} onChange={e => setPhoto(e.target.value)} placeholder="https://…"/><p className="mt-1 text-xs text-gray-500">Public image link; see guidance above.</p></div>
            <div><label htmlFor="peer-video" className="mb-1.5 block text-sm font-semibold">YouTube video link <span className="font-normal text-gray-400">(optional)</span></label><input id="peer-video" type="url" className={field} value={video} onChange={e => setVideo(e.target.value)} placeholder="https://youtube.com/…"/><p className="mt-1 text-xs text-gray-500">An unlisted YouTube video is fine.</p></div>
          </div>

          <div><label className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0" style={{ accentColor: accent }}/><span className="text-xs leading-relaxed text-gray-600">I agree to {fundraiser?.club_name} storing and using my details to manage this fundraising request, in accordance with <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: accent }}>Fundraisely's Privacy Policy</a>. <span className="text-red-600">*</span></span></label>{errors.consent && <p className="mt-1 text-xs text-red-600">{errors.consent}</p>}</div>
          {errors.submit && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errors.submit}</p>}
          <button type="submit" disabled={stage === 'submitting'} className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold text-white transition hover:brightness-95 disabled:cursor-wait disabled:opacity-60" style={{ backgroundColor: accent }}>{stage === 'submitting' ? 'Sending your request…' : 'Request my fundraising page'}{stage !== 'submitting' && <ArrowRight size={18}/>}</button>
          <p className="text-center text-xs text-gray-500">Your page won't go live until the organiser approves your request.</p>
        </form>
      </section>
    </div>
  );
}