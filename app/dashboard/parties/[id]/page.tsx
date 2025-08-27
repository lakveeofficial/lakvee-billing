'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft, Edit, Trash2, Phone, Mail, MapPin, Building } from 'lucide-react'
import { Party } from '@/types/party'
import Link from 'next/link'
import PartyRateSlabsManager from '@/app/dashboard/rates/components/PartyRateSlabsManager'
import PartyPayments from './PartyPayments'

export default function PartyDetailsPage() {
  const [party, setParty] = useState<Party | null>(null)
  const [loading, setLoading] = useState(true)
  const [slabsLoading, setSlabsLoading] = useState(false)
  const [slabsError, setSlabsError] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [rateSlabs, setRateSlabs] = useState<any[]>([])
  const [showSlabManager, setShowSlabManager] = useState(false)
  const [modesMap, setModesMap] = useState<Record<number, string>>({})
  const [serviceTypesMap, setServiceTypesMap] = useState<Record<number, string>>({})
  const [distanceSlabsMap, setDistanceSlabsMap] = useState<Record<number, string>>({})
  const [weightSlabsMap, setWeightSlabsMap] = useState<Record<number, string>>({})
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params.id as string

  useEffect(() => {
    if (id) {
      loadParty()
    }
  }, [id])

  useEffect(() => {
    if (!id) return
    loadMastersAndSlabs()
  }, [id, showInactive])

  // Auto-open slab manager when showSlabs=1 is present
  useEffect(() => {
    const qs = searchParams?.get('showSlabs')
    if (qs === '1') {
      setShowSlabManager(true)
      // Scroll to slab section after a tick
      setTimeout(() => {
        const el = document.getElementById('party-slab-section')
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [searchParams])

  async function loadMastersAndSlabs() {
    setSlabsLoading(true)
    setSlabsError(null)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      // Fetch masters in parallel
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined
      const [modesRes, stRes, distRes, wtRes] = await Promise.all([
        fetch('/api/slabs/modes', { cache: 'no-store', headers: authHeaders }),
        fetch('/api/slabs/service-types', { cache: 'no-store', headers: authHeaders }),
        fetch('/api/slabs/distance', { cache: 'no-store', headers: authHeaders }),
        fetch('/api/slabs/weight', { cache: 'no-store', headers: authHeaders }),
      ])
      const [modesJson, stJson, distJson, wtJson] = await Promise.all([
        modesRes.json().catch(() => ({ data: [] })),
        stRes.json().catch(() => ({ data: [] })),
        distRes.json().catch(() => ({ data: [] })),
        wtRes.json().catch(() => ({ data: [] })),
      ])
      const mm: Record<number, string> = {}
      for (const m of (modesJson.data || [])) mm[m.id] = m.name || m.code || String(m.id)
      const sm: Record<number, string> = {}
      for (const s of (stJson.data || [])) sm[s.id] = s.name || s.code || String(s.id)
      const dm: Record<number, string> = {}
      for (const d of (distJson.data || [])) dm[d.id] = d.name || d.label || d.code || String(d.id)
      const wm: Record<number, string> = {}
      for (const w of (wtJson.data || [])) wm[w.id] = w.name || w.label || `${w.min_weight}-${w.max_weight}` || String(w.id)
      setModesMap(mm)
      setServiceTypesMap(sm)
      setDistanceSlabsMap(dm)
      setWeightSlabsMap(wm)

      // Fetch party slabs
      const res = await fetch(`/api/party-rate-slabs?partyId=${id}`, {
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (res.status === 401) {
        setSlabsError('Unauthorized. Please login again to view slabs.')
        setRateSlabs([])
      } else if (!res.ok) {
        throw new Error(`Failed to load slabs: ${res.status}`)
      } else {
        const json = await res.json()
        const data = (json.data || []) as any[]
        setRateSlabs(showInactive ? data : data.filter(r => r.is_active !== false))
      }
    } catch (e: any) {
      setSlabsError(e?.message || 'Error loading slabs')
      setRateSlabs([])
    } finally {
      setSlabsLoading(false)
    }
  }

  const loadParty = () => {
    setLoading(true)
    ;(async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        const res = await fetch(`/api/parties/${id}`, {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
        if (!res.ok) {
          setParty(null)
          setLoading(false)
          return
        }
        const row = await res.json()
        // Map API row (snake_case) or already camelCase to Party
        const mapped: Party = {
          id: row.id,
          partyName: row.party_name ?? row.partyName,
          phoneNumber: row.phone ?? row.phoneNumber,
          email: row.email ?? undefined,
          gstin: row.gst_number ?? row.gstin ?? undefined,
          billingAddress: {
            street: row.address ?? row.billingAddress?.street ?? '',
            city: row.city ?? row.billingAddress?.city ?? '',
            state: row.state ?? row.billingAddress?.state ?? '',
            pincode: row.pincode ?? row.billingAddress?.pincode ?? '',
            country: row.country ?? row.billingAddress?.country ?? 'India',
          },
          shippingAddress: row.shippingAddress ?? undefined,
          useShippingAddress: row.useShippingAddress ?? false,
          gstType: row.gst_type ?? row.gstType ?? 'unregistered',
          state: row.state,
          weightSlabId: row.weight_slab_id ?? row.weightSlabId ?? undefined,
          distanceSlabId: row.distance_slab_id ?? row.distanceSlabId ?? undefined,
          distanceCategory: row.distance_category ?? row.distanceCategory ?? undefined,
          volumeSlabId: row.volume_slab_id ?? row.volumeSlabId ?? undefined,
          codSlabId: row.cod_slab_id ?? row.codSlabId ?? undefined,
          createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
          updatedAt: row.updated_at ?? row.updatedAt ?? new Date().toISOString(),
        }
        setParty(mapped)
      } catch (e) {
        console.error('Failed to load party', e)
        setParty(null)
      }
      setLoading(false)
    })()
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this party?')) return
    try {
      const res = await fetch(`/api/parties/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to delete party' }))
        alert(data.error || 'Failed to delete party')
        return
      }
      router.push('/dashboard/parties')
    } catch (e) {
      console.error('Failed to delete party', e)
      alert('Failed to delete party')
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>

        {showSlabManager && (
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Party Rate Slabs Manager</h3>
            <PartyRateSlabsManager partyId={Number(id)} />
          </div>
        )}
      </div>
    )
  }

  if (!party) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Party Not Found</h2>
          <p className="text-gray-600 mb-4">The party you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/dashboard/parties')}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Parties
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => router.back()}
            className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{party.partyName}</h1>
            <p className="text-gray-600 mt-1">Party Details</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => router.push(`/dashboard/parties/${party.id}/edit`)}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Party Name</label>
              <p className="mt-1 text-sm text-gray-900">{party.partyName}</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Phone Number</label>
                <div className="mt-1 flex items-center text-sm text-gray-900">
                  <Phone className="h-4 w-4 mr-2 text-gray-400" />
                  {party.phoneNumber}
                </div>
              </div>
              {party.email && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Email</label>
                  <div className="mt-1 flex items-center text-sm text-gray-900">
                    <Mail className="h-4 w-4 mr-2 text-gray-400" />
                    {party.email}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">GST Type</label>
                <p className="mt-1 text-sm text-gray-900 capitalize">
                  {party.gstType.replace('_', ' ')}
                </p>
              </div>
              {party.gstin && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">GSTIN</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono">{party.gstin}</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500">State</label>
              <p className="mt-1 text-sm text-gray-900">{party.state}</p>
            </div>
          </div>
        </div>

        {/* Billing Address */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Building className="h-5 w-5 mr-2" />
            Billing Address
          </h3>
          <div className="text-sm text-gray-900 space-y-1">
            <p>{party.billingAddress.street}</p>
            <p>{party.billingAddress.city}, {party.billingAddress.state}</p>
            <p>{party.billingAddress.pincode}</p>
            <p>{party.billingAddress.country}</p>
          </div>
        </div>

        {/* Shipping Address */}
        {party.useShippingAddress && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Shipping Address
            </h3>
            <div className="text-sm text-gray-900 space-y-1">
              <p>{party.shippingAddress?.street}</p>
              <p>{party.shippingAddress?.city}, {party.shippingAddress?.state}</p>
              <p>{party.shippingAddress?.pincode}</p>
              <p>{party.shippingAddress?.country}</p>
            </div>
          </div>
        )}

        {/* Current Rate Slabs */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Current Rate Slabs</h3>
            <div className="flex items-center space-x-3">
              <label className="text-sm text-gray-600 flex items-center space-x-2">
                <input type="checkbox" className="rounded" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
                <span>Show inactive</span>
              </label>
              <button
                className="text-sm text-primary-600 hover:underline"
                onClick={() => setShowSlabManager(v => !v)}
              >
                {showSlabManager ? 'Hide Slab Manager' : 'Manage Slabs'}
              </button>
            </div>
          </div>
          {slabsLoading ? (
            <div className="text-sm text-gray-500">Loading slabs…</div>
          ) : slabsError ? (
            <div className="text-sm text-red-600">{slabsError}</div>
          ) : rateSlabs.length === 0 ? (
            <div className="text-sm text-gray-500">No slabs found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Shipment</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Mode</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Service</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Distance</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Weight Slab</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-700">Rate</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-700">Fuel %</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-700">Handling</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-700">GST %</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rateSlabs.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">{r.shipment_type}</td>
                      <td className="px-3 py-2">{modesMap[r.mode_id] || r.mode_id}</td>
                      <td className="px-3 py-2">{serviceTypesMap[r.service_type_id] || r.service_type_id}</td>
                      <td className="px-3 py-2">{distanceSlabsMap[r.distance_slab_id] || r.distance_slab_id}</td>
                      <td className="px-3 py-2">{weightSlabsMap[r.slab_id] || r.slab_id}</td>
                      <td className="px-3 py-2 text-right">{Number(r.rate).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">{Number(r.fuel_pct || 0)}</td>
                      <td className="px-3 py-2 text-right">{Number(r.handling || 0)}</td>
                      <td className="px-3 py-2 text-right">{Number(r.gst_pct || 0)}</td>
                      <td className="px-3 py-2">{r.is_active === false ? 'No' : 'Yes'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Record Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Party ID</label>
              <p className="mt-1 text-sm text-gray-900 font-mono">{party.id}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Created</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(party.createdAt).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Last Updated</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(party.updatedAt).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Payments Section */}
      <div className="mt-6">
        <PartyPayments partyId={Number(party.id)} />
      </div>
    </div>
  )
}
