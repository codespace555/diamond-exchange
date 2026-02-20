import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, Trophy, RefreshCw, Gamepad2, Wallet, 
  Users, Settings, LogOut, Bell, Menu, X, ChevronDown,
  Shield, TrendingUp, Activity
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useWalletStore } from '../store/walletStore'
import { useNotificationStore } from '../store/notificationStore'
import { formatCurrency } from '../utils/format'
import { authApi } from '../api/auth'
import { disconnectSocket } from '../socket/socket'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['SUPER_ADMIN', 'ADMIN', 'AGENT', 'USER'] },
  { to: '/sports', icon: Trophy, label: 'Sports', roles: ['SUPER_ADMIN', 'ADMIN', 'AGENT', 'USER'] },
  { to: '/exchange', icon: TrendingUp, label: 'Exchange', roles: ['SUPER_ADMIN', 'ADMIN', 'AGENT', 'USER'] },
  { to: '/casino', icon: Gamepad2, label: 'Casino', roles: ['SUPER_ADMIN', 'ADMIN', 'AGENT', 'USER'] },
  { to: '/wallet', icon: Wallet, label: 'Wallet', roles: ['SUPER_ADMIN', 'ADMIN', 'AGENT', 'USER'] },
  { to: '/orders', icon: RefreshCw, label: 'My Orders', roles: ['SUPER_ADMIN', 'ADMIN', 'AGENT', 'USER'] },
  { to: '/admin', icon: Shield, label: 'Admin Panel', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { to: '/admin/users', icon: Users, label: 'Users', roles: ['SUPER_ADMIN', 'ADMIN', 'AGENT'] },
  { to: '/admin/matches', icon: Activity, label: 'Matches', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { to: '/admin/odds', icon: Settings, label: 'Odds Monitor', roles: ['SUPER_ADMIN', 'ADMIN'] },
]

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore()
  const { wallet } = useWalletStore()
  const { unreadCount } = useNotificationStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch { /* ignore */ }
    disconnectSocket()
    logout()
    navigate('/login')
    toast.success('Logged out successfully')
  }

  const filteredNav = navItems.filter(item => 
    user && item.roles.includes(user.role)
  )

  const available = (wallet?.balance ?? 0) - (wallet?.exposure ?? 0)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-40 w-60 bg-bg-secondary border-r border-bg-border flex flex-col transition-transform duration-300',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}>
        {/* Logo */}
        <div className="p-4 border-b border-bg-border">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-accent-gold to-orange-500 rounded-lg flex items-center justify-center font-display font-bold text-black text-sm">
              D
            </div>
            <span className="font-display text-xl font-bold gradient-text">DIAMOND</span>
          </Link>
        </div>

        {/* Wallet Summary */}
        {wallet && (
          <div className="p-3 mx-3 mt-3 bg-bg-card rounded-lg border border-bg-border">
            <div className="text-xs text-text-muted mb-1">Available Balance</div>
            <div className="text-lg font-display font-bold text-accent-green">{formatCurrency(available)}</div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-text-muted">Exposure: <span className="text-accent-red">{formatCurrency(wallet.exposure)}</span></span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto mt-2">
          {filteredNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => clsx('nav-link', isActive && 'active')}
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-3 border-t border-bg-border">
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-bg-hover transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-accent-purple to-accent-blue rounded-full flex items-center justify-center text-xs font-bold">
                {user?.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold text-text-primary truncate">{user?.name}</div>
                <div className="text-xs text-text-muted">{user?.role}</div>
              </div>
              <ChevronDown size={14} className={clsx('text-text-muted transition-transform', profileOpen && 'rotate-180')} />
            </button>

            {profileOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 card p-2 space-y-1 shadow-xl">
                <Link to="/profile" onClick={() => setProfileOpen(false)} className="nav-link">
                  <Settings size={14} />
                  Profile Settings
                </Link>
                <button onClick={handleLogout} className="nav-link w-full text-accent-red hover:text-accent-red">
                  <LogOut size={14} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:ml-60 overflow-hidden">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-bg-secondary border-b border-bg-border px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden text-text-muted hover:text-text-primary"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="hidden md:flex items-center gap-2 text-xs text-text-muted">
            <span className="w-2 h-2 bg-accent-green rounded-full animate-pulse" />
            Live Exchange
          </div>

          <div className="flex items-center gap-3">
            {/* Wallet Quick View */}
            {wallet && (
              <div className="hidden sm:flex items-center gap-4 text-sm">
                <div className="text-center">
                  <div className="text-text-muted text-xs">Balance</div>
                  <div className="text-accent-green font-mono font-bold">{formatCurrency(wallet.balance)}</div>
                </div>
                <div className="text-center">
                  <div className="text-text-muted text-xs">Exposure</div>
                  <div className="text-accent-red font-mono font-bold">{formatCurrency(wallet.exposure)}</div>
                </div>
              </div>
            )}

            {/* Notifications */}
            <Link to="/notifications" className="relative text-text-muted hover:text-text-primary transition-colors">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-red rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4">
          {children}
        </main>
      </div>
    </div>
  )
}
