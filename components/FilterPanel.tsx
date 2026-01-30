'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'

interface FilterPanelProps {
    title?: string
    children: React.ReactNode
    defaultOpen?: boolean
    onClear?: () => void
    className?: string
}

export default function FilterPanel({
    title = 'Filters',
    children,
    defaultOpen = false,
    onClear,
    className = ''
}: FilterPanelProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    return (
        <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
                    >
                        {title}
                        {isOpen ? (
                            <ChevronUp className="h-4 w-4" />
                        ) : (
                            <ChevronDown className="h-4 w-4" />
                        )}
                    </button>

                    {onClear && (
                        <button
                            onClick={onClear}
                            className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 transition-colors"
                        >
                            <X className="h-3 w-3" />
                            Clear All
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            {isOpen && (
                <div className="p-4">
                    {children}
                </div>
            )}
        </div>
    )
}

// Filter Field Component
interface FilterFieldProps {
    label: string
    children: React.ReactNode
    className?: string
}

export function FilterField({ label, children, className = '' }: FilterFieldProps) {
    return (
        <div className={className}>
            <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
            {children}
        </div>
    )
}
