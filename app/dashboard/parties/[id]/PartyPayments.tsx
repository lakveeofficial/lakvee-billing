"use client"

import { useEffect, useState } from 'react'

type PaymentRow = {
  id: number
  party_id: number
  payment_date: string
  amount: number
  payment_method?: string | null
  reference_no?: string | null
  notes?: string | null
  created_at: string
}

type OpenInvoice = {
  id: number
  invoice_number: string
  invoice_date: string
  total_amount: number
  received_amount: number
  outstanding: number
}

export default function PartyPayments({ partyId }: { partyId: number }) {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<PaymentRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { load() }, [partyId])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch(`/api/party-payments?party_id=${partyId}`, {
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!res.ok) throw new Error(`Failed to load payments: ${res.status}`)
      const json = await res.json()
      setRows(json.payments || [])
    } catch (e:any) {
      setError(e?.message || 'Failed to load payments')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-slate-900">Payments</h3>
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">Loading payments…</div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-slate-500">No payments yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-700">Date</th>
                <th className="px-3 py-2 text-right font-medium text-slate-700">Amount</th>
                <th className="px-3 py-2 text-left font-medium text-slate-700">Method</th>
                <th className="px-3 py-2 text-left font-medium text-slate-700">Reference</th>
                <th className="px-3 py-2 text-left font-medium text-slate-700">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">{new Date(r.payment_date).toLocaleDateString('en-IN')}</td>
                  <td className="px-3 py-2 text-right">₹ {Number(r.amount).toFixed(2)}</td>
                  <td className="px-3 py-2">{r.payment_method || '-'}</td>
                  <td className="px-3 py-2">{r.reference_no || '-'}</td>
                  <td className="px-3 py-2">{r.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Payment modal intentionally removed on party detail page */}
    </div>
  )
}
