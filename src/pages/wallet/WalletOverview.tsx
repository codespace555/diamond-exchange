import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Wallet, ArrowUpRight, ArrowDownLeft, History, Lock } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { walletApi } from '../../api/wallet'
import { useAuthStore } from '../../store/authStore'
import { useWalletStore } from '../../store/walletStore'
import { formatCurrency, formatDate } from '../../utils/format'
import { Badge } from '../../components/ui/Badge'
import { Pagination } from '../../components/ui/Pagination'
import { Modal } from '../../components/ui/Modal'
import { SkeletonTable } from '../../components/ui/Skeleton'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'

const transferSchema = z.object({
  toUserId: z.string().min(1, 'User ID is required'),
  amount: z.number().min(1, 'Amount must be positive'),
  notes: z.string().optional(),
})
type TransferForm = z.infer<typeof transferSchema>

export default function WalletOverview() {
  const { user } = useAuthStore()
  const { wallet, setWallet } = useWalletStore()
  const [page, setPage] = useState(1)
  const [ledgerType, setLedgerType] = useState('All')
  const [transferModal, setTransferModal] = useState(false)
  const queryClient = useQueryClient()

  const { data: walletData } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const data = await walletApi.getWallet()
      setWallet(data)
      return data
    },
  })
console.log('Fetched wallet data:', walletData)
  const { data: ledger, isLoading: ledgerLoading } = useQuery({
    queryKey: ['ledger', page, ledgerType],
    queryFn: () => walletApi.getLedger({
      page,
      limit: 20,
      type: ledgerType !== 'All' ? ledgerType : undefined,
    }),
  })
console.log('Fetched ledger data:', ledger, 'isLoading:', ledgerLoading)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TransferForm>({
    resolver: zodResolver(transferSchema),
  })

  const transferMutation = useMutation({
    mutationFn: walletApi.transfer,
    onSuccess: (data) => {
      toast.success(`Transfer successful! New balance: ${formatCurrency(data.newBalance)}`)
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      queryClient.invalidateQueries({ queryKey: ['ledger'] })
      setTransferModal(false)
      reset()
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error?.response?.data?.message || 'Transfer failed')
    },
  })

  const displayWallet = wallet ?? walletData
  const available = (displayWallet?.balance ?? 0) - (displayWallet?.exposure ?? 0)

  const LEDGER_TYPES = ['All', 'CREDIT', 'DEBIT', 'TRANSFER_IN', 'TRANSFER_OUT', 'ORDER_PLACE', 'ORDER_SETTLE']

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Wallet size={20} className="text-accent-gold" />
        <h1 className="font-display text-2xl font-bold text-text-primary">Wallet</h1>
      </div>

      {/* Wallet Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 border-l-4 border-l-accent-green">
          <div className="flex items-center gap-2 text-text-muted text-sm mb-2">
            <Wallet size={14} />
            Total Balance
          </div>
          <div className="font-display text-3xl font-bold text-accent-green">
            {formatCurrency(displayWallet?.balance ?? 0)}
          </div>
        </div>

        <div className="card p-5 border-l-4 border-l-accent-red">
          <div className="flex items-center gap-2 text-text-muted text-sm mb-2">
            <Lock size={14} />
            Exposure (Locked)
          </div>
          <div className="font-display text-3xl font-bold text-accent-red">
            {formatCurrency(displayWallet?.exposure ?? 0)}
          </div>
        </div>

        <div className="card p-5 border-l-4 border-l-accent-blue">
          <div className="flex items-center gap-2 text-text-muted text-sm mb-2">
            <ArrowUpRight size={14} />
            Available
          </div>
          <div className="font-display text-3xl font-bold text-accent-blue">
            {formatCurrency(available)}
          </div>
        </div>
      </div>

      {/* Actions */}
      {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'AGENT') && (
        <div className="flex gap-3">
          <button onClick={() => setTransferModal(true)} className="btn-primary">
            <ArrowUpRight size={16} />
            Transfer Funds
          </button>
          <Link to="/wallet/ledger" className="btn-secondary">
            <History size={16} />
            Full Ledger
          </Link>
        </div>
      )}

      {/* Ledger */}
      <div className="card">
        <div className="flex items-center justify-between p-4 border-b border-bg-border">
          <div className="flex items-center gap-2">
            <History size={16} className="text-accent-blue" />
            <h3 className="font-semibold text-text-primary">Transaction History</h3>
          </div>
        </div>

        {/* Type Filter */}
        <div className="p-4 border-b border-bg-border">
          <div className="flex flex-wrap gap-2">
            {LEDGER_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => { setLedgerType(type); setPage(1) }}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                  ledgerType === type ? 'bg-accent-gold text-black font-bold' : 'bg-bg-hover text-text-secondary hover:text-text-primary'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-border bg-bg-secondary">
                <th className="text-left p-3 text-text-muted font-medium">Type</th>
                <th className="text-right p-3 text-text-muted font-medium">Amount</th>
                <th className="text-right p-3 text-text-muted font-medium">Balance After</th>
                <th className="text-left p-3 text-text-muted font-medium">Notes</th>
                <th className="text-left p-3 text-text-muted font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {ledgerLoading ? (
                <tr><td colSpan={5}><SkeletonTable rows={8} /></td></tr>
              ) : ledger?.entries && ledger.entries.length > 0 ? (
                ledger.entries.map((entry) => (
                  <tr key={entry.id} className="table-row">
                    <td className="p-3">
                      <Badge variant={
                        entry.type.includes('CREDIT') || entry.type.includes('WIN') || entry.type.includes('IN') ? 'success' :
                        entry.type.includes('DEBIT') || entry.type.includes('LOSS') || entry.type.includes('OUT') ? 'error' :
                        'default'
                      }>
                        {entry.type.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className={`p-3 text-right font-mono font-bold ${
                      entry.amount >= 0 ? 'text-accent-green' : 'text-accent-red'
                    }`}>
                      {entry.amount >= 0 ? '+' : ''}{formatCurrency(entry.amount)}
                    </td>
                    <td className="p-3 text-right font-mono text-text-primary">{formatCurrency(entry.balance)}</td>
                    <td className="p-3 text-xs text-text-muted">{entry.notes ?? '—'}</td>
                    <td className="p-3 text-xs text-text-muted">{formatDate(entry.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-text-muted">No transactions</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {ledger && ledger.totalPages > 1 && (
          <div className="p-4 border-t border-bg-border">
            <Pagination page={page} totalPages={ledger.totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Transfer Modal */}
      <Modal isOpen={transferModal} onClose={() => setTransferModal(false)} title="Transfer Funds">
        <form onSubmit={handleSubmit((data) => transferMutation.mutate(data))} className="space-y-4">
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Recipient User ID</label>
            <input {...register('toUserId')} className="input-field" placeholder="Enter user ID" />
            {errors.toUserId && <p className="text-accent-red text-xs mt-1">{errors.toUserId.message}</p>}
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Amount (₹)</label>
            <input {...register('amount', { valueAsNumber: true })} type="number" className="input-field" min="1" />
            {errors.amount && <p className="text-accent-red text-xs mt-1">{errors.amount.message}</p>}
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Notes (optional)</label>
            <input {...register('notes')} className="input-field" placeholder="Transfer notes..." />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 justify-center">
              <ArrowUpRight size={16} />
              {isSubmitting ? 'Transferring...' : 'Transfer'}
            </button>
            <button type="button" onClick={() => setTransferModal(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
