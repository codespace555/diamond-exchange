import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Globe, RefreshCw, Download, CheckCircle2, XCircle,
  AlertCircle, ChevronDown, ChevronUp, Loader2, TrendingUp,
  Clock, BookOpen, BarChart3
} from 'lucide-react'
import { oddsApi } from '../../api/odds'
import { adminApi } from '../../api/admin'
import { sportsApi } from '../../api/sports'
import { formatDate } from '../../utils/format'
import { Skeleton } from '../../components/ui/Skeleton'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import toast from 'react-hot-toast'
import type { ExternalMatch, ExternalBookmaker } from '../../types'

// ─── Constants ────────────────────────────────────────────────────────────

const SPORTS = [
  { key: 'americanfootball_nfl',      label: 'NFL',     group: 'American Football' },
  { key: 'americanfootball_ncaaf',    label: 'NCAAF',   group: 'American Football' },
  { key: 'basketball_nba',            label: 'NBA',     group: 'Basketball' },
  { key: 'baseball_mlb',              label: 'MLB',     group: 'Baseball' },
  { key: 'icehockey_nhl',             label: 'NHL',     group: 'Ice Hockey' },
  { key: 'soccer_usa_mls',            label: 'MLS',     group: 'Soccer' },
  { key: 'soccer_epl',                label: 'EPL',     group: 'Soccer' },
  { key: 'cricket_test_match',        label: 'Cricket', group: 'Cricket' },
  { key: 'tennis_atp_french_open',    label: 'ATP',     group: 'Tennis' },
  { key: 'mma_mixed_martial_arts',    label: 'MMA',     group: 'MMA' },
]

const SPORT_LABEL_MAP: Record<string, string> = {
  americanfootball_nfl:   'American Football',
  americanfootball_ncaaf: 'American Football',
  basketball_nba:         'Basketball',
  baseball_mlb:           'Baseball',
  icehockey_nhl:          'Ice Hockey',
  soccer_usa_mls:         'Soccer',
  soccer_epl:             'Soccer',
  cricket_test_match:     'Cricket',
  tennis_atp_french_open: 'Tennis',
  mma_mixed_martial_arts: 'MMA',
}

// ─── Types ─────────────────────────────────────────────────────────────────

interface ImportPayload {
  externalId:  string
  home:        string
  away:        string
  sport:       string
  sportKey:    string
  commenceTime: string
  markets: ImportMarket[]
  bookmakers:  ExternalBookmaker[]
}

interface ImportMarket {
  key:     string           // 'h2h' | 'spreads' | 'totals'
  label:   string
  runners: ImportRunner[]
}

interface ImportRunner {
  name:     string
  backOdds: number
  layOdds:  number
  point?:   number
}

type ImportStatus = 'idle' | 'importing' | 'success' | 'duplicate' | 'error'

