import api from './axios'
import type { Game, CasinoTransaction, PaginatedResponse } from '../types'

export const casinoApi = {
  getGames: async (params?: {
    category?: string
    search?: string
    page?: number
    limit?: number
  }): Promise<PaginatedResponse<Game>> => {
    const res = await api.get('/casino/games', { params })
    return res.data.data
  },

  getCategories: async (): Promise<string[]> => {
    const res = await api.get('/casino/categories')
    return res.data.data
  },

  launchGame: async (gameId: string): Promise<{ url: string; token: string }> => {
    const res = await api.post('/casino/launch', { gameId })
    return res.data
  },

  placeBet: async (data: {
    gameId: string
    amount: number
    betData?: Record<string, unknown>
  }): Promise<{ transactionId: string; balance: number }> => {
    const res = await api.post('/casino/bet', data)
    return res.data
  },

  reportWin: async (data: {
    gameId: string
    transactionId: string
    amount: number
  }): Promise<{ balance: number }> => {
    const res = await api.post('/casino/win', data)
    return res.data
  },

  getTransactions: async (params?: {
    page?: number
    limit?: number
    gameId?: string
  }): Promise<PaginatedResponse<CasinoTransaction>> => {
    const res = await api.get('/casino/transactions', { params })
    return res.data.data
  },
}
