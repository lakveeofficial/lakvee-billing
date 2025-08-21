'use client'

import React from 'react'
import { AlertTriangle, X } from 'lucide-react'

export interface ConfirmDialogProps {
  isOpen: boolean
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  destructive?: boolean
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

export default function ConfirmDialog({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative w-full max-w-md mx-4 bg-white rounded-lg shadow-lg">
        <div className="flex items-start gap-3 p-5 border-b">
          <div className={`mt-0.5 rounded-full p-1 ${destructive ? 'bg-red-50' : 'bg-blue-50'}`}>
            <AlertTriangle className={`h-5 w-5 ${destructive ? 'text-red-500' : 'text-blue-500'}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {message && <p className="mt-1 text-sm text-gray-600">{message}</p>}
          </div>
          <button className="p-2 rounded hover:bg-gray-100" onClick={onCancel} aria-label="Close">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        <div className="p-4 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm rounded-md text-white ${destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
