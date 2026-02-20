// ==================== ENUMS ====================

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'AGENT' | 'USER'
export type MatchStatus = 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED'
export type MarketStatus = 'OPEN' | 'SUSPENDED' | 'CLOSED' | 'SETTLED'
export type OrderSide = 'BACK' | 'LAY'
export type OrderStatus = 'OPEN' | 'PARTIAL' | 'MATCHED' | 'CANCELLED'
export type BetType = 'BACK' | 'LAY'
export type BetStatus = 'PENDING' | 'WON' | 'LOST' | 'REFUNDED'
export type LedgerType = 
  | 'CREDIT' | 'DEBIT' | 'TRANSFER_IN' | 'TRANSFER_OUT'
  | 'BET_PLACE' | 'BET_SETTLE' | 'BET_REFUND'
  | 'ORDER_PLACE' | 'ORDER_CANCEL' | 'ORDER_SETTLE'
  | 'EXPOSURE_LOCK' | 'EXPOSURE_RELEASE'
export type TransactionType = 'BET' | 'WIN' | 'LOSS'

// ==================== USER ====================

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  parentId?: string
  wallet?: Wallet
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  token: string
  user: User
}

// ==================== WALLET ====================

export interface Wallet {
  id: string
  userId: string
  balance: number
  exposure: number
  availableBalance?: number
  createdAt: string
  updatedAt: string
}

export interface LedgerEntry {
  id: string
  userId: string
  amount: number
  type: LedgerType
  balance: number
  notes?: string
  createdAt: string
}

// ==================== SPORTS / MATCHES ====================

export interface Match {
  id: string
  teamA: string
  teamB: string
  sport: string
  status: MatchStatus
  startTime: string
  endTime?: string
  externalId?: string
  markets?: Market[]
  createdAt: string
}

export interface Market {
  id: string
  matchId: string
  name: string
  status: MarketStatus
  runners: Runner[]
  winnerId?: string
  createdAt: string
}

export interface Runner {
  id: string
  marketId: string
  name: string
  backOdds: number
  layOdds: number
  isWinner?: boolean
}

export interface OrderBook {
  marketId: string
  runnerId: string
  backs: OrderBookEntry[]
  lays: OrderBookEntry[]
}

export interface OrderBookEntry {
  price: number
  availableStake: number
  orders: number
}

// ==================== ORDERS ====================

export interface Order {
  id: string
  userId: string
  marketId: string
  selectionId: string
  selection?: Runner
  market?: Market
  side: OrderSide
  price: number
  stake: number
  matchedStake: number
  remainingStake: number
  status: OrderStatus
  lockedExposure: number
  createdAt: string
  updatedAt: string
}

export interface PlaceOrderRequest {
  marketId: string
  selectionId: string
  side: OrderSide
  price: number
  stake: number
}

// ==================== BETS ====================

export interface Bet {
  id: string
  userId: string
  matchId: string
  runnerId: string
  type: BetType
  odds: number
  stake: number
  liability: number
  status: BetStatus
  payout?: number
  createdAt: string
  settledAt?: string
}

// ==================== CASINO ====================

export interface Game {
  id: string
  name: string
  slug: string
  category: string
  thumbnail?: string
  launchUrl: string
  createdAt: string
}

export interface CasinoTransaction {
  id: string
  userId: string
  gameId: string
  game?: Game
  type: TransactionType
  amount: number
  balanceBefore: number
  balanceAfter: number
  createdAt: string
}

// ==================== PAGINATION ====================

export interface PaginatedResponse<T> {
  matches?: T[] // For backward compatibility with older APIs
  data: T[]
  users: T[]
  orders: T[]
  transactions: T[]
  total: number
  page: number
  limit: number
  totalPages: number
  entries: T[]

}

// ==================== SOCKET EVENTS ====================

export interface OddsUpdateEvent {
  marketId: string
  runnerId: string
  backOdds: number
  layOdds: number
}

export interface BalanceUpdateEvent {
  balance: number
  exposure: number
}

export interface BetSettledEvent {
  betId: string
  status: BetStatus
  payout?: number
}

export interface MatchUpdateEvent {
  matchId: string
  status: MatchStatus
}

export interface SystemAlertEvent {
  type: 'info' | 'warning' | 'error'
  message: string
}

// ==================== EXTERNAL ODDS ====================

export interface ExternalSport {
  key: string
  group: string
  title: string
  description: string
  active: boolean
  has_outrights: boolean
}

export interface ExternalOddsOutcome {
  name: string
  price: number
  point?: number
}

export interface ExternalOddsMarket {
  key: string
  outcomes: ExternalOddsOutcome[]
}

export interface ExternalBookmaker {
  key: string
  title: string
  last_update: string
  markets: ExternalOddsMarket[]
}

export interface ExternalMatch {
  id: string
  sport_key: string
  commence_time: string
  home_team: string
  away_team: string
  bookmakers: ExternalBookmaker[]
}

export interface ExternalScore {
  id: string
  sport_key: string
  sport_title: string
  commence_time: string
  completed: boolean
  home_team: string
  away_team: string
  scores?: { name: string; score: string }[]
  last_update?: string
}

// ==================== NOTIFICATIONS ====================

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  createdAt: string
}

// ==================== ADMIN ====================

export interface AdminStats {
  totalUsers: number
  activeUsers: number
  totalBalance: number
  totalExposure: number
  activeMatches: number
  totalVolume: number
  dailyVolume: number
  pendingOrders: number
}

export interface Trade {
  id: string
  backOrderId: string
  layOrderId: string
  selectionId: string
  price: number
  stake: number
  settled: boolean
  settledAt?: string
  createdAt: string
}
