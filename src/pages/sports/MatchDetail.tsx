import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { useState, useEffect } from 'react'
import { sportsApi } from '../../api/sports'
import { useSocket } from '../../hooks/useSocket'
import { subscribeToMarket, unsubscribeFromMarket } from '../../socket/socket'
import { OrderBook } from '../../components/shared/OrderBook'
import { LiveBadge, Badge } from '../../components/ui/Badge'
import { Skeleton } from '../../components/ui/Skeleton'
import { formatDate } from '../../utils/format'
import type { MatchUpdateEvent, OrderSide } from '../../types'
import toast from 'react-hot-toast'

interface MatchDetailProps {
  apiPrefix?: 'sports' | 'exchange'
}

export default function MatchDetail({ apiPrefix = 'sports' }: MatchDetailProps) {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [expandedMarket, setExpandedMarket] = useState<string | null>(null)

  // Fetch match
  const { data: match, isLoading } = useQuery({
    queryKey: ['match', matchId, apiPrefix],
    queryFn: () => sportsApi.getMatch(matchId!),
    enabled: !!matchId,
    staleTime: 15000,
  })

  // Subscribe only for LIVE matches
  useEffect(() => {
    if (!match || match.status !== 'LIVE') return

    const marketIds = match.markets?.map((m) => m.id) ?? []
    marketIds.forEach(subscribeToMarket)

    setExpandedMarket(marketIds[0] ?? null)

    return () => {
      marketIds.forEach(unsubscribeFromMarket)
    }
  }, [match?.markets, match?.status])

  // Socket update
  useSocket<MatchUpdateEvent>('match_update', (data) => {
    if (data.matchId === matchId) {
      queryClient.invalidateQueries({ queryKey: ['match', matchId] })
    }
  })

  // Place order
  const placeMutation = useMutation({
    mutationFn: (data: { runnerId: string; side: OrderSide; price: number; stake: number }) =>
      sportsApi.placeOrder({
        marketId: expandedMarket!,
        selectionId: data.runnerId,
        side: data.side,
        price: data.price,
        stake: data.stake,
      }),
    onSuccess: (order) => {
      toast.success(`Order placed! ${order.status}`)
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error?.response?.data?.message || 'Failed to place order')
    },
  })

  // Loading
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  // Not found
  if (!match) {
    return (
      <div className="card p-8 text-center">
        <p className="text-text-muted">Match not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors text-sm"
      >
        <ArrowLeft size={16} />
        Back to matches
      </button>

      {/* Match Header */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          {match.status === 'LIVE' ? (
            <LiveBadge />
          ) : (
            <Badge
              variant={
                match.status === 'UPCOMING'
                  ? 'info'
                  : match.status === 'COMPLETED'
                  ? 'success'
                  : 'default'
              }
            >
              {match.status}
            </Badge>
          )}
          <span className="text-sm text-text-muted">{match.sport}</span>
        </div>

        <div className="flex items-center justify-center gap-8 py-4">
          <div className="text-center">
            <div className="font-display text-2xl font-bold text-text-primary">
              {match.teamA}
            </div>
            <div className="text-text-muted text-sm mt-1">Home</div>
          </div>

          <div className="text-center">
            <div className="font-display text-4xl font-bold text-text-muted">VS</div>
            <div className="flex items-center gap-1 text-xs text-text-muted mt-1">
              <Clock size={10} />
              {formatDate(match.startTime)}
            </div>
          </div>

          <div className="text-center">
            <div className="font-display text-2xl font-bold text-text-primary">
              {match.teamB}
            </div>
            <div className="text-text-muted text-sm mt-1">Away</div>
          </div>
        </div>
      </div>

      {/* Markets */}
      {match.markets && match.markets.length > 0 ? (
        <div className="space-y-3">
          <h2 className="font-display text-lg font-bold text-text-primary">Markets</h2>

          {match.markets.map((market) => {
            const winner =
              market.runners.find((r) => r.id === market.winnerId) ||
              market.runners.find((r) => r.isWinner)

            return (
              <div key={market.id} className="card overflow-hidden">
                {/* Market Header */}
                <button
                  onClick={() =>
                    setExpandedMarket(expandedMarket === market.id ? null : market.id)
                  }
                  className="w-full flex items-center justify-between p-4 hover:bg-bg-hover transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-text-primary">
                      {market.name}
                    </span>

                    <Badge
                      variant={
                        market.status === 'OPEN'
                          ? 'success'
                          : market.status === 'SUSPENDED'
                          ? 'warning'
                          : market.status === 'SETTLED'
                          ? 'info'
                          : 'default'
                      }
                    >
                      {market.status}
                    </Badge>
                  </div>

                  {expandedMarket === market.id ? (
                    <ChevronUp size={16} className="text-text-muted" />
                  ) : (
                    <ChevronDown size={16} className="text-text-muted" />
                  )}
                </button>

                {/* OrderBook only when OPEN */}
                {expandedMarket === market.id && market.status === 'OPEN' && (
                  <div className="p-4 border-t border-bg-border">
                    <OrderBook
                      marketId={market.id}
                      runners={market.runners.map((r) => ({
                        ...r,
                        backOdds: Number(r.backOdds),
                        layOdds: Number(r.layOdds),
                      }))}
                      onPlaceOrder={(data) => placeMutation.mutate(data)}
                      apiPrefix={apiPrefix}
                    />
                  </div>
                )}

                {/* Settled Result */}
                {(market.status === 'SETTLED' || market.status === 'CLOSED') && (
                  <div className="px-4 pb-4 border-t border-bg-border pt-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-text-muted">Winner:</span>
                      <span className="font-bold text-accent-green">
                        {winner?.name ?? 'Pending'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card p-8 text-center text-text-muted">
          No markets available for this match
        </div>
      )}
    </div>
  )
}
