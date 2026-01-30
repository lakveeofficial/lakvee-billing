'use client'

import { useState, useEffect } from 'react'
import { FileText, IndianRupee, TrendingUp, AlertCircle, Filter as FilterIcon } from 'lucide-react'
import AddBillModal from '@/components/AddBillModal'
import AddIncomeModal from '@/components/AddIncomeModal'
import PeriodBillModal from '@/components/PeriodBillModal'
import BillsPageHeader from '@/components/BillsPageHeader'
import BillsTable from '@/components/BillsTable'
import BookingsTable from '@/components/BookingsTable'

interface Bill {
  id: number
  party_code: string
  party_name: string
  booking_amount: number
  billed_amount: number
  grand_total: number
  status: string
  balance_credit: number
  booking_types?: string
  booking_count?: number
  party_id?: number
  bill_id?: number
  bill_number?: string
  bill_status?: string
  pending_amount?: number
}

type BookingRow = {
  id: number
  booking_type: 'account' | 'cash'
  booking_date?: string | null
  date?: string | null
  sender?: string | null
  receiver?: string | null
  center?: string | null
  reference_number?: string | null
  consignment_no?: string | null
  net_amount?: number | null
  gross_amount?: number | null
  remarks?: string | null
  weight?: number | null
}

export default function BillsPage() {
  // Get current month as default
  const getCurrentMonth = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.toLocaleDateString('en-US', { month: 'short' })
    return `${month} ${year}`
  }

  const [bills, setBills] = useState<Bill[]>([])
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [bookingSearchTerm, setBookingSearchTerm] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [activeTab, setActiveTab] = useState<'summary' | 'bookings'>('summary')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedBills, setSelectedBills] = useState<Set<number>>(new Set())
  const [selectedBookingKeys, setSelectedBookingKeys] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [showAddBillModal, setShowAddBillModal] = useState(false)
  const [showAddIncomeModal, setShowAddIncomeModal] = useState(false)
  const [showPeriodBillModal, setShowPeriodBillModal] = useState(false)
  const [selectedBillForIncome, setSelectedBillForIncome] = useState<Bill | null>(null)
  const [selectedBillForGeneration, setSelectedBillForGeneration] = useState<Bill | null>(null)

  useEffect(() => {
    loadBills()
    loadBookings()
  }, [selectedMonth])

  // Helper: convert selectedMonth like "Jan 2026" to "2026-01"
  const toApiMonth = (m: string) => {
    const [mon, year] = String(m || '').split(' ')
    const map: Record<string, string> = {
      Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
      Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
    }
    const mm = map[mon] || '01'
    return `${year}-${mm}`
  }

  const loadBills = async () => {
    try {
      setLoading(true)
      const apiMonth = toApiMonth(selectedMonth)

      const response = await fetch(`/api/billing/summary?month=${apiMonth}`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        const billsData = (data.data || []).map((item: any, index: number) => ({
          id: index + 1,
          party_code: item.party_id || '-',
          party_name: item.party_name || 'Unknown',
          booking_amount: Number(item.booking_amount || 0),
          billed_amount: Number(item.billed_amount || 0),
          grand_total: Number(item.grand_total || item.billed_amount || 0),
          pending_amount: Number(item.pending_amount ?? (Number(item.booking_amount || 0) - Number(item.billed_amount || 0))),
          status: item.status || 'Pending',
          balance_credit: Number(item.balance_credit || 0),
          booking_types: item.booking_types || 'account',
          booking_count: Number(item.booking_count || 0),
          party_id: item.party_id,
          bill_id: item.bill_id,
          bill_number: item.bill_number,
          bill_status: item.bill_status
        }))

        setBills(billsData)
      } else {
        console.error('Failed to fetch bills')
        setBills([])
      }
    } catch (error) {
      console.error('Error loading bills:', error)
      setBills([])
    } finally {
      setLoading(false)
    }
  }

  const loadBookings = async () => {
    try {
      setBookingsLoading(true)
      const apiMonth = toApiMonth(selectedMonth)
      const res = await fetch(`/api/bookings/list?month=${apiMonth}`, { credentials: 'include' })
      if (!res.ok) {
        setBookings([])
        return
      }
      const j = await res.json()
      const rows: BookingRow[] = Array.isArray(j?.data) ? j.data : []
      setBookings(rows)
    } catch {
      setBookings([])
    } finally {
      setBookingsLoading(false)
      setSelectedBookingKeys(new Set())
    }
  }

  // Filter bills based on search and status
  const filteredBills = bills.filter(bill => {
    const matchesSearch = searchTerm === '' ||
      bill.party_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.bill_number?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'All' || bill.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Filter bookings based on search
  const filteredBookings = bookings.filter(b => {
    const term = bookingSearchTerm.toLowerCase()
    if (!term) return true

    const senderMatch = b.sender?.toLowerCase().includes(term)
    const receiverMatch = b.receiver?.toLowerCase().includes(term)
    const consignmentMatch = (b.reference_number || b.consignment_no)?.toLowerCase().includes(term)

    return senderMatch || receiverMatch || consignmentMatch
  })

  // Calculate summary statistics
  const totalBookingAmount = bills.reduce((sum, bill) => sum + bill.booking_amount, 0)
  const totalBilledAmount = bills.reduce((sum, bill) => sum + bill.billed_amount, 0)
  const totalPendingAmount = bills.reduce((sum, bill) => sum + (bill.pending_amount || 0), 0)
  const totalBookings = bills.reduce((sum, bill) => sum + (bill.booking_count || 0), 0)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0
    }).format(amount)
  }

  const summaryCards = [
    {
      label: 'Total Bookings',
      value: totalBookings,
      icon: FileText,
      color: 'from-blue-500 to-blue-600'
    },
    {
      label: 'Booking Amount',
      value: `₹${formatCurrency(totalBookingAmount)}`,
      icon: IndianRupee,
      color: 'from-purple-500 to-purple-600'
    },
    {
      label: 'Billed Amount',
      value: `₹${formatCurrency(totalBilledAmount)}`,
      icon: TrendingUp,
      color: 'from-green-500 to-green-600'
    },
    {
      label: 'Pending Amount',
      value: `₹${formatCurrency(totalPendingAmount)}`,
      icon: AlertCircle,
      color: 'from-orange-500 to-orange-600'
    }
  ]

  // Bill actions
  const handleGenerateBill = (bill: Bill) => {
    setSelectedBillForGeneration(bill)
    setShowAddBillModal(true)
  }

  const handlePrintBill = (bill: Bill) => {
    if (bill.bill_id) {
      window.open(`/api/bills/${bill.bill_id}/pdf`, '_blank')
    }
  }

  const handleEditBill = (bill: Bill) => {
    setSelectedBillForGeneration(bill)
    setShowAddBillModal(true)
  }

  const handleDeleteBill = async (bill: Bill) => {
    if (!bill.bill_id) return

    const confirmed = window.confirm(
      `Are you sure you want to delete bill ${bill.bill_number}? This action cannot be undone.`
    )

    if (!confirmed) return

    try {
      const response = await fetch(`/api/bills/${bill.bill_id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('Bill deleted successfully!')
        loadBills()
      } else {
        const errorData = await response.json()
        alert(`Failed to delete bill: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error deleting bill:', error)
      alert('Failed to delete bill. Please try again.')
    }
  }

  const handleAddIncome = (bill: Bill) => {
    setSelectedBillForIncome(bill)
    setShowAddIncomeModal(true)
  }

  const handleBillCreated = () => {
    loadBills()
    setSelectedBookingKeys(new Set())
  }

  const handleIncomeAdded = () => {
    loadBills()
    setSelectedBillForIncome(null)
  }

  // Bill selection
  const toggleSelectBill = (id: number) => {
    setSelectedBills(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAllBills = (checked: boolean) => {
    if (checked) {
      setSelectedBills(new Set(filteredBills.map(b => b.id)))
    } else {
      setSelectedBills(new Set())
    }
  }

  // Booking selection
  const toggleSelectBooking = (id: number, type: 'account' | 'cash') => {
    const key = `${type}:${id}`
    setSelectedBookingKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const selectAllBookings = (checked: boolean) => {
    if (checked) {
      setSelectedBookingKeys(new Set(filteredBookings.map(b => `${b.booking_type}:${b.id}`)))
    } else {
      setSelectedBookingKeys(new Set())
    }
  }

  const handleGenerateFromSelection = () => {
    const sel = bookings.filter(b => selectedBookingKeys.has(`${b.booking_type}:${b.id}`))
    if (sel.length === 0) return

    const norm = (s?: string | null) => String(s || '').trim().toLowerCase()
    const parties = Array.from(new Set(sel.map(b => norm(b.sender))))

    if (parties.length !== 1) {
      alert('Please select bookings for a single party to generate a bill.')
      return
    }

    const partyDisplay = sel[0].sender || 'Unknown'
    const total = sel.reduce((sum, r) => sum + Number(r.net_amount ?? r.gross_amount ?? 0), 0)
    const bookingTypes = Array.from(new Set(sel.map(b => b.booking_type))).join(', ')

    const stubBill: Bill = {
      id: 0,
      party_code: '-',
      party_name: partyDisplay,
      booking_amount: total,
      billed_amount: 0,
      grand_total: 0,
      status: 'Pending',
      balance_credit: 0,
      booking_types: bookingTypes,
      booking_count: sel.length,
      bill_id: undefined,
      bill_number: undefined,
      bill_status: undefined,
      pending_amount: total,
      party_id: undefined,
    }

    setSelectedBillForGeneration(stubBill)
    setShowAddBillModal(true)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Summary Cards */}
        <BillsPageHeader
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          summaryCards={summaryCards}
        />

        {/* Tabs and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="border-b border-slate-200">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex space-x-1">
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'summary'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                >
                  Party Summary
                </button>
                <button
                  onClick={() => setActiveTab('bookings')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'bookings'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                >
                  All Bookings ({bookings.length})
                </button>
              </div>

              {/* Status Filter (only for summary tab) */}
              {activeTab === 'summary' && (
                <div className="flex items-center gap-2">
                  <FilterIcon className="h-4 w-4 text-slate-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="All">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Billed">Billed</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'summary' ? (
              <BillsTable
                bills={filteredBills}
                allBookings={bookings}
                loading={loading}
                onGenerateBill={handleGenerateBill}
                onPrintBill={handlePrintBill}
                onEditBill={handleEditBill}
                onDeleteBill={handleDeleteBill}
                onAddIncome={handleAddIncome}
                selectedBills={selectedBills}
                onToggleSelect={toggleSelectBill}
                onSelectAll={selectAllBills}
              />
            ) : (
              <BookingsTable
                bookings={filteredBookings}
                loading={bookingsLoading}
                selectedKeys={selectedBookingKeys}
                onToggleSelect={toggleSelectBooking}
                onSelectAll={selectAllBookings}
                onGenerateFromSelection={handleGenerateFromSelection}
                searchTerm={bookingSearchTerm}
                onSearchChange={setBookingSearchTerm}
              />
            )}
          </div>
        </div>

        {/* Modals */}
        <AddBillModal
          isOpen={showAddBillModal}
          onClose={() => {
            setShowAddBillModal(false)
            setSelectedBillForGeneration(null)
          }}
          onBillCreated={handleBillCreated}
          prefillData={selectedBillForGeneration ? {
            partyName: selectedBillForGeneration.party_name,
            amount: selectedBillForGeneration.booking_amount,
            month: selectedMonth
          } : {
            month: selectedMonth
          }}
          selectedBookings={(() => {
            const manualSelection = Array.from(selectedBookingKeys).map(k => {
              const [type, idStr] = k.split(':')
              return { id: Number(idStr), booking_type: (type as 'account' | 'cash') }
            })

            if (manualSelection.length > 0) return manualSelection

            // If no manual selection, and we are generating for a specific party row (summary mode),
            // auto-select all UNBILLED bookings for that party.
            if (selectedBillForGeneration) {
              const pName = selectedBillForGeneration.party_name?.trim().toLowerCase()
              return bookings
                .filter(b =>
                  (b.sender?.trim().toLowerCase() === pName) &&
                  // @ts-ignore - is_billed comes from API now
                  !b.is_billed
                )
                .map(b => ({ id: b.id, booking_type: b.booking_type }))
            }

            return []
          })()}
        />

        <AddIncomeModal
          isOpen={showAddIncomeModal}
          onClose={() => {
            setShowAddIncomeModal(false)
            setSelectedBillForIncome(null)
          }}
          onIncomeAdded={handleIncomeAdded}
          clientData={selectedBillForIncome ? {
            partyId: selectedBillForIncome.party_id,
            clientName: selectedBillForIncome.party_name,
            totalBalance: selectedBillForIncome.grand_total,
            unpaidBills: [{
              billNo: `STC${selectedBillForIncome.id}`,
              month: selectedMonth,
              amount: selectedBillForIncome.grand_total,
              dueAmount: selectedBillForIncome.grand_total
            }]
          } : undefined}
        />

        <PeriodBillModal
          isOpen={showPeriodBillModal}
          onClose={() => setShowPeriodBillModal(false)}
          onBillGenerated={loadBills}
        />
      </div>
    </div>
  )
}
