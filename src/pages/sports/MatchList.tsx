import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Search, Filter, Trophy, Clock, ChevronRight } from 'lucide-react'
import { sportsApi } from '../../api/sports'
import { useDebounce } from '../../hooks/useDebounce'
import { formatDateShort } from '../../utils/format'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { LiveBadge, Badge } from '../../components/ui/Badge'
import { Pagination } from '../../components/ui/Pagination'

const SPORTS = ['All', 'Cricket', 'Football', 'Tennis', 'Basketball', 'Baseball']
const STATUSES = ['All', 'LIVE', 'UPCOMING', 'COMPLETED']

interface MatchListProps {
  apiPrefix?: 'sports' | 'exchange'
  title?: string
}

export default function MatchList({ apiPrefix = 'sports', title = 'Sports Betting' }: MatchListProps) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const [sport, setSport] = useState('All')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 400)

  const { data, isLoading } = useQuery({
    queryKey: ['matches', apiPrefix, debouncedSearch, status, sport, page],
    queryFn: () => sportsApi.getMatches({
      search: debouncedSearch || undefined,
      status: status !== 'All' ? status : undefined,
      sport: sport !== 'All' ? sport : undefined,
      page,
      limit: 10,
    }),
    staleTime: 15000,
  })
console.log('Fetched matches:', data)
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Trophy size={20} className="text-accent-gold" />
        <h1 className="font-display text-2xl font-bold text-text-primary">{title}</h1>
        {data?.total !== undefined && (
          <span className="text-xs text-text-muted bg-bg-card px-2 py-0.5 rounded-full border border-bg-border">
            {data.total} matches
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search teams, matches..."
            className="input-field pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <Filter size={12} className="text-text-muted" />
            <span className="text-xs text-text-muted">Status:</span>
          </div>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1) }}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                status === s
                  ? 'bg-accent-blue text-white'
                  : 'bg-bg-hover text-text-secondary hover:text-text-primary'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-text-muted flex items-center gap-1">Sport:</span>
          {SPORTS.map((s) => (
            <button
              key={s}
              onClick={() => { setSport(s); setPage(1) }}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                sport === s
                  ? 'bg-accent-gold text-black'
                  : 'bg-bg-hover text-text-secondary hover:text-text-primary'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Match Grid */}
      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : data?.matches && data.matches.length > 0 ? (
        <div className="grid gap-3">
          {data.matches?.map((match) => (
            <Link
              key={match.id}
              to={`/${apiPrefix}/match/${match.id}`}
              className="card p-4 hover:bg-bg-hover transition-all group border-transparent hover:border-bg-border"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {match.status === 'LIVE' ? (
                      <LiveBadge />
                    ) : (
                      <Badge variant={match.status === 'UPCOMING' ? 'info' : 'default'}>
                        {match.status}
                      </Badge>
                    )}
                    <span className="text-xs text-text-muted">{match.sport}</span>
                    {match.status === 'LIVE' && (
                      <span className="text-xs text-accent-green font-mono animate-pulse">• LIVE</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-text-primary">{match.teamA}</span>
                    <span className="text-text-muted text-sm">vs</span>
                    <span className="font-semibold text-text-primary">{match.teamB}</span>
                  </div>

                  <div className="flex items-center gap-2 mt-2 text-xs text-text-muted">
                    <Clock size={12} />
                    {formatDateShort(match.startTime)}
                    {match.markets && (
                      <span className="text-accent-blue">• {match.markets.length} markets</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <ChevronRight size={16} className="text-text-muted group-hover:text-text-primary group-hover:translate-x-1 transition-all" />
                  <span className="text-xs text-accent-blue">Bet Now</span>
                </div>
              </div>

              {/* Quick odds preview */}
              {match.markets?.[0]?.runners && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-bg-border">
                  {match.markets[0].runners.map((runner) => (
                    <div key={runner.id} className="flex-1 flex gap-1">
                      <div className="flex-1 text-center py-1 bg-accent-blue/10 rounded text-xs">
                        <div className="text-accent-blue font-bold">{runner.backOdds}</div>
                        <div className="text-text-muted text-[10px] truncate">{runner.name}</div>
                      </div>
                      <div className="flex-1 text-center py-1 bg-accent-pink/10 rounded text-xs">
                        <div className="text-accent-pink font-bold">{runner.layOdds}</div>
                        <div className="text-text-muted text-[10px]">Lay</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <Trophy size={48} className="mx-auto mb-4 text-text-muted opacity-30" />
          <p className="text-text-muted">No matches found</p>
          <p className="text-text-muted text-sm mt-1">Try adjusting your filters</p>
        </div>
      )}

      {data && data.totalPages > 1 && (
        <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
      )}
    </div>
  )
}
