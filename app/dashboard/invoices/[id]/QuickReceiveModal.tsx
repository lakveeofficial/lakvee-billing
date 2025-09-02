"use client"

import { useEffect, useMemo, useState } from 'react'
import { Calendar, CreditCard, Hash, StickyNote, IndianRupee } from 'lucide-react'
import ModalShell from '@/components/ModalShell'

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

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Receive Payment"
      icon={<IndianRupee className="h-5 w-5" />}
      size="md"
      footer={(
        <>
          <button
            className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-gradient-to-r from-primary-600 to-emerald-600 px-4 py-2 font-medium text-white shadow hover:from-primary-700 hover:to-emerald-700 disabled:opacity-60"
            onClick={save}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save Payment'}
          </button>
        </>
      )}
    >
      <div className="mb-3 text-xs text-gray-600">Outstanding: ₹ {outstanding.toFixed(2)}</div>
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
    </ModalShell>
  )
}
