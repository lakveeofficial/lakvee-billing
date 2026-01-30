'use client'

import { LucideIcon } from 'lucide-react'

interface StatCardProps {
    label: string
    value: string | number
    icon: LucideIcon
    gradient: string
    trend?: {
        value: number
        isPositive: boolean
    }
    onClick?: () => void
    className?: string
}

export default function StatCard({
    label,
    value,
    icon: Icon,
    gradient,
    trend,
    onClick,
    className = ''
}: StatCardProps) {
    const baseClasses = 'rounded-xl shadow-sm p-5 text-white transition-all duration-200'
    const interactiveClasses = onClick ? 'cursor-pointer hover:shadow-lg hover:scale-105' : ''

    return (
        <div
            className={`bg-gradient-to-br ${gradient} ${baseClasses} ${interactiveClasses} ${className}`}
            onClick={onClick}
        >
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium opacity-90">{label}</p>
                    <p className="text-2xl font-bold mt-1">{value}</p>

                    {trend && (
                        <div className="mt-2 flex items-center gap-1">
                            <span className={`text-xs font-medium ${trend.isPositive ? 'text-white' : 'text-white/80'}`}>
                                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                            </span>
                            <span className="text-xs opacity-75">vs last month</span>
                        </div>
                    )}
                </div>

                <div className="bg-white/20 rounded-xl p-3">
                    <Icon className="h-6 w-6" />
                </div>
            </div>
        </div>
    )
}
