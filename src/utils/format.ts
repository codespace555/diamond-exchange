import { format, formatDistanceToNow, parseISO } from 'date-fns'

export const formatCurrency = (amount: number | string, currency = '₹'): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return `${currency}0.00`
  return `${currency}${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const formatOdds = (odds: number | string): string => {
  const num = typeof odds === 'string' ? parseFloat(odds) : odds
  if (isNaN(num)) return '0.00'
  return num.toFixed(2)
}

export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd MMM yyyy, HH:mm')
}

export const formatDateShort = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd MMM, HH:mm')
}

export const formatRelative = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

export const formatStake = (stake: number): string => {
  if (stake >= 1000000) return `${(stake / 1000000).toFixed(1)}M`
  if (stake >= 1000) return `${(stake / 1000).toFixed(1)}K`
  return stake.toString()
}

export const calculateExposure = (side: 'BACK' | 'LAY', stake: number, odds: number): number => {
  if (side === 'BACK') return stake
  return stake * (odds - 1)
}

export const calculatePotentialWin = (side: 'BACK' | 'LAY', stake: number, odds: number): number => {
  if (side === 'BACK') return stake * (odds - 1)
  return stake
}

export const getRoleBadgeColor = (role: string): string => {
  switch (role) {
    case 'SUPER_ADMIN': return 'bg-accent-purple/20 text-accent-purple'
    case 'ADMIN': return 'bg-accent-gold/20 text-accent-gold'
    case 'AGENT': return 'bg-accent-blue/20 text-accent-blue'
    default: return 'bg-text-muted/20 text-text-muted'
  }
}

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'LIVE': return 'text-accent-red'
    case 'UPCOMING': return 'text-accent-blue'
    case 'COMPLETED': return 'text-text-muted'
    case 'CANCELLED': return 'text-accent-red'
    case 'OPEN': return 'text-accent-green'
    case 'SUSPENDED': return 'text-accent-gold'
    case 'CLOSED': return 'text-text-muted'
    case 'SETTLED': return 'text-text-muted'
    case 'MATCHED': return 'text-accent-green'
    case 'PARTIAL': return 'text-accent-gold'
    case 'CANCELLED': return 'text-accent-red'
    default: return 'text-text-secondary'
  }
}
