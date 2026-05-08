// src/components/web3/dashboard/my-events/myEventsHelpers.ts

import type { PublicEvent } from '../../../../services/web3PublicEventsService'
import type { Charity } from '../../../../chains/evm/config/gbcharities'
import { SOLANA_TOKENS } from '../../../../chains/solana/config/solanaTokenConfig'
import type { Chain } from '../../../../services/web3PublicEventsService'

export const FIXED_CHAIN: Chain = 'solana'
export const BONK_TOKEN = 'BONK'
export const BONK_CHARITY_NAME = 'Buddies for Paws'

export const softMono: React.CSSProperties = { fontFamily: "'DM Mono', monospace" }

export const panelStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(19,19,31,0.98) 0%, rgba(13,13,23,0.98) 100%)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 18,
  boxShadow: '0 16px 50px rgba(0,0,0,0.28)',
}

export const actionPillBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontFamily: "'DM Mono', monospace",
  fontSize: 11,
  fontWeight: 500,
  padding: '7px 14px',
  borderRadius: 9,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
}

export function getOrigin(): string {
  return typeof window !== 'undefined'
    ? window.location.origin.replace(/\/$/, '')
    : 'https://fundraisely.ie'
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatTime(timeStr: string, tz: string): string {
  return `${timeStr.slice(0, 5)} ${tz}`
}

export function statusColor(status: PublicEvent['status']): {
  bg: string
  color: string
  border: string
} {
  switch (status) {
    case 'draft':
      return {
        bg: 'rgba(255,255,255,0.06)',
        color: 'rgba(255,255,255,0.72)',
        border: 'rgba(255,255,255,0.14)',
      }
    case 'published':
      return {
        bg: 'rgba(99,255,180,0.12)',
        color: '#7affc1',
        border: 'rgba(99,255,180,0.34)',
      }
    case 'live':
      return {
        bg: 'rgba(59,190,245,0.12)',
        color: '#6cd2ff',
        border: 'rgba(59,190,245,0.34)',
      }
    case 'ended':
      return {
        bg: 'rgba(255,255,255,0.04)',
        color: 'rgba(255,255,255,0.50)',
        border: 'rgba(255,255,255,0.10)',
      }
  }
}

export function platformLabel(platform: string | null): string {
  const map: Record<string, string> = {
    discord: 'Discord',
    zoom: 'Zoom',
    x: 'X Space',
    telegram: 'Telegram',
    whatsapp: 'WhatsApp',
    luma: 'Luma',
    eventbrite: 'Eventbrite',
    meet: 'Google Meet',
  }

  return map[platform ?? ''] ?? 'Link'
}

export function outlineBtn(borderColor: string, color: string): React.CSSProperties {
  return {
    ...actionPillBase,
    background: 'transparent',
    border: `1px solid ${borderColor}`,
    color,
    cursor: 'pointer',
  }
}

export function charityKey(c: Charity): string {
  return c.direct ? `direct:${c.name}` : String(c.id)
}

export function normaliseName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function isBuddiesForPaws(c: Charity): boolean {
  const name = normaliseName(c.name)
  return name === 'buddies for paws' || (name.includes('buddies') && name.includes('paws'))
}

export function isBonkToken(token: string | undefined | null): boolean {
  return String(token ?? '').toUpperCase() === BONK_TOKEN
}

const SOLANA_TOKEN_CODES = Object.keys(SOLANA_TOKENS)

export function getTokensForChain(chain: Chain) {
  if (chain === 'base') return [{ code: 'USDC', name: 'USDC (Base)' }]

  return SOLANA_TOKEN_CODES.map(code => ({
    code,
    name: SOLANA_TOKENS[code as keyof typeof SOLANA_TOKENS].name,
  }))
}