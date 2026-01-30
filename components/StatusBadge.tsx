'use client'

interface StatusBadgeProps {
    status: string
    onClick?: () => void
    className?: string
}

export default function StatusBadge({ status, onClick, className = '' }: StatusBadgeProps) {
    const getStatusStyles = (status: string) => {
        const normalized = status.toLowerCase()

        if (normalized === 'paid') {
            return 'bg-green-100 text-green-800 border-green-200'
        } else if (normalized === 'partially paid') {
            return 'bg-yellow-100 text-yellow-800 border-yellow-200'
        } else if (normalized === 'billed') {
            return 'bg-blue-100 text-blue-800 border-blue-200'
        } else if (normalized === 'pending') {
            return 'bg-slate-100 text-gray-800 border-slate-200'
        } else if (normalized === 'overdue') {
            return 'bg-red-100 text-red-800 border-red-200'
        }

        return 'bg-slate-100 text-gray-800 border-slate-200'
    }

    const baseClasses = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-colors'
    const statusClasses = getStatusStyles(status)
    const interactiveClasses = onClick ? 'cursor-pointer hover:opacity-80' : ''

    return (
        <span
            className={`${baseClasses} ${statusClasses} ${interactiveClasses} ${className}`}
            onClick={onClick}
        >
            {status}
        </span>
    )
}
