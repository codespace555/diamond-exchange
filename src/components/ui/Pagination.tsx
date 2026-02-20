import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="btn-secondary px-2 py-1 disabled:opacity-50"
      >
        <ChevronLeft size={16} />
      </button>

      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
        let pageNum: number
        if (totalPages <= 5) {
          pageNum = i + 1
        } else if (page <= 3) {
          pageNum = i + 1
        } else if (page >= totalPages - 2) {
          pageNum = totalPages - 4 + i
        } else {
          pageNum = page - 2 + i
        }

        return (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
              pageNum === page
                ? 'bg-accent-blue text-white'
                : 'bg-bg-hover text-text-secondary hover:text-text-primary'
            }`}
          >
            {pageNum}
          </button>
        )
      })}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="btn-secondary px-2 py-1 disabled:opacity-50"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
