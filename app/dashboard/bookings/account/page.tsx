'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Search, Plus, Eye, Check, Printer, FileText, Package, Trash2, Upload } from 'lucide-react'
import { INDIAN_STATES, getCityName } from '@/lib/indiaData' // Replaced ALL_LOCATIONS
// ...
const getStateFullName = (codeOrName: string) => {
  const match = INDIAN_STATES.find(s => s.code === codeOrName)
  return match ? match.name : codeOrName
}

// ... (existing imports)


import AddCenterModal from '@/components/AddCenterModal'
import BookingImportUploader from '@/components/BookingImportUploader'
import BulkUploadModal from '@/components/BulkUploadModal'
import ConfirmationModal from '@/components/ConfirmationModal'
import GradientSectionHeader from '@/components/GradientSectionHeader'
import PageHeader from '@/components/PageHeader'



interface Party {
  id: number
  party_name: string
  contact_person: string
  phone: string
  email: string
  city: string
  state: string
  has_quotation: boolean
  quotations: Array<{
    package_type: string
    rates: any
    created_at: string
    updated_at: string
  }>
  package_configs?: Array<{
    name: string
    unit: string
    extraWeight?: number
    ranges?: any[]
  }>
}


interface Carrier {
  id: number
  name: string
}

interface BookingData {
  date: string
  sender: string
  senderId: string
  center: string
  receiver: string
  mobile: string
  carrier: string
  consignmentNumber: string
  referenceNumber: string
  packageType: string
  weight: string
  numberOfBoxes: string
  grossAmount: string
  otherCharges: string
  insuranceAmount: string
  parcelValue: string
  netAmount: string
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

export default function AccountBookingPage() {
  const [bookingData, setBookingData] = useState<BookingData>({
    date: new Date().toISOString().slice(0, 10),
    sender: '',
    senderId: '',
    center: '',
    receiver: '',
    mobile: '',
    carrier: '',
    consignmentNumber: '',
    referenceNumber: '',
    packageType: '',
    weight: '100',
    numberOfBoxes: '1',
    grossAmount: '',
    otherCharges: '',
    insuranceAmount: '',
    parcelValue: '',
    netAmount: '',
    weightUnit: 'gm',
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

  const [bookingImportExpanded, setBookingImportExpanded] = useState(false)
  const [offlineImportExpanded, setOfflineImportExpanded] = useState(false)
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false)

  const [parties, setParties] = useState<Party[]>([])
  const [carriers, setCarriers] = useState<Carrier[]>([])
  const [regions, setRegions] = useState<any[]>([])
  const [addCenterOpen, setAddCenterOpen] = useState(false)
  const [centers, setCenters] = useState<Array<{ id: number; state: string; city: string; region_id: number | null }>>([])
  const [showCenterSuggest, setShowCenterSuggest] = useState(false)
  const [bookings, setBookings] = useState<any[]>([])
  const [selectedPartyQuotations, setSelectedPartyQuotations] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOptions, setSelectedOptions] = useState('Select Options')
  const [editBookingId, setEditBookingId] = useState<number | null>(null)
  const [showAllBookings, setShowAllBookings] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [receivers, setReceivers] = useState<Array<{ id: number; name: string; city?: string; contact?: string }>>([])
  const [showReceiverSuggest, setShowReceiverSuggest] = useState(false)
  const [bookingToDelete, setBookingToDelete] = useState<number | null>(null)
  const [selectedBookingIds, setSelectedBookingIds] = useState<Set<number>>(new Set())
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)

