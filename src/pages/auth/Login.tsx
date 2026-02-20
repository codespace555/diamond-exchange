import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useState } from 'react'
import { authApi } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'
import { connectSocket } from '../../socket/socket'
import AuthLayout from '../../layouts/AuthLayout'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type FormData = z.infer<typeof schema>

export default function Login() {
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      const response = await authApi.login(data.email, data.password)
      setAuth(response.user, response.token)
      connectSocket(response.token)
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      toast.success(`Welcome back, ${response.user.name}!`)
      navigate('/dashboard')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error?.response?.data?.message || 'Login failed. Check your credentials.')
    }
  }

  return (
    <AuthLayout>
      <h2 className="font-display text-2xl font-bold text-text-primary mb-1">Sign In</h2>
      <p className="text-text-muted text-sm mb-6">Enter your credentials to access the platform</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
          <input
            {...register('email')}
            type="email"
            placeholder="you@example.com"
            className="input-field"
            autoComplete="email"
          />
          {errors.email && <p className="text-accent-red text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Password</label>
          <div className="relative">
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="input-field pr-10"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && <p className="text-accent-red text-xs mt-1">{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary w-full justify-center py-2.5 mt-2"
        >
          <LogIn size={16} />
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <span className="text-text-muted text-sm">Don't have an account? </span>
        <Link to="/register" className="text-accent-blue hover:text-blue-400 text-sm font-medium transition-colors">
          Register
        </Link>
      </div>
    </AuthLayout>
  )
}
