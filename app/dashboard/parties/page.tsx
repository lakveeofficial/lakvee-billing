'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Download,
  Upload,
  Eye,
  Layers,
  Phone,
  Mail,
  Users,
  IndianRupee,
  Calendar,
  CreditCard,
  Hash,
  StickyNote
} from 'lucide-react'
import { Party, PartyFilters, GST_TYPES, INDIAN_STATES } from '@/types/party'
import PageHeader from '@/components/PageHeader'

export default function PartiesPage() {
  const [parties, setParties] = useState<Party[]>([])
  const [filteredParties, setFilteredParties] = useState<Party[]>([])
  const [filters, setFilters] = useState<PartyFilters>({
    search: '',
    gstType: 'all',
    state: 'all'
  })
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(true)
  // Inline Add Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentSaving, setPaymentSaving] = useState(false)
  const [paymentPartyId, setPaymentPartyId] = useState<string | null>(null)
  const [paymentPartyName, setPaymentPartyName] = useState<string>('')
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().slice(0,10))
  const [paymentAmount, setPaymentAmount] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<string>('')
  const [paymentRef, setPaymentRef] = useState<string>('')
  const [paymentNotes, setPaymentNotes] = useState<string>('')
  const router = useRouter()

  // Helper to format ISO timestamps for display in table
  const formatDate = (iso?: string) => {
    if (!iso) return '—'
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleString()
  }

  const openPaymentModal = (party: Party) => {
    setPaymentPartyId(String(party.id))
    setPaymentPartyName(party.partyName)
    setPaymentDate(new Date().toISOString().slice(0,10))
    setPaymentAmount('')
    setPaymentMethod('')
    setPaymentRef('')
    setPaymentNotes('')
    setPaymentModalOpen(true)
  }

  const savePartyPayment = async () => {
    const amt = parseFloat(paymentAmount)
    if (!amt || amt <= 0) {
      alert('Enter a valid amount')
      return
    }
    if (!paymentPartyId) return
    setPaymentSaving(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch('/api/party-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          party_id: Number(paymentPartyId),
          payment_date: paymentDate,
          amount: amt,
          payment_method: paymentMethod || undefined,
          reference_no: paymentRef || undefined,
          notes: paymentNotes || undefined,
          allocations: [],
        })
      })
      if (!res.ok) {
        const j = await res.json().catch(()=>({}))
        throw new Error(j.error || `Failed to save: ${res.status}`)
      }
      setPaymentModalOpen(false)
      alert('Payment saved')
    } catch (e:any) {
      alert(e?.message || 'Failed to save payment')
    } finally {
      setPaymentSaving(false)
    }
  }

  useEffect(() => {
    loadParties()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [parties, filters])

  const loadParties = async () => {
    setLoading(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch('/api/parties', {
        cache: 'no-store',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.ok) {
        const data = await res.json();
        setParties(data.data || []);
      } else if (res.status === 401) {
        // Unauthorized: prompt re-login and clear list
        console.warn('Unauthorized fetching parties. Please login again.')
        setParties([])
      } else {
        setParties([]);
      }
    } catch (e) {
      setParties([]);
    }
    setLoading(false);
  }

  const applyFilters = () => {
    let filtered = parties

    // Search filter
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(party =>
        party.partyName.toLowerCase().includes(searchTerm) ||
        party.phoneNumber.includes(searchTerm) ||
        party.email?.toLowerCase().includes(searchTerm) ||
        party.gstin?.toLowerCase().includes(searchTerm)
      )
    }

    // GST Type filter
    if (filters.gstType !== 'all') {
      filtered = filtered.filter(party => party.gstType === filters.gstType)
    }

    // State filter
    if (filters.state !== 'all') {
      filtered = filtered.filter(party => party.state === filters.state)
    }

    setFilteredParties(filtered)
  }

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/parties/${id}`, { 
        method: 'DELETE',
        credentials: 'include', // Include cookies for authentication
      });
      
      if (res.ok) {
        alert('Party deleted successfully!');
        loadParties(); // Reload the list
      } else {
        const error = await res.json();
        alert(`Failed to delete party: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete party. Please try again.');
    }
    setPendingDeleteId(null);
  }

  const handleExport = () => {
    const header = [
      'ID',
      'Party Name',
      'Contact Person',
      'Phone',
      'Email',
      'GST Type',
      'GSTIN',
      'PAN',
      'Billing Street',
      'Billing City',
      'Billing State',
      'Billing Pincode',
      'Shipping Street',
      'Shipping City',
      'Shipping State',
      'Shipping Pincode',
      'Use Shipping Address',
      'Weight Slab ID',
      'Distance Slab ID',
      'Distance Category',
      'Volume Slab ID',
      'COD Slab ID',
      'Created At',
      'Updated At',
    ]

    const rows = filteredParties.map(party => [
      party.id,
      party.partyName,
      (party as any).contactPerson || '',
      party.phoneNumber,
      party.email || '',
      party.gstType || '',
      party.gstin || '',
      (party as any).panNumber || '',
      party.billingAddress?.street || '',
      party.billingAddress?.city || '',
      party.billingAddress?.state || '',
      party.billingAddress?.pincode || '',
      party.shippingAddress?.street || '',
      party.shippingAddress?.city || '',
      party.shippingAddress?.state || '',
      party.shippingAddress?.pincode || '',
      String(party.useShippingAddress ?? false),
      party.weightSlabId || '',
      party.distanceSlabId || '',
      party.distanceCategory || '',
      party.volumeSlabId || '',
      party.codSlabId || '',
      party.createdAt || '',
      party.updatedAt || '',
    ])

    const csvContent = [header, ...rows].map(row => row.map(v => typeof v === 'string' && v.includes(',') ? `"${v}"` : v).join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `parties_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="space-y-3">
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
      {/* Custom Delete Confirmation Modal */}
      {pendingDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-xs">
            <h3 className="text-lg font-bold mb-2">Confirm Delete</h3>
            <p className="mb-4">Are you sure you want to delete this party?</p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setPendingDeleteId(null)}
                className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
              >Cancel</button>
              <button
                onClick={() => handleDelete(pendingDeleteId)}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >Delete</button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <PageHeader
        title="Party Management"
        subtitle="Manage customer parties and their details"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/dashboard/parties/upload')}
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
            >
              <Upload className="h-4 w-4 mr-2 text-emerald-200" />
              Upload CSV
            </button>
            <button
              onClick={() => router.push('/dashboard/parties/new')}
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-white bg-white/20 hover:bg-white/30 border border-white/20 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2 text-sky-200" />
              Add Party
            </button>
          </div>
        }
      />

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search parties by name, phone, email, or GSTIN..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </button>

            {/* Export */}
            <button
              onClick={handleExport}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GST Type
                </label>
                <select
                  value={filters.gstType}
                  onChange={(e) => setFilters(prev => ({ ...prev, gstType: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All GST Types</option>
                  {GST_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <select
                  value={filters.state}
                  onChange={(e) => setFilters(prev => ({ ...prev, state: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All States</option>
                  {INDIAN_STATES.map(state => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="px-4 py-2 bg-gray-50 text-sm text-gray-600">
          Showing {filteredParties.length} of {parties.length} parties
        </div>
      </div>

      {/* Parties List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredParties.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-4">
              <Users className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No parties found</h3>
            <p className="text-gray-600 mb-4">
              {filters.search || filters.gstType !== 'all' || filters.state !== 'all'
                ? 'Try adjusting your search criteria or filters.'
                : 'Get started by adding your first party.'}
            </p>
            <button
              onClick={() => router.push('/dashboard/parties/new')}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Party
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Party Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    GST Info
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredParties.map((party) => (
                  <tr key={party.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {party.partyName}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {party.id}
                        </div>
                        <div className="mt-2">
                          <button
                            onClick={() => openPaymentModal(party)}
                            className="inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium text-white bg-green-600 hover:bg-green-700"
                            title="Add Payment"
                          >
                            <IndianRupee className="h-3 w-3 mr-1 text-white" />
                            Add Payment
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {(party as any).contactPerson && (
                          <div className="text-sm text-gray-900">
                            {(party as any).contactPerson}
                          </div>
                        )}
                        <div className="flex items-center text-sm text-gray-900">
                          <Phone className="h-3 w-3 mr-1 text-gray-400" />
                          {party.phoneNumber}
                        </div>
                        {party.email && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Mail className="h-3 w-3 mr-1 text-gray-400" />
                            {party.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900 capitalize">
                          {party.gstType ? party.gstType.replace('_', ' ') : 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500 font-mono">
                          {party.gstin || '—'}
                        </div>
                        {(party as any).panNumber && (
                          <div className="text-xs text-gray-500 font-mono">PAN: {(party as any).panNumber}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => router.push(`/dashboard/parties/${party.id}`)}
                          className="text-gray-600 hover:text-gray-900 p-1"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/rates/party?partyId=${party.id}`)}
                          className="text-amber-600 hover:text-amber-800 p-1"
                          title="Party Rate Slabs"
                        >
                          <Layers className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => router.push(`/dashboard/parties/${party.id}/edit`)}
                          className="text-indigo-600 hover:text-indigo-900 p-1"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setPendingDeleteId(party.id);
                          }}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl shadow-2xl border border-white/10">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-emerald-600 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IndianRupee className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Add Payment</h3>
                </div>
                <button className="/text-white/80 hover:text-white" onClick={() => setPaymentModalOpen(false)}>✕</button>
              </div>
              <div className="mt-1 text-xs text-white/90">Party: <span className="font-medium">{paymentPartyName}</span></div>
            </div>

            {/* Body */}
            <div className="bg-white px-6 py-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Date</label>
                  <div className="relative">
                    <Calendar className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="date" className="w-full border rounded-md pl-9 pr-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" value={paymentDate} onChange={(e)=>setPaymentDate(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Amount</label>
                  <div className="relative">
                    <IndianRupee className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="number" min="0" step="0.01" className="w-full border rounded-md pl-9 pr-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" value={paymentAmount} onChange={(e)=>setPaymentAmount(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Method</label>
                  <div className="relative">
                    <CreditCard className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" className="w-full border rounded-md pl-9 pr-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" value={paymentMethod} onChange={(e)=>setPaymentMethod(e.target.value)} placeholder="NEFT / UPI / CASH" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Reference No</label>
                  <div className="relative">
                    <Hash className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" className="w-full border rounded-md pl-9 pr-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" value={paymentRef} onChange={(e)=>setPaymentRef(e.target.value)} />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-700 mb-1">Notes</label>
                  <div className="relative">
                    <StickyNote className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" className="w-full border rounded-md pl-9 pr-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" value={paymentNotes} onChange={(e)=>setPaymentNotes(e.target.value)} placeholder="Optional" />
                  </div>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-end gap-2">
                <button className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50" onClick={()=>setPaymentModalOpen(false)} disabled={paymentSaving}>Cancel</button>
                <button className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white bg-gradient-to-r from-primary-600 to-emerald-600 hover:from-primary-700 hover:to-emerald-700 disabled:opacity-60" onClick={savePartyPayment} disabled={paymentSaving}>
                  <IndianRupee className="h-4 w-4" />
                  {paymentSaving ? 'Saving…' : 'Save Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
