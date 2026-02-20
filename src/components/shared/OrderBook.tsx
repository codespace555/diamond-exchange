import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { sportsApi } from '../../api/sports'
import { useSocket } from '../../hooks/useSocket'
import { useAuthStore } from '../../store/authStore'
import { useWalletStore } from '../../store/walletStore'
import { formatCurrency, formatOdds, calculateExposure, calculatePotentialWin } from '../../utils/format'
import { Skeleton } from '../ui/Skeleton'
import toast from 'react-hot-toast'
import type { Runner, OddsUpdateEvent, OrderSide } from '../../types'

interface OrderBookProps {
  marketId: string
  runners: Runner[]
  onPlaceOrder?: (data: { runnerId: string; side: OrderSide; price: number; stake: number }) => void
  apiPrefix?: 'sports' | 'exchange'
}

interface OrderFormState {
  runnerId: string
  side: OrderSide
  price: number
  stake: number
}

export function OrderBook({ marketId, runners: initialRunners, onPlaceOrder, apiPrefix = 'sports' }: OrderBookProps) {
  const { user } = useAuthStore()
  const { wallet } = useWalletStore()
  const [liveOdds, setLiveOdds] = useState<Record<string, { back: number; lay: number }>>({})
  const [orderForm, setOrderForm] = useState<OrderFormState | null>(null)
  const [flashMap, setFlashMap] = useState<Record<string, 'back' | 'lay' | null>>({})

  const { data: orderBook, isLoading } = useQuery({
    queryKey: ['orderbook', marketId, apiPrefix],
    queryFn: () => sportsApi.getOrderBook(marketId),
    refetchInterval: 10000,
  })
console.log('Fetched order book:', orderBook, 'isLoading:', isLoading)
  // Handle live odds updates
  useSocket<OddsUpdateEvent>('odds_update', (data) => {
    if (data.marketId !== marketId) return
    
    setLiveOdds((prev) => ({
      ...prev,
      [data.runnerId]: { back: data.backOdds, lay: data.layOdds },
    }))

    // Flash animation
    setFlashMap((prev) => ({ ...prev, [data.runnerId]: 'back' }))
    setTimeout(() => setFlashMap((prev) => ({ ...prev, [data.runnerId]: null })), 500)
  }, [marketId])

  const getOdds = useCallback((runner: Runner) => {
    const live = liveOdds[runner.id]
    return {
      back: live?.back ?? runner.backOdds,
      lay: live?.lay ?? runner.layOdds,
    }
  }, [liveOdds])

  const handleSelectOdds = (runnerId: string, side: OrderSide, price: number) => {
    if (!user) { toast.error('Please login to place orders'); return }
    
    setOrderForm({
      runnerId,
      side,
      price,
      stake: 100,
    })
  }

  const handlePlaceOrder = () => {
    if (!orderForm) return

    const { side, stake, price } = orderForm
    const exposure = calculateExposure(side, stake, price)
    const available = (wallet?.balance ?? 0) - (wallet?.exposure ?? 0)

    if (exposure > available) {
      toast.error(`Insufficient balance. Required: ${formatCurrency(exposure)}, Available: ${formatCurrency(available)}`)
      return
    }

    onPlaceOrder?.(orderForm)
    setOrderForm(null)
  }

  const runners = initialRunners

  return (
    <div className="space-y-4">
      {/* Back/Lay Header */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-2 text-xs font-bold text-text-muted uppercase px-2">
        <span>Selection</span>
        <span className="text-accent-blue text-center w-[140px]">BACK</span>
        <span className="text-accent-pink text-center w-[140px]">LAY</span>
      </div>

      {/* Runners */}
      {runners.map((runner) => {
        const odds = getOdds(runner)
        const isFlashing = flashMap[runner.id]

        return (
          <div key={runner.id} className={`card overflow-hidden transition-all ${isFlashing ? 'odds-flash-back' : ''}`}>
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 p-3">
              {/* Runner Name */}
              <div>
                <div className="font-semibold text-text-primary">{runner.name}</div>
                {orderBook && (
                  <div className="text-xs text-text-muted mt-0.5">
                    Matched: {formatCurrency(
                      (orderBook.backs.reduce((s, b) => s + b.availableStake, 0) + 
                       orderBook.lays.reduce((s, l) => s + l.availableStake, 0)) / runners.length
                    )}
                  </div>
                )}
              </div>

              {/* Back Odds */}
              <div className="flex gap-1 w-[140px]">
                {[
                  { price: odds.back * 1.02, opacity: 0.4 },
                  { price: odds.back * 1.01, opacity: 0.6 },
                  { price: odds.back, opacity: 1, primary: true },
                ].map((o, i) => (
                  <button
                    key={i}
                    onClick={() => o.primary && handleSelectOdds(runner.id, 'BACK', odds.back)}
                    className={`flex-1 py-2 rounded text-center transition-all ${
                      o.primary
                        ? 'bg-accent-blue hover:bg-blue-500 text-white font-bold cursor-pointer'
                        : 'bg-accent-blue/10 text-accent-blue cursor-default'
                    }`}
                    style={{ opacity: o.opacity }}
                  >
                    <div className="text-xs font-bold">{formatOdds(o.price)}</div>
                    {o.primary && (
                      <div className="text-[10px] opacity-70">
                        {isLoading ? '...' : formatStake(orderBook?.backs[0]?.availableStake ?? 0)}
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Lay Odds */}
              <div className="flex gap-1 w-[140px]">
                {[
                  { price: odds.lay, opacity: 1, primary: true },
                  { price: odds.lay * 0.99, opacity: 0.6 },
                  { price: odds.lay * 0.98, opacity: 0.4 },
                ].map((o, i) => (
                  <button
                    key={i}
                    onClick={() => o.primary && handleSelectOdds(runner.id, 'LAY', odds.lay)}
                    className={`flex-1 py-2 rounded text-center transition-all ${
                      o.primary
                        ? 'bg-accent-pink hover:bg-pink-600 text-white font-bold cursor-pointer'
                        : 'bg-accent-pink/10 text-accent-pink cursor-default'
                    }`}
                    style={{ opacity: o.opacity }}
                  >
                    <div className="text-xs font-bold">{formatOdds(o.price)}</div>
                    {o.primary && (
                      <div className="text-[10px] opacity-70">
                        {isLoading ? '...' : formatStake(orderBook?.lays[0]?.availableStake ?? 0)}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Bet Slip - shows when this runner is selected */}
            {orderForm?.runnerId === runner.id && (
              <BetSlip
                form={orderForm}
                runner={runner}
                wallet={wallet}
                onChange={(updates) => setOrderForm((prev) => prev ? { ...prev, ...updates } : null)}
                onPlace={handlePlaceOrder}
                onCancel={() => setOrderForm(null)}
              />
            )}
          </div>
        )
      })}

      {/* Order Depth Panel */}
      {orderBook && (
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="card p-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className="text-accent-blue" />
              <span className="text-xs font-bold text-accent-blue uppercase">Back Orders</span>
            </div>
            <div className="space-y-1">
              {orderBook.backs.slice(0, 5).map((entry, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-accent-blue font-mono">{formatOdds(entry.price)}</span>
                  <span className="text-text-secondary font-mono">{formatCurrency(entry.availableStake)}</span>
                </div>
              ))}
              {orderBook.backs.length === 0 && (
                <div className="text-xs text-text-muted text-center py-2">No orders</div>
              )}
            </div>
          </div>
          <div className="card p-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={14} className="text-accent-pink" />
              <span className="text-xs font-bold text-accent-pink uppercase">Lay Orders</span>
            </div>
            <div className="space-y-1">
              {orderBook.lays.slice(0, 5).map((entry, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-accent-pink font-mono">{formatOdds(entry.price)}</span>
                  <span className="text-text-secondary font-mono">{formatCurrency(entry.availableStake)}</span>
                </div>
              ))}
              {orderBook.lays.length === 0 && (
                <div className="text-xs text-text-muted text-center py-2">No orders</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatStake(stake: number): string {
  if (!stake) return '0'
  if (stake >= 1000000) return `${(stake / 1000000).toFixed(1)}M`
  if (stake >= 1000) return `${(stake / 1000).toFixed(1)}K`
  return stake.toFixed(0)
}

interface BetSlipProps {
  form: { runnerId: string; side: OrderSide; price: number; stake: number }
  runner: Runner
  wallet: { balance: number; exposure: number } | null
  onChange: (updates: { price?: number; stake?: number }) => void
  onPlace: () => void
  onCancel: () => void
}

function BetSlip({ form, runner, wallet, onChange, onPlace, onCancel }: BetSlipProps) {
  const available = (wallet?.balance ?? 0) - (wallet?.exposure ?? 0)
  const exposure = calculateExposure(form.side, form.stake, form.price)
  const potentialWin = calculatePotentialWin(form.side, form.stake, form.price)
  const hasEnough = exposure <= available

  const quickStakes = [100, 500, 1000, 5000]

  return (
    <div className={`border-t ${form.side === 'BACK' ? 'border-accent-blue bg-accent-blue/5' : 'border-accent-pink bg-accent-pink/5'} p-3`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
            form.side === 'BACK' ? 'bg-accent-blue text-white' : 'bg-accent-pink text-white'
          }`}>
            {form.side}
          </span>
          <span className="text-sm font-semibold text-text-primary">{runner.name}</span>
        </div>
        <button onClick={onCancel} className="text-text-muted hover:text-text-primary text-xs">✕</button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs text-text-muted mb-1 block">Odds</label>
          <input
            type="number"
            value={form.price}
            onChange={(e) => onChange({ price: parseFloat(e.target.value) })}
            className="input-field text-sm font-mono"
            step="0.01"
            min="1.01"
          />
        </div>
        <div>
          <label className="text-xs text-text-muted mb-1 block">Stake (₹)</label>
          <input
            type="number"
            value={form.stake}
            onChange={(e) => onChange({ stake: parseFloat(e.target.value) })}
            className="input-field text-sm font-mono"
            step="1"
            min="1"
          />
        </div>
      </div>

      {/* Quick Stake Buttons */}
      <div className="flex gap-2 mb-3">
        {quickStakes.map((s) => (
          <button
            key={s}
            onClick={() => onChange({ stake: s })}
            className="text-xs px-2 py-1 bg-bg-hover hover:bg-bg-border rounded transition-colors text-text-secondary"
          >
            {s >= 1000 ? `${s / 1000}K` : s}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="text-xs space-y-1 mb-3 p-2 bg-bg-secondary rounded">
        <div className="flex justify-between">
          <span className="text-text-muted">Liability / Exposure</span>
          <span className={`font-mono font-bold ${hasEnough ? 'text-text-primary' : 'text-accent-red'}`}>
            {formatCurrency(exposure)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Potential Win</span>
          <span className="font-mono font-bold text-accent-green">{formatCurrency(potentialWin)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Available Balance</span>
          <span className="font-mono text-text-secondary">{formatCurrency(available)}</span>
        </div>
      </div>

      {!hasEnough && (
        <div className="text-xs text-accent-red mb-2 text-center">
          Insufficient balance. Need {formatCurrency(exposure - available)} more.
        </div>
      )}

      <button
        onClick={onPlace}
        disabled={!hasEnough || form.stake <= 0}
        className={`w-full font-bold py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
          form.side === 'BACK'
            ? 'bg-accent-blue hover:bg-blue-500 text-white'
            : 'bg-accent-pink hover:bg-pink-600 text-white'
        }`}
      >
        Place {form.side} Order @ {formatOdds(form.price)}
      </button>
    </div>
  )
}
