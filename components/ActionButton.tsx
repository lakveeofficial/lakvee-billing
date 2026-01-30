'use client'

import { LucideIcon } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'outline'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ActionButtonProps {
    children: React.ReactNode
    onClick?: () => void
    variant?: ButtonVariant
    size?: ButtonSize
    icon?: LucideIcon
    iconPosition?: 'left' | 'right'
    loading?: boolean
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
    className?: string
}

export default function ActionButton({
    children,
    onClick,
    variant = 'primary',
    size = 'md',
    icon: Icon,
    iconPosition = 'left',
    loading = false,
    disabled = false,
    type = 'button',
    className = ''
}: ActionButtonProps) {
    const baseClasses = 'inline-flex items-center justify-center gap-2 font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

    const variantClasses = {
        primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-indigo-500 shadow-sm hover:shadow-sm',
        secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 shadow-sm hover:shadow-sm',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm hover:shadow-sm',
        success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-sm hover:shadow-sm',
        outline: 'border-2 border-slate-300 text-slate-700 hover:bg-slate-50 focus:ring-indigo-500'
    }

    const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base'
    }

    const iconSizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-4 w-4',
        lg: 'h-5 w-5'
    }

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        >
            {loading && (
                <div className={`animate-spin rounded-full border-b-2 border-current ${iconSizeClasses[size]}`}></div>
            )}
            {!loading && Icon && iconPosition === 'left' && (
                <Icon className={iconSizeClasses[size]} />
            )}
            {children}
            {!loading && Icon && iconPosition === 'right' && (
                <Icon className={iconSizeClasses[size]} />
            )}
        </button>
    )
}
