import api from './axios'
import type { User, Match, Market, Order, Trade, AdminStats, PaginatedResponse, Notification } from '../types'

export const adminApi = {
  // Users
  getUsers: async (params?: {
    page?: number
    limit?: number
    search?: string
    role?: string
    parentId?: string
  }): Promise<PaginatedResponse<User>> => {
    const res = await api.get('/admin/users', { params })
    return res.data.data
  },

  createUser: async (data: {
    email: string
    password: string
    name: string
    role: string
    parentId?: string
  }): Promise<User> => {
    const res = await api.post('/admin/users', data)
    return res.data
  },

  updateUser: async (userId: string, data: Partial<User>): Promise<User> => {
    const res = await api.patch(`/admin/users/${userId}`, data)
    return res.data
  },

  deleteUser: async (userId: string): Promise<void> => {
    await api.delete(`/admin/users/${userId}`)
  },

  banUser: async (userId: string): Promise<void> => {
    await api.post(`/admin/users/${userId}/ban`)
  },

  unbanUser: async (userId: string): Promise<void> => {
    await api.post(`/admin/users/${userId}/unban`)
  },

  // Matches
  createMatch: async (data: {
    teamA: string
    teamB: string
    sport: string
    startTime: string
    externalId?: string
  }): Promise<Match> => {
    const res = await api.post('/admin/matches', data)
    return res.data
  },

  updateMatchStatus: async (matchId: string, status: string): Promise<Match> => {
    const res = await api.patch(`/admin/matches/${matchId}/status`, { status })
    return res.data
  },

  // Markets
  updateMarketStatus: async (marketId: string, status: string): Promise<Market> => {
    const res = await api.patch(`/admin/markets/${marketId}/status`, { status })
    return res.data
  },

  forceCloseMarket: async (marketId: string, winnerId: string): Promise<void> => {
    await api.post(`/admin/markets/${marketId}/force-close`, { winnerId })
  },

  createMarket: async (data: {
    matchId: string
    name: string
    runners: { name: string; backOdds: number; layOdds: number }[]
  }): Promise<Market> => {
    const res = await api.post('/admin/markets', data)
    return res.data
  },

  // Monitoring
  getMarketOrders: async (marketId: string): Promise<Order[]> => {
    const res = await api.get(`/admin/markets/${marketId}/orders`)
    return res.data
  },

  getTrades: async (params?: {
    page?: number
    limit?: number
    marketId?: string
    settled?: boolean
  }): Promise<PaginatedResponse<Trade>> => {
    const res = await api.get('/admin/trades', { params })
    return res.data
  },

  getStats: async (): Promise<AdminStats> => {
    const res = await api.get('/admin/stats')
    return res.data.data
  },

  // Notifications
  sendNotification: async (data: {
    userId?: string
    title: string
    message: string
    type: string
    broadcast?: boolean
  }): Promise<void> => {
    await api.post('/admin/notifications', data)
  },

  getNotifications: async (): Promise<Notification[]> => {
    const res = await api.get('/notifications')
    
    return res.data.data
  },

  markNotificationRead: async (id: string): Promise<void> => {
    await api.patch(`/notifications/${id}/read`)
  },
}
