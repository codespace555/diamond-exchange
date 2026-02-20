import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { authApi } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import { connectSocket, disconnectSocket } from '../socket/socket'

export function useAuth() {
  const { user, token, isAuthenticated, setUser, logout } = useAuthStore()

  const { isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const userData = await authApi.me()
      setUser(userData)
      return userData
    },
    enabled: !!token && !user,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (token && isAuthenticated) {
      connectSocket(token)
    } else {
      disconnectSocket()
    }
  }, [token, isAuthenticated])

  useEffect(() => {
    const handleLogout = () => logout()
    window.addEventListener('auth:logout', handleLogout)
    return () => window.removeEventListener('auth:logout', handleLogout)
  }, [logout])

  return { user, isAuthenticated, isLoading }
}
