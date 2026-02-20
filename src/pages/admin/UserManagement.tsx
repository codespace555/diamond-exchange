import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Search, Plus, Ban, Trash2, DollarSign } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { adminApi } from '../../api/admin'
import { walletApi } from '../../api/wallet'
import { useDebounce } from '../../hooks/useDebounce'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency, formatDate, getRoleBadgeColor } from '../../utils/format'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { Pagination } from '../../components/ui/Pagination'
import { Modal } from '../../components/ui/Modal'
import toast from 'react-hot-toast'
import type { UserRole } from '../../types'

/* =========================
   Schemas
========================= */

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'AGENT', 'USER']),
})

type CreateUserForm = z.infer<typeof createUserSchema>

const addBalanceSchema = z.object({
  amount: z.number().min(1),
  notes: z.string().optional(),
})

type AddBalanceForm = z.infer<typeof addBalanceSchema>

const ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'AGENT', 'USER']

/* =========================
   Component
========================= */

export default function UserManagement() {
  const { user: currentUser } = useAuthStore()

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN'
  const isAgent = currentUser?.role === 'AGENT'

  const [search, setSearch] = useState('')
  const [role, setRole] = useState<string>('All')
  const [page, setPage] = useState(1)
  const [createModal, setCreateModal] = useState(false)
  const [balanceModal, setBalanceModal] = useState<string | null>(null)

  const queryClient = useQueryClient()
  const debouncedSearch = useDebounce(search)

  /* =========================
     Fetch Users
  ========================= */

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', debouncedSearch, role, page],
    queryFn: () =>
      adminApi.getUsers({
        search: debouncedSearch || undefined,
        role: role !== 'All' ? role : undefined,
        page,
        limit: 20,
      }),
  })

  /* =========================
     Role-based Filtering
     AGENT sees only own users
  ========================= */

  const filteredUsers = (() => {
    if (!data?.users) return []

    if (isAgent) {
      return data.users.filter(
        (u) => u.parentId === currentUser?.id
      )
    }

    return data.users
  })()

  /* =========================
     Forms
  ========================= */

  const {
    register: regCreate,
    handleSubmit: handleCreate,
    reset: resetCreate,
    formState: { errors: createErrors, isSubmitting: creating },
  } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'USER' },
  })

  const {
    register: regBalance,
    handleSubmit: handleBalance,
    reset: resetBalance,
    formState: { isSubmitting: addingBalance },
  } = useForm<AddBalanceForm>({
    resolver: zodResolver(addBalanceSchema),
  })

  /* =========================
     Mutations
  ========================= */

  const createMutation = useMutation({
    mutationFn: adminApi.createUser,
    onSuccess: () => {
      toast.success('User created')
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setCreateModal(false)
      resetCreate()
    },
  })

  const banMutation = useMutation({
    mutationFn: adminApi.banUser,
    onSuccess: () => {
      toast.success('User banned')
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteUser,
    onSuccess: () => {
      toast.success('User deleted')
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })

  const addBalanceMutation = useMutation({
    mutationFn: (data: AddBalanceForm) =>
      walletApi.addBalance({ userId: balanceModal!, ...data }),
    onSuccess: () => {
      toast.success('Balance added')
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setBalanceModal(null)
      resetBalance()
    },
  })

  /* =========================
     UI
  ========================= */

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users size={20} className="text-accent-blue" />
          <h1 className="font-display text-2xl font-bold text-text-primary">
            User Management
          </h1>

          {data && (
            <span className="text-xs text-text-muted bg-bg-card px-2 py-0.5 rounded-full border border-bg-border">
              {isAgent ? filteredUsers.length : data.total} users
            </span>
          )}
        </div>

        {!isAgent && (
          <button onClick={() => setCreateModal(true)} className="btn-primary">
            <Plus size={16} />
            Create User
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search by name or email..."
            className="input-field pl-9"
          />
        </div>

        {!isAgent && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setRole('All')}
              className={`text-xs px-3 py-1.5 rounded-full ${
                role === 'All'
                  ? 'bg-accent-blue text-white'
                  : 'bg-bg-hover text-text-secondary'
              }`}
            >
              All Roles
            </button>

            {ROLES.map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRole(r)
                  setPage(1)
                }}
                className={`text-xs px-3 py-1.5 rounded-full ${
                  role === r
                    ? 'bg-accent-blue text-white'
                    : 'bg-bg-hover text-text-secondary'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-secondary border-b border-bg-border">
              <tr>
                <th className="p-3 text-left">User</th>
                <th className="p-3 text-left">Role</th>
                <th className="p-3 text-right">Balance</th>
                <th className="p-3 text-right">Exposure</th>
                <th className="p-3 text-left">Joined</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6}>
                    <SkeletonTable rows={8} />
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="table-row">
                    <td className="p-3">
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-text-muted">{u.email}</div>
                    </td>

                    <td className="p-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${getRoleBadgeColor(
                          u.role
                        )}`}
                      >
                        {u.role}
                      </span>
                    </td>

                    <td className="p-3 text-right text-accent-green font-mono">
                      {formatCurrency(u.wallet?.balance ?? 0)}
                    </td>

                    <td className="p-3 text-right text-accent-red font-mono">
                      {formatCurrency(u.wallet?.exposure ?? 0)}
                    </td>

                    <td className="p-3 text-xs text-text-muted">
                      {formatDate(u.createdAt)}
                    </td>

                    <td className="p-3 text-center space-x-2">
                      {isSuperAdmin && (
                        <button
                          onClick={() => setBalanceModal(u.id)}
                          title="Add Balance"
                        >
                          <DollarSign size={14} />
                        </button>
                      )}

                      <button
                        onClick={() => banMutation.mutate(u.id)}
                        title="Ban"
                        disabled={u.id === currentUser?.id}
                      >
                        <Ban size={14} />
                      </button>

                      {isSuperAdmin && (
                        <button
                          onClick={() => deleteMutation.mutate(u.id)}
                          disabled={u.id === currentUser?.id}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-text-muted">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination disabled for Agent */}
        {!isAgent && data && data.totalPages > 1 && (
          <div className="p-4 border-t border-bg-border">
            <Pagination
              page={page}
              totalPages={data.totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  )
}
