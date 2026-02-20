import axios from 'axios'
import type { ExternalSport, ExternalMatch, ExternalScore } from '../types'

const ODDS_API_URL = import.meta.env.VITE_ODDS_API_URL || 'https://api.the-odds-api.com/v4'
const ODDS_API_KEY = import.meta.env.VITE_ODDS_API_KEY || '418f36a45fe19ee008150464cfb5bfdd'

const oddsAxios = axios.create({
  baseURL: ODDS_API_URL,
})

export const oddsApi = {
  getSports: async (): Promise<ExternalSport[]> => {
    const res = await oddsAxios.get('/sports', {
      params: { apiKey: ODDS_API_KEY },
    })
    return res.data.data
  },

  getOdds: async (params: {
    sport: string
    regions?: string
    markets?: string
    oddsFormat?: string
    dateFormat?: string
  }): Promise<ExternalMatch[]> => {
    const { sport, regions = 'us', markets = 'h2h,spreads', oddsFormat = 'decimal', dateFormat = 'iso' } = params
    const res = await oddsAxios.get(`/sports/${sport}/odds`, {
      params: { apiKey: ODDS_API_KEY, regions, markets, oddsFormat, dateFormat },
    })
    console.log('API response for odds:', res.data)
    return res.data
  },

  getScores: async (sport: string, daysFrom: number = 1): Promise<ExternalScore[]> => {
    const res = await oddsAxios.get(`/sports/${sport}/scores`, {
      params: { apiKey: ODDS_API_KEY, daysFrom, dateFormat: 'iso' },
    })
    console.log('API response for scores:', res.data)
    return res.data
  },

  getUpcomingOdds: async (regions = 'us', markets = 'h2h'): Promise<ExternalMatch[]> => {
    const res = await oddsAxios.get('/sports/upcoming/odds', {
      params: { apiKey: ODDS_API_KEY, regions, markets, oddsFormat: 'decimal', dateFormat: 'iso' },
    })
    console.log('API response for upcoming odds:', res.data)
    return res.data
  },
}
