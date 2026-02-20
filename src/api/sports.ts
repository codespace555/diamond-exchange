import api from './axios'
import type { Match, Market, OrderBook, Order, PlaceOrderRequest, PaginatedResponse } from '../types'

export const sportsApi = {
  getMatches: async (params?: {
    page?: number
    limit?: number
    search?: string
    status?: string
    sport?: string
  }): Promise<PaginatedResponse<Match>> => {
    const res = await api.get('/sports/matches', { params })
    return res.data.data
  },

  getMatch: async (matchId: string): Promise<Match> => {
    const res = await api.get(`/sports/matches/${matchId}`)
    console.log('Fetched match:', res.data.data)
    return res.data.data
  },

  getOrderBook: async (marketId: string): Promise<OrderBook> => {
    const res = await api.get(`/sports/markets/${marketId}/orderbook`)
    return res.data.data
  },

  placeOrder: async (data: PlaceOrderRequest): Promise<Order> => {
    const res = await api.post('/sports/order', data)
    return res.data
  },

  getOrders: async (params?: {
    page?: number
    limit?: number
    status?: string
    marketId?: string
  }): Promise<PaginatedResponse<Order>> => {
    const res = await api.get('/sports/orders', { params })
    return res.data.data
  },

  cancelOrder: async (orderId: string): Promise<void> => {
    await api.delete(`/sports/order/${orderId}`)
  },
}

export const exchangeApi = {
  getMatches: async (params?: {
    page?: number
    limit?: number
    search?: string
    status?: string
  }): Promise<PaginatedResponse<Match>> => {
    const res = await api.get('/exchange/matches', { params })
    return res.data.data
  },

  getMatch: async (matchId: string): Promise<Match> => {
    const res = await api.get(`/exchange/matches/${matchId}`)
    return res.data.data
  },

  getOrderBook: async (marketId: string): Promise<OrderBook> => {
    const res = await api.get(`/exchange/markets/${marketId}/orderbook`)
    return res.data.data
  },

  placeOrder: async (data: PlaceOrderRequest): Promise<Order> => {
    const res = await api.post('/exchange/order', data)
    return res.data
  },

  getOrders: async (params?: {
    page?: number
    limit?: number
    status?: string
  }): Promise<PaginatedResponse<Order>> => {
    const res = await api.get('/exchange/orders', { params })
    return res.data.data
  },

  cancelOrder: async (orderId: string): Promise<void> => {
    await api.delete(`/exchange/order/${orderId}`)
  },
}
