'use client'

import { useState, useEffect } from 'react'
import { X, MapPin } from 'lucide-react'

interface AddBarcodeModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { carrier: string; start: string; end: string }) => void
  carrierName?: string
  initialData?: { start: string; end: string }
  isEditMode?: boolean
}

export default function AddBarcodeModal({ 
  isOpen, 
  onClose, 
  onSave, 
  carrierName = "PROFESSIONAL COURIER",
  initialData,
  isEditMode = false
}: AddBarcodeModalProps) {
  const [start, setStart] = useState(initialData?.start || '')
  const [end, setEnd] = useState(initialData?.end || '')

  // Update form fields when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData) {
      setStart(initialData.start || '')
      setEnd(initialData.end || '')
    } else {
      setStart('')
      setEnd('')
    }
  }, [initialData, isOpen])

  const handleSave = () => {
    if (start.trim() && end.trim()) {
      onSave({
        carrier: carrierName,
        start: start.trim(),
        end: end.trim()
      })
      setStart('')
      setEnd('')
      onClose()
    }
  }

  const handleCancel = () => {
    setStart('')
    setEnd('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-slate-600" />
            <h2 className="text-lg font-medium text-slate-900">{carrierName}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6">
          <div className="space-y-4">
            {/* Start Field */}
            <div>
              <label htmlFor="start" className="block text-sm font-medium text-slate-700 mb-1">
                Start <span className="text-red-500">*</span>
              </label>
              <input
                id="start"
                type="text"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                placeholder="e.g 01"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* End Field */}
            <div>
              <label htmlFor="end" className="block text-sm font-medium text-slate-700 mb-1">
                End <span className="text-red-500">*</span>
              </label>
              <input
                id="end"
                type="text"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                placeholder="e.g 50"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!start.trim() || !end.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-orange-500 border border-transparent rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
