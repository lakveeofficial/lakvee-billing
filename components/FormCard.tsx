'use client'

import { LucideIcon } from 'lucide-react'

interface FormCardProps {
    title: string
    subtitle?: string
    icon?: LucideIcon
    children: React.ReactNode
    onSubmit?: (e: React.FormEvent) => void
    onCancel?: () => void
    submitLabel?: string
    cancelLabel?: string
    loading?: boolean
    className?: string
}

export default function FormCard({
    title,
    subtitle,
    icon: Icon,
    children,
    onSubmit,
    onCancel,
    submitLabel = 'Submit',
    cancelLabel = 'Cancel',
    loading = false,
    className = ''
}: FormCardProps) {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSubmit?.(e)
    }

    return (
        <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-3">
                    {Icon && (
                        <div className="bg-primary-100 rounded-xl p-2">
                            <Icon className="h-5 w-5 text-primary-600" />
                        </div>
                    )}
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
                    </div>
                </div>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-6">
                    {children}
                </div>

                {/* Footer with Actions */}
                {(onSubmit || onCancel) && (
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                        {onCancel && (
                            <button
                                type="button"
                                onClick={onCancel}
                                disabled={loading}
                                className="px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {cancelLabel}
                            </button>
                        )}
                        {onSubmit && (
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
                            >
                                {loading && (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                )}
                                {submitLabel}
                            </button>
                        )}
                    </div>
                )}
            </form>
        </div>
    )
}

// Field Group Component for organizing form fields
interface FieldGroupProps {
    label: string
    children: React.ReactNode
    className?: string
}

export function FieldGroup({ label, children, className = '' }: FieldGroupProps) {
    return (
        <div className={className}>
            <h4 className="text-sm font-medium text-slate-700 mb-3">{label}</h4>
            <div className="space-y-4">
                {children}
            </div>
        </div>
    )
}
