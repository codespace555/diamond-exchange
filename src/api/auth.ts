import api from './axios'
import type { AuthResponse, User } from '../types'

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    
    const res = await api.post('/auth/login', { email, password })
    console.log('Logging in with email:', res)
    return res.data.data
  },

  register: async (data: {
    email: string
    password: string
    name: string
    role?: string
  }): Promise<AuthResponse> => {
    const res = await api.post('/auth/register', data)
    return res.data
  },

  me: async (): Promise<User> => {
    const res = await api.get('/auth/me')
    return res.data.data
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.post('/auth/change-password', { currentPassword, newPassword })
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout')
  },
}
