import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Trash2 } from 'lucide-react'
import { sportsApi } from '../../api/sports'
import { formatCurrency, formatDate } from '../../utils/format'
import { Pagination } from '../../components/ui/Pagination'
import { Badge } from '../../components/ui/Badge'
import { SkeletonTable } from '../../components/ui/Skeleton'
import toast from 'react-hot-toast'

const STATUSES = ['All', 'OPEN', 'PARTIAL', 'MATCHED', 'CANCELLED']

export default function MyOrders() {
  const [status, setStatus] = useState('All')
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['orders', 'my', status, page],
    queryFn: () => sportsApi.getOrders({
      status: status !== 'All' ? status : undefined,
      page,
      limit: 20,
    }),
  })
console.log('Fetched orders:', data)
  const cancelMutation = useMutation({
    mutationFn: sportsApi.cancelOrder,
    onSuccess: () => {
      toast.success('Order cancelled')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
    },
    onError: () => toast.error('Failed to cancel order'),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <RefreshCw size={20} className="text-accent-blue" />
        <h1 className="font-display text-2xl font-bold text-text-primary">My Orders</h1>
      </div>

      {/* Status Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1) }}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                status === s ? 'bg-accent-blue text-white' : 'bg-bg-hover text-text-secondary hover:text-text-primary'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-border bg-bg-secondary">
                <th className="text-left p-3 text-text-muted font-medium">Selection</th>
                <th className="text-left p-3 text-text-muted font-medium">Side</th>
                <th className="text-right p-3 text-text-muted font-medium">Price</th>
                <th className="text-right p-3 text-text-muted font-medium">Stake</th>
                <th className="text-right p-3 text-text-muted font-medium">Matched</th>
                <th className="text-right p-3 text-text-muted font-medium">Exposure</th>
                <th className="text-center p-3 text-text-muted font-medium">Status</th>
                <th className="text-left p-3 text-text-muted font-medium">Date</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9}><SkeletonTable rows={5} /></td></tr>
              ) : data?.orders && data.orders.length > 0 ? (
                data.orders.map((order) => (
                  <tr key={order.id} className="table-row">
                    <td className="p-3">
                      <div className="font-medium text-text-primary">{order.selection?.name ?? 'N/A'}</div>
                      <div className="text-xs text-text-muted">{order.market?.name ?? ''}</div>
                    </td>
                    <td className="p-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        order.side === 'BACK' ? 'bg-accent-blue/20 text-accent-blue' : 'bg-accent-pink/20 text-accent-pink'
                      }`}>
                        {order.side}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-text-primary">{order.price}</td>
                    <td className="p-3 text-right font-mono text-text-primary">{formatCurrency(order.stake)}</td>
                    <td className="p-3 text-right font-mono text-accent-green">{formatCurrency(order.matchedStake)}</td>
                    <td className="p-3 text-right font-mono text-accent-red">{formatCurrency(order.lockedExposure)}</td>
                    <td className="p-3 text-center">
                      <Badge variant={
                        order.status === 'MATCHED' ? 'success' :
                        order.status === 'CANCELLED' ? 'error' :
                        order.status === 'PARTIAL' ? 'warning' : 'info'
                      }>
                        {order.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs text-text-muted">{formatDate(order.createdAt)}</td>
                    <td className="p-3">
                      {(order.status === 'OPEN' || order.status === 'PARTIAL') && (
                        <button
                          onClick={() => cancelMutation.mutate(order.id)}
                          disabled={cancelMutation.isPending}
                          className="text-accent-red hover:text-red-400 transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-text-muted">
                    No orders found
                  </td>
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
