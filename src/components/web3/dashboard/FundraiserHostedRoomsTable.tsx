import React, { useState } from 'react'
import type { HostedRoom } from '../../../hooks/useFundraiserDashboard'

interface Props {
  rooms: HostedRoom[]
  total: number
}

type SortKey = 'created_at' | 'charity_amount_eur' | 'number_of_players' | 'total_raised_eur'
type SortDir = 'asc' | 'desc'

const fmtEur = (n: number) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n)

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })

function ChainPill({ chain }: { chain: string }) {
  const map: Record<string, string> = {
    ethereum: '#8b9ef5', solana: '#63ffb4', polygon: '#a78bfa',
    base: '#60a5fa', bnb: '#fbbf24',
  }
  const color = map[chain?.toLowerCase()] ?? 'rgba(255,255,255,0.35)'
  return (
    <span style={{
      fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.1em',
      padding: '2px 8px', borderRadius: '4px',
      background: `${color}18`, color, border: `0.5px solid ${color}40`,
    }}>
      {chain?.toUpperCase()}
    </span>
  )
}

export function FundraiserHostedRoomsTable({ rooms, total }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const sorted = [...rooms].sort((a, b) => {
    const av = a[sortKey] as any
    const bv = b[sortKey] as any
    const cmp = av < bv ? -1 : av > bv ? 1 : 0
    return sortDir === 'asc' ? cmp : -cmp
  })

  const SortIndicator = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? <span style={{ marginLeft: 4, opacity: 0.7 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
      : <span style={{ marginLeft: 4, opacity: 0.2 }}>↕</span>

  if (rooms.length === 0) {
    return (
      <div className="fl-table-empty">
        <p>No hosted rooms yet. Launch your first room to see it here.</p>
      </div>
    )
  }

  return (
    <div className="fl-rooms-root">
      <div className="fl-table-meta">
        <span>{total} room{total !== 1 ? 's' : ''} total</span>
      </div>
      <div className="fl-table-scroll">
        <table className="fl-table">
          <thead>
            <tr>
              <th>Room</th>
              <th>Charity</th>
              <th onClick={() => handleSort('created_at')} className="fl-th-sort">
                Date <SortIndicator k="created_at" />
              </th>
              <th>Chain</th>
              <th onClick={() => handleSort('number_of_players')} className="fl-th-sort">
                Players <SortIndicator k="number_of_players" />
              </th>
              <th onClick={() => handleSort('total_raised_eur')} className="fl-th-sort">
                Total raised <SortIndicator k="total_raised_eur" />
              </th>
              <th onClick={() => handleSort('charity_amount_eur')} className="fl-th-sort">
                To charity <SortIndicator k="charity_amount_eur" />
              </th>
              <th>Host fee</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(room => (
              <tr key={room.room_id}>
                <td>
                  <span className="fl-room-id" title={room.room_id}>
                    {room.room_id.slice(0, 8)}…
                  </span>
                </td>
                <td>
                  <span className="fl-charity-name">{room.charity_name}</span>
                </td>
                <td className="fl-td-mono">{fmtDate(room.created_at)}</td>
                <td><ChainPill chain={room.chain} /></td>
                <td className="fl-td-mono fl-td-right">{room.number_of_players}</td>
                <td className="fl-td-mono fl-td-right fl-td-total">{fmtEur(room.total_raised_eur)}</td>
                <td className="fl-td-mono fl-td-right fl-td-charity">{fmtEur(room.charity_amount_eur)}</td>
                <td className="fl-td-mono fl-td-right fl-td-fee">{fmtEur(room.host_fee_amount_eur)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        .fl-rooms-root {
          background: #0f0f18;
          border: 0.5px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          overflow: hidden;
        }
        .fl-table-meta {
          padding: 1rem 1.5rem 0.75rem;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: rgba(255,255,255,0.3);
          border-bottom: 0.5px solid rgba(255,255,255,0.05);
        }
        .fl-table-scroll { overflow-x: auto; }
        .fl-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .fl-table thead tr {
          border-bottom: 0.5px solid rgba(255,255,255,0.07);
        }
        .fl-table th {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.3);
          padding: 0.875rem 1rem;
          text-align: left;
          white-space: nowrap;
        }
        .fl-th-sort { cursor: pointer; user-select: none; }
        .fl-th-sort:hover { color: rgba(255,255,255,0.6); }
        .fl-table tbody tr {
          border-bottom: 0.5px solid rgba(255,255,255,0.04);
          transition: background 0.1s ease;
        }
        .fl-table tbody tr:last-child { border-bottom: none; }
        .fl-table tbody tr:hover { background: rgba(255,255,255,0.03); }
        .fl-table td {
          padding: 0.875rem 1rem;
          color: rgba(255,255,255,0.7);
          white-space: nowrap;
        }
        .fl-room-id {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: rgba(255,255,255,0.3);
        }
        .fl-charity-name {
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          color: rgba(255,255,255,0.7);
        }
        .fl-td-mono { font-family: 'DM Mono', monospace; font-size: 12px; }
        .fl-td-right { text-align: right; }
        .fl-td-total { color: rgba(255,255,255,0.85); }
        .fl-td-charity { color: #3bbef5; }
        .fl-td-fee { color: rgba(255,255,255,0.4); }
        .fl-table-empty {
          padding: 2rem;
          text-align: center;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          color: rgba(255,255,255,0.25);
        }
      `}</style>
    </div>
  )
}