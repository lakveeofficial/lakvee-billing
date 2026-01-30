'use client'

import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastProps {
    id: string
    type: ToastType
    message: string
    duration?: number
    onClose: (id: string) => void
}

function Toast({ id, type, message, duration = 5000, onClose }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(id)
        }, duration)

        return () => clearTimeout(timer)
    }, [id, duration, onClose])

    const config = {
        success: {
            icon: CheckCircle,
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200',
            iconColor: 'text-green-600',
            textColor: 'text-green-800'
        },
        error: {
            icon: AlertCircle,
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200',
            iconColor: 'text-red-600',
            textColor: 'text-red-800'
        },
        warning: {
            icon: AlertTriangle,
            bgColor: 'bg-yellow-50',
            borderColor: 'border-yellow-200',
            iconColor: 'text-yellow-600',
            textColor: 'text-yellow-800'
        },
        info: {
            icon: Info,
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200',
            iconColor: 'text-blue-600',
            textColor: 'text-blue-800'
        }
    }

    const { icon: Icon, bgColor, borderColor, iconColor, textColor } = config[type]

    return (
        <div className={`${bgColor} ${borderColor} border rounded-xl shadow-lg p-4 mb-3 flex items-start gap-3 min-w-[300px] max-w-md animate-slide-in-right`}>
            <Icon className={`h-5 w-5 ${iconColor} flex-shrink-0 mt-0.5`} />
            <p className={`text-sm font-medium ${textColor} flex-1`}>{message}</p>
            <button
                onClick={() => onClose(id)}
                className={`${textColor} hover:opacity-75 transition-opacity flex-shrink-0`}
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    )
}

// Toast Container Component
interface ToastContainerProps {
    toasts: Array<{ id: string; type: ToastType; message: string; duration?: number }>
    onClose: (id: string) => void
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
    return (
        <div className="fixed top-4 right-4 z-50">
            {toasts.map(toast => (
                <Toast key={toast.id} {...toast} onClose={onClose} />
            ))}
        </div>
    )
}

// Hook for managing toasts
export function useToast() {
    const [toasts, setToasts] = useState<Array<{ id: string; type: ToastType; message: string; duration?: number }>>([])

    const showToast = (type: ToastType, message: string, duration?: number) => {
        const id = Math.random().toString(36).substr(2, 9)
        setToasts(prev => [...prev, { id, type, message, duration }])
    }

    const closeToast = (id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id))
    }

    return {
        toasts,
        showToast,
        closeToast,
        success: (message: string, duration?: number) => showToast('success', message, duration),
        error: (message: string, duration?: number) => showToast('error', message, duration),
        warning: (message: string, duration?: number) => showToast('warning', message, duration),
        info: (message: string, duration?: number) => showToast('info', message, duration),
    }
}

export default Toast
