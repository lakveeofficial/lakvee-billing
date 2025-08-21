"use client"

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function DeleteButton({ id }: { id: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const onDelete = async () => {
    if (!confirm('Delete this CSV invoice? This cannot be undone.')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/csv-invoices/${id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) throw new Error('Delete failed')
      router.push('/dashboard/csv-invoices')
      router.refresh()
    } catch (e) {
      alert('Failed to delete')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={onDelete} disabled={loading} className="px-3 py-2 border rounded text-red-600 hover:bg-red-50 disabled:opacity-50">
      {loading ? 'Deleting...' : 'Delete'}
    </button>
  )
}
