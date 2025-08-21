"use client"

import { Printer } from 'lucide-react'
import { useState } from 'react'
import TemplateSelectionModal from '@/components/TemplateSelectionModal'

function inr(n: any) {
  const v = Number(n)
  if (!isFinite(v)) return ''
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v)
}

// Client now opens server-generated PDF from jsPDF route using courier_aryan template

export default function PrintPdfButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const openPicker = () => setOpen(true)
  const onSelect = (templateId: string) => {
    setLoading(true)
    try {
      const tpl = templateId || 'courier_aryan'
      const url = `/api/csv-invoices/${id}/pdf?template=${encodeURIComponent(tpl)}`
      window.open(url, '_blank', 'noopener,noreferrer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button title={loading ? 'Preparing...' : 'Print PDF'} onClick={openPicker} disabled={loading} className="p-2 rounded hover:bg-gray-50 text-gray-700 disabled:opacity-50">
        <Printer className="h-4 w-4" />
      </button>
      <TemplateSelectionModal isOpen={open} onClose={() => setOpen(false)} onSelect={onSelect} />
    </>
  )
}
