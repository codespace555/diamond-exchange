import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Users, DollarSign, Activity, TrendingUp, Shield } from 'lucide-react'
import { adminApi } from '../../api/admin'
import { formatCurrency } from '../../utils/format'
import { Skeleton } from '../../components/ui/Skeleton'

const CHART_COLORS = ['#1e88e5', '#e91e8c', '#00c853', '#f0b429', '#7c4dff']

// Mock chart data (would come from API in production)
const volumeData = Array.from({ length: 7 }, (_, i) => ({
  day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
  volume: Math.floor(Math.random() * 500000 + 100000),
  bets: Math.floor(Math.random() * 500 + 100),
}))

const walletData = [
  { name: 'Available', value: 65 },
  { name: 'Exposure', value: 20 },
  { name: 'Settled', value: 15 },
]

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.getStats,
    refetchInterval: 30000,
  })
console.log('Admin stats:', stats)
  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: Users, color: 'text-accent-blue', fmt: (v: number) => v.toLocaleString() },
    { label: 'Total Balance', value: stats?.totalBalance ?? 0, icon: DollarSign, color: 'text-accent-green', fmt: formatCurrency },
    { label: 'Active Matches', value: stats?.activeMatches ?? 0, icon: Activity, color: 'text-accent-gold', fmt: (v: number) => v.toLocaleString() },
    { label: 'Daily Volume', value: stats?.dailyVolume ?? 0, icon: TrendingUp, color: 'text-accent-purple', fmt: formatCurrency },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield size={20} className="text-accent-gold" />
        <h1 className="font-display text-2xl font-bold text-text-primary">Admin Dashboard</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="stat-card">
            <div className={`flex items-center gap-2 ${card.color} text-sm`}>
              <card.icon size={16} />
              {card.label}
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className={`font-display text-2xl font-bold ${card.color}`}>
                {card.fmt(card.value)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Additional Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="text-text-muted text-sm">Active Users</div>
            <div className="font-display text-xl font-bold text-text-primary">{stats.activeUsers}</div>
          </div>
          <div className="stat-card">
            <div className="text-text-muted text-sm">Total Exposure</div>
            <div className="font-display text-xl font-bold text-accent-red">{formatCurrency(stats.totalExposure)}</div>
          </div>
          <div className="stat-card">
            <div className="text-text-muted text-sm">Total Volume</div>
            <div className="font-display text-xl font-bold text-accent-blue">{formatCurrency(stats.totalVolume)}</div>
          </div>
          <div className="stat-card">
            <div className="text-text-muted text-sm">Pending Orders</div>
            <div className="font-display text-xl font-bold text-accent-gold">{stats.pendingOrders}</div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Volume Chart */}
        <div className="card p-4 lg:col-span-2">
          <h3 className="font-semibold text-text-primary mb-4">Weekly Volume</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={volumeData}>
              <defs>
                <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1e88e5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#1e88e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a42" />
              <XAxis dataKey="day" tick={{ fill: '#a0a0c0', fontSize: 12 }} />
              <YAxis tick={{ fill: '#a0a0c0', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#1a1a28', border: '1px solid #2a2a42', borderRadius: '8px' }}
                labelStyle={{ color: '#ffffff' }}
              />
              <Area type="monotone" dataKey="volume" stroke="#1e88e5" fill="url(#volumeGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Wallet Distribution */}
        <div className="card p-4">
          <h3 className="font-semibold text-text-primary mb-4">Wallet Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={walletData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {walletData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1a1a28', border: '1px solid #2a2a42', borderRadius: '8px' }}
              />
              <Legend
                formatter={(value) => <span style={{ color: '#a0a0c0', fontSize: '12px' }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bets Bar Chart */}
        <div className="card p-4 lg:col-span-2">
          <h3 className="font-semibold text-text-primary mb-4">Daily Bets</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a42" />
              <XAxis dataKey="day" tick={{ fill: '#a0a0c0', fontSize: 12 }} />
              <YAxis tick={{ fill: '#a0a0c0', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#1a1a28', border: '1px solid #2a2a42', borderRadius: '8px' }}
              />
              <Bar dataKey="bets" fill="#7c4dff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Stats Card */}
        <div className="card p-4">
          <h3 className="font-semibold text-text-primary mb-4">System Health</h3>
          <div className="space-y-3">
            {[
              { label: 'API Latency', value: '< 50ms', color: 'text-accent-green' },
              { label: 'Socket Connections', value: '247', color: 'text-accent-blue' },
              { label: 'Order Matching', value: 'Active', color: 'text-accent-green' },
              { label: 'Settlement Queue', value: '3 pending', color: 'text-accent-gold' },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center py-2 border-b border-bg-border">
                <span className="text-sm text-text-muted">{item.label}</span>
                <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
