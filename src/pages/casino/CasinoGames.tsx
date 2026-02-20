import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Gamepad2, Search, ExternalLink } from 'lucide-react'
import { casinoApi } from '../../api/casino'
import { useDebounce } from '../../hooks/useDebounce'
import { useWalletStore } from '../../store/walletStore'
import { formatCurrency } from '../../utils/format'
import { Skeleton } from '../../components/ui/Skeleton'
import { Modal } from '../../components/ui/Modal'
import toast from 'react-hot-toast'

export default function CasinoGames() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [selectedGame, setSelectedGame] = useState<string | null>(null)
  const [betModal, setBetModal] = useState<string | null>(null)
  const [betAmount, setBetAmount] = useState(100)
  const { wallet, updateBalance } = useWalletStore()
  const queryClient = useQueryClient()
  const debouncedSearch = useDebounce(search)

  const { data: categories } = useQuery({
    queryKey: ['casino', 'categories'],
    queryFn: casinoApi.getCategories,
  })

  const { data: games, isLoading } = useQuery({
    queryKey: ['casino', 'games', debouncedSearch, category],
    queryFn: () => casinoApi.getGames({
      category: category !== 'All' ? category : undefined,
      search: debouncedSearch || undefined,
      limit: 50,
    }),
  })

  const launchMutation = useMutation({
    mutationFn: casinoApi.launchGame,
    onSuccess: (data) => {
      setSelectedGame(data.url)
    },
    onError: () => toast.error('Failed to launch game'),
  })

  const betMutation = useMutation({
    mutationFn: casinoApi.placeBet,
    onSuccess: (data) => {
      updateBalance(data.balance, wallet?.exposure ?? 0)
      toast.success(`Bet placed! Balance: ${formatCurrency(data.balance)}`)
      setBetModal(null)
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error?.response?.data?.message || 'Failed to place bet')
    },
  })

  const allCategories = ['All', ...(categories ?? [])]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Gamepad2 size={20} className="text-accent-purple" />
        <h1 className="font-display text-2xl font-bold text-text-primary">Casino</h1>
        {wallet && (
          <span className="ml-auto text-sm text-accent-green font-mono">
            Balance: {formatCurrency(wallet.balance)}
          </span>
        )}
      </div>

      {/* Search & Categories */}
      <div className="card p-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search games..."
            className="input-field pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                category === cat ? 'bg-accent-purple text-white' : 'bg-bg-hover text-text-secondary hover:text-text-primary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Games Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="skeleton rounded-xl aspect-[3/4]" />
          ))}
        </div>
      ) : games?.data && games.data.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {games.data.map((game) => (
            <div key={game.id} className="card overflow-hidden group cursor-pointer hover:border-accent-purple/50 transition-all">
              {/* Game Thumbnail */}
              <div className="aspect-[3/4] bg-gradient-to-br from-accent-purple/20 to-accent-blue/20 relative overflow-hidden">
                {game.thumbnail ? (
                  <img src={game.thumbnail} alt={game.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Gamepad2 size={32} className="text-accent-purple opacity-50" />
                  </div>
                )}
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                  <button
                    onClick={() => launchMutation.mutate(game.id)}
                    className="w-full bg-accent-purple hover:bg-purple-600 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 transition-colors"
                  >
                    <ExternalLink size={12} />
                    Play Now
                  </button>
                  <button
                    onClick={() => setBetModal(game.id)}
                    className="w-full bg-bg-card hover:bg-bg-hover text-text-primary text-xs font-bold py-2 rounded-lg transition-colors"
                  >
                    Place Bet
                  </button>
                </div>
              </div>
              <div className="p-2">
                <div className="text-xs font-semibold text-text-primary truncate">{game.name}</div>
                <div className="text-[10px] text-text-muted mt-0.5">{game.category}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <Gamepad2 size={48} className="mx-auto mb-4 text-text-muted opacity-30" />
          <p className="text-text-muted">No games found</p>
        </div>
      )}

      {/* Game Launch Modal */}
      {selectedGame && (
        <Modal isOpen={!!selectedGame} onClose={() => setSelectedGame(null)} title="Casino Game" size="xl">
          <iframe
            src={selectedGame}
            className="w-full h-[500px] rounded-lg"
            title="Casino Game"
            allow="fullscreen"
          />
        </Modal>
      )}

      {/* Bet Modal */}
      <Modal isOpen={!!betModal} onClose={() => setBetModal(null)} title="Place Casino Bet" size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-text-muted mb-1 block">Bet Amount (₹)</label>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              className="input-field"
              min="1"
            />
          </div>
          <div className="flex gap-2">
            {[100, 500, 1000, 5000].map((a) => (
              <button key={a} onClick={() => setBetAmount(a)} className="btn-secondary text-xs py-1">
                ₹{a}
              </button>
            ))}
          </div>
          {wallet && (
            <div className="text-xs text-text-muted">
              Available: <span className="text-accent-green font-mono">{formatCurrency(wallet.balance - wallet.exposure)}</span>
            </div>
          )}
          <button
            onClick={() => betModal && betMutation.mutate({ gameId: betModal, amount: betAmount })}
            disabled={betMutation.isPending}
            className="btn-primary w-full justify-center"
          >
            {betMutation.isPending ? 'Placing...' : `Place Bet — ${formatCurrency(betAmount)}`}
          </button>
        </div>
      </Modal>
    </div>
  )
}
