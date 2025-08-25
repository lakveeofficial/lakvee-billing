"use client"

import { useState } from 'react'
import TemplateSelectionModal from '@/components/TemplateSelectionModal'
import { FileText } from 'lucide-react'

export default function PdfTemplatePicker({ id }: { id: string }) {
  const [open, setOpen] = useState(false)

  const onSelect = (templateId: string) => {
    const url = `/api/csv-invoices/${id}/pdf?template=${encodeURIComponent(templateId)}`
    // Create a hidden iframe to handle the download with credentials
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    
    // Also open in a new tab as fallback
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
