"use client"

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import ConfirmDialog from '@/components/ConfirmDialog'

export default function DeleteRowButton({ id }: { id: string }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const onDelete = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/csv-invoices/${id}`, { 
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include'
      })
      if (!res.ok && res.status !== 204) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || 'Delete failed')
      }
      setIsOpen(false)
      router.refresh()
    } catch (e: any) {
      alert(e.message || 'Failed to delete')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-red-600 hover:text-red-900"
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <ConfirmDialog
        isOpen={isOpen}
        title="Delete Invoice"
        message="Are you sure you want to delete this invoice?"
        confirmText={loading ? 'Deleting…' : 'Delete'}
        cancelText="Cancel"
        destructive
        onConfirm={onDelete}
        onCancel={() => !loading && setIsOpen(false)}
      />
    </>
  )
}