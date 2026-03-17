// src/components/Quiz/game/OrderImageReview.tsx
import React from 'react';

const getBaseUrl = () => {
  if (typeof window !== 'undefined') return window.location.origin;
  return import.meta.env.VITE_SITE_ORIGIN || 'http://localhost:3001';
};

const getFullImageUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = getBaseUrl();
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
};

interface OrderImageItem {
  id: string;
  label: string;
  imageUrl: string;
  url?: string;
  order: number;
}

interface OrderImageQuestion {
  id: string;
  prompt: string;
  images: OrderImageItem[];
  difficulty?: string;
  category?: string;
}

interface OrderImageReviewProps {
  question: OrderImageQuestion;
  playerOrder: string[] | null;
  questionNumber?: number;
  totalQuestions?: number;
}

const OrderImageReview: React.FC<OrderImageReviewProps> = ({
  question,
  playerOrder,
  questionNumber,
  totalQuestions,
}) => {
  const correctOrderImages = [...question.images].sort((a, b) => a.order - b.order);

  const playerOrderImages = playerOrder
    ? (playerOrder
        .map(id => question.images.find(img => img.id === id))
        .filter(Boolean) as OrderImageItem[])
    : null;

  const isCorrect =
    playerOrder &&
    playerOrder.length === question.images.length &&
    playerOrder.every((id, index) => {
      const img = question.images.find(i => i.id === id);
      return img && img.order === index + 1;
    });

  const getImgUrl = (item: OrderImageItem) =>
    getFullImageUrl(item.imageUrl || item.url || '');

  return (
    <div style={{ minHeight: '100dvh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>

      {/* ── STICKY HEADER ── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          background: '#fff',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          padding: '12px 16px 14px',
        }}
      >
        {questionNumber && totalQuestions && (
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 4px', fontWeight: 500 }}>
            Question {questionNumber} / {totalQuestions}
          </p>
        )}
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '0 0 8px', lineHeight: 1.4 }}>
          {question.prompt}
        </h2>

        {/* Result badge */}
        {playerOrder ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 14px',
              borderRadius: 99,
              background: isCorrect ? '#dcfce7' : '#fee2e2',
              border: `1.5px solid ${isCorrect ? '#86efac' : '#fca5a5'}`,
              fontSize: 13,
              fontWeight: 700,
              color: isCorrect ? '#166534' : '#991b1b',
            }}
          >
            {isCorrect ? '✅ Correct!' : '❌ Incorrect'}
          </div>
        ) : (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 14px',
              borderRadius: 99,
              background: '#fef9c3',
              border: '1.5px solid #fde047',
              fontSize: 13,
              fontWeight: 700,
              color: '#854d0e',
            }}
          >
            ⏰ No answer submitted
          </div>
        )}

        {question.difficulty && (
          <span
            style={{
              marginLeft: 8,
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: '2px 10px',
              borderRadius: 99,
              background: '#f1f5f9',
              color: '#475569',
            }}
          >
            {question.difficulty}
          </span>
        )}
      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px 20px' }}>

        {/* On mobile: stack correct then player; on wide screens: side-by-side */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
            gap: 16,
          }}
        >
          {/* CORRECT ORDER */}
          <section>
            <h3
              style={{
                fontSize: 13,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#16a34a',
                margin: '0 0 10px',
              }}
            >
              ✅ Correct Order
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {correctOrderImages.map((item, index) => (
                <ReviewRow
                  key={item.id}
                  position={index + 1}
                  item={item}
                  imgUrl={getImgUrl(item)}
                  variant="correct"
                />
              ))}
            </div>
          </section>

          {/* PLAYER ORDER */}
          {playerOrderImages ? (
            <section>
              <h3
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: isCorrect ? '#16a34a' : '#dc2626',
                  margin: '0 0 10px',
                }}
              >
                {isCorrect ? '✅' : '❌'} Your Answer
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {playerOrderImages.map((item, index) => {
                  const inRightSpot = item.order === index + 1;
                  return (
                    <ReviewRow
                      key={item.id}
                      position={index + 1}
                      item={item}
                      imgUrl={getImgUrl(item)}
                      variant={inRightSpot ? 'correct' : 'wrong'}
                      wrongPositionLabel={!inRightSpot ? `Should be #${item.order}` : undefined}
                    />
                  );
                })}
              </div>
            </section>
          ) : (
            <section
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '32px 16px',
                color: '#94a3b8',
                fontSize: 15,
                textAlign: 'center',
              }}
            >
              You didn't submit an answer
            </section>
          )}
        </div>

        {/* Category note */}
        {question.category && (
          <div
            style={{
              marginTop: 16,
              padding: '10px 14px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 10,
              fontSize: 13,
              color: '#1e40af',
              textAlign: 'center',
            }}
          >
            <strong>Category:</strong> {question.category}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Shared row sub-component ──────────────────────────────────────────────────
interface ReviewRowProps {
  position: number;
  item: OrderImageItem;
  imgUrl: string;
  variant: 'correct' | 'wrong' | 'neutral';
  wrongPositionLabel?: string;
}

const ReviewRow: React.FC<ReviewRowProps> = ({ position, item, imgUrl, variant, wrongPositionLabel }) => {
  const palette = {
    correct: { bg: '#f0fdf4', border: '#86efac', badge: '#16a34a', icon: '✅' },
    wrong:   { bg: '#fff1f2', border: '#fca5a5', badge: '#dc2626', icon: '❌' },
    neutral: { bg: '#f8fafc', border: '#e2e8f0', badge: '#475569', icon: '' },
  }[variant];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        borderRadius: 12,
        border: `2px solid ${palette.border}`,
        background: palette.bg,
      }}
    >
      {/* Badge */}
      <div
        style={{
          flexShrink: 0,
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: palette.badge,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: 14,
        }}
      >
        {position}
      </div>

      {/* Image */}
      <div
        style={{
          flexShrink: 0,
          width: 52,
          height: 52,
          borderRadius: 8,
          overflow: 'hidden',
          border: `1.5px solid ${palette.border}`,
        }}
      >
        <img
          src={imgUrl}
          alt={item.label}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>

      {/* Label */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#1e293b',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.label}
        </p>
        {wrongPositionLabel && (
          <p style={{ fontSize: 11, color: '#dc2626', margin: '2px 0 0', fontWeight: 500 }}>
            {wrongPositionLabel}
          </p>
        )}
      </div>

      {/* Icon */}
      {palette.icon && (
        <span style={{ flexShrink: 0, fontSize: 16 }}>{palette.icon}</span>
      )}
    </div>
  );
};

export default OrderImageReview;