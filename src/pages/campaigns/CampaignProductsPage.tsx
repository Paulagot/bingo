// src/pages/campaigns/CampaignProductsPage.tsx
//
// Standalone test/dev page for the Campaign Product Builder management UI.
// Mount at /campaigns/:campaignId/products  (or wherever suits during dev).
// Later this tab content can be slotted into the main CampaignManagementPage.

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import campaignProductService, {
  CampaignProduct,
  CampaignProductOrder,
  UpsertCampaignProductPayload,
  CampaignProductTemplateKey,
} from '../../components/mgtsystem/services/CampaignProductService';
import CampaignProductCard from '../../components/campaigns/management/CampaignProductCard';
import CampaignProductEditorModal from '../../components/campaigns/management/CampaignProductEditorModal';
import CampaignProductOrdersPanel from '../../components/campaigns/management/CampaignProductOrdersPanel';
import CampaignPaymentsTab from '../../components/campaigns/management/CampaignPaymentsTab';
import CampaignSellersTab from '../../components/campaigns/management/CampaignSellersTab';

// Pull campaignId from URL params via React Router v6
function useCampaignId(): string {
  const params = useParams<{ campaignId: string }>();
  return params.campaignId ?? '';
}

type TabKey = 'products' | 'orders' | 'payments' | 'sellers' | 'report';

