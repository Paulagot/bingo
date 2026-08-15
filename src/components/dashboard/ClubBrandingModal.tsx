// src/components/dashboard/ClubBrandingModal.tsx
import { useEffect, useState } from 'react';
import { X, Palette, AlertCircle, CheckCircle2, Image } from 'lucide-react';
import ClubBrandingService, { type ClubBranding } from '../../services/ClubBrandingService';
import { useAuthStore } from '../../features/auth';
import { brand } from './branding';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const isHex = (v: string) => HEX_RE.test(v.trim());

interface Props {
  clubId:  string;
  onClose: () => void;
  onSaved: (branding: ClubBranding) => void;
}

function ColorRow({
  label, hint, value, onChange,
}: {
  label: string; hint: string; value: string; onChange: (v: string) => void;
}) {
  const [text, setText] = useState(value);
  useEffect(() => { setText(value); }, [value]);

  const invalid = text.trim().length > 0 && !isHex(text);

  return (
    <div>
      <label className="block text-xs font-bold mb-1" style={{ color: brand.slate }}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={isHex(value) ? value : '#157f85'}
          onChange={e => { setText(e.target.value); onChange(e.target.value); }}
          className="h-9 w-9 flex-shrink-0 rounded-lg border cursor-pointer"
          style={{ borderColor: brand.border }}
        />
        <input
          type="text"
          value={text}
          onChange={e => {
            setText(e.target.value);
            if (isHex(e.target.value)) onChange(e.target.value);
          }}
          placeholder="#157f85"
          maxLength={7}
          className="flex-1 rounded-lg border px-3 py-2 text-sm font-mono"
          style={{ borderColor: invalid ? '#e9574f' : brand.border }}
        />
      </div>
      <p className="text-xs mt-1" style={{ color: brand.slate }}>{hint}</p>
      {invalid && (
        <p className="text-xs mt-1" style={{ color: '#e9574f' }}>
          Must be a hex code e.g. #157f85
        </p>
      )}
    </div>
  );
}

