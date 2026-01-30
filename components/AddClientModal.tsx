'use client'

import { useState, useEffect } from 'react'
import { X, User } from 'lucide-react'
import { INDIAN_STATES, State, City } from '@/lib/indiaData'

interface AddClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
  initialData?: any
  isEditMode?: boolean
}

export default function AddClientModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  isEditMode = false
}: AddClientModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    contactPersonName: '',
    address: '',
    state: '',
    city: '',
    phone: '',
    email1: '',
    email2: '',
    fuelChargePercent: '10',
    fovChargePercent: '0.02',
    gstType: 'GST',
    gstNumber: '',
    cgstPercent: '',
    sgstPercent: '',
    igstPercent: '',
    status: 'Active',
    sendWeightsInEmail: false,
    sendChargesInEmail: false,
    sendCarrierInEmail: false,
    sendRemarkInEmail: false,
    sendWelcomeSMS: false,
    ignoreWhileImport: false,
    bookingWithGST: false
  })

  const [availableCities, setAvailableCities] = useState<City[]>([])

  // Update form fields when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData && isEditMode) {
      // Extract address from billing_address JSON if it exists
      let addressStr = ''
      if (initialData.billing_address) {
        try {
          const billingAddr = typeof initialData.billing_address === 'string'
            ? JSON.parse(initialData.billing_address)
            : initialData.billing_address
          addressStr = billingAddr.street || ''
        } catch (e) {
          console.error('Error parsing billing address:', e)
        }
      }

      setFormData({
        name: initialData.name || '',
        contactPersonName: initialData.contact_person_name || '',
        address: addressStr,
        state: initialData.state || '',
        city: initialData.city || '',
        phone: initialData.phone || '',
        email1: initialData.email || '',
        email2: initialData.email2 || '',
        fuelChargePercent: initialData.fuel_charge_percent ? (+initialData.fuel_charge_percent).toFixed(2).replace(/\.?0+$/, '') : '10',
        fovChargePercent: initialData.fov_charge_percent ? (+initialData.fov_charge_percent).toFixed(2).replace(/\.?0+$/, '') : '0.02',
        gstType: initialData.gst_type === 'registered' ? 'GST' : 'Non GST',
        gstNumber: initialData.gst_number || '',
        cgstPercent: initialData.cgst_percent ? (+initialData.cgst_percent).toFixed(2).replace(/\.?0+$/, '') : '',
        sgstPercent: initialData.sgst_percent ? (+initialData.sgst_percent).toFixed(2).replace(/\.?0+$/, '') : '',
        igstPercent: initialData.igst_percent ? (+initialData.igst_percent).toFixed(2).replace(/\.?0+$/, '') : '',
        status: initialData.status || 'Active',
        sendWeightsInEmail: initialData.send_weights_in_email || false,
        sendChargesInEmail: initialData.send_charges_in_email || false,
        sendCarrierInEmail: initialData.send_carrier_in_email || false,
        sendRemarkInEmail: initialData.send_remark_in_email || false,
        sendWelcomeSMS: initialData.send_welcome_sms || false,
        ignoreWhileImport: initialData.ignore_while_import || false,
        bookingWithGST: initialData.booking_with_gst || false
      })
    } else if (!isEditMode) {
      // Reset form for add mode
      setFormData({
        name: '',
        contactPersonName: '',
        address: '',
        state: '',
        city: '',
        phone: '',
        email1: '',
        email2: '',
        fuelChargePercent: '10',
        fovChargePercent: '0.02',
        gstType: 'GST',
        gstNumber: '',
        cgstPercent: '',
        sgstPercent: '',
        igstPercent: '',
        status: 'Active',
        sendWeightsInEmail: false,
        sendChargesInEmail: false,
        sendCarrierInEmail: false,
        sendRemarkInEmail: false,
        sendWelcomeSMS: false,
        ignoreWhileImport: false,
        bookingWithGST: false
      })
    }
  }, [initialData, isEditMode, isOpen])

  const handleSave = () => {
    if (formData.name.trim() && formData.contactPersonName.trim()) {
      onSave(formData)
      onClose()
    } else {
      alert('Please fill in required fields: Name and Contact Person Name')
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleStateChange = (stateName: string) => {
    // Update state in form data
    setFormData(prev => ({
      ...prev,
      state: stateName,
      city: '' // Reset city when state changes
    }))

    // Find the selected state and update available cities
    const selectedState = INDIAN_STATES.find(state => state.name === stateName)
    if (selectedState) {
      setAvailableCities(selectedState.cities)
    } else {
      setAvailableCities([])
    }
  }

  // Update available cities when state changes in edit mode
  useEffect(() => {
    if (formData.state) {
      const selectedState = INDIAN_STATES.find(state => state.name === formData.state)
      if (selectedState) {
        setAvailableCities(selectedState.cities)
      }
    }
  }, [formData.state])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">
              {isEditMode ? 'Edit Party' : 'Add Party'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter party name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contact Person Name *
              </label>
              <input
                type="text"
                value={formData.contactPersonName}
                onChange={(e) => handleInputChange('contactPersonName', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter contact person name"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Enter full address"
            />
          </div>

          {/* State and City */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                State
              </label>
              <select
                value={formData.state}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">Select State</option>
                {INDIAN_STATES.map((state) => (
                  <option key={state.code} value={state.name}>
                    {state.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                City
              </label>
              <select
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className={`w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${!formData.state ? 'bg-slate-100 cursor-not-allowed' : ''
                  }`}
                disabled={!formData.state}
              >
                <option value="">
                  {formData.state ? 'Select City' : 'Select State First'}
                </option>
                {availableCities.map((city) => (
                  <option key={city.code} value={city.name}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email 1
              </label>
              <input
                type="email"
                value={formData.email1}
                onChange={(e) => handleInputChange('email1', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter primary email"
              />
            </div>
          </div>

          {/* Email 2 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Emails 2
            </label>
            <input
              type="email"
              value={formData.email2}
              onChange={(e) => handleInputChange('email2', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Add multiple emails with comma (,) separated. For eg - abc@test.com, def@test.com and so on"
            />
          </div>

          {/* Charges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Fuel Charge %
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.fuelChargePercent}
                onChange={(e) => handleInputChange('fuelChargePercent', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="E.g. 10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                FOV Charge %
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.fovChargePercent}
                onChange={(e) => handleInputChange('fovChargePercent', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="E.g. 0.02"
              />
            </div>
          </div>

          {/* GST Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  GST Type
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="gstType"
                      value="GST"
                      checked={formData.gstType === 'GST'}
                      onChange={(e) => handleInputChange('gstType', e.target.value)}
                      className="mr-2"
                    />
                    GST
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="gstType"
                      value="Non GST"
                      checked={formData.gstType === 'Non GST'}
                      onChange={(e) => handleInputChange('gstType', e.target.value)}
                      className="mr-2"
                    />
                    Non GST
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  GST Number
                </label>
                <input
                  type="text"
                  value={formData.gstNumber}
                  onChange={(e) => handleInputChange('gstNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Enter GST number"
                />
              </div>
            </div>

            {/* GST Percentages */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  CGST %
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cgstPercent}
                  onChange={(e) => handleInputChange('cgstPercent', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  SGST %
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.sgstPercent}
                  onChange={(e) => handleInputChange('sgstPercent', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  IGST %
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.igstPercent}
                  onChange={(e) => handleInputChange('igstPercent', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Status
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="status"
                  value="Active"
                  checked={formData.status === 'Active'}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="mr-2"
                />
                Active
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="status"
                  value="Inactive"
                  checked={formData.status === 'Inactive'}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="mr-2"
                />
                Inactive
              </label>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.sendWeightsInEmail}
                  onChange={(e) => handleInputChange('sendWeightsInEmail', e.target.checked)}
                  className="mr-2 rounded border-slate-300"
                />
                Send weights in email
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.sendChargesInEmail}
                  onChange={(e) => handleInputChange('sendChargesInEmail', e.target.checked)}
                  className="mr-2 rounded border-slate-300"
                />
                Send charges in email
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.sendCarrierInEmail}
                  onChange={(e) => handleInputChange('sendCarrierInEmail', e.target.checked)}
                  className="mr-2 rounded border-slate-300"
                />
                Send carrier in email
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.sendRemarkInEmail}
                  onChange={(e) => handleInputChange('sendRemarkInEmail', e.target.checked)}
                  className="mr-2 rounded border-slate-300"
                />
                Send remark in email
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.sendWelcomeSMS}
                  onChange={(e) => handleInputChange('sendWelcomeSMS', e.target.checked)}
                  className="mr-2 rounded border-slate-300"
                />
                Send welcome SMS
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.ignoreWhileImport}
                  onChange={(e) => handleInputChange('ignoreWhileImport', e.target.checked)}
                  className="mr-2 rounded border-slate-300"
                />
                Ignore while import
              </label>
            </div>
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.bookingWithGST}
                  onChange={(e) => handleInputChange('bookingWithGST', e.target.checked)}
                  className="mr-2 rounded border-slate-300"
                />
                Booking with GST
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-orange-500 border border-transparent rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
          >
            {isEditMode ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