  const getStateFullName = (codeOrName: string) => {
    const match = INDIAN_STATES.find(s => s.code === codeOrName)
    return match ? match.name : codeOrName
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        const headers: HeadersInit = {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
        const [partiesRes, carriersRes, regionsRes, bookingsRes, centersRes, receiversRes] = await Promise.all([
          fetch('/api/parties/quotations', { headers }),
          fetch('/api/carriers', { headers }).catch(() => ({ json: () => ({ data: [] }) })),
          fetch('/api/regions', { headers }).catch(() => ({ json: () => ({ data: [] }) })),
          fetch('/api/bookings/account', { headers }).catch(() => ({ json: () => ({ data: [] }) })),
          fetch('/api/centers', { headers }).catch(() => ({ json: () => ({ success: true, data: [] }) })),
          fetch('/api/receivers?limit=1000', { headers }).catch(() => ({ json: () => ({ data: [] }) }))
        ])

        const [partiesData, carriersData, regionsData, bookingsData, centersData, receiversData] = await Promise.all([
          partiesRes.json(),
          carriersRes.json(),
          regionsRes.json(),
          bookingsRes.json(),
          centersRes.json(),
          receiversRes.json()
        ])

        setParties(partiesData.data || [])
        setCarriers(carriersData.data || [])
        setRegions(regionsData.data || [])
        setBookings(bookingsData.data || [])
        setCenters(centersData.success ? centersData.data || [] : [])
        setReceivers(receiversData.data || [])
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }
    loadData()
  }, [])

  const computeNet = (gross: string, other: string, insurance: string) => {
    const g = parseFloat(gross) || 0
    const o = parseFloat(other) || 0
    const i = parseFloat(insurance) || 0
    return (g + o + i).toFixed(2)
  }

  const refreshBookings = async () => {
    console.log('Manual refresh triggered')
    setIsRefreshing(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const headers: HeadersInit = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
      console.log('Fetching bookings with headers:', headers)
      const bookingsRes = await fetch('/api/bookings/account', { headers })
      const bookingsData = await bookingsRes.json()
      console.log('Bookings response:', bookingsData)
      setBookings(bookingsData.data || [])
      console.log('Bookings updated, count:', bookingsData.data?.length || 0)
    } catch (error) {
      console.error('Error refreshing bookings:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const updateBookingData = (field: keyof BookingData, value: string) => {
    setBookingData(prev => {
      const next = { ...prev, [field]: value }
      // Auto-calc Net = Gross + Other + Insurance for any change to these fields
      if (field === 'grossAmount' || field === 'otherCharges' || field === 'insuranceAmount') {
        next.netAmount = computeNet(next.grossAmount, next.otherCharges, next.insuranceAmount)
      }
      return next
    })

    let effectiveUnit = bookingData.weightUnit

    // Auto-switch weight unit when package type changes
    if (field === 'packageType') {
      const selectedParty = parties.find(p => p.id.toString() === bookingData.senderId)
      if (selectedParty && selectedParty.package_configs) {
        const config = selectedParty.package_configs.find((pc: any) => pc.name === value)
        if (config && config.unit) {
          effectiveUnit = config.unit as 'gm' | 'kg'
          setBookingData(prev => ({ ...prev, weightUnit: effectiveUnit }))
        }
      }
    }

    // Auto-calculate gross amount when center, package type, weight, or unit changes
    if (field === 'center' || field === 'packageType' || field === 'weight' || field === 'weightUnit') {
      calculateGrossAmount({
        ...bookingData,
        [field]: value,
        weightUnit: effectiveUnit
      })
    }
  }


  const handleSenderChange = (senderId: string) => {
    const selectedParty = parties.find(p => p.id.toString() === senderId)
    if (selectedParty) {
      setBookingData(prev => ({
        ...prev,
        sender: selectedParty.party_name,
        senderId: senderId
      }))
      setSelectedPartyQuotations(selectedParty.quotations || [])
    }
  }

  // Find region name for a given city/town using regions loaded from API
  const findRegionForCity = (city: string): string | null => {
    if (!city) return null
    const lcCity = city.trim().toLowerCase()
    for (const region of regions) {
      // region.states is an object: stateCode -> string[] of city names
      const stateEntries = Object.entries(region.states || {}) as Array<[string, string[]]>
      for (const [, cities] of stateEntries) {
        if (Array.isArray(cities) && cities.some(c => String(c).toLowerCase() === lcCity)) {
          return region.name
        }
      }
    }
    return null
  }

  // Flexible weight key matching similar to print page logic
  const findBestMatchingRate = (regionRates: any, weightStr: string): number | null => {
    if (!regionRates || typeof regionRates !== 'object') return null
    const w = (weightStr || '').toString().trim()
    if (!w) return null

    // Extract weight and unit from input string
    const match = weightStr.match(/^([\d.]+)\s*(gm|kg|g)?$/i)
    const val = match ? match[1] : w
    const unit = match && match[2] ? match[2].toLowerCase() : ''

    const candidates = []
    if (unit) {
      // 1. Prioritize exact matches with the input unit
      candidates.push(`${val} ${unit}`, `${val}${unit}`)

      // 2. Add equivalents in other units for conversion
      if (unit === 'kg') {
        const gmVal = parseFloat(val) * 1000
        candidates.push(`${gmVal} gm`, `${gmVal}gm`, `${gmVal} g`, `${gmVal}g`, String(gmVal))
      } else if (unit === 'gm' || unit === 'g') {
        const kgVal = parseFloat(val) / 1000
        candidates.push(`${kgVal} kg`, `${kgVal}kg`, String(kgVal))
        // also try without trailing zeros if any
        const kgStr = parseFloat(kgVal.toFixed(3)).toString()
        if (kgStr !== String(kgVal)) {
          candidates.push(`${kgStr} kg`, `${kgStr}kg`)
        }
      }
    }

    // 3. Add general versions
    candidates.push(val, w.toLowerCase(), w.toUpperCase(), w.replace(/\s+/g, ''))

    // 4. Case-insensitive check of all keys if no direct candidate match
    // (Optimization: first check candidates for exact key match including case)
    for (const key of candidates) {
      if (regionRates[key] != null && regionRates[key] !== '') {
        const v = regionRates[key]
        const n = typeof v === 'number' ? v : parseFloat(v)
        return isNaN(n) ? null : n
      }
    }

    // 5. Case-insensitive fallback
    const lowerCandidates = candidates.map(c => c.toLowerCase())
    for (const key of Object.keys(regionRates)) {
      if (lowerCandidates.includes(key.toLowerCase())) {
        const v = regionRates[key]
        const n = typeof v === 'number' ? v : parseFloat(v)
        return isNaN(n) ? null : n
      }
    }
    // Fallback: try any key containing the digits
    const m = w.match(/(\d+)/)
    if (m) {
      const num = m[1]
      for (const k of Object.keys(regionRates)) {
        if (k.includes(num) && regionRates[k] != null && regionRates[k] !== '') {
          const v = regionRates[k]
          const n = typeof v === 'number' ? v : parseFloat(v)
          return isNaN(n) ? null : n
        }
      }
    }
    return null
  }

  const calculateGrossAmount = async (data: BookingData) => {
    if (!data.senderId || !data.center || !data.packageType || !data.weight) {
      return
    }

    try {
      // Find the selected party's quotation for the package type
      const selectedParty = parties.find(p => p.id.toString() === data.senderId)
      if (!selectedParty || !selectedParty.quotations) return

      const quotation = selectedParty.quotations.find((q: any) => q.package_type === data.packageType)
      if (!quotation || !quotation.rates) return

      const rates = quotation.rates

      // Resolve effective region key: direct center match or mapped region name
      const directKey = data.center
      const mappedRegion = findRegionForCity(data.center)
      const regionKey = rates[directKey]
        ? directKey
        : (mappedRegion && rates[mappedRegion]) ? mappedRegion : null
      if (!regionKey) return

      const regionRates = rates[regionKey]
      const weightWithUnit = `${data.weight} ${data.weightUnit}`
      const perUnitRate = findBestMatchingRate(regionRates, weightWithUnit)
      if (perUnitRate == null) return

      // For now treat rate as slab price (not per-gram multiplier). If design later changes, we can adjust.
      const grossAmount = perUnitRate

      setBookingData(prev => {
        const grossStr = Number(grossAmount).toFixed(2)
        return {
          ...prev,
          grossAmount: grossStr,
          // Also update Net = Gross + Other + Insurance
          netAmount: computeNet(grossStr, prev.otherCharges, prev.insuranceAmount)
        }
      })
    } catch (error) {
      console.error('Error calculating gross amount:', error)
    }
  }

  const updateRememberSetting = (field: keyof RememberSettings, value: boolean) => {
    setRememberSettings(prev => ({ ...prev, [field]: value }))
  }

  const populateFormFromBooking = (booking: any) => {
    // Find the party that matches the sender
    const matchingParty = parties.find(party => party.party_name === booking.sender)

    setBookingData({
      date: booking.booking_date ? new Date(booking.booking_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      sender: booking.sender || '',
      senderId: matchingParty?.id.toString() || '',
      center: booking.center || '', // Use the actual stored center value
      receiver: booking.receiver || '',
      mobile: booking.mobile || '',
      carrier: booking.carrier || '',
      consignmentNumber: booking.consignment_number || '',
      referenceNumber: booking.reference_number || '',
      packageType: booking.package_type || '',
      weight: booking.weight?.toString() || '100',
      numberOfBoxes: booking.number_of_boxes?.toString() || '1',
      grossAmount: booking.gross_amount?.toString() || '',
      otherCharges: booking.other_charges?.toString() || '',
      insuranceAmount: booking.insurance_amount?.toString() || '',
      parcelValue: booking.parcel_value?.toString() || '',
      netAmount: booking.net_amount?.toString() || '',
      weightUnit: booking.weight_unit || 'gm',
      remarks: booking.remarks || ''
    })

    // Set party quotations if party found
    if (matchingParty) {
      setSelectedPartyQuotations(matchingParty.quotations || [])
    }

    setEditBookingId(booking.id)
  }

  const resetForm = () => {
    setBookingData({
      date: new Date().toISOString().slice(0, 10),
      sender: '',
      senderId: '',
      center: '',
      receiver: '',
      mobile: '',
      carrier: '',
      consignmentNumber: '',
      referenceNumber: '',
      packageType: '',
      weight: '100',
      numberOfBoxes: '1',
      grossAmount: '',
      otherCharges: '',
      insuranceAmount: '',
      parcelValue: '',
      netAmount: '',
      weightUnit: 'gm',
      remarks: ''
    })
    setSelectedPartyQuotations([])
    setEditBookingId(null)
  }

  const handleDeleteBooking = (bookingId: number) => {
    setBookingToDelete(bookingId)
    setIsDeleteModalOpen(true)
  }

  const executeDeleteBooking = async () => {
    if (!bookingToDelete) return

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const headers: HeadersInit = {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }

      console.log(`Attempting to delete booking: ${bookingToDelete}`)
      const response = await fetch(`/api/bookings/account/${bookingToDelete}`, {
        method: 'DELETE',
        headers
      })

      if (response.ok) {
        alert('Booking deleted successfully!')
        // Reload bookings
        const bookingsRes = await fetch('/api/bookings/account', { headers })
        const bookingsData = await bookingsRes.json()
        setBookings(bookingsData.data || [])

        // If we were editing this booking, reset the form
        if (editBookingId === bookingToDelete) {
          resetForm()
        }
      } else {
        const error = await response.json()
        console.error('Delete failed:', error)
        alert(error.message || 'Failed to delete booking')
      }
    } catch (error) {
      console.error('Error deleting booking:', error)
      alert('Failed to delete booking')
    } finally {
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

      const response = await fetch('/api/bookings/account/bulk-delete', {
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


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!bookingData.sender) {
      alert('Please select a sender')
      return
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }

      // Auto-save receiver if new
      if (bookingData.receiver && !receivers.some(r => r.name.toLowerCase() === bookingData.receiver.toLowerCase())) {
        try {
          fetch('/api/receivers', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              name: bookingData.receiver,
              contact: bookingData.mobile,
              city: bookingData.center
            })
          }).then(() => {
            // Refresh receivers list silently
            fetch('/api/receivers?limit=1000', { headers })
              .then(res => res.json())
              .then(data => setReceivers(data.data || []))
          })
        } catch (ignore) { }
      }

      const payload = {
        date: bookingData.date,
        sender: bookingData.sender,
        center: bookingData.center,
        receiver: bookingData.receiver,
        mobile: bookingData.mobile,
        carrier: bookingData.carrier,
        reference_number: bookingData.referenceNumber,
        consignment_number: bookingData.consignmentNumber,
        package_type: bookingData.packageType,
        weight: parseFloat(bookingData.weight),
        number_of_boxes: parseInt(bookingData.numberOfBoxes),
        gross_amount: parseFloat(bookingData.grossAmount) || 0,
        other_charges: parseFloat(bookingData.otherCharges) || 0,
        insurance_amount: parseFloat(bookingData.insuranceAmount) || 0,
        parcel_value: parseFloat(bookingData.parcelValue) || 0,
        net_amount: parseFloat(bookingData.netAmount) || 0,
        weight_unit: bookingData.weightUnit,
        remarks: bookingData.remarks
      }

      const method = editBookingId ? 'PUT' : 'POST'
      const url = editBookingId ? `/api/bookings/account/${editBookingId}` : '/api/bookings/account'



      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        alert(`Booking ${editBookingId ? 'updated' : 'created'} successfully!`)
        resetForm()
        // Reload bookings
        const bookingsRes = await fetch('/api/bookings/account', { headers })
        const bookingsData = await bookingsRes.json()
        setBookings(bookingsData.data || [])
      } else {
        const error = await response.json()
        alert(error.message || `Failed to ${editBookingId ? 'update' : 'create'} booking`)
      }
    } catch (error) {
      console.error(`Error ${editBookingId ? 'updating' : 'creating'} booking:`, error)
      alert(`Failed to ${editBookingId ? 'update' : 'create'} booking`)
    }
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-6">
      <PageHeader
        title="Account Bookings"
        subtitle="Manage credit bookings and invoices"
      />
      <div className="flex gap-6">
        {/* Left Panel - Booking Form */}
        <div className="w-1/2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <GradientSectionHeader
            title={
              <>
                {editBookingId ? 'EDIT ACCOUNT BOOKING' : 'ACCOUNT BOOKING'}
                {editBookingId && (
                  <span className="ml-2 text-sm text-yellow-200 font-normal">
                    (Booking #{editBookingId})
                  </span>
                )}
              </>
            }
            actions={
              editBookingId && (
                <button
                  onClick={resetForm}
                  className="px-3 py-1 bg-white/20 text-white rounded text-sm hover:bg-white/30 backdrop-blur-sm transition-colors"
                >
                  New Booking
                </button>
              )
            }
          >
            <div className="flex items-center space-x-4 text-blue-100">
              <input
                type="date"
                value={bookingData.date}
                onChange={(e) => updateBookingData('date', e.target.value)}
                className="bg-white/10 border-blue-400/30 text-white placeholder-blue-200 px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent [&::-webkit-calendar-picker-indicator]:invert"
              />
              <span className="text-sm font-medium">E-WayBill (0.2 %)</span>
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
          </GradientSectionHeader>


          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Sender */}
            <div>
              <select
                value={bookingData.senderId}
                onChange={(e) => handleSenderChange(e.target.value)}
                className="w-full border border-red-300 px-3 py-2 rounded text-sm bg-red-50"
                required
              >
                <option value="">Select Sender</option>
                {parties.map(party => (
                  <option key={party.id} value={party.id}>
                    {party.party_name} - {getCityName(party.city)}
                  </option>
                ))}
              </select>
            </div>

            {/* Center - free text with + to add new city/town */}
            <div className="flex items-center space-x-2 relative">
              <input
                type="text"
                placeholder="CENTER (City/Town)"
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

            {/* Receiver and Mobile */}
            <div className="grid grid-cols-2 gap-2 relative">
              <div className="relative">
                <input
                  type="text"
                  placeholder="RECEIVER"
                  value={bookingData.receiver}
                  onChange={(e) => {
                    updateBookingData('receiver', e.target.value)
                    setShowReceiverSuggest(true)
                  }}
                  onFocus={() => setShowReceiverSuggest(true)}
                  onBlur={() => setTimeout(() => setShowReceiverSuggest(false), 200)}
                  className="w-full border border-slate-300 px-3 py-2 rounded text-sm"
                  required
                />
                {showReceiverSuggest && bookingData.receiver && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded shadow z-20 max-h-48 overflow-auto">
                    {receivers
                      .filter(r => r.name.toLowerCase().includes(bookingData.receiver.toLowerCase()))
                      .slice(0, 8)
                      .map(r => (
                        <button
                          key={r.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            updateBookingData('receiver', r.name)
                            if (r.contact) updateBookingData('mobile', r.contact)
                            setShowReceiverSuggest(false)
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm"
                        >
                          <div className="font-medium">{r.name}</div>
                          {r.contact && <div className="text-xs text-slate-500">{r.contact}</div>}
                        </button>
                      ))}
                  </div>
                )}
              </div>
              <input
                type="text"
                placeholder="MOBILE"
                value={bookingData.mobile}
                onChange={(e) => updateBookingData('mobile', e.target.value)}
                className="border border-slate-300 px-3 py-2 rounded text-sm"
              />
            </div>

            {/* Carrier, Consignment Number, and Reference Number */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Carrier</label>
                <select
                  value={bookingData.carrier}
                  onChange={(e) => updateBookingData('carrier', e.target.value)}
                  className="w-full border border-slate-300 px-3 py-2 rounded text-sm"
                >
                  <option value="">Select Carrier</option>
                  {carriers.map(carrier => (
                    <option key={carrier.id} value={carrier.name}>{carrier.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Consignment no</label>
                <input
                  type="text"
                  placeholder="Consignment no. eg."
                  value={bookingData.consignmentNumber}
                  onChange={(e) => updateBookingData('consignmentNumber', e.target.value)}
                  className="w-full border border-slate-300 px-3 py-2 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Reference Number</label>
                <input
                  type="text"
                  placeholder="Eg: 456789"
                  value={bookingData.referenceNumber}
                  onChange={(e) => updateBookingData('referenceNumber', e.target.value)}
                  className="w-full border border-slate-300 px-3 py-2 rounded text-sm"
                />
              </div>
            </div>

            {/* Package Type, Weight, Number of Boxes */}
            <div className="grid grid-cols-7 gap-2">
              <div className="col-span-3">
                <label className="block text-xs text-slate-600 mb-1">Package Type</label>
                <select
                  value={bookingData.packageType}
                  onChange={(e) => updateBookingData('packageType', e.target.value)}
                  className="w-full border border-slate-300 px-3 py-2 rounded text-sm h-[38px]"
                  disabled={!bookingData.senderId}
                >
                  <option value="">Select Package Type</option>
                  {selectedPartyQuotations.map((quotation: any, index: number) => (
                    <option key={index} value={quotation.package_type}>
                      {quotation.package_type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-3">
                <label className="block text-xs text-slate-600 mb-1">Weight</label>
                <div className="flex">
                  <input
                    type="number"
                    value={bookingData.weight}
                    onChange={(e) => updateBookingData('weight', e.target.value)}
                    className="flex-1 w-full min-w-[150px] border border-slate-300 px-3 py-2 rounded-l text-sm h-[38px] bg-yellow-50"
                    placeholder="100"
                  />
                  <select
                    value={bookingData.weightUnit}
                    onChange={(e) => updateBookingData('weightUnit', e.target.value as 'gm' | 'kg')}
                    className="bg-slate-100 border border-l-0 border-slate-300 px-2 py-2 rounded-r text-xs focus:outline-none h-[38px] min-w-[60px]"
                  >
                    <option value="gm">gm</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
              </div>
              <div className="col-span-1">
                <label className="block text-xs text-slate-600 mb-1">Boxes</label>
                <input
                  type="number"
                  value={bookingData.numberOfBoxes}
                  onChange={(e) => updateBookingData('numberOfBoxes', e.target.value)}
                  className="w-full border border-slate-300 px-3 py-2 rounded text-sm h-[38px]"
                  placeholder="Eg: 2"
                />
              </div>
            </div>

            {/* Financial Fields */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-100 px-3 py-2 rounded text-sm font-medium">GROSS Amt</div>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value={bookingData.grossAmount}
                  onChange={(e) => updateBookingData('grossAmount', e.target.value)}
                  className="border border-slate-300 px-3 py-2 rounded text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-100 px-3 py-2 rounded text-sm">Other Charges</div>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value={bookingData.otherCharges}
                  onChange={(e) => updateBookingData('otherCharges', e.target.value)}
                  className="border border-slate-300 px-3 py-2 rounded text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-100 px-3 py-2 rounded text-sm">Insurance Amt</div>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value={bookingData.insuranceAmount}
                  onChange={(e) => updateBookingData('insuranceAmount', e.target.value)}
                  className="border border-slate-300 px-3 py-2 rounded text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-100 px-3 py-2 rounded text-sm">Parcel Value</div>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value={bookingData.parcelValue}
                  onChange={(e) => updateBookingData('parcelValue', e.target.value)}
                  className="border border-slate-300 px-3 py-2 rounded text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-red-100 px-3 py-2 rounded text-sm font-medium text-red-700">NET Amt</div>
                <input
                  type="number"
                  step="0.01"
                  value={bookingData.netAmount}
                  onChange={(e) => updateBookingData('netAmount', e.target.value)}
                  className="border border-slate-300 px-3 py-2 rounded text-sm"
                />
              </div>
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
                onClick={resetForm}
                className="px-4 py-2 bg-gray-300 text-slate-700 rounded text-sm"
              >
                {editBookingId ? 'Cancel Edit' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded text-sm"
              >
                {editBookingId ? 'Update' : 'Add'}
              </button>
            </div>

            {/* Remember Section */}
            <div className="mt-6">
              <h3 className="font-medium mb-2">REMEMBER</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={rememberSettings.sender}
                    onChange={(e) => updateRememberSetting('sender', e.target.checked)}
                    className="rounded"
                  />
                  <span>Sender</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={rememberSettings.center}
                    onChange={(e) => updateRememberSetting('center', e.target.checked)}
                    className="rounded"
                  />
                  <span>Center</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={rememberSettings.receiver}
                    onChange={(e) => updateRememberSetting('receiver', e.target.checked)}
                    className="rounded"
                  />
                  <span>Receiver</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={rememberSettings.carrier}
                    onChange={(e) => updateRememberSetting('carrier', e.target.checked)}
                    className="rounded"
                  />
                  <span>Carrier</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={rememberSettings.packageType}
                    onChange={(e) => updateRememberSetting('packageType', e.target.checked)}
                    className="rounded"
                  />
                  <span>Package Type</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={rememberSettings.weight}
                    onChange={(e) => updateRememberSetting('weight', e.target.checked)}
                    className="rounded"
                  />
                  <span>Weight</span>
                </label>
                <label className="flex items-center space-x-2 col-span-2">
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

            {/* Booking Import Section */}
            <div className="mt-6">
              <div className="border border-slate-300 rounded">
                <button
                  type="button"
                  onClick={() => setBookingImportExpanded(!bookingImportExpanded)}
                  className="w-full flex items-center justify-between p-3 bg-slate-100 hover:bg-gray-200"
                >
                  <span>BOOKING IMPORT</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${bookingImportExpanded ? 'rotate-180' : ''}`} />
                </button>
                {bookingImportExpanded && (
                  <div className="p-4 border-t border-slate-300">
                    <BookingImportUploader
                      type="booking"
                      onUploadSuccess={async () => {
                        // Refresh bookings list
                        try {
                          const bookingsRes = await fetch('/api/bookings/account')
                          const bookingsData = await bookingsRes.json()
                          setBookings(bookingsData.data || [])
                        } catch (error) {
                          console.error('Error refreshing bookings:', error)
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Bulk Upload Button */}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowBulkUploadModal(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 font-medium"
              >
                <Upload className="h-5 w-5" />
                Bulk Upload Bookings
              </button>
            </div>

            {/* Offline Booking Import Section */}
            <div className="mt-4">
              <div className="border border-slate-300 rounded">
                <button
                  type="button"
                  onClick={() => setOfflineImportExpanded(!offlineImportExpanded)}
                  className="w-full flex items-center justify-between p-3 bg-slate-100 hover:bg-gray-200"
                >
                  <span>OFFLINE BOOKING IMPORT</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${offlineImportExpanded ? 'rotate-180' : ''}`} />
                </button>
                {offlineImportExpanded && (
                  <div className="p-4 border-t border-slate-300">
                    <BookingImportUploader
                      type="offline"
                      onUploadSuccess={async () => {
                        // Refresh bookings list
                        try {
                          const bookingsRes = await fetch('/api/bookings/account')
                          const bookingsData = await bookingsRes.json()
                          setBookings(bookingsData.data || [])
                        } catch (error) {
                          console.error('Error refreshing bookings:', error)
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Right Panel - Bookings List */}
        <div className="w-1/2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <GradientSectionHeader
            title="BOOKINGS"
            variant="emerald"
            actions={
              <>
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
              </>
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
                      booking.mobile?.toLowerCase().includes(searchTerm.toLowerCase())

                    if (!matchesSearch) return false
                    if (showAllBookings) return true
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
                  }).length}
                  onChange={() => handleToggleSelectAll(bookings.filter(booking => {
                    const matchesSearch = !searchTerm ||
                      booking.sender?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      booking.receiver?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      booking.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      booking.mobile?.toLowerCase().includes(searchTerm.toLowerCase())

                    if (!matchesSearch) return false
                    if (showAllBookings) return true
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

              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-200 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search bookings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/10 border-emerald-400/30 text-white placeholder-emerald-200 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                />
              </div>
            </div>
          </GradientSectionHeader>


          {/* Bookings List - Card Style */}
          <div className="space-y-3 overflow-auto max-h-[calc(100vh-120px)]">
            {bookings.length === 0 ? (
              <div className="flex items-center justify-center h-96 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-center text-slate-500">
                  <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <div className="text-sm">No bookings found</div>
                </div>
              </div>
            ) : (
              bookings
                .filter(booking => {
                  const matchesSearch = !searchTerm ||
                    booking.sender?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    booking.receiver?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    booking.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    booking.mobile?.toLowerCase().includes(searchTerm.toLowerCase())

                  if (!matchesSearch) return false
                  if (showAllBookings) return true
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
                          {booking.sender?.charAt(0)?.toUpperCase() || 'P'}
                        </div>

                        {/* Booking Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <button
                              onClick={() => populateFormFromBooking(booking)}
                              className="font-semibold text-slate-900 truncate hover:text-blue-600 hover:underline text-left"
                              title="Click to edit this booking"
                            >
                              {booking.sender || 'Unknown Sender'}
                            </button>
                            {booking.package_type && (
                              <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded font-medium">
                                {booking.package_type}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center text-sm text-slate-600 mb-2">
                            <Package className="h-3 w-3 mr-1" />
                            <span className="truncate">
                              WT {booking.weight || 0} {booking.weight_unit || 'gm'} | {booking.number_of_boxes || 1} Box
                            </span>
                          </div>


                          <div className="text-xs text-slate-500">
                            To: <span className="font-medium text-slate-700">{booking.receiver || 'N/A'}</span>
                          </div>

                          {booking.reference_number && (
                            <div className="text-xs text-slate-500 mt-1">
                              Ref: {booking.reference_number}
                            </div>
                          )}
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
                          className="p-2 text-slate-600 hover:bg-slate-100 rounded"
                          title="Print"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          className="p-2 text-slate-600 hover:bg-slate-100 rounded"
                          title="Details"
                        >
                          <FileText className="h-4 w-4" />
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
                        {booking.booking_date ? new Date(booking.booking_date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        }) : 'N/A'}
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

      <BulkUploadModal
        isOpen={showBulkUploadModal}
        onClose={() => setShowBulkUploadModal(false)}
        onUploadSuccess={async (insertedRecords) => {
          // Refresh bookings list
          try {
            // Optimistically add inserted records to the list immediately
            if (Array.isArray(insertedRecords) && insertedRecords.length > 0) {
              setBookings(prev => [...insertedRecords, ...prev])
            }

            // Then perform a fresh fetch to ensure full sync
            console.log('Refreshing bookings after bulk upload...')
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
            const headers: HeadersInit = {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            }
            const bookingsRes = await fetch('/api/bookings/account', { headers })
            const bookingsData = await bookingsRes.json()
            console.log('Bookings refresh response:', bookingsData)
            setBookings(bookingsData.data || [])
            console.log('Bookings state updated, count:', bookingsData.data?.length || 0)
          } catch (error) {
            console.error('Error refreshing bookings:', error)
          }
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
    </div>

  )
}
