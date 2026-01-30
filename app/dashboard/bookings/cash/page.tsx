'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Plus } from 'lucide-react'
import { INDIAN_STATES, getCityName } from '@/lib/indiaData' // Replaced ALL_LOCATIONS
// ...
const getStateFullName = (codeOrName: string) => {
  const match = INDIAN_STATES.find(s => s.code === codeOrName)
  return match ? match.name : codeOrName
}
import AddCenterModal from '@/components/AddCenterModal'
import GradientSectionHeader from '@/components/GradientSectionHeader'
import PageHeader from '@/components/PageHeader'


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
                <span className="text-sm text-emerald-100 flex items-center gap-1 bg-white/10 px-2 py-1 rounded">
                  👁️ ✓ SHOW ALL BOOKING
                </span>
              }
            >
              <div className="flex space-x-2">
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

                  .map((booking, index) => (
                    <div key={index} className="border border-slate-200 rounded p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {booking.sender?.charAt(0) || 'C'}
                          </div>
                          <div>
                            <div className="font-medium">{booking.sender} - {booking.receiver}</div>
                            <div className="text-slate-500 text-xs">
                              {booking.reference_number} | ₹{booking.net_amount}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-slate-500">
                          #{booking.id || 'WP6450061'}
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
    </>
  )
}
