'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Save, Plus } from 'lucide-react'
import { PartyFormData, GST_TYPES, INDIAN_STATES } from '@/types/party'

export default function NewPartyPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [useShippingAddress, setUseShippingAddress] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset
  } = useForm<PartyFormData>({
    defaultValues: {
      partyName: '',
      gstin: '',
      phoneNumber: '',
      email: '',
      gstType: 'unregistered',
      state: '',
      useShippingAddress: false,
      billingAddress: {
        street: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India'
      },
      shippingAddress: {
        street: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India'
      }
    }
  })

  const gstType = watch('gstType')
  const billingState = watch('billingAddress.state')

  const onSubmit = async (data: PartyFormData) => {
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
      // Map frontend camelCase fields to backend snake_case fields
      const party = {
        party_name: data.partyName,
        contact_person: data.contactPerson || '',
        phone: data.phoneNumber,
        email: data.email,
        address: data.billingAddress?.street || '',
        city: data.billingAddress?.city || '',
        state: data.billingAddress?.state || '',
        pincode: data.billingAddress?.pincode || '',
        gst_number: data.gstin,
        gst_type: data.gstType,
        pan_number: data.panNumber || '',
      };
      // Send to backend API
      const res = await fetch('/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(party)
      });
      if (res.ok) {
        alert('Party created successfully!');
        router.push('/dashboard/parties');
      } else {
        let message = 'Unknown error'
        try {
          const err = await res.json();
          message = [err.error, err.details].filter(Boolean).join(' - ')
        } catch (_) {
          try {
            const text = await res.text()
            message = text || message
          } catch {}
        }
        alert('Failed to create party: ' + message);
      }
    } catch (error) {
      console.error('Error creating party:', error)
      alert('Failed to create party. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveAndNew = async (data: PartyFormData) => {
    await onSubmit(data)
    reset()
    setUseShippingAddress(false)
  }

  const copyBillingToShipping = () => {
    const billingAddress = watch('billingAddress')
    setValue('shippingAddress', billingAddress)
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
            <h1 className="text-2xl font-bold text-gray-900">Add New Party</h1>
            <p className="text-gray-600 mt-1">Create a new customer party</p>
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

        {/* Slab Assignment removed as requested */}
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
            type="button"
            onClick={handleSubmit(handleSaveAndNew)}
            disabled={isSubmitting}
            className="flex items-center px-6 py-2 border border-primary-600 rounded-md text-sm font-medium text-primary-600 bg-white hover:bg-primary-50 transition-colors disabled:opacity-50"
          >
            <Plus className="h-4 w-4 mr-2" />
            Save & New
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
            Save Party
          </button>
        </div>
      </form>
    </div>
  )
}

