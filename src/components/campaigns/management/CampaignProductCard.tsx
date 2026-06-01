// src/components/campaigns/management/CampaignProductCard.tsx


import { CampaignProduct } from '../../mgtsystem/services/CampaignProductService';
import campaignProductService from '../../mgtsystem/services/CampaignProductService';

interface Props {
  product:     CampaignProduct;
  onEdit:      (p: CampaignProduct) => void;
  onHide:      (p: CampaignProduct) => void;
  onDuplicate: (p: CampaignProduct) => void;
}

export default function CampaignProductCard({ product, onEdit, onHide, onDuplicate }: Props) {
  const price = campaignProductService.formatPrice(product.price, product.currency);

  return (
    <div className={`fl-product-card ${!product.isActive ? 'fl-product-card--inactive' : ''}`}>
      {/* ── Badges ── */}
      <div className="fl-product-card-badges">
        {product.isFeatured && (
          <span className="fl-badge fl-badge--featured">
            ★ {product.badgeLabel ?? 'Featured'}
          </span>
        )}
        {!product.isActive && (
          <span className="fl-badge fl-badge--hidden">Hidden</span>
        )}
      </div>

      {/* ── Core info ── */}
      <div className="fl-product-card-body">
        <div className="fl-product-card-name">{product.name}</div>
        <div className="fl-product-card-price">{price}</div>
        {product.description && (
          <div className="fl-product-card-desc">{product.description}</div>
        )}
      </div>

      {/* ── Items ── */}
      {product.items.length > 0 && (
        <ul className="fl-product-card-items">
          {product.items.map(item => (
            <li key={item.id}>
              {item.quantity}× {campaignProductService.itemTypeLabel(item.itemType)}
            </li>
          ))}
        </ul>
      )}

      {/* ── Meta ── */}
      <div className="fl-product-card-meta">
        <span className="fl-product-card-type">{product.productType}</span>
        {product.maxSales !== null && (
          <span className="fl-product-card-maxsales">Max {product.maxSales}</span>
        )}
      </div>

      {/* ── Actions ── */}
      <div className="fl-product-card-actions">
        <button className="fl-btn fl-btn--sm fl-btn--outline" onClick={() => onEdit(product)}>
          Edit
        </button>
        <button className="fl-btn fl-btn--sm fl-btn--ghost" onClick={() => onDuplicate(product)}>
          Duplicate
        </button>
        {product.isActive && (
          <button className="fl-btn fl-btn--sm fl-btn--ghost fl-btn--danger" onClick={() => onHide(product)}>
            Hide
          </button>
        )}
      </div>
    </div>
  );
}