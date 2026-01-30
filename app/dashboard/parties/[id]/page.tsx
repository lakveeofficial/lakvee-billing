'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft, Edit, Trash2, Phone, Mail, MapPin, Building } from 'lucide-react'
import { Party } from '@/types/party'
import { getCityName } from '@/lib/indiaData'
import Link from 'next/link'
import PartyPayments from './PartyPayments'

export default function PartyDetailsPage() {
  const [party, setParty] = useState<Party | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params.id as string

  useEffect(() => {
    if (id) {
      loadParty()
    }
  }, [id])

  // Auto-scroll logic removed as showSlabs query param is deprecated.



  const loadParty = () => {
    setLoading(true)
      ; (async () => {
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
      </div>
    )
  }

  if (!party) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Party Not Found</h2>
          <p className="text-slate-600 mb-4">The party you're looking for doesn't exist.</p>
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
            className="mr-4 p-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{party.partyName}</h1>
            <p className="text-slate-600 mt-1">Party Details</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => router.push(`/dashboard/parties/${party.id}/edit`)}
            className="flex items-center px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
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
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-medium text-slate-900 mb-4">Basic Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-500">Party Name</label>
              <p className="mt-1 text-sm text-slate-900">{party.partyName}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-500">Phone Number</label>
                <div className="mt-1 flex items-center text-sm text-slate-900">
                  <Phone className="h-4 w-4 mr-2 text-slate-400" />
                  {party.phoneNumber}
                </div>
              </div>
              {party.email && (
                <div>
                  <label className="block text-sm font-medium text-slate-500">Email</label>
                  <div className="mt-1 flex items-center text-sm text-slate-900">
                    <Mail className="h-4 w-4 mr-2 text-slate-400" />
                    {party.email}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-500">GST Type</label>
                <p className="mt-1 text-sm text-slate-900 capitalize">
                  {party.gstType.replace('_', ' ')}
                </p>
              </div>
              {party.gstin && (
                <div>
                  <label className="block text-sm font-medium text-slate-500">GSTIN</label>
                  <p className="mt-1 text-sm text-slate-900 font-mono">{party.gstin}</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-500">State</label>
              <p className="mt-1 text-sm text-slate-900">{party.state}</p>
            </div>
          </div>
        </div>

        {/* Billing Address */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-medium text-slate-900 mb-4 flex items-center">
            <Building className="h-5 w-5 mr-2" />
            Billing Address
          </h3>
          <div className="text-sm text-slate-900 space-y-1">
            <p>{party.billingAddress.street}</p>
            <p>{getCityName(party.billingAddress.city)}, {party.billingAddress.state}</p>
            <p>{party.billingAddress.pincode}</p>
            <p>{party.billingAddress.country}</p>
          </div>
        </div>

        {/* Shipping Address */}
        {party.useShippingAddress && (
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-medium text-slate-900 mb-4 flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Shipping Address
            </h3>
            <div className="text-sm text-slate-900 space-y-1">
              <p>{party.shippingAddress?.street}</p>
              <p>{getCityName(party.shippingAddress?.city || '')}, {party.shippingAddress?.state}</p>
              <p>{party.shippingAddress?.pincode}</p>
              <p>{party.shippingAddress?.country}</p>
            </div>
          </div>
        )}

        {/* Current Rate Slabs */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-900">Assigned Rate Slabs</h3>
            <Link
              href={`/dashboard/parties/${party.id}/edit`}
              className="text-sm text-primary-600 hover:underline"
            >
              Update Assignments
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-slate-500">Weight Slab ID</span>
              <span className="font-medium">{party.weightSlabId || 'None'}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-slate-500">Distance Slab ID</span>
              <span className="font-medium">{party.distanceSlabId || 'None'}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-slate-500">Distance Category</span>
              <span className="font-medium capitalize">{party.distanceCategory?.replace('_', ' ') || 'None'}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-slate-500">Volume Slab ID</span>
              <span className="font-medium">{party.volumeSlabId || 'None'}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-slate-500">COD Value Slab ID</span>
              <span className="font-medium">{party.codSlabId || 'None'}</span>
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-medium text-slate-900 mb-4">Record Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-500">Party ID</label>
              <p className="mt-1 text-sm text-slate-900 font-mono">{party.id}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-500">Created</label>
                <p className="mt-1 text-sm text-slate-900">
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
                <label className="block text-sm font-medium text-slate-500">Last Updated</label>
                <p className="mt-1 text-sm text-slate-900">
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
