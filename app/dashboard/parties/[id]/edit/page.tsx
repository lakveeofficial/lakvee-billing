'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Save } from 'lucide-react'
import { Party, PartyFormData, GST_TYPES, INDIAN_STATES } from '@/types/party'
// Removed slab assignment from edit UI per new design

export default function EditPartyPage() {
  const [loading, setLoading] = useState(true)
  const [party, setParty] = useState<Party | null>(null)
  const [useShippingAddress, setUseShippingAddress] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset
  } = useForm<PartyFormData>()

  const gstType = watch('gstType')

  useEffect(() => {
    if (id) {
      loadParty()
    }
  }, [id])

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
        // Map DB row (snake_case) -> Party shape used in UI
        const foundParty: Party = {
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
            country: row.billingAddress?.country ?? 'India',
          },
          shippingAddress: row.shippingAddress ?? undefined,
          useShippingAddress: row.useShippingAddress ?? false,
          gstType: row.gstType ?? 'registered',
          state: row.state,
          createdAt: row.created_at ?? row.createdAt,
          updatedAt: row.updated_at ?? row.updatedAt,
          // Slab fields if present later
          weightSlabId: row.weightSlabId,
          distanceSlabId: row.distanceSlabId,
          distanceCategory: row.distanceCategory,
          volumeSlabId: row.volumeSlabId,
          codSlabId: row.codSlabId,
        }

        setParty(foundParty)
        setUseShippingAddress(foundParty.useShippingAddress)
        reset({
          partyName: foundParty.partyName,
          gstin: foundParty.gstin || '',
          phoneNumber: foundParty.phoneNumber,
          email: foundParty.email || '',
          gstType: foundParty.gstType,
          state: foundParty.state,
          useShippingAddress: foundParty.useShippingAddress,
          billingAddress: foundParty.billingAddress,
          shippingAddress: foundParty.shippingAddress || foundParty.billingAddress
        })
      } catch (e) {
        console.error('Failed to load party', e)
        setParty(null)
      }
      setLoading(false)
    })()
  }

  const onSubmit = async (data: PartyFormData) => {
    if (!party) return
    
    setIsSubmitting(true)
    
    try {
      // Validate GSTIN format for registered businesses
      if (data.gstType === 'registered' && data.gstin) {
        const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
        if (!gstinRegex.test(data.gstin)) {
          alert('Please enter a valid GSTIN format (e.g., 27AABCU9603R1ZX)')
          setIsSubmitting(false)
          return
        }
      }

      // Update party object
      const updatedParty: Party = {
        ...party,
        partyName: data.partyName,
        gstin: data.gstType === 'registered' ? data.gstin : undefined,
        phoneNumber: data.phoneNumber,
        email: data.email || undefined,
        billingAddress: data.billingAddress,
        shippingAddress: useShippingAddress ? data.shippingAddress : data.billingAddress,
        useShippingAddress,
        gstType: data.gstType,
        state: data.state,
        updatedAt: new Date().toISOString()
      }

      // Persist via API
      const payload = {
        // Map UI -> DB columns expected by backend
        party_name: updatedParty.partyName,
        contact_person: (updatedParty as any).contactPerson, // optional
        phone: updatedParty.phoneNumber,
        email: updatedParty.email,
        address: updatedParty.billingAddress.street,
        city: updatedParty.billingAddress.city,
        state: updatedParty.state,
        pincode: updatedParty.billingAddress.pincode,
        gst_number: updatedParty.gstin,
        pan_number: (updatedParty as any).panNumber, // optional
      }

      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch(`/api/parties/${party.id}` , {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Update failed')
      }

      // Show success message
      alert('Party updated successfully!')
      
      // Redirect to party details
      router.push(`/dashboard/parties`)
      
    } catch (error) {
      console.error('Error updating party:', error)
      alert('Failed to update party. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyBillingToShipping = () => {
    const billingAddress = watch('billingAddress')
    setValue('shippingAddress', billingAddress)
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
            <h1 className="text-2xl font-bold text-gray-900">Edit Party</h1>
            <p className="text-gray-600 mt-1">Update {party.partyName} details</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Party Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('partyName', { required: 'Party name is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter party name"
              />
              {errors.partyName && (
                <p className="mt-1 text-sm text-red-600">{errors.partyName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                {...register('phoneNumber', { 
                  required: 'Phone number is required',
                  pattern: {
                    value: /^[\+]?[1-9][\d]{0,15}$/,
                    message: 'Please enter a valid phone number'
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="+91-9876543210"
              />
              {errors.phoneNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.phoneNumber.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email ID
              </label>
              <input
                type="email"
                {...register('email', {
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Please enter a valid email address'
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="contact@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GST Type <span className="text-red-500">*</span>
              </label>
              <select
                {...register('gstType', { required: 'GST type is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {GST_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {errors.gstType && (
                <p className="mt-1 text-sm text-red-600">{errors.gstType.message}</p>
              )}
            </div>

            {gstType === 'registered' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GSTIN <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('gstin', {
                    required: gstType === 'registered' ? 'GSTIN is required for registered businesses' : false,
                    pattern: {
                      value: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
                      message: 'Please enter a valid GSTIN (e.g., 27AABCU9603R1ZX)'
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono"
                  placeholder="27AABCU9603R1ZX"
                  style={{ textTransform: 'uppercase' }}
                />
                {errors.gstin && (
                  <p className="mt-1 text-sm text-red-600">{errors.gstin.message}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State <span className="text-red-500">*</span>
              </label>
              <select
                {...register('state', { required: 'State is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select State</option>
                {INDIAN_STATES.map(state => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
              {errors.state && (
                <p className="mt-1 text-sm text-red-600">{errors.state.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Billing Address */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Billing Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Street Address <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register('billingAddress.street', { required: 'Street address is required' })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter complete street address"
              />
              {errors.billingAddress?.street && (
                <p className="mt-1 text-sm text-red-600">{errors.billingAddress.street.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('billingAddress.city', { required: 'City is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter city"
              />
              {errors.billingAddress?.city && (
                <p className="mt-1 text-sm text-red-600">{errors.billingAddress.city.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State <span className="text-red-500">*</span>
              </label>
              <select
                {...register('billingAddress.state', { required: 'State is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select State</option>
                {INDIAN_STATES.map(state => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
              {errors.billingAddress?.state && (
                <p className="mt-1 text-sm text-red-600">{errors.billingAddress.state.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pincode <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('billingAddress.pincode', { 
                  required: 'Pincode is required',
                  pattern: {
                    value: /^[1-9][0-9]{5}$/,
                    message: 'Please enter a valid 6-digit pincode'
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="400001"
                maxLength={6}
              />
              {errors.billingAddress?.pincode && (
                <p className="mt-1 text-sm text-red-600">{errors.billingAddress.pincode.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <input
                type="text"
                {...register('billingAddress.country')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                value="India"
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Shipping Address</h3>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={useShippingAddress}
                  onChange={(e) => setUseShippingAddress(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700">Different from billing address</span>
              </label>
              {useShippingAddress && (
                <button
                  type="button"
                  onClick={copyBillingToShipping}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  Copy from billing
                </button>
              )}
            </div>
          </div>

          {useShippingAddress && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  {...register('shippingAddress.street', { 
                    required: useShippingAddress ? 'Street address is required' : false 
                  })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter complete street address"
                />
                {errors.shippingAddress?.street && (
                  <p className="mt-1 text-sm text-red-600">{errors.shippingAddress.street.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('shippingAddress.city', { 
                    required: useShippingAddress ? 'City is required' : false 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter city"
                />
                {errors.shippingAddress?.city && (
                  <p className="mt-1 text-sm text-red-600">{errors.shippingAddress.city.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('shippingAddress.state', { 
                    required: useShippingAddress ? 'State is required' : false 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select State</option>
                  {INDIAN_STATES.map(state => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
                {errors.shippingAddress?.state && (
                  <p className="mt-1 text-sm text-red-600">{errors.shippingAddress.state.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pincode <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('shippingAddress.pincode', { 
                    required: useShippingAddress ? 'Pincode is required' : false,
                    pattern: {
                      value: /^[1-9][0-9]{5}$/,
                      message: 'Please enter a valid 6-digit pincode'
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="400001"
                  maxLength={6}
                />
                {errors.shippingAddress?.pincode && (
                  <p className="mt-1 text-sm text-red-600">{errors.shippingAddress.pincode.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <input
                  type="text"
                  {...register('shippingAddress.country')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  value="India"
                  readOnly
                />
              </div>
            </div>
          )}
        </div>

      {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center px-6 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Update Party
          </button>
        </div>
      </form>
    </div>
  )
}
