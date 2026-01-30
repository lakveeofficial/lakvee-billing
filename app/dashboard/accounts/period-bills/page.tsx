'use client'

import { useState, useEffect } from 'react'
import { Plus, Calendar } from 'lucide-react'
import PeriodBillModal from '@/components/PeriodBillModal'
import PeriodBillsTable from '@/components/PeriodBillsTable'

interface PeriodBill {
  id: number
  bill_number: string
  bill_date: string
  total_amount: number
  status: string
  party_id: number
  party_name: string
  start_date: string
  end_date: string
  booking_count: number
  total_paid: number
}

export default function PeriodBillsPage() {
  const [showPeriodBillModal, setShowPeriodBillModal] = useState(false)
  const [bills, setBills] = useState<PeriodBill[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPeriodBills()
  }, [])

  const loadPeriodBills = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/bills/period', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setBills(data.data || [])
      } else {
        console.error('Failed to fetch period bills')
        setBills([])
      }
    } catch (error) {
      console.error('Error loading period bills:', error)
      setBills([])
    } finally {
      setLoading(false)
    }
  }

  const handleBillGenerated = () => {
    setShowPeriodBillModal(false)
    loadPeriodBills()
  }

  const handlePrintBill = (bill: PeriodBill) => {
    if (bill.id) {
      window.open(`/api/bills/${bill.id}/pdf`, '_blank')
    }
  }

  const handleDeleteBill = async (bill: PeriodBill) => {
    if (!bill.id) return

    const confirmed = window.confirm(
      `Are you sure you want to delete period bill ${bill.bill_number}? This action cannot be undone.`
    )

    if (!confirmed) return

    try {
      const response = await fetch(`/api/bills/${bill.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('Period bill deleted successfully!')
        loadPeriodBills()
      } else {
        const errorData = await response.json()
        alert(`Failed to delete bill: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error deleting bill:', error)
      alert('Failed to delete bill. Please try again.')
    }
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-orange-500" />
            <h1 className="text-2xl font-semibold text-slate-900">Period Bills</h1>
          </div>
          <button
            onClick={() => setShowPeriodBillModal(true)}
            className="px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="h-5 w-5" />
            Generate Period Bill
          </button>
        </div>

        {/* Bills Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-6">
            <PeriodBillsTable
              bills={bills}
              loading={loading}
              onPrintBill={handlePrintBill}
              onDeleteBill={handleDeleteBill}
            />
          </div>
        </div>
      </div>

      {/* Period Bill Modal */}
      <PeriodBillModal
        isOpen={showPeriodBillModal}
        onClose={() => setShowPeriodBillModal(false)}
        onBillGenerated={handleBillGenerated}
      />
    </div>
  );
}
