import React, { ReactNode } from 'react'

interface GradientSectionHeaderProps {
    title: ReactNode
    actions?: ReactNode
    children?: ReactNode
    variant?: 'blue' | 'emerald' | 'orange' | 'purple'
    className?: string
}

export default function GradientSectionHeader({
    title,
    actions,
    children,
    variant = 'blue',
    className = ''
}: GradientSectionHeaderProps) {
    const variants: Record<string, string> = {
        blue: 'from-blue-600 to-indigo-600 shadow-blue-200',
        emerald: 'from-emerald-600 to-teal-600 shadow-emerald-200',
        orange: 'from-orange-500 to-red-500 shadow-orange-200',
        purple: 'from-purple-600 to-violet-600 shadow-purple-200',
        slate: 'from-slate-700 to-slate-800 shadow-slate-200'
    }

    const gradientClass = variants[variant] || variants.blue

    return (
        <div className={`mb-4 px-6 py-4 bg-gradient-to-r ${gradientClass} rounded-t-xl text-white shadow-lg ${className}`}>
            <div className={`flex justify-between items-center ${children ? 'mb-4' : ''}`}>
                <div className="text-lg font-bold text-white tracking-wide">
                    {title}
                </div>
                {actions && (
                    <div className="flex items-center space-x-2">
                        {actions}
                    </div>
                )}
            </div>
            {children}
        </div>
    )
}
