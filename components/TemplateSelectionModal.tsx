'use client'

import { useState } from 'react'
import { X, FileText, Check } from 'lucide-react'
import { INVOICE_TEMPLATES } from '@/types/company'

interface TemplateSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (templateId: string) => void
}

export default function TemplateSelectionModal({ isOpen, onClose, onSelect }: TemplateSelectionModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState('courier_aryan')

  if (!isOpen) return null

  const handleSelect = () => {
    onSelect(selectedTemplate)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Select Invoice Template</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {INVOICE_TEMPLATES.map((template) => (
            <div
              key={template.id}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                selectedTemplate === template.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedTemplate(template.id)}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">{template.name}</h3>
                {selectedTemplate === template.id && (
                  <Check className="w-5 h-5 text-blue-500" />
                )}
              </div>
              
              {/* Template Preview */}
              <div className="bg-white border rounded p-3 mb-3 min-h-[200px] flex items-center justify-center">
                <div className="text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Preview</p>
                  <p className="text-xs text-gray-500 mt-1">{template.id}</p>
                </div>
              </div>
              
              <p className="text-sm text-gray-600">{template.description}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSelect}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Generate PDF
          </button>
        </div>
      </div>
    </div>
  )
}