export default function CampaignProductsPage() {
  const campaignId = useCampaignId();

  const [tab, setTab]           = useState<TabKey>('products');
  const [products, setProducts] = useState<CampaignProduct[]>([]);
  const [orders, setOrders]     = useState<CampaignProductOrder[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);

  // Editor modal state
  const [editorOpen, setEditorOpen]         = useState(false);
  const [editingProduct, setEditingProduct] = useState<CampaignProduct | null>(null);

  // ── Loaders ────────────────────────────────────────────────────────────────

  const loadProducts = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    setError(null);
    try {
      const { products: p } = await campaignProductService.listProducts(campaignId);
      setProducts(p);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const loadOrders = useCallback(async () => {
    if (!campaignId) return;
    try {
      const { orders: o } = await campaignProductService.listOrders(campaignId);
      setOrders(o);
    } catch (err: any) {
      console.error('Failed to load orders:', err);
    }
  }, [campaignId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (tab === 'orders') loadOrders();
  }, [tab, loadOrders]);

  // ── Product actions ────────────────────────────────────────────────────────

  const handleSaveProduct = async (payload: UpsertCampaignProductPayload) => {
    setSaving(true);
    try {
      if (editingProduct) {
        await campaignProductService.updateProduct(campaignId, editingProduct.id, payload);
      } else {
        await campaignProductService.createProduct(campaignId, payload);
      }
      setEditorOpen(false);
      setEditingProduct(null);
      await loadProducts();
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (product: CampaignProduct) => {
    setEditingProduct(product);
    setEditorOpen(true);
  };

  const handleHide = async (product: CampaignProduct) => {
    if (!confirm(`Hide "${product.name}"? It will no longer be visible to supporters.`)) return;
    try {
      await campaignProductService.hideProduct(campaignId, product.id);
      await loadProducts();
    } catch (err: any) {
      alert(`Failed to hide: ${err.message}`);
    }
  };

  const handleDuplicate = async (product: CampaignProduct) => {
    try {
      await campaignProductService.duplicateProduct(campaignId, product.id);
      await loadProducts();
    } catch (err: any) {
      alert(`Failed to duplicate: ${err.message}`);
    }
  };

  const handleApplyTemplate = async (key: CampaignProductTemplateKey) => {
    if (!confirm(`Apply "${key}" template? This will create suggested products based on your linked events.`)) return;
    setSaving(true);
    try {
      await campaignProductService.applyTemplate(campaignId, key);
      await loadProducts();
    } catch (err: any) {
      alert(`Template failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ── Order actions ──────────────────────────────────────────────────────────

  const handleConfirmCash = async (order: CampaignProductOrder) => {
    if (!confirm(`Confirm cash received from ${order.supporterName}?`)) return;
    try {
      await campaignProductService.confirmCashOrder(campaignId, order.id);
      await loadOrders();
    } catch (err: any) {
      alert(`Confirm failed: ${err.message}`);
    }
  };

  const handleRejectCash = async (order: CampaignProductOrder) => {
    const reason = prompt('Reason for rejection (optional):') ?? undefined;
    try {
      await campaignProductService.rejectCashOrder(campaignId, order.id, reason);
      await loadOrders();
    } catch (err: any) {
      alert(`Reject failed: ${err.message}`);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!campaignId) {
    return <div className="fl-page-error">No campaign ID found in URL.</div>;
  }

  const claimedOrders = orders.filter(o =>
    ['claimed', 'pending'].includes(o.paymentStatus) &&
    ['cash_to_player', 'instant_payment'].includes(o.paymentMethodCategory)
  );

  return (
    <div className="fl-campaign-products-page">
      {/* ── Header ── */}
      <div className="fl-cp-header">
        <div className="fl-cp-header-left">
          <h1 className="fl-cp-title">Products &amp; Packs</h1>
          <p className="fl-cp-subtitle">
            Build supporter-facing products that bundle your campaign events into
            purchasable packs.
          </p>
        </div>
        <div className="fl-cp-header-right">
          {tab === 'products' && (
            <>
              <button
                className="fl-btn fl-btn--outline"
                onClick={() => {
                  const key = prompt(
                    'Template key:\n- door_to_door\n- quiz_only\n- puzzle_campaign'
                  ) as CampaignProductTemplateKey | null;
                  if (key) handleApplyTemplate(key);
                }}
                disabled={saving}
              >
                Use Template
              </button>
              <button
                className="fl-btn fl-btn--primary"
                onClick={() => { setEditingProduct(null); setEditorOpen(true); }}
                disabled={saving}
              >
                + Add Product
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="fl-cp-tabs">
        {(['products', 'orders', 'payments', 'sellers', 'report'] as TabKey[]).map(t => (
          <button
            key={t}
            className={`fl-cp-tab ${tab === t ? 'fl-cp-tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'products' && `Products (${products.length})`}
            {t === 'orders'   && `Orders${claimedOrders.length ? ` (${claimedOrders.length} pending)` : ''}`}
            {t === 'payments' && 'Payment Methods'}
            {t === 'sellers'  && 'Sellers & QR'}
            {t === 'report'   && 'Report'}
          </button>
        ))}
      </div>

      {/* ── Products tab ── */}
      {tab === 'products' && (
        <div className="fl-cp-products-tab">
          {loading && <div className="fl-cp-loading">Loading products…</div>}
          {error   && <div className="fl-cp-error">{error}</div>}

          {!loading && !error && products.length === 0 && (
            <div className="fl-cp-empty">
              <p>No products yet.</p>
              <p>
                Use <strong>Use Template</strong> to create suggested products from your
                linked events, or <strong>+ Add Product</strong> to build one manually.
              </p>
            </div>
          )}

          <div className="fl-cp-product-grid">
            {products.map(product => (
              <CampaignProductCard
                key={product.id}
                product={product}
                onEdit={handleEdit}
                onHide={handleHide}
                onDuplicate={handleDuplicate}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Orders tab ── */}
      {/* ── Orders tab ── */}
      {tab === 'orders' && (
        <CampaignProductOrdersPanel
          orders={orders}
          onConfirmCash={handleConfirmCash}
          onRejectCash={handleRejectCash}
          onRefresh={loadOrders}
        />
      )}

      {/* ── Payments tab ── */}
      {tab === 'payments' && (
        <CampaignPaymentsTab campaignId={campaignId} />
      )}

      {/* ── Sellers tab ── */}
      {tab === 'sellers' && (
        <CampaignSellersTab campaignId={campaignId} />
      )}

      {/* ── Report tab ── */}
      {tab === 'report' && (
        <CampaignReportTab campaignId={campaignId} />
      )}

      {/* ── Editor modal ── */}
      {editorOpen && (
        <CampaignProductEditorModal
          campaignId={campaignId}
          product={editingProduct}
          saving={saving}
          onSave={handleSaveProduct}
          onClose={() => { setEditorOpen(false); setEditingProduct(null); }}
        />
      )}
    </div>
  );
}

// ── Inline report tab (simple, no separate file needed for MVP) ───────────────

function CampaignReportTab({ campaignId }: { campaignId: string }) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    campaignProductService.getReport(campaignId)
      .then(r => setReport(r.report))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [campaignId]);

  if (loading) return <div className="fl-cp-loading">Loading report…</div>;
  if (!report) return <div className="fl-cp-error">Could not load report.</div>;

  const fmt = (n: number) => `€${Number(n || 0).toFixed(2)}`;

  return (
    <div className="fl-cp-report">
      {/* Totals */}
      <div className="fl-cp-report-section">
        <h2>Campaign Totals</h2>
        <div className="fl-cp-report-cards">
          <div className="fl-cp-report-card fl-cp-report-card--confirmed">
            <span className="fl-cp-report-label">Confirmed</span>
            <span className="fl-cp-report-value">{fmt(report.totals?.confirmed)}</span>
          </div>
          <div className="fl-cp-report-card fl-cp-report-card--claimed">
            <span className="fl-cp-report-label">Claimed Cash</span>
            <span className="fl-cp-report-value">{fmt(report.totals?.claimed)}</span>
          </div>
          <div className="fl-cp-report-card fl-cp-report-card--pending">
            <span className="fl-cp-report-label">Pending</span>
            <span className="fl-cp-report-value">{fmt(report.totals?.pending)}</span>
          </div>
        </div>
      </div>

      {/* By product */}
      {report.byProduct?.length > 0 && (
        <div className="fl-cp-report-section">
          <h2>By Product</h2>
          <table className="fl-cp-report-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty Sold</th>
                <th>Confirmed</th>
                <th>Claimed</th>
              </tr>
            </thead>
            <tbody>
              {report.byProduct.map((row: any) => (
                <tr key={row.product_id}>
                  <td>{row.product_name}</td>
                  <td>{row.qty_sold}</td>
                  <td>{fmt(row.confirmed_value)}</td>
                  <td>{fmt(row.claimed_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* By seller */}
      {report.bySeller?.length > 0 && (
        <div className="fl-cp-report-section">
          <h2>By Seller</h2>
          <table className="fl-cp-report-table">
            <thead>
              <tr>
                <th>Seller</th>
                <th>Orders</th>
                <th>Confirmed</th>
                <th>Claimed Cash</th>
                <th>Online</th>
              </tr>
            </thead>
            <tbody>
              {report.bySeller.map((row: any, i: number) => (
                <tr key={i}>
                  <td>{row.seller_name ?? 'Direct'}</td>
                  <td>{row.order_count}</td>
                  <td>{fmt(row.confirmed_total)}</td>
                  <td>{fmt(row.claimed_cash)}</td>
                  <td>{fmt(row.online_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* By room */}
      {report.byRoom?.length > 0 && (
        <div className="fl-cp-report-section">
          <h2>By Event / Room</h2>
          <table className="fl-cp-report-table">
            <thead>
              <tr>
                <th>Room</th>
                <th>Type</th>
                <th>Total</th>
                <th>Confirmed</th>
                <th>Pending</th>
                <th>Used</th>
              </tr>
            </thead>
            <tbody>
              {report.byRoom.map((row: any, i: number) => (
                <tr key={i}>
                  <td><code>{row.room_id}</code></td>
                  <td>{row.entry_type}</td>
                  <td>{row.total_entries}</td>
                  <td>{row.confirmed_entries}</td>
                  <td>{row.pending_entries}</td>
                  <td>{row.used_entries}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}