import { useEffect, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CharityName {
  charity_name: string
  charity_wallet: string
  total_eur: number
}

export interface HostedOverview {
  rooms_launched: number
  total_raised_eur: number
  charity_amount_eur: number
  host_fee_amount_eur: number
  extras_revenue_eur: number
  total_players: number
  avg_raised_per_room: number
  avg_players_per_room: number
  distinct_charities_count: number
  charity_names: CharityName[]
  unique_supporter_wallets: number
  total_prize_payouts_sent_eur: number
  avg_host_fee_per_room: number
}

export interface PlayerOverview {
  rooms_joined: number
  total_entry_fees_eur: number
  total_donation_eur: number
  total_extras_eur: number
  prize_payouts_received_eur: number
  distinct_chains: string[]
}

export interface ImpactHeadline {
  total_charity_impact_eur: number
  hosted_charity_eur: number
  player_donation_eur: number
}

export interface ChartDataPoint {
  period?: string
  period_start?: string
  name?: string
  value?: number
  charity_eur?: number
  total_eur?: number
  room_count?: number
  payout_eur?: number
  payout_count?: number
  chain?: string
  hosted_rooms?: number
  rooms_joined?: number
  raised_eur?: number
}

export interface ChartsData {
  raisedOverTime: ChartDataPoint[]
  revenueMix: ChartDataPoint[]
  contributionMix: ChartDataPoint[]
  chainUsage: ChartDataPoint[]
  payoutsOverTime: ChartDataPoint[]
  charitiesBreakdown: ChartDataPoint[]
}

export interface ActivityItem {
  activity_type: 'hosted_room' | 'transaction'
  room_id: string
  charity_name: string | null
  chain: string
  network: string
  total_raised_eur: number | null
  charity_amount_eur: number | null
  number_of_players: number | null
  tx_hash: string | null
  transaction_type: string | null
  fee_token: string | null
  amount: number | null
  amount_eur: number | null
  created_at: string
  label: string
}

export interface HostedRoom {
  room_id: string
  charity_name: string
  charity_wallet: string
  chain: string
  network: string
  fee_token: string
  total_raised_eur: number
  charity_amount_eur: number
  host_fee_amount_eur: number
  number_of_players: number
  created_at: string
}

export interface Transaction {
  id: number
  game_type: string
  room_id: string
  campaign_id: string
  wallet_address: string
  chain: string
  network: string
  tx_hash: string
  transaction_type: string
  direction: string
  status: string
  fee_token: string
  amount: number
  amount_eur: number
  entry_fee_amount_eur: number
  extras_amount_eur: number
  donation_amount_eur: number
  created_at: string
  confirmed_at: string
}

export interface DashboardData {
  impactHeadline: ImpactHeadline
  hostedOverview: HostedOverview
  playerOverview: PlayerOverview
  charts: ChartsData
  recentActivity: ActivityItem[]
  hostedRooms: { rows: HostedRoom[]; total: number; page: number; limit: number }
  transactions: { rows: Transaction[]; total: number; page: number; limit: number }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseFundraiserDashboardReturn {
  data: DashboardData | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useFundraiserDashboard(): UseFundraiserDashboardReturn {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchCount, setFetchCount] = useState(0)

  const refetch = () => setFetchCount(c => c + 1)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const token = sessionStorage.getItem('web3_fundraiser_session')
      if (!token) {
        setError('No session token found')
        setLoading(false)
        return
      }

      try {
        const res = await fetch('/api/web3/fundraisers/dashboard', {
          headers: {
            'x-wallet-session': token,
          },
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `HTTP ${res.status}`)
        }

        const json = await res.json()
        if (!cancelled) {
          setData(json.data)
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [fetchCount])

  return { data, loading, error, refetch }
}