interface MatchImportState {
  [externalId: string]: {
    status:  ImportStatus
    matchId?: string
    error?:  string
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Average bookmaker price for a given outcome name */
function avgPrice(bookmakers: ExternalBookmaker[], marketKey: string, outcomeName: string): number {
  const prices: number[] = []
  for (const bm of bookmakers) {
    const mkt = bm.markets.find(m => m.key === marketKey)
    const oc  = mkt?.outcomes.find(o => o.name === outcomeName)
    if (oc?.price && oc.price > 0) prices.push(oc.price)
  }
  if (!prices.length) return 0
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length
  return parseFloat(avg.toFixed(2))
}

/** Build a lay price from a back price (add a small spread) */
function toLayOdds(back: number): number {
  if (!back || back <= 1) return 0
  return parseFloat((back + Math.max(0.02, back * 0.01)).toFixed(2))
}

/** Derive spread runner label */
function spreadLabel(team: string, point: number): string {
  return `${team} ${point > 0 ? '+' : ''}${point}`
}

/** Extract all markets we can import from a match */
function buildImportPayload(match: ExternalMatch, sportKey: string): ImportPayload {
  const markets: ImportMarket[] = []
  const firstBm = match.bookmakers[0]

  // ── H2H (Match Winner) ──────────────────────────────
  const h2hExists = firstBm?.markets.some(m => m.key === 'h2h')
  if (h2hExists) {
    const homeBack = avgPrice(match.bookmakers, 'h2h', match.home_team)
    const awayBack = avgPrice(match.bookmakers, 'h2h', match.away_team)

    const runners: ImportRunner[] = []
    if (homeBack > 0) runners.push({ name: match.home_team, backOdds: homeBack, layOdds: toLayOdds(homeBack) })
    if (awayBack > 0) runners.push({ name: match.away_team, backOdds: awayBack, layOdds: toLayOdds(awayBack) })

    // Draw (soccer)
    const drawBack = avgPrice(match.bookmakers, 'h2h', 'Draw')
    if (drawBack > 0) runners.push({ name: 'Draw', backOdds: drawBack, layOdds: toLayOdds(drawBack) })

    if (runners.length >= 2) markets.push({ key: 'h2h', label: 'Match Winner', runners })
  }

  // ── Spreads ─────────────────────────────────────────
  const spreadsExists = firstBm?.markets.some(m => m.key === 'spreads')
  if (spreadsExists) {
    const homeSpreadOc = firstBm?.markets.find(m => m.key === 'spreads')
      ?.outcomes.find(o => o.name === match.home_team)
    const awaySpreadOc = firstBm?.markets.find(m => m.key === 'spreads')
      ?.outcomes.find(o => o.name === match.away_team)

    if (homeSpreadOc?.point !== undefined && awaySpreadOc?.point !== undefined) {
      const homeBack = avgPrice(match.bookmakers, 'spreads', match.home_team)
      const awayBack = avgPrice(match.bookmakers, 'spreads', match.away_team)

      markets.push({
        key: 'spreads',
        label: `Spread (${homeSpreadOc.point > 0 ? '+' : ''}${homeSpreadOc.point})`,
        runners: [
          { name: spreadLabel(match.home_team, homeSpreadOc.point), backOdds: homeBack, layOdds: toLayOdds(homeBack), point: homeSpreadOc.point },
          { name: spreadLabel(match.away_team, awaySpreadOc.point), backOdds: awayBack, layOdds: toLayOdds(awayBack), point: awaySpreadOc.point },
        ]
      })
    }
  }

  // ── Totals ──────────────────────────────────────────
  const totalsExists = firstBm?.markets.some(m => m.key === 'totals')
  if (totalsExists) {
    const overOc  = firstBm?.markets.find(m => m.key === 'totals')?.outcomes.find(o => o.name === 'Over')
    const underOc = firstBm?.markets.find(m => m.key === 'totals')?.outcomes.find(o => o.name === 'Under')

    if (overOc && underOc && overOc.point !== undefined) {
      const overBack  = avgPrice(match.bookmakers, 'totals', 'Over')
      const underBack = avgPrice(match.bookmakers, 'totals', 'Under')

      markets.push({
        key: 'totals',
        label: `Total O/U ${overOc.point}`,
        runners: [
          { name: `Over ${overOc.point}`,  backOdds: overBack,  layOdds: toLayOdds(overBack) },
          { name: `Under ${overOc.point}`, backOdds: underBack, layOdds: toLayOdds(underBack) },
        ]
      })
    }
  }

  return {
    externalId:   match.id,
    home:         match.home_team,
    away:         match.away_team,
    sport:        SPORT_LABEL_MAP[sportKey] ?? sportKey,
    sportKey,
    commenceTime: match.commence_time,
    markets,
    bookmakers:   match.bookmakers,
  }
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function OddsMonitor() {
  const [selectedSport, setSelectedSport]   = useState('americanfootball_nfl')
  const [importStates, setImportStates]     = useState<MatchImportState>({})
  const [previewMatch, setPreviewMatch]     = useState<ImportPayload | null>(null)
  const [selectedMarkets, setSelectedMarkets] = useState<Set<string>>(new Set(['h2h']))
  const [expandedMatch, setExpandedMatch]   = useState<string | null>(null)
  const [apiQuota, setApiQuota]             = useState<{ remaining: string; used: string } | null>(null)

  const queryClient = useQueryClient()

  // ── Data fetching ──────────────────────────────────
  const { data: odds, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['external-odds', selectedSport],
    queryFn: async () => {
      const data = await oddsApi.getOdds({
        sport:      selectedSport,
        regions:    'us',
        markets:    'h2h,spreads,totals',
        oddsFormat: 'decimal',
      })
      return data
    },
    staleTime: 60_000,
    retry: false,
  })

  const { data: scores } = useQuery({
    queryKey: ['external-scores', selectedSport],
    queryFn: () => oddsApi.getScores(selectedSport, 1),
    staleTime: 30_000,
    retry: false,
  })

  // Fetch already-imported matches to detect duplicates
  const { data: existingMatches } = useQuery({
    queryKey: ['matches', 'all-external-ids'],
    queryFn: () => sportsApi.getMatches({ limit: 500 }),
    staleTime: 30_000,
  })

  const importedExternalIds = new Set(
    (existingMatches?.data ?? []).map(m => m.externalId).filter(Boolean)
  )

  // ── Import mutation ────────────────────────────────
  const importMutation = useMutation({
    mutationFn: async (payload: ImportPayload) => {
      // 1. Create the match — handle duplicate externalId gracefully
      let matchId: string
      try {
        const match = await adminApi.createMatch({
          teamA:      payload.home,
          teamB:      payload.away,
          sport:      payload.sport,
          startTime:  payload.commenceTime,
          externalId: payload.externalId,
        })
        matchId = match.id
      } catch (err: any) {
        // 409 = match already exists; backend returns the existing matchId
        if (err?.response?.status === 409 && err?.response?.data?.matchId) {
          matchId = err.response.data.matchId
          toast(`ℹ️ Match already exists — adding markets to it`, { icon: '♻️' })
        } else {
          throw err  // real error — bubble up
        }
      }

      // 2. Create each selected market sequentially (not parallel) to avoid
      //    race conditions and get clearer per-market error messages
      const marketsToCreate = payload.markets.filter(m => selectedMarkets.has(m.key))
      let marketsCreated = 0

      for (const market of marketsToCreate) {
        try {
          await adminApi.createMarket({
            matchId,
            name: market.label,
            runners: market.runners.map(r => ({
              name:     r.name,
              backOdds: Number(r.backOdds.toFixed(2)),
              layOdds:  Number(r.layOdds.toFixed(2)),
            })),
          })
          marketsCreated++
        } catch (err: any) {
          // Log per-market errors but don't abort the entire import
          const msg = err?.response?.data?.error ?? 'Unknown error'
          console.warn(`[OddsMonitor] Market "${market.label}" failed:`, msg)
          toast.error(`Market "${market.label}" skipped: ${msg}`, { duration: 4000 })
        }
      }

      if (marketsCreated === 0 && marketsToCreate.length > 0) {
        throw new Error('All markets failed to create — check backend logs')
      }

      return { matchId, marketsCreated }
    },

    onMutate: (payload) => {
      setImportStates(prev => ({
        ...prev,
        [payload.externalId]: { status: 'importing' }
      }))
    },

    onSuccess: (result, payload) => {
      setImportStates(prev => ({
        ...prev,
        [payload.externalId]: { status: 'success', matchId: result.matchId }
      }))
      toast.success(
        `✅ Imported: ${payload.home} vs ${payload.away}\n${result.marketsCreated} market(s) created`,
        { duration: 4000 }
      )
      queryClient.invalidateQueries({ queryKey: ['matches'] })
      queryClient.invalidateQueries({ queryKey: ['matches', 'all-external-ids'] })
      setPreviewMatch(null)
    },

    onError: (err: unknown, payload) => {
      const error = err as { response?: { data?: { error?: string } } }
      const msg   = error?.response?.data?.error ?? 'Import failed'
      const isDup = msg.toLowerCase().includes('already') || msg.includes('unique')

      setImportStates(prev => ({
        ...prev,
        [payload.externalId]: {
          status: isDup ? 'duplicate' : 'error',
          error:  msg
        }
      }))

      if (isDup) {
        toast.error('Match already exists in the platform')
      } else {
        toast.error(`Import failed: ${msg}`)
      }
    },
  })

  // ── Handlers ───────────────────────────────────────
  const handleOpenPreview = useCallback((match: ExternalMatch) => {
    const payload = buildImportPayload(match, selectedSport)
    // Default: select all available markets
    setSelectedMarkets(new Set(payload.markets.map(m => m.key)))
    setPreviewMatch(payload)
  }, [selectedSport])

  const handleConfirmImport = () => {
    if (!previewMatch) return
    if (selectedMarkets.size === 0) {
      toast.error('Select at least one market to import')
      return
    }
    importMutation.mutate(previewMatch)
  }

  const toggleMarket = (key: string) => {
    setSelectedMarkets(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const getMatchState = (externalId: string) => {
    if (importedExternalIds.has(externalId)) return 'duplicate'
    return importStates[externalId]?.status ?? 'idle'
  }

  const liveScores = scores?.filter(s => !s.completed) ?? []

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Header ─────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <Globe size={20} className="text-accent-blue" />
            <h1 className="font-display text-2xl font-bold text-text-primary">Live Odds Monitor</h1>
          </div>
          <p className="text-xs text-text-muted mt-0.5 ml-8">
            Powered by The Odds API · Import matches directly to the platform
          </p>
        </div>

        <div className="flex items-center gap-2">
          {apiQuota && (
            <div className="text-xs text-text-muted bg-bg-card border border-bg-border rounded-lg px-3 py-1.5">
              <span className="text-accent-green font-mono">{apiQuota.remaining}</span> requests remaining
            </div>
          )}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn-secondary text-xs"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            Refresh Odds
          </button>
        </div>
      </div>

      {/* ── Sport Tabs ─────────────────────────────── */}
      <div className="card p-3">
        <div className="flex flex-wrap gap-2">
          {SPORTS.map(sport => (
            <button
              key={sport.key}
              onClick={() => setSelectedSport(sport.key)}
              className={`text-xs px-4 py-2 rounded-lg transition-all font-medium ${
                selectedSport === sport.key
                  ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/20'
                  : 'bg-bg-secondary border border-bg-border text-text-secondary hover:text-text-primary hover:border-bg-hover'
              }`}
            >
              {sport.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Live Scores ────────────────────────────── */}
      {liveScores.length > 0 && (
        <div className="card p-4">
          <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-accent-red rounded-full animate-pulse" />
            Live Scores
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {liveScores.slice(0, 6).map(score => (
              <div key={score.id} className="bg-bg-secondary rounded-lg p-3 border border-accent-red/20">
                <div className="text-xs text-accent-red font-bold mb-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-accent-red rounded-full animate-pulse" />
                  LIVE
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-text-primary">{score.home_team}</div>
                    <div className="text-xs text-text-muted mt-0.5">vs {score.away_team}</div>
                  </div>
                  {score.scores && (
                    <div className="text-right space-y-0.5">
                      {score.scores.map(s => (
                        <div key={s.name} className="text-sm font-mono font-bold text-accent-gold">
                          {s.score}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {score.last_update && (
                  <div className="text-[10px] text-text-muted mt-2">
                    Updated {new Date(score.last_update).toLocaleTimeString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Matches & Odds ─────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-bg-border">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-accent-blue" />
            <h3 className="font-semibold text-text-primary">Available Matches</h3>
            {odds && (
              <span className="text-xs text-text-muted bg-bg-secondary px-2 py-0.5 rounded-full border border-bg-border">
                {odds.length} matches
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-accent-green rounded-full" /> Imported
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-accent-gold rounded-full" /> Duplicate
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : odds && odds.length > 0 ? (
          <div className="divide-y divide-bg-border">
            {odds.map(match => {
              const payload    = buildImportPayload(match, selectedSport)
              const state      = getMatchState(match.id)
              const isExpanded = expandedMatch === match.id
              const isPast     = new Date(match.commence_time) < new Date()

              // Best consensus odds for display
              const homeBack = payload.markets.find(m => m.key === 'h2h')?.runners[0]?.backOdds ?? 0
              const awayBack = payload.markets.find(m => m.key === 'h2h')?.runners[1]?.backOdds ?? 0

              return (
                <div key={match.id} className="hover:bg-bg-hover/50 transition-colors">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">

                      {/* Match Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {isPast ? (
                            <span className="badge-live">
                              <span className="w-1.5 h-1.5 bg-accent-red rounded-full animate-pulse" />
                              LIVE/PAST
                            </span>
                          ) : (
                            <Badge variant="info">UPCOMING</Badge>
                          )}
                          <span className="text-xs text-text-muted flex items-center gap-1">
                            <Clock size={10} />
                            {formatDate(match.commence_time)}
                          </span>
                          <span className="text-xs text-text-muted flex items-center gap-1">
                            <BookOpen size={10} />
                            {match.bookmakers.length} books
                          </span>
                          {payload.markets.length > 1 && (
                            <span className="text-xs text-accent-purple bg-accent-purple/10 px-2 py-0.5 rounded-full">
                              {payload.markets.length} markets available
                            </span>
                          )}
                        </div>

                        <div className="font-semibold text-text-primary">
                          {match.home_team}
                          <span className="text-text-muted font-normal mx-2 text-sm">vs</span>
                          {match.away_team}
                        </div>
                      </div>

                      {/* Consensus Odds */}
                      {homeBack > 0 && (
                        <div className="hidden sm:flex items-center gap-4 shrink-0">
                          <OddsCell team={match.home_team} back={homeBack} lay={toLayOdds(homeBack)} />
                          <OddsCell team={match.away_team} back={awayBack} lay={toLayOdds(awayBack)} />
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Expand bookmakers */}
                        <button
                          onClick={() => setExpandedMatch(isExpanded ? null : match.id)}
                          className="text-text-muted hover:text-text-primary transition-colors p-1"
                          title="Compare bookmakers"
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>

                        {/* Import button */}
                        <ImportButton
                          state={state}
                          importStates={importStates}
                          externalId={match.id}
                          onClick={() => handleOpenPreview(match)}
                        />
                      </div>
                    </div>

                    {/* Bookmaker price comparison (expanded) */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-bg-border">
                        <div className="text-xs text-text-muted mb-2 font-semibold uppercase tracking-wide">
                          Bookmaker Comparison
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {match.bookmakers.slice(0, 8).map(bm => {
                            const h2h      = bm.markets.find(m => m.key === 'h2h')
                            const homeOdds = h2h?.outcomes.find(o => o.name === match.home_team)?.price
                            const awayOdds = h2h?.outcomes.find(o => o.name === match.away_team)?.price
                            if (!homeOdds) return null
                            return (
                              <div key={bm.key} className="bg-bg-secondary rounded-lg px-3 py-2 text-xs border border-bg-border">
                                <div className="text-text-muted font-medium mb-1">{bm.title}</div>
                                <div className="flex gap-3 font-mono">
                                  <span className="text-accent-blue">{homeOdds?.toFixed(2)}</span>
                                  <span className="text-text-muted">/</span>
                                  <span className="text-accent-pink">{awayOdds?.toFixed(2)}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Available markets preview */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {payload.markets.map(m => (
                            <span key={m.key} className="text-[10px] bg-accent-blue/10 text-accent-blue px-2 py-1 rounded-full font-medium">
                              {m.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-16 text-center text-text-muted">
            <Globe size={52} className="mx-auto mb-4 opacity-20" />
            <p className="font-medium">No odds data available</p>
            <p className="text-xs mt-2 text-text-muted/70">
              Set <code className="bg-bg-secondary px-1 rounded">VITE_ODDS_API_KEY</code> in your .env file
            </p>
          </div>
        )}
      </div>

      {/* ── Import Preview Modal ────────────────────── */}
      <Modal
        isOpen={!!previewMatch}
        onClose={() => setPreviewMatch(null)}
        title="Import Match to Platform"
        size="xl"
      >
        {previewMatch && (
          <ImportPreview
            payload={previewMatch}
            selectedMarkets={selectedMarkets}
            onToggleMarket={toggleMarket}
            onConfirm={handleConfirmImport}
            onCancel={() => setPreviewMatch(null)}
            isImporting={importMutation.isPending}
          />
        )}
      </Modal>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────

function OddsCell({ team, back, lay }: { team: string; back: number; lay: number }) {
  const shortName = team.split(' ').slice(-1)[0]
  return (
    <div className="text-center min-w-[90px]">
      <div className="text-[10px] text-text-muted mb-1 truncate">{shortName}</div>
      <div className="flex gap-1">
        <div className="bg-accent-blue/15 text-accent-blue text-xs font-bold px-2 py-1 rounded font-mono">
          {back.toFixed(2)}
        </div>
        <div className="bg-accent-pink/15 text-accent-pink text-xs font-bold px-2 py-1 rounded font-mono">
          {lay.toFixed(2)}
        </div>
      </div>
    </div>
  )
}

function ImportButton({
  state, importStates, externalId, onClick
}: {
  state: ImportStatus | 'duplicate'
  importStates: MatchImportState
  externalId: string
  onClick: () => void
}) {
  if (state === 'importing') {
    return (
      <button disabled className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-bg-hover rounded-lg text-text-muted cursor-not-allowed">
        <Loader2 size={13} className="animate-spin" />
        Importing...
      </button>
    )
  }
  if (state === 'success') {
    return (
      <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-accent-green/10 rounded-lg text-accent-green font-medium">
        <CheckCircle2 size={13} />
        Imported
      </div>
    )
  }
  if (state === 'duplicate') {
    return (
      <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-accent-gold/10 rounded-lg text-accent-gold font-medium" title="Already in platform">
        <AlertCircle size={13} />
        Exists
      </div>
    )
  }
  if (state === 'error') {
    return (
      <button
        onClick={onClick}
        title={importStates[externalId]?.error}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-accent-red/10 rounded-lg text-accent-red font-medium hover:bg-accent-red/20 transition-colors"
      >
        <XCircle size={13} />
        Retry
      </button>
    )
  }
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-accent-blue hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors shadow-sm"
    >
      <Download size={13} />
      Import
    </button>
  )
}

function ImportPreview({
  payload, selectedMarkets, onToggleMarket, onConfirm, onCancel, isImporting
}: {
  payload: ImportPayload
  selectedMarkets: Set<string>
  onToggleMarket: (key: string) => void
  onConfirm: () => void
  onCancel: () => void
  isImporting: boolean
}) {
  return (
    <div className="space-y-5">

      {/* Match overview */}
      <div className="bg-bg-secondary rounded-xl p-4 border border-bg-border">
        <div className="text-xs text-text-muted uppercase tracking-wide mb-2">Match</div>
        <div className="font-display text-xl font-bold text-text-primary">
          {payload.home}
          <span className="text-text-muted font-normal mx-3 text-base">vs</span>
          {payload.away}
        </div>
        <div className="flex flex-wrap gap-3 mt-2 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <TrendingUp size={11} />
            {payload.sport}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {formatDate(payload.commenceTime)}
          </span>
          <span className="flex items-center gap-1">
            <BookOpen size={11} />
            {payload.bookmakers.length} bookmakers
          </span>
        </div>
      </div>

      {/* Market selection */}
      <div>
        <div className="text-sm font-semibold text-text-primary mb-3">
          Select Markets to Import
          <span className="text-xs text-text-muted font-normal ml-2">
            ({selectedMarkets.size} of {payload.markets.length} selected)
          </span>
        </div>

        {payload.markets.length === 0 ? (
          <div className="text-sm text-text-muted text-center py-4 bg-bg-secondary rounded-lg">
            No markets available for this match
          </div>
        ) : (
          <div className="space-y-3">
            {payload.markets.map(market => {
              const isSelected = selectedMarkets.has(market.key)
              return (
                <button
                  key={market.key}
                  onClick={() => onToggleMarket(market.key)}
                  className={`w-full text-left rounded-xl border p-4 transition-all ${
                    isSelected
                      ? 'border-accent-blue bg-accent-blue/5'
                      : 'border-bg-border bg-bg-secondary hover:border-bg-hover'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-accent-blue border-accent-blue' : 'border-bg-border'
                      }`}>
                        {isSelected && <CheckCircle2 size={10} className="text-white" />}
                      </div>
                      <span className="font-semibold text-text-primary text-sm">{market.label}</span>
                    </div>
                    <span className="text-xs text-text-muted">{market.runners.length} runners</span>
                  </div>

                  {/* Runners preview */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {market.runners.map(runner => (
                      <div key={runner.name} className="flex items-center justify-between bg-bg-primary/50 rounded-lg px-3 py-2">
                        <span className="text-xs text-text-secondary truncate mr-2">{runner.name}</span>
                        <div className="flex gap-1.5 shrink-0">
                          <span className="text-xs font-mono font-bold text-accent-blue bg-accent-blue/10 px-2 py-0.5 rounded">
                            B {runner.backOdds.toFixed(2)}
                          </span>
                          <span className="text-xs font-mono font-bold text-accent-pink bg-accent-pink/10 px-2 py-0.5 rounded">
                            L {runner.layOdds.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-bg-secondary rounded-lg p-3 border border-bg-border text-xs text-text-muted">
        <div className="font-semibold text-text-primary mb-1">What will be created:</div>
        <ul className="space-y-0.5 list-disc list-inside">
          <li>1 match record linked to external ID <code className="font-mono text-accent-blue">{payload.externalId.slice(0, 12)}…</code></li>
          {payload.markets
            .filter(m => selectedMarkets.has(m.key))
            .map(m => (
              <li key={m.key}>Market: <span className="text-text-secondary">{m.label}</span> with {m.runners.length} runners (status: OPEN)</li>
            ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onConfirm}
          disabled={isImporting || selectedMarkets.size === 0}
          className="btn-primary flex-1 justify-center py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isImporting ? (
            <><Loader2 size={16} className="animate-spin" /> Importing…</>
          ) : (
            <><Download size={16} /> Import {selectedMarkets.size} Market{selectedMarkets.size !== 1 ? 's' : ''}</>
          )}
        </button>
        <button onClick={onCancel} disabled={isImporting} className="btn-secondary">
          Cancel
        </button>
      </div>
    </div>
  )
}
