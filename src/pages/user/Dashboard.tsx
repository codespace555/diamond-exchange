import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, Wallet, Activity, Trophy, RefreshCw, Bell } from 'lucide-react'
import { walletApi } from '../../api/wallet'
import { sportsApi } from '../../api/sports'
import { adminApi } from '../../api/admin'
import { useAuthStore } from '../../store/authStore'
import { useWalletStore } from '../../store/walletStore'
import { useNotificationStore } from '../../store/notificationStore'
import { useSocket } from '../../hooks/useSocket'
import { formatCurrency, formatDate, getStatusColor } from '../../utils/format'
import { Skeleton } from '../../components/ui/Skeleton'
import { LiveBadge, Badge } from '../../components/ui/Badge'
import type { BalanceUpdateEvent, BetSettledEvent } from '../../types'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const { user } = useAuthStore()
  const { setWallet, updateBalance } = useWalletStore()
  const { setNotifications } = useNotificationStore()

  console.log('Rendering Dashboard for user:', user?.email)

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['wallet'],
    queryFn: walletApi.getWallet,
    staleTime: 30000,
  })

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', 'recent'],
    queryFn: () => sportsApi.getOrders({ limit: 5 }),
  })
  console.log('Fetched recent orders:', orders)

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: adminApi.getNotifications,
    refetchInterval: 60000,
  })
  console.log('Fetched notifications:', notifications)

  useEffect(() => {
    if (wallet) setWallet(wallet)
  }, [wallet, setWallet])

  useEffect(() => {
    if (notifications) setNotifications(notifications)
  }, [notifications, setNotifications])

  // Real-time balance updates
  useSocket<BalanceUpdateEvent>('balance_update', (data) => {
    updateBalance(data.balance, data.exposure)
  })

  useSocket<BetSettledEvent>('bet_settled', (data) => {
    toast.success(`Bet settled! ${data.status === 'WON' ? `Won ${formatCurrency(data.payout ?? 0)}` : 'Better luck next time'}`)
  })

  useSocket('transfer_success', (data: { amount: number }) => {
    toast.success(`Transfer of ${formatCurrency(data.amount)} completed!`)
  })

  const available = (wallet?.balance ?? 0) - (wallet?.exposure ?? 0)


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-text-primary">
            Welcome back, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-text-muted text-sm">Here's your account overview</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-accent-green">
          <span className="w-2 h-2 bg-accent-green rounded-full animate-pulse" />
          Live
        </div>
      </div>

      {/* Wallet Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {walletLoading ? (
          <>
            <div className="skeleton h-28 rounded-xl" />
            <div className="skeleton h-28 rounded-xl" />
            <div className="skeleton h-28 rounded-xl" />
          </>
        ) : (
          <>
            <div className="stat-card border-l-4 border-l-accent-green glow-blue">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-text-muted text-sm">
                  <Wallet size={14} />
                  Total Balance
                </div>
              </div>
              <div className="font-display text-2xl font-bold text-accent-green">
                {formatCurrency(wallet?.balance ?? 0)}
              </div>
              <div className="text-xs text-text-muted">Your main wallet balance</div>
            </div>

            <div className="stat-card border-l-4 border-l-accent-red">
              <div className="flex items-center gap-2 text-text-muted text-sm">
                <TrendingDown size={14} />
                Exposure
              </div>
              <div className="font-display text-2xl font-bold text-accent-red">
                {formatCurrency(wallet?.exposure ?? 0)}
              </div>
              <div className="text-xs text-text-muted">Locked in active orders</div>
            </div>

            <div className="stat-card border-l-4 border-l-accent-blue">
              <div className="flex items-center gap-2 text-text-muted text-sm">
                <TrendingUp size={14} />
                Available Balance
              </div>
              <div className="font-display text-2xl font-bold text-accent-blue">
                {formatCurrency(available)}
              </div>
              <div className="text-xs text-text-muted">Ready to bet</div>
            </div>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/sports', icon: Trophy, label: 'Sports Betting', color: 'text-accent-blue', bg: 'bg-accent-blue/10' },
          { to: '/exchange', icon: TrendingUp, label: 'Exchange', color: 'text-accent-green', bg: 'bg-accent-green/10' },
          { to: '/casino', icon: Activity, label: 'Casino', color: 'text-accent-purple', bg: 'bg-accent-purple/10' },
          { to: '/wallet', icon: Wallet, label: 'Wallet', color: 'text-accent-gold', bg: 'bg-accent-gold/10' },
        ].map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className={`card p-4 flex flex-col items-center gap-2 hover:bg-bg-hover transition-all cursor-pointer group`}
          >
            <div className={`w-10 h-10 ${action.bg} rounded-lg flex items-center justify-center ${action.color} group-hover:scale-110 transition-transform`}>
              <action.icon size={20} />
            </div>
            <span className="text-xs font-medium text-text-secondary text-center">{action.label}</span>
          </Link>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="card">
        <div className="flex items-center justify-between p-4 border-b border-bg-border">
          <div className="flex items-center gap-2">
            <RefreshCw size={16} className="text-accent-blue" />
            <h3 className="font-semibold text-text-primary">Recent Orders</h3>
          </div>
          <Link to="/orders" className="text-xs text-accent-blue hover:text-blue-400 transition-colors">
            View All →
          </Link>
        </div>

        {ordersLoading ? (
          <div className="p-4">
            <Skeleton className="h-48" />
          </div>
        ) : orders?.orders && orders.orders.length > 0 ? (
          <div className="divide-y divide-bg-border">
            {orders.orders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 hover:bg-bg-hover transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    order.side === 'BACK' ? 'bg-accent-blue/20 text-accent-blue' : 'bg-accent-pink/20 text-accent-pink'
                  }`}>
                    {order.side}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-text-primary">
                      {order.selection?.name ?? 'Unknown'}
                    </div>
                    <div className="text-xs text-text-muted">{formatDate(order.createdAt)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-bold text-text-primary">
                    {formatCurrency(order.stake)} @ {order.price}
                  </div>
                  <Badge variant={
                    order.status === 'MATCHED' ? 'success' :
                    order.status === 'CANCELLED' ? 'error' :
                    order.status === 'PARTIAL' ? 'warning' : 'info'
                  }>
                    {order.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-text-muted">
            <RefreshCw size={24} className="mx-auto mb-2 opacity-30" />
            <p>No recent orders</p>
            <Link to="/sports" className="text-accent-blue text-sm hover:text-blue-400 transition-colors mt-1 inline-block">
              Place your first bet →
            </Link>
          </div>
        )}
      </div>

      {/* Notifications Preview */}
      <div className="card">
        <div className="flex items-center justify-between p-4 border-b border-bg-border">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-accent-gold" />
            <h3 className="font-semibold text-text-primary">Recent Notifications</h3>
          </div>
          <Link to="/notifications" className="text-xs text-accent-blue hover:text-blue-400 transition-colors">
            View All →
          </Link>
        </div>
        <div className="divide-y divide-bg-border max-h-48 overflow-y-auto">
          {notifications?.slice(0, 5)?.map((n) => (
            <div key={n.id} className={`p-3 hover:bg-bg-hover transition-colors ${!n.read ? 'bg-accent-blue/5' : ''}`}>
              <div className="flex items-start gap-2">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  n.type === 'success' ? 'bg-accent-green' :
                  n.type === 'error' ? 'bg-accent-red' :
                  n.type === 'warning' ? 'bg-accent-gold' : 'bg-accent-blue'
                }`} />
                <div>
                  <div className="text-sm font-medium text-text-primary">{n.title}</div>
                  <div className="text-xs text-text-muted">{n.message}</div>
                </div>
              </div>
            </div>
          )) ?? (
            <div className="p-4 text-center text-text-muted text-sm">No notifications</div>
          )}
        </div>
      </div>
    </div>
  )
}
