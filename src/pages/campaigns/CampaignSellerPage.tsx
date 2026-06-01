// src/pages/campaigns/CampaignSellerPage.tsx
// Public seller stats — no login. URL: /campaigns/:campaignId/sellers/:sellerId

import { useEffect,  useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { Loader2, Download, Copy, Check, TrendingUp } from 'lucide-react';

interface SellerStats {
  seller: {
    id:           string;
    sellerName:   string;
    sellerSlug:   string;
    campaignName: string;
  };
  stats: {
    orderCount:     number;
    confirmedTotal: number;
    claimedTotal:   number;
    currency:       string;
  };
}

function fmt(amount: number, currency = 'EUR') {
  const s: Record<string, string> = { EUR: '€', GBP: '£', USD: '$' };
  return `${s[currency] ?? currency}${Number(amount).toFixed(2)}`;
}

export default function CampaignSellerPage() {
  const { campaignId, sellerId } = useParams<{ campaignId: string; sellerId: string }>();

  const [data,    setData]    = useState<SellerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [copied,  setCopied]  = useState(false);

  // const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const supportUrl = campaignId && sellerId
    ? `${window.location.origin}/campaigns/${campaignId}/support?sellerId=${sellerId}`
    : '';

  useEffect(() => {
    if (!campaignId || !sellerId) return;
    fetch(`/api/campaign-support/${campaignId}/sellers/${sellerId}`)
      .then(r => r.json())
      .then(d => {
        if (!d.ok) throw new Error(d.error ?? 'Not found');
        setData(d);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [campaignId, sellerId]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(supportUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const canvas = document.getElementById('seller-qr-canvas') as HTMLCanvasElement | null;
    if (!canvas || !data) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `qr-${data.seller.sellerSlug}.png`;
    link.click();
  };

  if (loading) {
    return (
      <div className="fl-seller-page-loading">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p>Loading your stats…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fl-seller-page-error">
        <p>This seller page could not be found.</p>
      </div>
    );
  }

  const { seller, stats } = data;
  const total = stats.confirmedTotal + stats.claimedTotal;

  return (
    <div className="fl-seller-page">

      {/* ── Header ── */}
      <div className="fl-seller-page-header">
        <div className="fl-seller-page-campaign">{seller.campaignName}</div>
        <h1 className="fl-seller-page-name">{seller.sellerName}</h1>
        <p className="fl-seller-page-subtitle">Your fundraising stats</p>
      </div>

      {/* ── Stats ── */}
      <div className="fl-seller-stats-grid">
        <div className="fl-seller-stat-card fl-seller-stat-card--green">
          <div className="fl-seller-stat-card-label">Confirmed sales</div>
          <div className="fl-seller-stat-card-value">{fmt(stats.confirmedTotal, stats.currency)}</div>
          <div className="fl-seller-stat-card-sub">Payment received ✓</div>
        </div>

        {stats.claimedTotal > 0 && (
          <div className="fl-seller-stat-card fl-seller-stat-card--amber">
            <div className="fl-seller-stat-card-label">Awaiting confirmation</div>
            <div className="fl-seller-stat-card-value">{fmt(stats.claimedTotal, stats.currency)}</div>
            <div className="fl-seller-stat-card-sub">Being verified by club</div>
          </div>
        )}

        <div className="fl-seller-stat-card">
          <div className="fl-seller-stat-card-label">Total orders</div>
          <div className="fl-seller-stat-card-value">{stats.orderCount}</div>
          <div className="fl-seller-stat-card-sub">people supported</div>
        </div>

        {total > 0 && (
          <div className="fl-seller-stat-card fl-seller-stat-card--teal">
            <TrendingUp className="fl-seller-stat-icon" />
            <div className="fl-seller-stat-card-label">Total raised</div>
            <div className="fl-seller-stat-card-value">{fmt(total, stats.currency)}</div>
            <div className="fl-seller-stat-card-sub">confirmed + pending</div>
          </div>
        )}

        {stats.orderCount === 0 && (
          <div className="fl-seller-stat-card">
            <div className="fl-seller-stat-card-label">Getting started</div>
            <div className="fl-seller-stat-card-value">€0.00</div>
            <div className="fl-seller-stat-card-sub">Share your QR code below!</div>
          </div>
        )}
      </div>

      {/* ── QR code ── */}
      <div className="fl-seller-qr-section">
        <h2>Your QR code</h2>
        <p>
          Share this with people to support your fundraising.
          When they scan it or use your link, their purchase is credited to you.
        </p>

        <div className="fl-seller-qr-wrapper">
          <QRCodeCanvas
            id="seller-qr-canvas"
            value={supportUrl}
            size={220}
            marginSize={2}
            fgColor="#102532"
            bgColor="#FFFFFF"
          />
        </div>

        <div className="fl-seller-qr-actions">
          <button type="button" onClick={handleCopy} className="fl-btn fl-btn--outline">
            {copied
              ? <><Check className="h-4 w-4" /> Copied!</>
              : <><Copy className="h-4 w-4" /> Copy link</>}
          </button>
          <button type="button" onClick={handleDownload} className="fl-btn fl-btn--primary">
            <Download className="h-4 w-4" /> Download QR code
          </button>
        </div>

        <div className="fl-seller-link-display">
          <span className="fl-seller-link-label">Your link:</span>
          <span className="fl-seller-link-url">{supportUrl}</span>
        </div>
      </div>

    </div>
  );
}