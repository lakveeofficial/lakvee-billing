"use client"

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { BadgeIndianRupee } from 'lucide-react'

export default function ApplyRateButton({ id }: { id: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const onApply = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/csv-invoices/${id}/apply-rate`, { method: 'POST' })
      const data = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(data?.error || 'Failed to apply rate')
      alert('Slab Rate Applied')
      router.refresh()
    } catch (e: any) {
      const msg = e?.message || 'Failed to apply rate'
      alert(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      title="Apply Slab Rate"
      onClick={onApply}
      disabled={loading}
      className="p-2 rounded hover:bg-emerald-50 text-emerald-600 disabled:opacity-50"
    >
      <BadgeIndianRupee className="h-4 w-4" />
    </button>
  )
}
