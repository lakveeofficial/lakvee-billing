"use client"

import { useEffect, useMemo, useState } from 'react'
import { Calendar, CreditCard, Hash, StickyNote, IndianRupee } from 'lucide-react'

export default function QuickReceiveModal({
  isOpen,
  onClose,
  invoiceId,
  partyId,
  totalAmount,
  receivedAmount,
  onSaved,
}: {
  isOpen: boolean
  onClose: () => void
  invoiceId: number
  partyId: number
  totalAmount: number
  receivedAmount: number
  onSaved: () => Promise<void> | void
}) {
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0,10))
  const [amount, setAmount] = useState<string>('')
  const [method, setMethod] = useState<string>('')
  const [refNo, setRefNo] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const outstanding = useMemo(() => Math.max(0, Number(totalAmount) - Number(receivedAmount)), [totalAmount, receivedAmount])

  useEffect(() => {
    if (isOpen) {
      setDate(new Date().toISOString().slice(0,10))
      setAmount(outstanding > 0 ? String(outstanding.toFixed(2)) : '')
      setMethod('')
      setRefNo('')
      setNotes('')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  async function save() {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) {
      alert('Enter a valid amount')
      return
    }
    if (amt - outstanding > 0.001) {
      alert('Amount cannot exceed outstanding')
      return
    }

    setSaving(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch('/api/party-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          party_id: partyId,
          payment_date: date,
          amount: amt,
          payment_method: method || undefined,
          reference_no: refNo || undefined,
          notes: notes || undefined,
          allocations: [ { invoice_id: invoiceId, amount: amt } ],
        })
      })
      if (!res.ok) {
        const j = await res.json().catch(()=>({}))
        throw new Error(j.error || `Failed to save: ${res.status}`)
      }
      await onSaved()
      onClose()
    } catch (e:any) {
      alert(e?.message || 'Failed to save payment')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 px-6 py-5">
          <div className="flex items-center gap-3 text-white">
            <div className="rounded-xl bg-white/15 p-2">
              <IndianRupee className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-lg font-semibold leading-tight">Receive Payment</h4>
              <p className="text-xs/5 text-white/90">Outstanding: ₹ {outstanding.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-10 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Amount</label>
              <div className="relative">
                <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-10 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Method</label>
              <div className="relative">
                <CreditCard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="NEFT / UPI / CASH"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-10 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Reference No</label>
              <div className="relative">
                <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-10 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
              <div className="relative">
                <StickyNote className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-10 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 px-4 py-2 font-medium text-white shadow hover:from-emerald-700 hover:to-green-700 disabled:opacity-60"
              onClick={save}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save Payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
