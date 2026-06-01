// src/components/campaigns/management/CampaignProductOrdersPanel.tsx
//
// Shows campaign product orders for the club admin.
// Highlights pending cash/instant_payment orders that need confirmation.


import { CampaignProductOrder } from '../../mgtsystem/services/CampaignProductService';
import campaignProductService from '../../mgtsystem/services/CampaignProductService';
import { useState } from 'react';

interface Props {
  orders:           CampaignProductOrder[];
  onConfirmCash:    (order: CampaignProductOrder) => void;
  onRejectCash:     (order: CampaignProductOrder) => void;
  onRefresh:        () => void;
}

const STATUS_LABELS: Record<string, string> = {
  pending:   'Pending',
  claimed:   'Claimed',
  confirmed: 'Confirmed',
  failed:    'Failed',
  cancelled: 'Cancelled',
  refunded:  'Refunded',
};

const METHOD_LABELS: Record<string, string> = {
  card:             'Card',
  instant_payment:  'Instant Payment',
  cash_to_player:   'Cash to Player',
  bank_transfer:    'Bank Transfer',
  other:            'Other',
};

type FilterStatus = CampaignProductOrder['paymentStatus'] | 'all';

export default function CampaignProductOrdersPanel({
  orders, onConfirmCash, onRejectCash, onRefresh,
}: Props) {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');

  const displayed = statusFilter === 'all'
    ? orders
    : orders.filter(o => o.paymentStatus === statusFilter);

  const pendingCount = orders.filter(o =>
    o.paymentStatus === 'claimed' &&
    ['cash_to_player', 'instant_payment'].includes(o.paymentMethodCategory)
  ).length;

  const fmtAmount = (o: CampaignProductOrder) =>
    campaignProductService.formatPrice(o.totalAmount, o.currency);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div className="fl-orders-panel">
      {/* ── Filter bar ── */}
      <div className="fl-orders-filter-bar">
        <div className="fl-orders-filter-tabs">
          {(['all', 'pending', 'claimed', 'confirmed', 'cancelled'] as FilterStatus[]).map(s => (
            <button
              key={s}
              className={`fl-orders-filter-tab ${statusFilter === s ? 'fl-orders-filter-tab--active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'All' : STATUS_LABELS[s]}
              {s === 'claimed' && pendingCount > 0 ? ` (${pendingCount})` : ''}
            </button>
          ))}
        </div>
        <button className="fl-btn fl-btn--ghost fl-btn--sm" onClick={onRefresh}>
          Refresh
        </button>
      </div>

      {displayed.length === 0 && (
        <div className="fl-orders-empty">
          {statusFilter === 'all'
            ? 'No orders yet.'
            : `No ${statusFilter} orders.`}
        </div>
      )}

      {/* ── Order list ── */}
      <div className="fl-orders-list">
        {displayed.map(order => {
          const needsAction =
            order.paymentStatus === 'claimed' &&
            ['cash_to_player', 'instant_payment'].includes(order.paymentMethodCategory);

          return (
            <div
              key={order.id}
              className={`fl-order-row ${needsAction ? 'fl-order-row--action-required' : ''}`}
            >
              <div className="fl-order-row-main">
                <div className="fl-order-row-supporter">
                  <span className="fl-order-row-name">{order.supporterName}</span>
                  <span className="fl-order-row-email">{order.supporterEmail}</span>
                </div>

                <div className="fl-order-row-meta">
                  <span className={`fl-status-badge fl-status-badge--${order.paymentStatus}`}>
                    {STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
                  </span>
                  <span className="fl-order-row-method">
                    {METHOD_LABELS[order.paymentMethodCategory] ?? order.paymentMethodCategory}
                  </span>
                  <span className="fl-order-row-amount">{fmtAmount(order)}</span>
                </div>

                <div className="fl-order-row-dates">
                  <span>{fmtDate(order.createdAt)}</span>
                  {order.sellerId && (
                    <span className="fl-order-row-seller">
                      Seller: {order.sellerName ?? order.sellerId}
                    </span>
                  )}
                </div>
              </div>

              {/* ── Action buttons for pending cash/instant ── */}
              {needsAction && (
                <div className="fl-order-row-actions">
                  <button
                    className="fl-btn fl-btn--sm fl-btn--success"
                    onClick={() => onConfirmCash(order)}
                  >
                    ✓ Confirm Cash
                  </button>
                  <button
                    className="fl-btn fl-btn--sm fl-btn--danger"
                    onClick={() => onRejectCash(order)}
                  >
                    ✗ Reject
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}