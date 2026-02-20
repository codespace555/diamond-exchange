import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { authApi } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'
import { connectSocket } from '../../socket/socket'
import AuthLayout from '../../layouts/AuthLayout'
import toast from 'react-hot-toast'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

export default function Register() {
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      const response = await authApi.register({
        name: data.name,
        email: data.email,
        password: data.password,
      })
      setAuth(response.user, response.token)
      connectSocket(response.token)
      toast.success(`Welcome to Diamond, ${response.user.name}!`)
      navigate('/dashboard')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error?.response?.data?.message || 'Registration failed.')
    }
  }

  return (
    <AuthLayout>
      <h2 className="font-display text-2xl font-bold text-text-primary mb-1">Create Account</h2>
      <p className="text-text-muted text-sm mb-6">Join the Diamond Exchange platform</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Full Name</label>
          <input {...register('name')} placeholder="John Doe" className="input-field" />
          {errors.name && <p className="text-accent-red text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
          <input {...register('email')} type="email" placeholder="you@example.com" className="input-field" />
          {errors.email && <p className="text-accent-red text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Password</label>
          <input {...register('password')} type="password" placeholder="••••••••" className="input-field" />
          {errors.password && <p className="text-accent-red text-xs mt-1">{errors.password.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Confirm Password</label>
          <input {...register('confirmPassword')} type="password" placeholder="••••••••" className="input-field" />
          {errors.confirmPassword && <p className="text-accent-red text-xs mt-1">{errors.confirmPassword.message}</p>}
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center py-2.5 mt-2">
          <UserPlus size={16} />
          {isSubmitting ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <span className="text-text-muted text-sm">Already have an account? </span>
        <Link to="/login" className="text-accent-blue hover:text-blue-400 text-sm font-medium transition-colors">
          Sign In
        </Link>
      </div>
    </AuthLayout>
  )
}
