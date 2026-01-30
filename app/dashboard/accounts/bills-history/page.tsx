"use client"

import { useState, useEffect } from 'react'
import { FileText, Eye, Download, Trash2 } from 'lucide-react'
import ConfirmationModal from '@/components/ConfirmationModal'

interface GeneratedBill {
  id: number
  billNumber: string
  billDate: string
  partyName: string
  contactPerson: string
  totalAmount: number
  status: string
  template: string
  emailSent: boolean
  createdAt: string
}

export default function BillsHistoryPage() {
  const [bills, setBills] = useState<GeneratedBill[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [billToDelete, setBillToDelete] = useState<GeneratedBill | null>(null)

  useEffect(() => {
    loadBills()
  }, [])

  const loadBills = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/bills')
      if (response.ok) {
        const data = await response.json()
        setBills(data.data || [])
      }
    } catch (error) {
      console.error('Error loading bills:', error)
    } finally {
      setLoading(false)
    }
  }

  const viewBill = (billId: number) => {
    window.open(`/api/bills/${billId}/pdf`, '_blank')
  }

  const handleDeleteClick = (bill: GeneratedBill) => {
    setBillToDelete(bill)
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!billToDelete) return

    try {
      const response = await fetch(`/api/bills/${billToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setBills(bills.filter(b => b.id !== billToDelete.id))
      } else {
        console.error('Failed to delete bill')
        alert('Failed to delete bill')
      }
    } catch (error) {
      console.error('Error deleting bill:', error)
      alert('Error deleting bill')
    }
  }

  const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-IN')

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-orange-500" />
          <h1 className="text-2xl font-bold text-slate-900">Generated Bills</h1>
        </div>
        <div className="text-sm text-slate-500">
          Total: {bills.length} bills
        </div>
      </div>

      {bills.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No bills generated yet</h3>
          <p className="text-slate-500">Generated bills will appear here</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Bill Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Party
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bills.map((bill) => (
                <tr key={bill.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {bill.billNumber}
                      </div>
                      <div className="text-sm text-slate-500">
                        {formatDate(bill.billDate)}
                      </div>
                      <div className="text-xs text-slate-400">
                        Template: {bill.template}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {bill.partyName}
                      </div>
                      {bill.contactPerson && (
                        <div className="text-sm text-slate-500">
                          {bill.contactPerson}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">
                      {formatCurrency(bill.totalAmount)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${bill.status === 'generated'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-slate-100 text-gray-800'
                      }`}>
                      {bill.status}
                    </span>
                    {bill.emailSent && (
                      <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        Emailed
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => viewBill(bill.id)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-orange-500 text-white rounded text-xs hover:bg-orange-600"
                      >
                        <Eye className="h-3 w-3" />
                        View
                      </button>
                      <button
                        onClick={() => viewBill(bill.id)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-slate-500 text-white rounded text-xs hover:bg-gray-600"
                      >
                        <Download className="h-3 w-3" />
                        Print
                      </button>
                      <button
                        onClick={() => handleDeleteClick(bill)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Bill"
        message={`Are you sure you want to delete bill ${billToDelete?.billNumber}? This action cannot be undone.`}
        confirmText="Delete"
        type="danger"
      />
    </div>
  )
}

