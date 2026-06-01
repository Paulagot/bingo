// src/components/campaigns/management/CampaignSellersTab.tsx

import { useEffect, useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Loader2, Plus, Copy, Download, QrCode, Check, Trash2, AlertCircle } from 'lucide-react';
import campaignSellerService, { CampaignSeller } from '../../mgtsystem/services/CampaignSellerService';

interface Props {
  campaignId: string;
}

function fmt(amount: number, currency = 'EUR') {
  const s: Record<string, string> = { EUR: '€', GBP: '£', USD: '$' };
  return `${s[currency] ?? currency}${Number(amount).toFixed(2)}`;
}

function sellerUrl(campaignId: string, sellerId: string): string {
  return `${window.location.origin}/campaigns/${campaignId}/support?sellerId=${sellerId}`;
}

/** Download the QRCodeCanvas as a PNG using an offscreen canvas */
function downloadQrPng(sellerId: string, sellerSlug: string) {
  const canvas = document.getElementById(`qr-canvas-${sellerId}`) as HTMLCanvasElement | null;
  if (!canvas) return;
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `qr-${sellerSlug}.png`;
  link.click();
}

// ─── Seller row ───────────────────────────────────────────────────────────────

function SellerRow({
  seller,
  campaignId,
  onDelete,
}: {
  seller:     CampaignSeller;
  campaignId: string;
  onDelete:   (id: string) => void;
}) {
  const [copied,        setCopied]        = useState(false);
  const [showQr,        setShowQr]        = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const url   = sellerUrl(campaignId, seller.id);
  const stats = seller.stats;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`fl-seller-row ${!seller.isActive ? 'fl-seller-row--inactive' : ''}`}>

      {/* Hidden QR canvas used for PNG download */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <QRCodeCanvas
          id={`qr-canvas-${seller.id}`}
          value={url}
          size={400}
          marginSize={2}
          fgColor="#102532"
          bgColor="#FFFFFF"
        />
      </div>

      <div className="fl-seller-row-info">
        <div className="fl-seller-name">
          {seller.sellerName}
          {!seller.isActive && <span className="fl-badge fl-badge--grey">Inactive</span>}
        </div>
        {seller.notes && <div className="fl-seller-notes">{seller.notes}</div>}
        <div className="fl-seller-url">{url}</div>
      </div>

      {stats && (
        <div className="fl-seller-stats">
          <div className="fl-seller-stat">
            <span className="fl-seller-stat-label">Confirmed</span>
            <span className="fl-seller-stat-value fl-seller-stat-value--green">
              {fmt(stats.confirmedTotal)}
            </span>
          </div>
          <div className="fl-seller-stat">
            <span className="fl-seller-stat-label">Claimed</span>
            <span className="fl-seller-stat-value fl-seller-stat-value--amber">
              {fmt(stats.claimedTotal)}
            </span>
          </div>
          <div className="fl-seller-stat">
            <span className="fl-seller-stat-label">Orders</span>
            <span className="fl-seller-stat-value">{stats.orderCount}</span>
          </div>
        </div>
      )}

      <div className="fl-seller-actions">
        <button type="button" onClick={handleCopy} className="fl-btn fl-btn--icon-sm" title="Copy seller link">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={() => setShowQr(v => !v)}
          className="fl-btn fl-btn--icon-sm"
          title="Show QR code"
        >
          <QrCode className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => downloadQrPng(seller.id, seller.sellerSlug)}
          className="fl-btn fl-btn--icon-sm"
          title="Download QR code"
        >
          <Download className="h-4 w-4" />
        </button>

        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="fl-btn fl-btn--icon-sm fl-btn--danger"
            title="Remove seller"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : (
          <div className="fl-seller-confirm-delete">
            <span className="fl-seller-confirm-text">Remove?</span>
            <button type="button" onClick={() => onDelete(seller.id)} className="fl-btn fl-btn--danger-sm">Yes</button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="fl-btn fl-btn--ghost-sm">No</button>
          </div>
        )}
      </div>

      {/* Inline QR preview */}
      {showQr && (
        <div className="fl-seller-qr-preview">
          <QRCodeCanvas
            value={url}
            size={180}
            marginSize={2}
            fgColor="#102532"
            bgColor="#FFFFFF"
          />
          <p className="fl-seller-qr-hint">
            Scan to go to campaign page supporting {seller.sellerName}
          </p>
          <button
            type="button"
            onClick={() => downloadQrPng(seller.id, seller.sellerSlug)}
            className="fl-btn fl-btn--outline"
          >
            <Download className="h-4 w-4" /> Download PNG
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export default function CampaignSellersTab({ campaignId }: Props) {
  const [sellers,  setSellers]  = useState<CampaignSeller[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [newName,  setNewName]  = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [adding,   setAdding]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, [campaignId]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await campaignSellerService.listSellers(campaignId);
      setSellers(res.sellers);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load sellers');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const res = await campaignSellerService.createSeller(campaignId, newName.trim(), newNotes.trim() || undefined);
      setSellers(prev => [{
        ...res.seller,
        stats: { orderCount: 0, confirmedTotal: 0, claimedTotal: 0, lastSaleAt: null }
      }, ...prev]);
      setNewName('');
      setNewNotes('');
      setShowForm(false);
    } catch (err: any) {
      setError(err.message ?? 'Failed to add seller');
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(sellerId: string) {
    try {
      await campaignSellerService.deleteSeller(campaignId, sellerId);
      setSellers(prev => prev.filter(s => s.id !== sellerId));
    } catch (err: any) {
      setError(err.message ?? 'Failed to remove seller');
    }
  }

  function handleDownloadAll() {
    sellers
      .filter(s => s.isActive)
      .forEach((seller, i) => {
        // Small delay between downloads so browser doesn't block them
        setTimeout(() => downloadQrPng(seller.id, seller.sellerSlug), i * 400);
      });
  }

  return (
    <div className="fl-sellers-tab">

      {/* ── Header ── */}
      <div className="fl-sellers-header">
        <div className="fl-sellers-header-text">
          <h3>Sellers &amp; QR Codes</h3>
          <p>
            Each seller gets a personal link and QR code. When a supporter scans it,
            their purchase is credited to that seller. Perfect for door-to-door fundraising.
          </p>
        </div>
        <div className="fl-sellers-header-actions">
          {sellers.length > 1 && (
            <button type="button" onClick={handleDownloadAll} className="fl-btn fl-btn--outline">
              <Download className="h-4 w-4" /> Download all QR codes
            </button>
          )}
          <button
            type="button"
            onClick={() => { setShowForm(true); setTimeout(() => inputRef.current?.focus(), 50); }}
            className="fl-btn fl-btn--primary"
          >
            <Plus className="h-4 w-4" /> Add seller
          </button>
        </div>
      </div>

      {/* ── Add form ── */}
      {showForm && (
        <div className="fl-sellers-add-form">
          <h4>Add a seller</h4>
          <div className="fl-form-row">
            <label className="fl-label" htmlFor="seller-name">Player / child name *</label>
            <input
              id="seller-name"
              ref={inputRef}
              className="fl-input"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="e.g. Ava Murphy"
              maxLength={255}
            />
          </div>
          <div className="fl-form-row">
            <label className="fl-label" htmlFor="seller-notes">Notes (optional — not visible to buyer)</label>
            <input
              id="seller-notes"
              className="fl-input"
              value={newNotes}
              onChange={e => setNewNotes(e.target.value)}
              placeholder="e.g. Year 4, Ms Kelly's class"
              maxLength={500}
            />
          </div>
          <div className="fl-form-actions">
            <button
              type="button"
              onClick={() => { setShowForm(false); setNewName(''); setNewNotes(''); }}
              className="fl-btn fl-btn--outline"
              disabled={adding}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newName.trim() || adding}
              className="fl-btn fl-btn--primary"
            >
              {adding ? <><Loader2 className="h-4 w-4 animate-spin" /> Adding…</> : 'Add seller'}
            </button>
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="fl-error-banner">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="fl-loading-row">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading sellers…
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && sellers.length === 0 && (
        <div className="fl-sellers-empty">
          <QrCode className="h-10 w-10 fl-sellers-empty-icon" />
          <p><strong>No sellers yet</strong></p>
          <p>
            Add a seller for each child or player doing door-to-door fundraising.
            Each one gets their own QR code linking to this campaign page.
          </p>
          <button
            type="button"
            onClick={() => { setShowForm(true); setTimeout(() => inputRef.current?.focus(), 50); }}
            className="fl-btn fl-btn--primary"
          >
            <Plus className="h-4 w-4" /> Add first seller
          </button>
        </div>
      )}

      {/* ── Seller list ── */}
      {!loading && sellers.length > 0 && (
        <div className="fl-sellers-list">
          <div className="fl-sellers-list-header">
            <span>{sellers.length} seller{sellers.length !== 1 ? 's' : ''}</span>
            <span className="fl-sellers-list-total">
              Total confirmed: {fmt(sellers.reduce((s, x) => s + (x.stats?.confirmedTotal ?? 0), 0))}
            </span>
          </div>
          {sellers.map(seller => (
            <SellerRow
              key={seller.id}
              seller={seller}
              campaignId={campaignId}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}