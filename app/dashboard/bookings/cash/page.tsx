'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Trash2, Eye, Check, Package, Trash } from 'lucide-react'
import { INDIAN_STATES, getCityName } from '@/lib/indiaData' // Replaced ALL_LOCATIONS
// ...
const getStateFullName = (codeOrName: string) => {
  const match = INDIAN_STATES.find(s => s.code === codeOrName)
  return match ? match.name : codeOrName
}
import AddCenterModal from '@/components/AddCenterModal'
import GradientSectionHeader from '@/components/GradientSectionHeader'
import PageHeader from '@/components/PageHeader'
import ConfirmationModal from '@/components/ConfirmationModal'


interface Party {
  id: number
  party_name: string
  contact_person?: string
  phone?: string
  email?: string
  city?: string
  state?: string
}

interface Carrier {
  id: number
  name: string
}

interface CashBookingData {
  date: string
  sender: string
  senderMobile: string
  senderAddress: string
  center: string
  receiver: string
  receiverMobile: string
  receiverAddress: string
  carrier: string
  referenceNumber: string
  packageType: string
  weight: string
  numberOfBoxes: string
  grossAmount: string
  fuelChargePercent: string
  insuranceAmount: string
  cgstAmount: string
  sgstAmount: string
  netAmount: string
  parcelValue: string
  weightUnit: 'gm' | 'kg'
  remarks: string
}

interface RememberSettings {
  sender: boolean
  center: boolean
  receiver: boolean
  carrier: boolean
  packageType: boolean
  weight: boolean
  autoConsignment: boolean
}

