'use client'

import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
    icon?: LucideIcon
    title: string
    message: string
    action?: {
        label: string
        onClick: () => void
        icon?: LucideIcon
    }
    className?: string
}

export default function EmptyState({
    icon: Icon,
    title,
    message,
    action,
    className = ''
}: EmptyStateProps) {
    const ActionIcon = action?.icon

    return (
        <div className={`text-center py-12 px-4 ${className}`}>
            {Icon && (
                <div className="mx-auto h-12 w-12 text-slate-400 mb-4">
                    <Icon className="h-full w-full" />
                </div>
            )}

            <h3 className="text-lg font-medium text-slate-900 mb-2">{title}</h3>
            <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">{message}</p>

            {action && (
                <button
                    onClick={action.onClick}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    {ActionIcon && <ActionIcon className="h-4 w-4" />}
                    {action.label}
                </button>
            )}
        </div>
    )
}
