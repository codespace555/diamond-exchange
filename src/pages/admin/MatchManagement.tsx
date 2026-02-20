import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Activity, Plus, Settings, X, Check } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { adminApi } from '../../api/admin'
import { sportsApi } from '../../api/sports'
import { formatDate, getStatusColor } from '../../utils/format'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { SkeletonCard } from '../../components/ui/Skeleton'
import toast from 'react-hot-toast'
import type { MatchStatus, MarketStatus } from '../../types'

const createMatchSchema = z.object({
  teamA: z.string().min(1),
  teamB: z.string().min(1),
  sport: z.string().min(1),
  startTime: z.string().min(1),
  externalId: z.string().optional(),
})

const createMarketSchema = z.object({
  name: z.string().min(1),
  runner1: z.string().min(1),
  runner2: z.string().min(1),
  backOdds1: z.number().min(1.01),
  layOdds1: z.number().min(1.01),
  backOdds2: z.number().min(1.01),
  layOdds2: z.number().min(1.01),
})

type CreateMatchForm = z.infer<typeof createMatchSchema>
type CreateMarketForm = z.infer<typeof createMarketSchema>

const MATCH_STATUSES: MatchStatus[] = ['UPCOMING', 'LIVE', 'COMPLETED', 'CANCELLED']
const MARKET_STATUSES: MarketStatus[] = ['OPEN', 'SUSPENDED', 'CLOSED', 'SETTLED']
const SPORTS = ['Cricket', 'Football', 'Tennis', 'Basketball', 'Baseball', 'Hockey', 'Rugby', 'Golf']

export default function MatchManagement() {
  const [createMatchModal, setCreateMatchModal] = useState(false)
  const [createMarketModal, setCreateMarketModal] = useState<string | null>(null)
  const [forceCloseModal, setForceCloseModal] = useState<{ marketId: string; runners: { id: string; name: string }[] } | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['matches', 'admin'],
    queryFn: () => sportsApi.getMatches({ limit: 50 }),
    refetchInterval: 15000,
  })
console.log('Admin matches:', data)
  const { register: regM, handleSubmit: hsM, reset: rM, formState: { errors: eM, isSubmitting: sM } } = useForm<CreateMatchForm>({
    resolver: zodResolver(createMatchSchema),
  })

  const { register: regK, handleSubmit: hsK, reset: rK, formState: { isSubmitting: sK } } = useForm<CreateMarketForm>({
    resolver: zodResolver(createMarketSchema),
    defaultValues: { backOdds1: 1.9, layOdds1: 2.0, backOdds2: 1.9, layOdds2: 2.0 },
  })

  const createMatchMutation = useMutation({
    mutationFn: adminApi.createMatch,
    onSuccess: () => {
      toast.success('Match created')
      queryClient.invalidateQueries({ queryKey: ['matches'] })
      setCreateMatchModal(false)
      rM()
    },
    onError: () => toast.error('Failed to create match'),
  })

  const updateMatchStatusMutation = useMutation({
    mutationFn: ({ matchId, status }: { matchId: string; status: string }) =>
      adminApi.updateMatchStatus(matchId, status),
    onSuccess: () => {
      toast.success('Match status updated')
      queryClient.invalidateQueries({ queryKey: ['matches'] })
    },
    onError: () => toast.error('Failed to update status'),
  })

  const updateMarketStatusMutation = useMutation({
    mutationFn: ({ marketId, status }: { marketId: string; status: string }) =>
      adminApi.updateMarketStatus(marketId, status),
    onSuccess: () => {
      toast.success('Market status updated')
      queryClient.invalidateQueries({ queryKey: ['matches'] })
    },
    onError: () => toast.error('Failed to update market'),
  })

  const createMarketMutation = useMutation({
    mutationFn: (data: CreateMarketForm & { matchId: string }) =>
      adminApi.createMarket({
        matchId: data.matchId,
        name: data.name,
        runners: [
          { name: data.runner1, backOdds: data.backOdds1, layOdds: data.layOdds1 },
          { name: data.runner2, backOdds: data.backOdds2, layOdds: data.layOdds2 },
        ],
      }),
    onSuccess: () => {
      toast.success('Market created')
      queryClient.invalidateQueries({ queryKey: ['matches'] })
      setCreateMarketModal(null)
      rK()
    },
    onError: () => toast.error('Failed to create market'),
  })

  const forceCloseMutation = useMutation({
    mutationFn: ({ marketId, winnerId }: { marketId: string; winnerId: string }) =>
      adminApi.forceCloseMarket(marketId, winnerId),
    onSuccess: () => {
      toast.success('Market force-closed and settled')
      queryClient.invalidateQueries({ queryKey: ['matches'] })
      setForceCloseModal(null)
    },
    onError: () => toast.error('Failed to close market'),
  })
