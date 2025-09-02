'use client'

import React from 'react'
import { X } from 'lucide-react'

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

const sizeToMaxWidth: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export default function ModalShell({
  isOpen,
  onClose,
  title,
  icon,
  children,
  footer,
  size = 'md',
  showClose = true,
  closeOnOverlay = true,
}: {
  isOpen: boolean
  onClose: () => void
  title?: React.ReactNode
  icon?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  size?: ModalSize
  showClose?: boolean
  closeOnOverlay?: boolean
}) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={() => {
        if (closeOnOverlay) onClose()
      }}
    >
      <div
        className={`w-full ${sizeToMaxWidth[size]} overflow-hidden rounded-2xl shadow-2xl border border-white/10 bg-white`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showClose) && (
          <div className="bg-gradient-to-r from-primary-600 to-emerald-600 px-6 py-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {icon}
                {title && (
                  <h3 className="text-lg font-semibold truncate">{title}</h3>
                )}
              </div>
              {showClose && (
                <button
                  type="button"
                  className="text-white/80 hover:text-white"
                  aria-label="Close"
                  onClick={onClose}
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="bg-white px-6 py-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="bg-white px-6 pb-6">
            <div className="flex items-center justify-end gap-2">{footer}</div>
          </div>
        )}
      </div>
    </div>
  )
}