export default function ClubBrandingModal({ clubId, onClose, onSaved }: Props) {
  const clubName = useAuthStore((s: any) =>
    s.club?.name || s.user?.club_name || 'Your Club'
  );

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState(false);

  const [logoUrl,       setLogoUrl]       = useState('');
  const [primary,       setPrimary]       = useState('#157f85');
  const [background,    setBackground]    = useState('#ffffff');
  const [textOnPrimary, setTextOnPrimary] = useState('#ffffff');

  useEffect(() => {
    ClubBrandingService.get(clubId)
      .then(b => {
        setLogoUrl      (b.brand_logo_url              || '');
        setPrimary      (b.brand_primary_color         || '#157f85');
        setBackground   (b.brand_background_color      || '#ffffff');
        setTextOnPrimary(b.brand_text_on_primary_color || '#ffffff');
      })
      .catch(() => setError('Failed to load branding'))
      .finally(() => setLoading(false));
  }, [clubId]);

  const handleSave = async () => {
    if (logoUrl && !isValidUrl(logoUrl)) {
      setError('Logo URL is not a valid URL');
      return;
    }
    if ((primary && !isHex(primary)) ||
        (background && !isHex(background)) ||
        (textOnPrimary && !isHex(textOnPrimary))) {
      setError('All colours must be valid hex codes e.g. #157f85');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const saved = await ClubBrandingService.save(clubId, {
        brand_logo_url:              logoUrl       || null,
        brand_primary_color:         primary       || null,
        brand_background_color:      background    || null,
        brand_text_on_primary_color: textOnPrimary || null,
      });
      setSuccess(true);
      onSaved(saved);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err: any) {
      setError(err?.message || 'Failed to save branding');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(16,37,50,0.55)', backdropFilter: 'blur(2px)' }}
    >
      <div
        className="flex flex-col w-full max-w-md max-h-[90vh] rounded-xl shadow-2xl overflow-hidden"
        style={{ background: brand.surface }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: `3px solid ${brand.teal}` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0"
              style={{ background: 'rgba(21,127,133,0.12)', color: brand.teal }}
            >
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: brand.navy }}>
                Club Branding
              </h2>
              <p className="text-xs" style={{ color: brand.slate }}>{clubName}</p>
            </div>
          </div>
          <button
            type="button" onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100"
            style={{ color: brand.slate }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5" style={{ background: '#f6f1e8' }}>

          {error && (
            <div className="flex items-start gap-3 rounded-lg p-3 bg-red-50 border border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
              <button type="button" onClick={() => setError(null)} className="ml-auto text-red-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-3 rounded-lg p-3 bg-green-50 border border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <p className="text-sm font-semibold text-green-700">Branding saved!</p>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-10">
              <div
                className="h-7 w-7 animate-spin rounded-full border-4"
                style={{ borderColor: brand.teal, borderTopColor: 'transparent' }}
              />
            </div>
          ) : (
            <>
              {/* Logo */}
              <section
                className="rounded-xl p-4 space-y-3"
                style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
              >
                <div className="flex items-center gap-2">
                  <Image className="h-4 w-4" style={{ color: brand.teal }} />
                  <p className="text-sm font-bold" style={{ color: brand.navy }}>Logo</p>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: brand.slate }}>
                    Logo URL
                  </label>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={e => setLogoUrl(e.target.value)}
                    placeholder="https://yourclub.com/logo.png"
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    style={{ borderColor: brand.border }}
                  />
                  <p className="text-xs mt-1" style={{ color: brand.slate }}>
                    Direct link to your club logo image (PNG or SVG recommended)
                  </p>
                </div>
                {logoUrl && isValidUrl(logoUrl) && (
                  <div
                    className="flex items-center justify-center rounded-lg p-3"
                    style={{ background: brand.bg, border: `1px dashed ${brand.border}` }}
                  >
                    <img
                      src={logoUrl}
                      alt="Logo preview"
                      className="max-h-16 max-w-full object-contain"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                )}
              </section>

              {/* Colours */}
              <section
                className="rounded-xl p-4 space-y-4"
                style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
              >
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4" style={{ color: brand.teal }} />
                  <p className="text-sm font-bold" style={{ color: brand.navy }}>Brand colours</p>
                </div>
                <ColorRow
                  label="Primary colour"
                  hint="Main button and highlight colour"
                  value={primary}
                  onChange={setPrimary}
                />
                <ColorRow
                  label="Background colour"
                  hint="Widget and card background"
                  value={background}
                  onChange={setBackground}
                />
                <ColorRow
                  label="Text on primary"
                  hint="Text and icons shown on the primary colour"
                  value={textOnPrimary}
                  onChange={setTextOnPrimary}
                />
              </section>

              {/* Live preview */}
              <section
                className="rounded-xl p-4 space-y-3"
                style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
              >
                <p className="text-xs font-bold" style={{ color: brand.slate }}>Preview</p>
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: isHex(background) ? background : '#ffffff',
                    border: `1px solid ${brand.border}`,
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    {logoUrl && isValidUrl(logoUrl) && (
                      <img
                        src={logoUrl}
                        alt="logo"
                        className="h-8 w-8 object-contain rounded"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                    <p className="text-sm font-bold" style={{ color: brand.navy }}>{clubName}</p>
                  </div>
                  <button
                    type="button"
                    className="w-full rounded-lg px-4 py-2 text-sm font-bold"
                    style={{
                      background: isHex(primary) ? primary : '#157f85',
                      color: isHex(textOnPrimary) ? textOnPrimary : '#ffffff',
                    }}
                  >
                    Donate now
                  </button>
                </div>
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderTop: `1px solid ${brand.border}`, background: '#fbf8f2' }}
        >
          <button
            type="button" onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm font-semibold"
            style={{ borderColor: brand.border, color: brand.slate }}
          >
            Cancel
          </button>
          <button
            type="button" onClick={handleSave} disabled={saving || loading}
            className="rounded-lg px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
            style={{ background: brand.teal }}
          >
            {saving ? 'Saving…' : 'Save branding'}
          </button>
        </div>
      </div>
    </div>
  );
}

function isValidUrl(v: string) {
  try { new URL(v); return true; } catch { return false; }
}