console.log('Match management component rendered', data)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity size={20} className="text-accent-gold" />
          <h1 className="font-display text-2xl font-bold text-text-primary">Match Management</h1>
        </div>
        <button onClick={() => setCreateMatchModal(true)} className="btn-primary">
          <Plus size={16} />
          Create Match
        </button>
      </div>

      {/* Matches List */}
      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : data?.matches && data.matches.length > 0 ? (
        <div className="space-y-3">
          {data.matches.map((match) => (
            <div key={match.id} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold text-text-primary">
                    {match.teamA} vs {match.teamB}
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">
                    {match.sport} • {formatDate(match.startTime)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={match.status}
                    onChange={(e) => updateMatchStatusMutation.mutate({ matchId: match.id, status: e.target.value })}
                    className="input-field text-xs py-1 w-auto"
                  >
                    {MATCH_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setCreateMarketModal(match.id)}
                    className="btn-secondary text-xs py-1"
                  >
                    <Plus size={12} />
                    Market
                  </button>
                </div>
              </div>

              {/* Markets */}
              {match.markets && match.markets.length > 0 && (
                <div className="space-y-2 mt-3 pt-3 border-t border-bg-border">
                  {match.markets.map((market) => (
                    <div key={market.id} className="flex items-center justify-between bg-bg-secondary rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-text-primary">{market.name}</span>
                        <Badge variant={
                          market.status === 'OPEN' ? 'success' :
                          market.status === 'SUSPENDED' ? 'warning' :
                          market.status === 'SETTLED' ? 'default' : 'error'
                        }>
                          {market.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={market.status}
                          onChange={(e) => updateMarketStatusMutation.mutate({ marketId: market.id, status: e.target.value })}
                          className="input-field text-xs py-1 w-auto"
                        >
                          {MARKET_STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        {market.status === 'CLOSED' && (
                          <button
                            onClick={() => setForceCloseModal({
                              marketId: market.id,
                              runners: market.runners,
                            })}
                            className="btn-danger text-xs py-1"
                          >
                            <Check size={12} />
                            Settle
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center text-text-muted">
          <Activity size={48} className="mx-auto mb-4 opacity-30" />
          <p>No matches. Create your first match!</p>
        </div>
      )}

      {/* Create Match Modal */}
      <Modal isOpen={createMatchModal} onClose={() => setCreateMatchModal(false)} title="Create Match">
        <form onSubmit={hsM((d) => createMatchMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-text-secondary mb-1 block">Team A</label>
              <input {...regM('teamA')} className="input-field" placeholder="Home team" />
              {eM.teamA && <p className="text-accent-red text-xs mt-1">{eM.teamA.message}</p>}
            </div>
            <div>
              <label className="text-sm text-text-secondary mb-1 block">Team B</label>
              <input {...regM('teamB')} className="input-field" placeholder="Away team" />
            </div>
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Sport</label>
            <select {...regM('sport')} className="input-field">
              {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Start Time</label>
            <input {...regM('startTime')} type="datetime-local" className="input-field" />
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1 block">External ID (optional)</label>
            <input {...regM('externalId')} className="input-field" placeholder="From odds API" />
          </div>
          <button type="submit" disabled={sM} className="btn-primary w-full justify-center">
            {sM ? 'Creating...' : 'Create Match'}
          </button>
        </form>
      </Modal>

      {/* Create Market Modal */}
      <Modal isOpen={!!createMarketModal} onClose={() => setCreateMarketModal(null)} title="Create Market" size="lg">
        <form onSubmit={hsK((d) => createMarketMutation.mutate({ ...d, matchId: createMarketModal! }))} className="space-y-4">
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Market Name</label>
            <input {...regK('name')} className="input-field" placeholder="Match Winner" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-text-primary">Runner 1</h4>
              <input {...regK('runner1')} className="input-field" placeholder="Team A" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Back Odds</label>
                  <input {...regK('backOdds1', { valueAsNumber: true })} type="number" step="0.01" className="input-field" />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Lay Odds</label>
                  <input {...regK('layOdds1', { valueAsNumber: true })} type="number" step="0.01" className="input-field" />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-text-primary">Runner 2</h4>
              <input {...regK('runner2')} className="input-field" placeholder="Team B" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Back Odds</label>
                  <input {...regK('backOdds2', { valueAsNumber: true })} type="number" step="0.01" className="input-field" />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Lay Odds</label>
                  <input {...regK('layOdds2', { valueAsNumber: true })} type="number" step="0.01" className="input-field" />
                </div>
              </div>
            </div>
          </div>
          <button type="submit" disabled={sK} className="btn-primary w-full justify-center">
            {sK ? 'Creating...' : 'Create Market'}
          </button>
        </form>
      </Modal>

      {/* Force Close / Settle Modal */}
      <Modal isOpen={!!forceCloseModal} onClose={() => setForceCloseModal(null)} title="Settle Market — Select Winner">
        <div className="space-y-3">
          <p className="text-text-muted text-sm">Choose the winning runner to settle this market and distribute winnings:</p>
          {forceCloseModal?.runners.map((runner) => (
            <button
              key={runner.id}
              onClick={() => forceCloseMutation.mutate({ marketId: forceCloseModal.marketId, winnerId: runner.id })}
              disabled={forceCloseMutation.isPending}
              className="w-full p-3 rounded-lg border border-bg-border hover:border-accent-green hover:bg-accent-green/5 transition-all flex items-center justify-between group"
            >
              <span className="font-semibold text-text-primary">{runner.name}</span>
              <Check size={16} className="text-accent-green opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}
