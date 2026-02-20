import { clsx } from 'clsx'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info' | 'purple'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full',
      {
        'bg-text-muted/20 text-text-muted': variant === 'default',
        'bg-accent-green/20 text-accent-green': variant === 'success',
        'bg-accent-red/20 text-accent-red': variant === 'error',
        'bg-accent-gold/20 text-accent-gold': variant === 'warning',
        'bg-accent-blue/20 text-accent-blue': variant === 'info',
        'bg-accent-purple/20 text-accent-purple': variant === 'purple',
      },
      className
    )}>
      {children}
    </span>
  )
}

export function LiveBadge() {
  return (
    <span className="badge-live">
      <span className="w-1.5 h-1.5 bg-accent-red rounded-full animate-pulse" />
      LIVE
    </span>
  )
}
