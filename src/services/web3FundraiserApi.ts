/**
 * web3FundraiserApi
 *
 * All HTTP calls for the Web3 fundraiser auth + dashboard.
 * Extends BaseService so it shares the request/error pattern.
 *
 * Auth endpoints use a separate wallet-session token (not the web2 JWT).
 * The token is stored in sessionStorage under 'web3_fundraiser_session'.
 */

import BaseService from '../components/mgtsystem/services/BaseService';

const SESSION_KEY = 'web3_fundraiser_session';

class Web3FundraiserService extends BaseService {
  // Override getAuthHeaders for wallet-session routes
  private getWalletAuthHeaders(): Record<string, string> {
    const token = sessionStorage.getItem(SESSION_KEY);
    return {
      'Content-Type': 'application/json',
      ...(token && { 'X-Wallet-Session': token }),
    };
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  async requestChallenge(
    walletAddress: string,
    chainFamily: string
  ): Promise<{ challenge: string; nonce: string }> {
    return this.request('/web3/auth/challenge', {
      method: 'POST',
      body: JSON.stringify({ wallet_address: walletAddress, chain_family: chainFamily }),
    });
  }

  async verifySignature(
    walletAddress: string,
    chainFamily: string,
    nonce: string,
    signature: string
  ): Promise<{ token: string }> {
    return this.request('/web3/auth/verify', {
      method: 'POST',
      body: JSON.stringify({
        wallet_address: walletAddress,
        chain_family: chainFamily,
        nonce,
        signature,
      }),
    });
  }

  async logoutWalletSession(token: string): Promise<void> {
    return this.request('/web3/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Wallet-Session': token,
      },
    });
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────

  async getDashboard(): Promise<DashboardPayload> {
    const token = sessionStorage.getItem(SESSION_KEY);
    return this.request('/web3/fundraisers/dashboard', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'X-Wallet-Session': token }),
      },
    });
  }
}

// ── Singleton exports (match your existing service pattern) ──────────────────

const web3FundraiserService = new Web3FundraiserService();

export const requestChallenge = (walletAddress: string, chainFamily: string) =>
  web3FundraiserService.requestChallenge(walletAddress, chainFamily);

export const verifySignature = (
  walletAddress: string,
  chainFamily: string,
  nonce: string,
  signature: string
) => web3FundraiserService.verifySignature(walletAddress, chainFamily, nonce, signature);

export const logoutWalletSession = (token: string) =>
  web3FundraiserService.logoutWalletSession(token);

export const getDashboard = () =>
  web3FundraiserService.getDashboard();

// ── Types ─────────────────────────────────────────────────────────────────────
// Stub types for PR 1 — expanded in PR 2 when the dashboard endpoint is built

export interface DashboardPayload {
  wallet: {
    address: string;
    chain_types_seen: string[];
    last_verified_at: string | null;
  };
  hostedOverview: Record<string, number>;
  playerOverview: Record<string, number>;
  combinedOverview: Record<string, number>;
  charts: Record<string, any[]>;
  recentActivity: ActivityItem[];
  hostedRooms: any[];
  transactions: any[];
}

export interface ActivityItem {
  id: string;
  type: string;
  label: string;
  room_id: string | null;
  chain: string | null;
  network: string | null;
  amount_eur: number | null;
  created_at: string;
}