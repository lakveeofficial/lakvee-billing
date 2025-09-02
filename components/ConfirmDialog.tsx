'use client'

import React from 'react'
import { AlertTriangle } from 'lucide-react'
import ModalShell from './ModalShell'

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
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      icon={<AlertTriangle className="h-5 w-5" />}
      size="sm"
      footer={(
        <>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm rounded-md text-white ${destructive
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-gradient-to-r from-primary-600 to-emerald-600 hover:from-primary-700 hover:to-emerald-700'
            }`}
          >
            {confirmText}
          </button>
        </>
      )}
    >
      {message && <p className="text-sm text-gray-700">{message}</p>}
    </ModalShell>
  )
}
