import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { History } from 'lucide-react'
import { casinoApi } from '../../api/casino'
import { formatCurrency, formatDate } from '../../utils/format'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { Badge } from '../../components/ui/Badge'
import { Pagination } from '../../components/ui/Pagination'

export default function CasinoTransactions() {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['casino', 'transactions', page],
    queryFn: () => casinoApi.getTransactions({ page, limit: 20 }),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <History size={20} className="text-accent-purple" />
        <h1 className="font-display text-2xl font-bold text-text-primary">Casino Transactions</h1>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-border bg-bg-secondary">
                <th className="text-left p-3 text-text-muted font-medium">Game</th>
                <th className="text-center p-3 text-text-muted font-medium">Type</th>
                <th className="text-right p-3 text-text-muted font-medium">Amount</th>
                <th className="text-right p-3 text-text-muted font-medium">Before</th>
                <th className="text-right p-3 text-text-muted font-medium">After</th>
                <th className="text-left p-3 text-text-muted font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6}><SkeletonTable rows={10} /></td></tr>
              ) : data?.data && data.data.length > 0 ? (
                data.data.map((tx) => (
                  <tr key={tx.id} className="table-row">
                    <td className="p-3">
                      <div className="font-medium text-text-primary">{tx.game?.name ?? 'Unknown'}</div>
                      <div className="text-xs text-text-muted">{tx.game?.category}</div>
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant={
                        tx.type === 'WIN' ? 'success' :
                        tx.type === 'LOSS' ? 'error' : 'info'
                      }>
                        {tx.type}
                      </Badge>
                    </td>
                    <td className="p-3 text-right font-mono font-bold">
                      <span className={tx.type === 'WIN' ? 'text-accent-green' : 'text-accent-red'}>
                        {tx.type === 'WIN' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono text-text-muted">{formatCurrency(tx.balanceBefore)}</td>
                    <td className="p-3 text-right font-mono text-text-primary">{formatCurrency(tx.balanceAfter)}</td>
                    <td className="p-3 text-xs text-text-muted">{formatDate(tx.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-text-muted">No transactions found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {data && data.totalPages > 1 && (
          <div className="p-4 border-t border-bg-border">
            <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  )
}
