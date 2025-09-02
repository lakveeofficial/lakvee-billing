'use client'

import { useState } from 'react'
import { FileText, Check } from 'lucide-react'
import { INVOICE_TEMPLATES } from '@/types/company'
import ModalShell from '@/components/ModalShell'

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
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Select Invoice Template"
      icon={<FileText className="w-5 h-5" />}
      size="xl"
      footer={(
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSelect}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white bg-gradient-to-r from-primary-600 to-emerald-600 hover:from-primary-700 hover:to-emerald-700"
          >
            Generate PDF
          </button>
        </>
      )}
    >
      <div className="max-h-[65vh] overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {INVOICE_TEMPLATES.map((template) => (
            <div
              key={template.id}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                selectedTemplate === template.id
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedTemplate(template.id)}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">{template.name}</h3>
                {selectedTemplate === template.id && (
                  <Check className="w-5 h-5 text-emerald-600" />
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
      </div>
    </ModalShell>
  )
}
