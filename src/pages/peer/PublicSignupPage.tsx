// src/pages/peer/PeerSignupPage.tsx
//
// Route: /fundraise/:clubSlug/:fundraiserSlug/join
// Public — no auth required.

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, Video, ChevronDown, ChevronUp } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface PublicFundraiser {
  id:             string;
  name:           string;
  description:    string | null;
  club_name:      string;
  club_logo_url:  string | null;
  primary_colour: string | null;
  currency:       string;
  end_date?:      string | null;
  status:         string;
}

type Stage = 'form' | 'submitting' | 'success' | 'closed' | 'error';

// ── Helpers ──────────────────────────────────────────────────────────────────

const field =
  'w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ' +
  'focus:border-transparent transition border-gray-200 bg-white hover:border-gray-300';

// ── Before you begin ──────────────────────────────────────────────────────────

function BeforeYouBegin({ accent, currency }: { accent: string; currency: string }) {
  // Open by default so people see the guidance before starting
  const [open, setOpen] = useState(true);

  return (
    <div
      className="rounded-xl border mb-6 overflow-hidden"
      style={{ borderColor: '#e5e7eb' }}
    >
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        style={{ background: `${accent}10` }}
      >
        <div>
          <p className="text-sm font-bold" style={{ color: accent }}>
            Before you begin
          </p>
          <p className="text-xs mt-0.5 text-gray-500">
            Optional extras that make your fundraising page stand out
          </p>
        </div>
        {open
          ? <ChevronUp   className="h-4 w-4 flex-shrink-0 text-gray-400" />
          : <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
        }
      </button>

      {open && (
        <div className="px-4 pb-4 pt-3 space-y-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 leading-relaxed">
            The form below only takes a minute. If you'd like your personal fundraising
            page to really stand out, you can optionally add a <strong>profile photo</strong> and
            a <strong>video message</strong> for your supporters. These are completely optional —
            you'll just need a public URL for each, so it's worth getting them ready before you start.
          </p>

          {/* Photo card */}
          <div className="rounded-lg border border-gray-100 p-3 flex gap-3">
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${accent}15` }}
            >
              <Camera className="h-4 w-4" style={{ color: accent }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">
                Profile photo <span className="font-normal text-gray-400">(optional)</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                A photo of you that will appear on your personal fundraising page.
                Upload it somewhere public and copy the link — good free options are{' '}
                <a href="https://imgur.com" target="_blank" rel="noopener noreferrer"
                  className="underline" style={{ color: accent }}>Imgur</a>
                {' '}or Google Drive (set sharing to "Anyone with the link").
              </p>
            </div>
          </div>

          {/* Video card */}
          <div className="rounded-lg border border-gray-100 p-3 flex gap-3">
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${accent}15` }}
            >
              <Video className="h-4 w-4" style={{ color: accent }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">
                Video message <span className="font-normal text-gray-400">(optional)</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                Record a short video telling your supporters why you're taking part and
                what this fundraiser means to you. Upload it to{' '}
                <a href="https://youtube.com" target="_blank" rel="noopener noreferrer"
                  className="underline" style={{ color: accent }}>YouTube</a>
                {' '}— set it to <strong>Unlisted</strong> so only people with the link
                can see it — then paste the YouTube URL in the form below.
              </p>
            </div>
          </div>

          <p className="text-[11px] text-gray-400">
            Don't have these ready? No problem — skip those fields and submit the form.
            You can always ask the organiser to add them later.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function PeerSignupPage() {
  const { clubSlug, fundraiserSlug } = useParams<{
    clubSlug: string;
    fundraiserSlug: string;
  }>();

  const [fundraiser, setFundraiser] = useState<PublicFundraiser | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [stage,      setStage]      = useState<Stage>('form');

  // Form fields — track photo/video so success screen knows what was skipped
  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [phone,   setPhone]   = useState('');
  const [target,  setTarget]  = useState('');
  const [message, setMessage] = useState('');
  const [photo,   setPhoto]   = useState('');
  const [video,   setVideo]   = useState('');
  const [consent, setConsent] = useState(false);
  const [errors,  setErrors]  = useState<Record<string, string>>({});

  // Capture what was submitted so success screen can check
  const [submittedPhoto, setSubmittedPhoto] = useState('');
  const [submittedVideo, setSubmittedVideo] = useState('');

  // ── Load fundraiser ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!clubSlug || !fundraiserSlug) return;
    fetch(`/api/public/fundraisers/${clubSlug}/${fundraiserSlug}`)
      .then(r => r.json())
      .then((data: { fundraiser?: PublicFundraiser; error?: string }) => {
        if (data.fundraiser) {
          setFundraiser(data.fundraiser);
          if (data.fundraiser.status !== 'published') setStage('closed');
        } else {
          setStage('error');
        }
      })
      .catch(() => setStage('error'))
      .finally(() => setLoading(false));
  }, [clubSlug, fundraiserSlug]);

  const accent = fundraiser?.primary_colour ?? '#157f85';

  // ── Validate ─────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim())  e.name    = 'Your name is required.';
    if (!email.trim()) e.email   = 'Your email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
                       e.email   = 'Please enter a valid email address.';
    if (!consent)      e.consent = 'Please agree to the privacy policy to continue.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const submit = async () => {
    if (!validate() || !fundraiser) return;
    setStage('submitting');
    // Capture before clearing
    setSubmittedPhoto(photo.trim());
    setSubmittedVideo(video.trim());
    try {
      const res = await fetch(
        `/api/public/fundraisers/${fundraiser.id}/signup`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participantName:  name.trim(),
            email:            email.toLowerCase().trim(),
            phone:            phone.trim()   || null,
            personalTarget:   target ? Number(target) : null,
            personalMessage:  message.trim() || null,
            profileImageUrl:  photo.trim()   || null,
            videoUrl:         video.trim()   || null,
            consentGiven:     true,
          }),
        }
      );
      if (res.status === 409) {
        setStage('form');
        setErrors({ submit: `This email address has already been used to apply for this fundraiser. If you think this is a mistake, contact ${fundraiser.club_name} directly.` });
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error ?? 'Submission failed');
      }
      setStage('success');
    } catch {
      setStage('form');
      setErrors({ submit: 'Something went wrong — please try again.' });
    }
  };

  // ── Shell ─────────────────────────────────────────────────────────────────
  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-gray-50">
      <div className="h-1.5 w-full" style={{ background: accent }} />
      <div className="mx-auto max-w-lg px-4 py-10">
        {fundraiser && (
          <div className="mb-6 flex items-center gap-3">
            {fundraiser.club_logo_url ? (
              <img
                src={fundraiser.club_logo_url}
                alt={fundraiser.club_name}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ background: accent }}
              >
                {fundraiser.club_name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-semibold text-gray-600">{fundraiser.club_name}</span>
          </div>
        )}
        {fundraiser && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 leading-snug">{fundraiser.name}</h1>
            {fundraiser.description && (
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{fundraiser.description}</p>
            )}
          </div>
        )}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
          {children}
        </div>
        <p className="mt-6 text-center text-xs text-gray-400">Powered by Fundraisely</p>
      </div>
    </div>
  );

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return shell(
    <div className="flex justify-center py-8">
      <div className="h-8 w-8 rounded-full border-4 border-gray-200 animate-spin"
        style={{ borderTopColor: accent }} />
    </div>
  );

  // ── Error ─────────────────────────────────────────────────────────────────
  if (stage === 'error') return shell(
    <div className="text-center py-10">
      <p className="text-lg font-bold text-gray-800">Fundraiser not found</p>
      <p className="mt-1 text-sm text-gray-500">Check the link and try again.</p>
    </div>
  );

  // ── Closed ────────────────────────────────────────────────────────────────
  if (stage === 'closed') return shell(
    <div className="text-center py-10">
      <p className="text-lg font-bold text-gray-800">
        This fundraiser isn't accepting participants right now.
      </p>
      {fundraiser?.club_name && (
        <p className="mt-1 text-sm text-gray-500">
          Contact {fundraiser.club_name} for more information.
        </p>
      )}
    </div>
  );

  // ── Success ───────────────────────────────────────────────────────────────
  if (stage === 'success') {
    const missingPhoto = !submittedPhoto;
    const missingVideo = !submittedVideo;
    const showTips     = missingPhoto || missingVideo;

    return shell(
      <div className="py-4">
        {/* Confirmation */}
        <div className="text-center mb-6">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: `${accent}18` }}
          >
            <svg className="h-7 w-7" style={{ color: accent }} fill="none"
              viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Application submitted!</h2>
          <p className="mt-2 text-sm text-gray-600 max-w-xs mx-auto">
            We'll notify you when{' '}
            <span className="font-semibold">{fundraiser?.club_name}</span>{' '}
            approves your application.
          </p>
        </div>

        {/* Only show photo/video tips if they were skipped */}
        {showTips && (
          <div className="border-t border-gray-100 pt-5 space-y-3">
            <p className="text-sm font-bold text-gray-800">Want to make your page stand out?</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Once approved, your fundraising page can include{' '}
              {missingPhoto && missingVideo
                ? 'a profile photo and a personal video message'
                : missingPhoto
                ? 'a profile photo'
                : 'a personal video message'
              }{' '}
              for your supporters. Get{' '}
              {missingPhoto && missingVideo ? 'these' : 'it'}{' '}
              ready and share the URL{missingPhoto && missingVideo ? 's' : ''} with{' '}
              <span className="font-semibold">{fundraiser?.club_name}</span> so they
              can add {missingPhoto && missingVideo ? 'them' : 'it'} to your page.
            </p>

            {missingPhoto && (
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 flex gap-3">
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${accent}15` }}
                >
                  <Camera className="h-4 w-4" style={{ color: accent }} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-800">Profile photo</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Upload a photo of yourself to{' '}
                    <a href="https://imgur.com" target="_blank" rel="noopener noreferrer"
                      className="underline" style={{ color: accent }}>Imgur</a>
                    {' '}or Google Drive (set to "Anyone with the link"), then share
                    the URL with your organiser.
                  </p>
                </div>
              </div>
            )}

            {missingVideo && (
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 flex gap-3">
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${accent}15` }}
                >
                  <Video className="h-4 w-4" style={{ color: accent }} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-800">Video message</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Record a short video about why you're taking part. Upload to{' '}
                    <a href="https://youtube.com" target="_blank" rel="noopener noreferrer"
                      className="underline" style={{ color: accent }}>YouTube</a>
                    {' '}as <strong>Unlisted</strong>, then share the link with your organiser.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────
  return shell(
    <>
      <BeforeYouBegin accent={accent} currency={fundraiser?.currency ?? 'EUR'} />

      <p className="text-sm text-gray-500 mb-5">
        Fill in your details and {fundraiser?.club_name} will review your application.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">

        <div className="sm:col-span-2">
          <input
            className={`${field} ${errors.name ? 'border-red-400' : ''}`}
            value={name}
            onChange={e => { setName(e.target.value); setErrors(v => ({ ...v, name: '' })); }}
            placeholder="Your full name *"
            autoFocus
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
        </div>

        <div>
          <input
            className={`${field} ${errors.email ? 'border-red-400' : ''}`}
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setErrors(v => ({ ...v, email: '' })); }}
            placeholder="Email address *"
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
        </div>

        <input
          className={field}
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="Phone (optional)"
        />

        <input
          className={field}
          type="number"
          min="0"
          step="1"
          value={target}
          onChange={e => setTarget(e.target.value)}
          placeholder={`Fundraising target in ${fundraiser?.currency ?? 'EUR'} (optional)`}
        />

        <div>
          <input
            className={field}
            value={photo}
            onChange={e => setPhoto(e.target.value)}
            placeholder="Profile photo URL (optional)"
          />
          <p className="mt-1 text-[11px] text-gray-400">
            Public link from Imgur or Google Drive — see tips above
          </p>
        </div>

        <div>
          <input
            className={field}
            value={video}
            onChange={e => setVideo(e.target.value)}
            placeholder="YouTube video URL (optional)"
          />
          <p className="mt-1 text-[11px] text-gray-400">
            Upload to YouTube as Unlisted — see tips above
          </p>
        </div>

        <textarea
          className={`${field} resize-none sm:col-span-2`}
          rows={3}
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Tell supporters why you're taking part (optional)"
        />
      </div>

      {/* GDPR consent */}
      <div className="mt-4">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={e => { setConsent(e.target.checked); setErrors(v => ({ ...v, consent: '' })); }}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 flex-shrink-0"
            style={{ accentColor: accent }}
          />
          <span className="text-xs text-gray-600 leading-relaxed">
            I agree to {fundraiser?.club_name} storing and using my details to manage
            my participation in this fundraiser, in accordance with{' '}
            <a
              href="/legal/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: accent }}
            >
              Fundraisely's Privacy Policy
            </a>. *
          </span>
        </label>
        {errors.consent && <p className="mt-1 text-xs text-red-600">{errors.consent}</p>}
      </div>

      {errors.submit && (
        <p className="mt-3 text-xs font-semibold text-red-600">{errors.submit}</p>
      )}

      <button
        onClick={submit}
        disabled={stage === 'submitting' || !name.trim() || !email.trim() || !consent}
        className="mt-5 w-full rounded-lg py-3 text-sm font-bold text-white disabled:opacity-50 transition"
        style={{ background: accent }}
      >
        {stage === 'submitting' ? 'Submitting…' : 'Apply to take part'}
      </button>
    </>
  );
}