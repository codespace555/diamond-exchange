import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Shield, Key } from 'lucide-react'
import { authApi } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'
import { getRoleBadgeColor } from '../../utils/format'
import toast from 'react-hot-toast'

const passwordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type PasswordForm = z.infer<typeof passwordSchema>

export default function Profile() {
  const { user } = useAuthStore()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  const onChangePassword = async (data: PasswordForm) => {
    try {
      await authApi.changePassword(data.currentPassword, data.newPassword)
      toast.success('Password changed successfully')
      reset()
    } catch {
      toast.error('Failed to change password')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="font-display text-2xl font-bold text-text-primary">Profile</h1>

      {/* User Info */}
      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-accent-purple to-accent-blue rounded-full flex items-center justify-center text-2xl font-bold">
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-text-primary">{user?.name}</h2>
            <p className="text-text-muted">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-bg-secondary rounded-lg p-3">
            <div className="flex items-center gap-2 text-text-muted text-sm mb-1">
              <User size={14} />
              Name
            </div>
            <div className="text-text-primary font-medium">{user?.name}</div>
          </div>
          <div className="bg-bg-secondary rounded-lg p-3">
            <div className="flex items-center gap-2 text-text-muted text-sm mb-1">
              <Shield size={14} />
              Role
            </div>
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${getRoleBadgeColor(user?.role ?? '')}`}>
              {user?.role}
            </span>
          </div>
          <div className="bg-bg-secondary rounded-lg p-3 col-span-2">
            <div className="text-text-muted text-sm mb-1">Email</div>
            <div className="text-text-primary font-medium">{user?.email}</div>
          </div>
          <div className="bg-bg-secondary rounded-lg p-3">
            <div className="text-text-muted text-sm mb-1">User ID</div>
            <div className="text-text-primary font-mono text-xs">{user?.id}</div>
          </div>
          <div className="bg-bg-secondary rounded-lg p-3">
            <div className="text-text-muted text-sm mb-1">Member Since</div>
            <div className="text-text-primary text-sm">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Key size={18} className="text-accent-gold" />
          <h3 className="font-display text-lg font-bold text-text-primary">Change Password</h3>
        </div>

        <form onSubmit={handleSubmit(onChangePassword)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Current Password</label>
            <input {...register('currentPassword')} type="password" className="input-field" />
            {errors.currentPassword && <p className="text-accent-red text-xs mt-1">{errors.currentPassword.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">New Password</label>
            <input {...register('newPassword')} type="password" className="input-field" />
            {errors.newPassword && <p className="text-accent-red text-xs mt-1">{errors.newPassword.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Confirm New Password</label>
            <input {...register('confirmPassword')} type="password" className="input-field" />
            {errors.confirmPassword && <p className="text-accent-red text-xs mt-1">{errors.confirmPassword.message}</p>}
          </div>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
