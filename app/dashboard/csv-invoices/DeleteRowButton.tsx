"use client"

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Trash2 } from 'lucide-react'

export default function DeleteRowButton({ id }: { id: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const onDelete = async () => {
    if (!confirm('Delete this CSV invoice? This cannot be undone.')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/csv-invoices/${id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) throw new Error('Delete failed')
      router.refresh()
    } catch (e) {
      alert('Failed to delete')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      title="Delete"
      onClick={onDelete}
      disabled={loading}
      className="p-2 rounded hover:bg-red-50 text-red-600 disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )
}
