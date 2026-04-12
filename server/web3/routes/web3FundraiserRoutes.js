import express from 'express'
import { validateSessionToken } from '../services/web3AuthService.js'
import { getDashboardData } from '../services/web3FundraiserService.js'
import { web3DashboardLimiter } from '../../middleware/rateLimit.js'

const router = express.Router()

router.get('/dashboard', web3DashboardLimiter, async (req, res) => {
  const token = req.headers['x-wallet-session']

  if (!token) {
    return res.status(401).json({ error: 'Missing session token' })
  }

  const session = await validateSessionToken(token)  // ← await added
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session token' })
  }

  const { wallet_address } = session

  console.log('[dashboard] querying for wallet:', wallet_address)

  try {
    const data = await getDashboardData(wallet_address)
    return res.json({ ok: true, data })
  } catch (err) {
    console.error('[web3FundraiserRoutes] Dashboard error:', err)
    return res.status(500).json({ error: 'Failed to load dashboard data' })
  }
})

export default router