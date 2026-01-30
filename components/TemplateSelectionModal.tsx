'use client'

import { useState } from 'react'
import { FileText, Check, X } from 'lucide-react'
import { INVOICE_TEMPLATES } from '@/types/company'
import ModalShell from '@/components/ModalShell'

interface TemplateSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (templateId: string) => void
  currentTemplate?: string
}

export default function TemplateSelectionModal({ isOpen, onClose, onSelect, currentTemplate }: TemplateSelectionModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState(currentTemplate || 'Default')

  if (!isOpen) return null

  const handleSelect = () => {
    onSelect(selectedTemplate)
    onClose()
  }

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Select Bill Template"
      icon={<FileText className="w-5 h-5" />}
      size="xl"
      footer={(
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSelect}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 font-semibold"
          >
            Apply Template
          </button>
        </>
      )}
    >
      <div className="max-h-[65vh] overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {INVOICE_TEMPLATES.map((template) => (
            <div
              key={template.id}
              className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all ${
                selectedTemplate === template.id
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
              onClick={() => setSelectedTemplate(template.id)}
            >
              {selectedTemplate === template.id && (
                <div className="absolute top-2 right-2 bg-orange-500 text-white rounded-full p-1">
                  <Check className="h-4 w-4" />
                </div>
              )}

              {/* Color Preview */}
              <div
                className="h-20 rounded-xl mb-3 flex items-center justify-center text-white font-bold text-sm"
                style={{ background: `linear-gradient(135deg, ${template.color}, ${template.color}dd)` }}
              >
                {template.name}
              </div>

              <h3 className="font-semibold text-slate-900 mb-1">{template.name}</h3>
              <p className="text-sm text-slate-600 mb-3">{template.description}</p>

              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded border-2 border-slate-300"
                  style={{ backgroundColor: template.color }}
                />
                <span className="text-xs text-slate-500">Color Theme</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ModalShell>
  )
}
