import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Bell, Send } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { adminApi } from '../../api/admin'
import { useAuthStore } from '../../store/authStore'
import { useNotificationStore } from '../../store/notificationStore'
import { formatRelative } from '../../utils/format'
import toast from 'react-hot-toast'

const sendSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  type: z.enum(['info', 'success', 'warning', 'error']),
  broadcast: z.boolean().optional(),
  userId: z.string().optional(),
})
type SendForm = z.infer<typeof sendSchema>

export default function NotificationsPage() {
  const { user } = useAuthStore()
  const { notifications, markRead, markAllRead } = useNotificationStore()
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<SendForm>({
    resolver: zodResolver(sendSchema),
    defaultValues: { type: 'info', broadcast: true },
  })

  const sendMutation = useMutation({
    mutationFn: adminApi.sendNotification,
    onSuccess: () => {
      toast.success('Notification sent!')
      reset()
    },
    onError: () => toast.error('Failed to send notification'),
  })
console.log('Notifications page rendered. Current notifications:', notifications)
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell size={20} className="text-accent-gold" />
          <h1 className="font-display text-2xl font-bold text-text-primary">Notifications</h1>
        </div>
        {notifications.some((n) => !n.read) && (
          <button onClick={markAllRead} className="text-xs text-accent-blue hover:text-blue-400 transition-colors">
            Mark all as read
          </button>
        )}
      </div>

      {/* Admin: Send Notification */}
      {isAdmin && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Send size={16} className="text-accent-blue" />
            <h3 className="font-semibold text-text-primary">Send Notification</h3>
          </div>
          <form onSubmit={handleSubmit((d) => sendMutation.mutate(d))} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-text-secondary mb-1 block">Title</label>
                <input {...register('title')} className="input-field" placeholder="Notification title" />
              </div>
              <div>
                <label className="text-sm text-text-secondary mb-1 block">Type</label>
                <select {...register('type')} className="input-field">
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm text-text-secondary mb-1 block">Message</label>
              <textarea {...register('message')} className="input-field" rows={3} placeholder="Notification message..." />
            </div>
            <div className="flex items-center gap-4">
              <div>
                <label className="text-sm text-text-secondary mb-1 block">User ID (optional)</label>
                <input {...register('userId')} className="input-field" placeholder="Leave empty for broadcast" />
              </div>
              <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer mt-6">
                <input {...register('broadcast')} type="checkbox" className="w-4 h-4 accent-accent-blue" />
                Broadcast to all
              </label>
            </div>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              <Send size={14} />
              {isSubmitting ? 'Sending...' : 'Send Notification'}
            </button>
          </form>
        </div>
      )}

      {/* Notifications List */}
      <div className="card divide-y divide-bg-border">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-text-muted">
            <Bell size={48} className="mx-auto mb-4 opacity-30" />
            <p>No notifications</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => markRead(n.id)}
              className={`p-4 cursor-pointer hover:bg-bg-hover transition-colors ${!n.read ? 'bg-accent-blue/5' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                  n.type === 'success' ? 'bg-accent-green' :
                  n.type === 'error' ? 'bg-accent-red' :
                  n.type === 'warning' ? 'bg-accent-gold' : 'bg-accent-blue'
                }`} />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-text-primary">{n.title}</div>
                    <div className="text-xs text-text-muted flex-shrink-0">{formatRelative(n.createdAt)}</div>
                  </div>
                  <div className="text-sm text-text-secondary mt-1">{n.message}</div>
                </div>
                {!n.read && <div className="w-2 h-2 bg-accent-blue rounded-full flex-shrink-0 mt-2" />}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
