import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { ProtectedRoute, PublicOnlyRoute } from './routes/ProtectedRoute'
import MainLayout from './layouts/MainLayout'

const Login = lazy(() => import('./pages/auth/Login'))
const Register = lazy(() => import('./pages/auth/Register'))
const Profile = lazy(() => import('./pages/auth/Profile'))
const Dashboard = lazy(() => import('./pages/user/Dashboard'))
const MatchList = lazy(() => import('./pages/sports/MatchList'))
const MatchDetail = lazy(() => import('./pages/sports/MatchDetail'))
const MyOrders = lazy(() => import('./pages/sports/MyOrders'))
const CasinoGames = lazy(() => import('./pages/casino/CasinoGames'))
const CasinoTransactions = lazy(() => import('./pages/casino/CasinoTransactions'))
const WalletOverview = lazy(() => import('./pages/wallet/WalletOverview'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const UserManagement = lazy(() => import('./pages/admin/UserManagement'))
const MatchManagement = lazy(() => import('./pages/admin/MatchManagement'))
const OddsMonitor = lazy(() => import('./pages/admin/OddsMonitor'))
const NotificationsPage = lazy(() => import('./pages/admin/Notifications'))

function PageLoader() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-bg-hover rounded" />
      <div className="grid grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="h-28 bg-bg-hover rounded-xl" />)}
      </div>
      <div className="h-64 bg-bg-hover rounded-xl" />
    </div>
  )
}

function PL({ children }: { children: React.ReactNode }) {
  return <MainLayout><Suspense fallback={<PageLoader />}>{children}</Suspense></MainLayout>
}

export default function App() {
  const { isLoading } = useAuth()
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 bg-gradient-to-br from-accent-gold to-orange-500 rounded-2xl mx-auto mb-4 flex items-center justify-center font-display font-bold text-black text-2xl animate-pulse">D</div>
        <div className="text-text-muted text-sm font-display tracking-widest uppercase">Loading Diamond...</div>
      </div>
    </div>
  )
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<PL><Dashboard /></PL>} />
            <Route path="/profile" element={<PL><Profile /></PL>} />
            <Route path="/sports" element={<PL><MatchList apiPrefix="sports" title="Sports Betting" /></PL>} />
            <Route path="/sports/match/:matchId" element={<PL><MatchDetail apiPrefix="sports" /></PL>} />
            <Route path="/exchange" element={<PL><MatchList apiPrefix="exchange" title="Exchange" /></PL>} />
            <Route path="/exchange/match/:matchId" element={<PL><MatchDetail apiPrefix="exchange" /></PL>} />
            <Route path="/orders" element={<PL><MyOrders /></PL>} />
            <Route path="/casino" element={<PL><CasinoGames /></PL>} />
            <Route path="/casino/transactions" element={<PL><CasinoTransactions /></PL>} />
            <Route path="/wallet" element={<PL><WalletOverview /></PL>} />
            <Route path="/notifications" element={<PL><NotificationsPage /></PL>} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN','ADMIN','AGENT']} />}>
            <Route path="/admin/users" element={<PL><UserManagement /></PL>} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN','ADMIN']} />}>
            <Route path="/admin" element={<PL><AdminDashboard /></PL>} />
            <Route path="/admin/matches" element={<PL><MatchManagement /></PL>} />
            <Route path="/admin/odds" element={<PL><OddsMonitor /></PL>} />
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
