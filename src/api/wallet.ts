import api from './axios'
import type { Wallet, LedgerEntry, PaginatedResponse } from '../types'

export const walletApi = {
  getWallet: async (): Promise<Wallet> => {
    const res = await api.get('/wallet')
    return res.data.data
  },

  getLedger: async (params?: {
    page?: number
    limit?: number
    type?: string
  }): Promise<PaginatedResponse<LedgerEntry>> => {
    const res = await api.get('/wallet/ledger', { params })
    return res.data.data
  },

  transfer: async (data: {
    toUserId: string
    amount: number
    notes?: string
  }): Promise<{ success: boolean; newBalance: number }> => {
    const res = await api.post('/wallet/transfer', data)
    return res.data
  },

  // Admin only
  addBalance: async (data: {
    userId: string
    amount: number
    notes?: string
  }): Promise<void> => {
    await api.post('/wallet/add-balance', data)
  },

  lockExposure: async (data: {
    userId: string
    amount: number
    marketId?: string
  }): Promise<void> => {
    await api.post('/wallet/lock-exposure', data)
  },

  releaseExposure: async (data: {
    userId: string
    amount: number
    marketId?: string
  }): Promise<void> => {
    await api.post('/wallet/release-exposure', data)
  },
}
