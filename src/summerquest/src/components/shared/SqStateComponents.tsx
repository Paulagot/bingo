import React from 'react';

export function SqLoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="sq-loading-state">
      <div className="sq-spinner" />
      <p>{label}</p>
    </div>
  );
}

export function SqEmptyState({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="sq-empty-state">
      <span className="sq-empty-icon">{icon}</span>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

export function SqErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="sq-error-banner">
      <span>{message}</span>
      {onRetry && <button onClick={onRetry} className="sq-error-retry">Try again</button>}
    </div>
  );
}

export const SQ_STATE_CSS = `
.sq-loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 20px;
  color: var(--sq-grey);
}
.sq-spinner {
  width: 32px;
  height: 32px;
  border: 4px solid var(--sq-soft-orange);
  border-top-color: var(--sq-orange);
  border-radius: 50%;
  animation: sq-spin 0.7s linear infinite;
}
@keyframes sq-spin { to { transform: rotate(360deg); } }

.sq-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  padding: 40px 20px;
  color: var(--sq-grey);
}
.sq-empty-icon { font-size: 36px; margin-bottom: 6px; }
.sq-empty-state h3 { margin: 0; color: var(--sq-black); font-size: 17px; font-weight: 800; }
.sq-empty-state p { margin: 0; font-size: 14px; max-width: 280px; }

.sq-error-banner {
  background: #FEECEC;
  border: 1px solid var(--sq-red);
  color: #8B1A1A;
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.sq-error-retry {
  background: none;
  border: none;
  color: #8B1A1A;
  font-weight: 800;
  text-decoration: underline;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
}
`;