export default function CashBookingPage() {
  const [bookingData, setBookingData] = useState<CashBookingData>({
    date: new Date().toISOString().slice(0, 10),
    sender: '',
    senderMobile: '',
    senderAddress: '',
    center: '',
    receiver: '',
    receiverMobile: '',
    receiverAddress: '',
    carrier: '',
    referenceNumber: '',
    packageType: '',
    weight: '100',
    numberOfBoxes: '1',
    grossAmount: '',
    fuelChargePercent: '',
    insuranceAmount: '',
    cgstAmount: '',
    sgstAmount: '',
    netAmount: '0',
    parcelValue: '',
    weightUnit: 'kg',
    remarks: ''
  })

  const [rememberSettings, setRememberSettings] = useState<RememberSettings>({
    sender: false,
    center: false,
    receiver: false,
    carrier: false,
    packageType: false,
    weight: false,
    autoConsignment: false
  })

  const [parties, setParties] = useState<Party[]>([])
  const [carriers, setCarriers] = useState<Carrier[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOptions, setSelectedOptions] = useState('Select Options')
  const [showAllBookings, setShowAllBookings] = useState(false)
  const [gstIncluded, setGstIncluded] = useState(true)
  const [gstExcluded, setGstExcluded] = useState(false)
  const [addCenterOpen, setAddCenterOpen] = useState(false)
  const [centers, setCenters] = useState<Array<{ id: number; state: string; city: string; region_id: number | null }>>([])
  const [showCenterSuggest, setShowCenterSuggest] = useState(false)
  const [selectedBookingIds, setSelectedBookingIds] = useState<Set<number>>(new Set())
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)
  const [bookingToDelete, setBookingToDelete] = useState<number | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const getStateFullName = (codeOrName: string) => {
    const match = INDIAN_STATES.find(s => s.code === codeOrName)
    return match ? match.name : codeOrName
  }

  const updateBookingData = useCallback((field: keyof CashBookingData, value: string) => {
    const computeNet = (g: string, fuelPct: string, ins: string, cgst: string, sgst: string) => {
      const gross = parseFloat(g) || 0
      const fuel = (parseFloat(fuelPct) || 0) / 100 * gross
      const insurance = parseFloat(ins) || 0
      const cg = parseFloat(cgst) || 0
      const sg = parseFloat(sgst) || 0
      return (gross + fuel + insurance + cg + sg).toFixed(2)
    }

    setBookingData(prev => {
      const next = { ...prev, [field]: value }
      if (
        field === 'grossAmount' ||
        field === 'fuelChargePercent' ||
        field === 'insuranceAmount' ||
        field === 'cgstAmount' ||
        field === 'sgstAmount'
      ) {
        next.netAmount = computeNet(
          next.grossAmount,
          next.fuelChargePercent,
          next.insuranceAmount,
          next.cgstAmount,
          next.sgstAmount
        )
      }
      return next
    })
  }, [])

  interface QuotationDefault {
    id: number
    region_id: number
    package_type: string
    min_weight_grams: number
    max_weight_grams: number
    base_rate: number
    extra_per_1000g: number
  }

  const [quotationDefaults, setQuotationDefaults] = useState<QuotationDefault[]>([])

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        const headers: HeadersInit = {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
        const [partiesRes, carriersRes, bookingsRes, centersRes, defaultsRes] = await Promise.all([
          fetch('/api/parties?limit=100&page=1', { headers }),
          fetch('/api/carriers', { headers }).catch(() => ({ json: () => ({ data: [] }) })),
          fetch('/api/bookings/cash', { headers }).catch(() => ({ json: () => ({ data: [] }) })),
          fetch('/api/centers', { headers }).catch(() => ({ json: () => ({ success: true, data: [] }) })),
          fetch('/api/quotations/defaults', { headers }).catch(() => ({ json: () => ({ data: [] }) }))
        ])

        const [partiesData, carriersData, bookingsData, centersData, defaultsData] = await Promise.all([
          partiesRes.json(),
          carriersRes.json(),
          bookingsRes.json(),
          centersRes.json(),
          defaultsRes.json()
        ])

        setParties(partiesData.data || partiesData.parties || [])
        setCarriers(carriersData.data || [])
        setBookings(bookingsData.data || [])
        setCenters(centersData.success ? centersData.data || [] : [])
        setQuotationDefaults(defaultsData.data || [])
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }
    loadData()
  }, [])

  const refreshBookings = async () => {
    setIsRefreshing(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const headers: HeadersInit = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
      const bookingsRes = await fetch('/api/bookings/cash', { headers })
      const bookingsData = await bookingsRes.json()
      setBookings(bookingsData.data || [])
    } catch (error) {
      console.error('Error refreshing bookings:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleDeleteBooking = (id: number) => {
    setBookingToDelete(id)
    setIsDeleteModalOpen(true)
  }

  const executeDeleteBooking = async () => {
    if (!bookingToDelete) return
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const headersInit: HeadersInit = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
      const response = await fetch(`/api/bookings/cash/${bookingToDelete}`, {
        method: 'DELETE',
        headers: headersInit
      })

      if (response.ok) {
        alert('Booking deleted successfully!')
        refreshBookings()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete booking')
      }
    } catch (error) {
      console.error('Error deleting booking:', error)
      alert('Failed to delete booking')
    } finally {
      setIsDeleteModalOpen(false)
      setBookingToDelete(null)
    }
  }

  const handleToggleSelectAll = (filteredBookings: any[]) => {
    if (selectedBookingIds.size === filteredBookings.length) {
      setSelectedBookingIds(new Set())
    } else {
      setSelectedBookingIds(new Set(filteredBookings.map(b => b.id)))
    }
  }

  const handleToggleSelectBooking = (id: number) => {
    const next = new Set(selectedBookingIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedBookingIds(next)
  }

  const executeBulkDelete = async () => {
    if (selectedBookingIds.size === 0) return
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
      const response = await fetch('/api/bookings/cash/bulk-delete', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ids: Array.from(selectedBookingIds) })
      })

      if (response.ok) {
        alert(`${selectedBookingIds.size} bookings deleted successfully!`)
        setSelectedBookingIds(new Set())
        refreshBookings()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to bulk delete bookings')
      }
    } catch (error) {
      console.error('Error bulk deleting bookings:', error)
      alert('Failed to delete bookings')
    } finally {
      setIsBulkDeleteModalOpen(false)
    }
  }

  // Auto-calculate rate when dependencies change
  useEffect(() => {
    if (!bookingData.center || !bookingData.packageType || !bookingData.weight) return

    const calculateRate = () => {
      // 1. Find the selected center to get its region
      const centerObj = centers.find(c => c.city.toLowerCase() === bookingData.center.toLowerCase())
      if (!centerObj?.region_id) return

      // 2. Convert weight to grams for comparison
      const weightVal = parseFloat(bookingData.weight)
      if (isNaN(weightVal)) return

      const weightInGrams = bookingData.weightUnit === 'kg' ? weightVal * 1000 : weightVal

      // 3. Find matching quotation default
      const match = quotationDefaults.find(q =>
        q.region_id === centerObj.region_id &&
        q.package_type === bookingData.packageType &&
        weightInGrams > q.min_weight_grams &&
        weightInGrams <= q.max_weight_grams
      )

      if (match) {
        let amount = Number(match.base_rate)

        // Calculate extra weight charge if applicable
        // Logic: specific slab rate is usually a flat base rate for that range
        // If there's an extra_per_1000g and we are over the min weight... 
        // Actually, usually slab rates are "up to X kg = Y amount". 
        // If it's a "per kg" logic, usually base rate covers the first slab and then extra.
        // But here we matched a specific slab range. 
        // Let's assume the base_rate is the cost for that slab range.
        // If extra_per_1000g is > 0, it might apply to weight EXCEEDING the slab? 
        // Or maybe it applies to weight exceeding the min_weight?
        // Let's follow the standard pattern: Slabs usually have fixed cost.
        // If the user uses a "per kg" model, they might have a "0-1000g" slab and then "1001-..."

        // If standard slab logic:
        updateBookingData('grossAmount', amount.toFixed(2))
      }
    }

    // Only calculate if the user hasn't manually edited the amount? 
    // Or just always update like typical booking forms?
    // Let's always update for now as it's a helper.
    calculateRate()
    // Let's always update for now as it's a helper.
    calculateRate()
  }, [bookingData.center, bookingData.packageType, bookingData.weight, bookingData.weightUnit, centers, quotationDefaults, updateBookingData])



  const updateRememberSetting = (field: keyof RememberSettings, value: boolean) => {
    setRememberSettings(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!bookingData.sender) {
      alert('Please select a sender')
      return
    }

    try {
      const payload = {
        date: bookingData.date,
        sender: bookingData.sender,
        sender_mobile: bookingData.senderMobile,
        sender_address: bookingData.senderAddress,
        center: bookingData.center,
        receiver: bookingData.receiver,
        receiver_mobile: bookingData.receiverMobile,
        receiver_address: bookingData.receiverAddress,
        carrier: bookingData.carrier,
        reference_number: bookingData.referenceNumber,
        package_type: bookingData.packageType,
        weight: parseFloat(bookingData.weight) || 0,
        number_of_boxes: parseInt(bookingData.numberOfBoxes) || 1,
        gross_amount: parseFloat(bookingData.grossAmount) || 0,
        fuel_charge_percent: parseFloat(bookingData.fuelChargePercent) || 0,
        insurance_amount: parseFloat(bookingData.insuranceAmount) || 0,
        cgst_amount: parseFloat(bookingData.cgstAmount) || 0,
        sgst_amount: parseFloat(bookingData.sgstAmount) || 0,
        net_amount: parseFloat(bookingData.netAmount) || 0,
        parcel_value: parseFloat(bookingData.parcelValue) || 0,
        weight_unit: bookingData.weightUnit,
        remarks: bookingData.remarks
      }

      const response = await fetch('/api/bookings/cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        alert('Cash booking created successfully!')
        // Reset form
        setBookingData({
          date: new Date().toISOString().slice(0, 10),
          sender: '',
          senderMobile: '',
          senderAddress: '',
          center: '',
          receiver: '',
          receiverMobile: '',
          receiverAddress: '',
          carrier: '',
          referenceNumber: '',
          packageType: '',
          weight: '100',
          numberOfBoxes: '1',
          grossAmount: '',
          fuelChargePercent: '',
          insuranceAmount: '',
          cgstAmount: '',
          sgstAmount: '',
          netAmount: '0',
          parcelValue: '',
          weightUnit: 'kg',
          remarks: ''
        })

        // Refresh bookings list
        const bookingsRes = await fetch('/api/bookings/cash')
        const bookingsData = await bookingsRes.json()
        setBookings(bookingsData.data || [])
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to create booking')
      }
    } catch (error) {
      console.error('Error creating booking:', error)
      alert('Failed to create booking')
    }
  }

  return (
    <>
      <div className="p-6 bg-slate-50 min-h-screen space-y-6">
        <PageHeader
          title="Cash Bookings"
          subtitle="Manage cash bookings and transactions"
        />
        <div className="flex gap-6">
          {/* Left Panel - Cash Booking Form */}
          <div className="w-1/2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <GradientSectionHeader title="CASH BOOKING">
              <div className="flex items-center space-x-4 text-blue-100">
                <input
                  type="date"
                  value={bookingData.date}
                  onChange={(e) => updateBookingData('date', e.target.value)}
                  className="bg-white/10 border-blue-400/30 text-white placeholder-blue-200 px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent [&::-webkit-calendar-picker-indicator]:invert"
                />
                <span className="text-sm font-medium">E-WayBill (0.2 %)</span>
                <div className="flex items-center space-x-3 bg-white/10 px-3 py-2 rounded text-sm border border-blue-400/30">
                  <label className="flex items-center space-x-2 cursor-pointer hover:text-white transition-colors">
                    <input
                      type="checkbox"
                      checked={gstIncluded}
                      onChange={(e) => setGstIncluded(e.target.checked)}
                      className="rounded border-blue-300 text-blue-600 focus:ring-blue-500 bg-white/80"
                    />
                    <span>GST (18 %)</span>
                  </label>
                  <div className="w-px h-4 bg-blue-400/50"></div>
                  <label className="flex items-center space-x-2 cursor-pointer hover:text-white transition-colors">
                    <input
                      type="checkbox"
                      checked={gstExcluded}
                      onChange={(e) => setGstExcluded(e.target.checked)}
                      className="rounded border-blue-300 text-blue-600 focus:ring-blue-500 bg-white/80"
                    />
                    <span>Included GST</span>
                  </label>
                  <div className="w-px h-4 bg-blue-400/50"></div>
                  <span className="opacity-75">Excluded GST</span>
                </div>
              </div>
            </GradientSectionHeader>


            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Sender and Sender Mobile */}
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="SENDER"
                  value={bookingData.sender}
                  onChange={(e) => updateBookingData('sender', e.target.value)}
                  className="w-full border border-red-300 px-3 py-2 rounded text-sm bg-red-50"
                  required
                />
                <input
                  type="text"
                  placeholder="SENDER MOBILE"
                  value={bookingData.senderMobile}
                  onChange={(e) => updateBookingData('senderMobile', e.target.value)}
                  className="w-full border border-slate-300 px-3 py-2 rounded text-sm"
                />
              </div>

              {/* Sender Address */}
              <div>
                <input
                  type="text"
                  placeholder="SENDER ADDRESS"
                  value={bookingData.senderAddress}
                  onChange={(e) => updateBookingData('senderAddress', e.target.value)}
                  className="w-full border border-slate-300 px-3 py-2 rounded text-sm"
                />
              </div>

              {/* Center */}
              <div className="flex items-center space-x-2 relative">
                <input
                  type="text"
                  placeholder="CENTER"
                  value={bookingData.center}
                  onChange={(e) => {
                    updateBookingData('center', e.target.value)
                    setShowCenterSuggest(true)
                  }}
                  onFocus={() => setShowCenterSuggest(true)}
                  onBlur={() => setTimeout(() => setShowCenterSuggest(false), 150)}
                  className="flex-1 border border-slate-300 px-3 py-2 rounded text-sm"
                />
                <button type="button" className="px-3 py-2 text-slate-600" onClick={() => setAddCenterOpen(true)} title="Add Center">
                  <Plus className="h-4 w-4" />
                </button>
                {showCenterSuggest && bookingData.center && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded shadow z-10 max-h-48 overflow-auto">
                    {(centers
                      .filter(c => {
                        const term = bookingData.center.toLowerCase()
                        const stateFull = getStateFullName(c.state).toLowerCase()
                        const cityName = getCityName(c.city).toLowerCase()
                        // Prioritize matches that start with the term, but allow broader search too
                        return c.city.toLowerCase().includes(term) || cityName.includes(term) || stateFull.includes(term)
                      })
                      .slice(0, 8)
                    ).map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          updateBookingData('center', c.city)
                          setShowCenterSuggest(false)
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm"
                      >
                        {getCityName(c.city)} ({c.city}), {getStateFullName(c.state)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Receiver and Receiver Mobile */}
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="RECEIVER"
                  value={bookingData.receiver}
                  onChange={(e) => updateBookingData('receiver', e.target.value)}
                  className="w-full border border-red-300 px-3 py-2 rounded text-sm bg-red-50"
                  required
                />
                <input
                  type="text"
                  placeholder="RECEIVER MOBILE"
                  value={bookingData.receiverMobile}
                  onChange={(e) => updateBookingData('receiverMobile', e.target.value)}
                  className="w-full border border-slate-300 px-3 py-2 rounded text-sm"
                />
              </div>

              {/* Receiver Address */}
              <div>
                <input
                  type="text"
                  placeholder="RECEIVER ADDRESS"
                  value={bookingData.receiverAddress}
                  onChange={(e) => updateBookingData('receiverAddress', e.target.value)}
                  className="w-full border border-slate-300 px-3 py-2 rounded text-sm"
                />
              </div>

              {/* Carrier, Consignment no., Reference no. */}
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Carrier"
                  value={bookingData.carrier}
                  onChange={(e) => updateBookingData('carrier', e.target.value)}
                  className="w-full border border-slate-300 px-3 py-2 rounded text-sm"
                />
                <input
                  type="text"
                  placeholder="Consignment no. eg."
                  className="w-full border border-slate-300 px-3 py-2 rounded text-sm"
                />
                <input
                  type="text"
                  placeholder="Reference no. eg. 45871"
                  value={bookingData.referenceNumber}
                  onChange={(e) => updateBookingData('referenceNumber', e.target.value)}
                  className="w-full border border-slate-300 px-3 py-2 rounded text-sm"
                />
              </div>

              {/* Package Type, Weight, Number of Boxes */}
              <div className="grid grid-cols-7 gap-2">
                <div className="col-span-3">
                  <input
                    type="text"
                    placeholder="Package Type"
                    value={bookingData.packageType}
                    onChange={(e) => updateBookingData('packageType', e.target.value)}
                    className="w-full border border-slate-300 px-3 py-2 rounded text-sm h-[38px]"
                  />
                </div>
                <div className="col-span-3 flex items-center">
                  <input
                    type="number"
                    placeholder="100"
                    value={bookingData.weight}
                    onChange={(e) => updateBookingData('weight', e.target.value)}
                    className="flex-1 w-full min-w-[150px] border border-slate-300 px-3 py-2 rounded-l text-sm h-[38px] bg-yellow-50"
                  />
                  <select
                    value={bookingData.weightUnit}
                    onChange={(e) => updateBookingData('weightUnit', e.target.value as 'gm' | 'kg')}
                    className="bg-slate-100 border border-l-0 border-slate-300 px-2 py-2 rounded-r text-xs focus:outline-none h-[38px] min-w-[60px]"
                  >
                    <option value="kg">kg</option>
                    <option value="gm">gm</option>
                  </select>
                </div>
                <div className="col-span-1">
                  <input
                    type="number"
                    placeholder="Box"
                    value={bookingData.numberOfBoxes}
                    onChange={(e) => updateBookingData('numberOfBoxes', e.target.value)}
                    className="w-full border border-slate-300 px-3 py-2 rounded text-sm h-[38px]"
                  />
                </div>
              </div>

              {/* GROSS Amt */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-200 px-3 py-2 rounded text-sm font-medium">GROSS Amt</div>
                <input
                  type="number"
                  placeholder="Amount"
                  value={bookingData.grossAmount}
                  onChange={(e) => updateBookingData('grossAmount', e.target.value)}
                  className="w-full border border-slate-300 px-3 py-2 rounded text-sm"
                />
              </div>

              {/* Other Charges */}
              <div className="text-sm font-medium mb-2">Other Charges</div>

              {/* Fuel Charge */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-200 px-3 py-2 rounded text-sm">Fuel Charge (%)</div>
                <input
                  type="number"
                  placeholder="%"
                  value={bookingData.fuelChargePercent}
                  onChange={(e) => updateBookingData('fuelChargePercent', e.target.value)}
                  className="w-full border border-slate-300 px-3 py-2 rounded text-sm"
                />
              </div>

              {/* Insurance Amt */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-200 px-3 py-2 rounded text-sm">Insurance Amt</div>
                <input
                  type="number"
                  placeholder="Amount"
                  value={bookingData.insuranceAmount}
                  onChange={(e) => updateBookingData('insuranceAmount', e.target.value)}
                  className="w-full border border-slate-300 px-3 py-2 rounded text-sm"
                />
              </div>

              {/* CGST Amt */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-200 px-3 py-2 rounded text-sm">CGST Amt</div>
                <input
                  type="number"
                  placeholder="Amount"
                  value={bookingData.cgstAmount}
                  onChange={(e) => updateBookingData('cgstAmount', e.target.value)}
                  className="w-full border border-slate-300 px-3 py-2 rounded text-sm"
                />
              </div>

              {/* SGST Amt */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-200 px-3 py-2 rounded text-sm">SGST Amt</div>
                <input
                  type="number"
                  placeholder="Amount"
                  value={bookingData.sgstAmount}
                  onChange={(e) => updateBookingData('sgstAmount', e.target.value)}
                  className="w-full border border-slate-300 px-3 py-2 rounded text-sm"
                />
              </div>

              {/* NET Amt */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-red-200 px-3 py-2 rounded text-sm font-medium text-red-800">NET Amt</div>
                <input
                  type="number"
                  value={bookingData.netAmount}
                  onChange={(e) => updateBookingData('netAmount', e.target.value)}
                  className="w-full border border-slate-300 px-3 py-2 rounded text-sm bg-slate-50"
                  readOnly
                />
              </div>

              {/* Parcel Value */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-200 px-3 py-2 rounded text-sm">Parcel Value</div>
                <input
                  type="number"
                  placeholder="Amount"
                  value={bookingData.parcelValue}
                  onChange={(e) => updateBookingData('parcelValue', e.target.value)}
                  className="w-full border border-slate-300 px-3 py-2 rounded text-sm"
                />
              </div>

              {/* Remarks */}
              <div>
                <textarea
                  placeholder="Remarks"
                  value={bookingData.remarks}
                  onChange={(e) => updateBookingData('remarks', e.target.value)}
                  className="w-full border border-slate-300 px-3 py-2 rounded text-sm"
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <button
                  type="button"
                  className="flex-1 bg-gray-300 text-slate-700 px-4 py-2 rounded text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-orange-500 text-white px-4 py-2 rounded text-sm hover:bg-orange-600"
                >
                  Add
                </button>
              </div>

              {/* Remember Section */}
              <div className="mt-4">
                <div className="text-sm font-medium mb-2">REMEMBER</div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <label className="flex items-center space-x-1">
                    <input
                      type="checkbox"
                      checked={rememberSettings.sender}
                      onChange={(e) => updateRememberSetting('sender', e.target.checked)}
                      className="rounded"
                    />
                    <span>Sender</span>
                  </label>
                  <label className="flex items-center space-x-1">
                    <input
                      type="checkbox"
                      checked={rememberSettings.center}
                      onChange={(e) => updateRememberSetting('center', e.target.checked)}
                      className="rounded"
                    />
                    <span>Center</span>
                  </label>
                  <label className="flex items-center space-x-1">
                    <input
                      type="checkbox"
                      checked={rememberSettings.receiver}
                      onChange={(e) => updateRememberSetting('receiver', e.target.checked)}
                      className="rounded"
                    />
                    <span>Receiver</span>
                  </label>
                  <label className="flex items-center space-x-1">
                    <input
                      type="checkbox"
                      checked={rememberSettings.carrier}
                      onChange={(e) => updateRememberSetting('carrier', e.target.checked)}
                      className="rounded"
                    />
                    <span>Carrier</span>
                  </label>
                  <label className="flex items-center space-x-1">
                    <input
                      type="checkbox"
                      checked={rememberSettings.packageType}
                      onChange={(e) => updateRememberSetting('packageType', e.target.checked)}
                      className="rounded"
                    />
                    <span>Package Type</span>
                  </label>
                  <label className="flex items-center space-x-1">
                    <input
                      type="checkbox"
                      checked={rememberSettings.weight}
                      onChange={(e) => updateRememberSetting('weight', e.target.checked)}
                      className="rounded"
                    />
                    <span>Weight</span>
                  </label>
                  <label className="flex items-center space-x-1">
                    <input
                      type="checkbox"
                      checked={rememberSettings.autoConsignment}
                      onChange={(e) => updateRememberSetting('autoConsignment', e.target.checked)}
                      className="rounded"
                    />
                    <span>Auto Consignment</span>
                  </label>
                </div>
              </div>
            </form>
          </div>

          {/* Right Panel - Bookings List */}
          <div className="w-1/2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <GradientSectionHeader
              title="BOOKINGS / CASH"
              variant="emerald"
              actions={
                <div className="flex items-center gap-2">
                  {selectedBookingIds.size > 0 && (
                    <button
                      onClick={() => setIsBulkDeleteModalOpen(true)}
                      className="px-3 py-1.5 bg-red-500 text-white rounded text-sm hover:bg-red-600 flex items-center gap-1 shadow-sm transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete ({selectedBookingIds.size})</span>
                    </button>
                  )}
                  <button
                    onClick={refreshBookings}
                    disabled={isRefreshing}
                    className="px-3 py-1.5 bg-white/20 text-white rounded text-sm hover:bg-white/30 disabled:opacity-50 flex items-center gap-1 backdrop-blur-sm transition-colors"
                  >
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                  </button>
                  <button
                    onClick={() => setShowAllBookings(!showAllBookings)}
                    className={`flex items-center space-x-1 text-sm px-3 py-1.5 rounded transition-colors ${showAllBookings
                      ? 'bg-white text-emerald-700 font-medium'
                      : 'text-emerald-100 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    <Eye className="h-4 w-4" />
                    <Check className="h-4 w-4" />
                    <span>SHOW ALL</span>
                  </button>
                </div>
              }
            >
              <div className="flex space-x-2">
                <div className="flex items-center bg-white/10 border border-emerald-400/30 rounded px-2">
                  <input
                    type="checkbox"
                    checked={bookings.length > 0 && selectedBookingIds.size === bookings.filter(booking => {
                      const matchesSearch = !searchTerm ||
                        booking.sender?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        booking.receiver?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        booking.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        booking.sender_mobile?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        booking.receiver_mobile?.toLowerCase().includes(searchTerm.toLowerCase())

                      if (!matchesSearch) return false
                      if (selectedOptions === 'Select Options') return true

                      const bookingDate = new Date(booking.booking_date || booking.date)
                      const now = new Date()

                      if (selectedOptions === 'Today') {
                        return bookingDate.toDateString() === now.toDateString()
                      }
                      if (selectedOptions === 'This Week') {
                        const oneWeekAgo = new Date()
                        oneWeekAgo.setDate(now.getDate() - 7)
                        return bookingDate >= oneWeekAgo
                      }
                      if (selectedOptions === 'This Month') {
                        return bookingDate.getMonth() === now.getMonth() && bookingDate.getFullYear() === now.getFullYear()
                      }
                      return true
                    }).length}
                    onChange={() => handleToggleSelectAll(bookings.filter(booking => {
                      const matchesSearch = !searchTerm ||
                        booking.sender?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        booking.receiver?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        booking.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        booking.sender_mobile?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        booking.receiver_mobile?.toLowerCase().includes(searchTerm.toLowerCase())

                      if (!matchesSearch) return false
                      if (selectedOptions === 'Select Options') return true

                      const bookingDate = new Date(booking.booking_date || booking.date)
                      const now = new Date()

                      if (selectedOptions === 'Today') {
                        return bookingDate.toDateString() === now.toDateString()
                      }
                      if (selectedOptions === 'This Week') {
                        const oneWeekAgo = new Date()
                        oneWeekAgo.setDate(now.getDate() - 7)
                        return bookingDate >= oneWeekAgo
                      }
                      if (selectedOptions === 'This Month') {
                        return bookingDate.getMonth() === now.getMonth() && bookingDate.getFullYear() === now.getFullYear()
                      }
                      return true
                    }))}
                    className="rounded border-emerald-400/50 text-emerald-500 focus:ring-emerald-500 h-4 w-4 bg-white/20"
                  />
                </div>
                <select
                  value={selectedOptions}
                  onChange={(e) => setSelectedOptions(e.target.value)}
                  className="bg-white/10 border-emerald-400/30 text-white px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-white/50 [&>option]:text-slate-900"
                >
                  <option>Select Options</option>
                  <option>Today</option>
                  <option>This Week</option>
                  <option>This Month</option>
                </select>

                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Search bookings..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white/10 border-emerald-400/30 text-white placeholder-emerald-200 px-3 py-2 pl-8 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                  />
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-emerald-200" />
                </div>
              </div>
            </GradientSectionHeader>

            {/* Bookings List */}
            <div className="space-y-2">
              {bookings.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p>No records found.</p>
                </div>
              ) : (
                bookings
                  .filter(booking => {
                    const matchesSearch = !searchTerm ||
                      booking.sender?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      booking.receiver?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      booking.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      booking.sender_mobile?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      booking.receiver_mobile?.toLowerCase().includes(searchTerm.toLowerCase())

                    if (!matchesSearch) return false
                    if (selectedOptions === 'Select Options') return true

                    const bookingDate = new Date(booking.booking_date)
                    const now = new Date()

                    if (selectedOptions === 'Today') {
                      return bookingDate.toDateString() === now.toDateString()
                    }
                    if (selectedOptions === 'This Week') {
                      const oneWeekAgo = new Date()
                      oneWeekAgo.setDate(now.getDate() - 7)
                      return bookingDate >= oneWeekAgo
                    }
                    if (selectedOptions === 'This Month') {
                      return bookingDate.getMonth() === now.getMonth() && bookingDate.getFullYear() === now.getFullYear()
                    }
                    return true
                  })

                  .map((booking) => (
                    <div
                      key={booking.id}
                      className={`border rounded-xl p-4 hover:shadow-sm transition-all duration-200 bg-white ${selectedBookingIds.has(booking.id) ? 'border-emerald-500 ring-1 ring-emerald-500/20 shadow-md translate-x-1' : 'border-slate-200'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          {/* Checkbox */}
                          <div className="pt-3">
                            <input
                              type="checkbox"
                              checked={selectedBookingIds.has(booking.id)}
                              onChange={() => handleToggleSelectBooking(booking.id)}
                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 transition-colors"
                            />
                          </div>

                          {/* Party Icon */}
                          <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                            {booking.sender?.charAt(0)?.toUpperCase() || 'C'}
                          </div>

                          {/* Booking Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-slate-900 truncate">
                                {booking.sender || 'Unknown'}
                              </span>
                              {booking.package_type && (
                                <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded font-medium">
                                  {booking.package_type}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center text-sm text-slate-600 mb-2">
                              <Package className="h-3 w-3 mr-1" />
                              <span className="truncate">
                                WT {booking.weight || 0} {booking.weight_unit || 'kg'} | {booking.number_of_boxes || 1} Box
                              </span>
                            </div>

                            <div className="text-xs text-slate-500">
                              To: <span className="font-medium text-slate-700">{booking.receiver || 'N/A'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-1 ml-3">
                          <button
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded"
                            title="View Booking ID"
                          >
                            <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">
                              #{booking.id?.toString().padStart(4, '0') || '0000'}
                            </span>
                          </button>
                          <button
                            onClick={() => handleDeleteBooking(booking.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title="Delete Booking"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Footer with amount and date */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                        <div className="text-xs text-slate-500">
                          {new Date(booking.date || booking.booking_date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-sm font-semibold text-slate-900">
                          ₹{parseFloat(booking.net_amount || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Add Center Modal */}
      <AddCenterModal
        isOpen={addCenterOpen}
        onClose={() => setAddCenterOpen(false)}
        onSaved={(created) => {
          // Set the center to the newly created city/town
          updateBookingData('center', created.city)
          setAddCenterOpen(false)
        }}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={executeDeleteBooking}
        title="Delete Booking"
        message="Are you sure you want to delete this booking? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      <ConfirmationModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={executeBulkDelete}
        title="Bulk Delete Bookings"
        message={`Are you sure you want to delete ${selectedBookingIds.size} selected bookings? This action cannot be undone.`}
        confirmText="Delete All Selected"
        cancelText="Cancel"
        type="danger"
      />
    </>
  )
}
