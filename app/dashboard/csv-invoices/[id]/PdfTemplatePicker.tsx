"use client"

import { useState } from 'react'
import TemplateSelectionModal from '@/components/TemplateSelectionModal'
import { FileText } from 'lucide-react'

export default function PdfTemplatePicker({ id }: { id: string }) {
  const [open, setOpen] = useState(false)

  const onSelect = (templateId: string) => {
    const url = `/api/csv-invoices/${id}/pdf?template=${encodeURIComponent(templateId)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-2 border rounded hover:bg-gray-50 text-sm inline-flex items-center gap-2"
        title="Choose PDF Template"
      >
        <FileText className="h-4 w-4" /> PDF Templates
      </button>
      <TemplateSelectionModal isOpen={open} onClose={() => setOpen(false)} onSelect={onSelect} />
    </>
  )
}
