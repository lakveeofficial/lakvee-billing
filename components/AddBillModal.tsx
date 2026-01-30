"use client"

import { useState, useEffect } from 'react'
import { X, Palette } from 'lucide-react'
import TemplateSelectionModal from './TemplateSelectionModal'

interface AddBillModalProps {
  isOpen: boolean
  onClose: () => void
  onBillCreated?: (bill: any) => void
  prefillData?: {
    partyName?: string
    amount?: number
    month?: string
  }
  selectedBookings?: { id: number; booking_type: 'account' | 'cash' }[]
}

interface Party {
  id: number
  partyName: string
}

export default function AddBillModal({ isOpen, onClose, onBillCreated, prefillData, selectedBookings }: AddBillModalProps) {
  const [formData, setFormData] = useState({
    billNo: '',
    partyName: '',
    amount: '',
    month: 'Sep 2025',
    serviceChPercent: '',
    fchPercent: '0',
    otherCharges: '',
    cgstPercent: '9',
    sgstPercent: '9',
    igstPercent: '0',
    billDate: new Date().toISOString().split('T')[0],
    sendEmail: true,
    selectedTemplate: 'Default'
  })

  const [parties, setParties] = useState<Party[]>([])
  const [partiesLoading, setPartiesLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showTemplateModal, setShowTemplateModal] = useState(false)

  // Template options
  const templates = [
    'Default', 'Template 1', 'Template 2', 'Template 3',
    'Template 4', 'Template 5', 'Template 6', 'Template 7',
    'Template 8', 'Template 9', 'Template 10', 'Template 11',
    'Template 12', 'Template 13'
  ]

  useEffect(() => {
    if (isOpen) {
      // Generate bill number
      const now = new Date()
      const year = now.getFullYear().toString().slice(-2)
      const month = (now.getMonth() + 1).toString().padStart(2, '0')
      const day = now.getDate().toString().padStart(2, '0')
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')

      setFormData(prev => ({
        ...prev,
        billNo: `STC${year}${month}${day}${random}`,
        partyName: prefillData?.partyName || '',
        amount: prefillData?.amount?.toString() || '',
        month: prefillData?.month || now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      }))

      // Load parties
      loadParties()
    }
  }, [isOpen, prefillData])

  const loadParties = async () => {
    try {
      setPartiesLoading(true)
      const response = await fetch('/api/parties/simple', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        console.log('Loaded parties:', data.data)
        setParties(data.data || [])
      } else {
        console.error('Failed to load parties:', response.status, response.statusText)
        setError('Failed to load parties')
      }
    } catch (error) {
      console.error('Error loading parties:', error)
      setError('Error loading parties')
    } finally {
      setPartiesLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const calculateTotals = () => {
    const amount = parseFloat(formData.amount) || 0
    const serviceChPercent = parseFloat(formData.serviceChPercent) || 0
    const fchPercent = parseFloat(formData.fchPercent) || 0
    const otherCharges = parseFloat(formData.otherCharges) || 0
    const cgstPercent = parseFloat(formData.cgstPercent) || 0
    const sgstPercent = parseFloat(formData.sgstPercent) || 0
    const igstPercent = parseFloat(formData.igstPercent) || 0

    const serviceCharges = (amount * serviceChPercent) / 100
    const fuelCharges = (amount * fchPercent) / 100
    const subtotal = amount + serviceCharges + fuelCharges + otherCharges

    const cgstAmount = (subtotal * cgstPercent) / 100
    const sgstAmount = (subtotal * sgstPercent) / 100
    const igstAmount = (subtotal * igstPercent) / 100

    const totalTax = cgstAmount + sgstAmount + igstAmount
    const grandTotal = subtotal + totalTax

    return {
      serviceCharges,
      fuelCharges,
      subtotal,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalTax,
      grandTotal
    }
  }

  const handleSubmit = async (action: 'generate' | 'generateAndPrint') => {
    try {
      setLoading(true)
      setError('')

      const selectedParty = parties.find(p => p.partyName.trim().toLowerCase() === (formData.partyName || '').trim().toLowerCase())
      if (!selectedParty) {
        setError('Please select a valid party')
        return
      }

      const totals = calculateTotals()

      const payload = {
        party_id: selectedParty.id,
        invoice_number: formData.billNo,
        invoice_date: formData.billDate,
        total_amount: totals.grandTotal,
        base_amount: parseFloat(formData.amount) || 0,
        status: 'sent',
        items: [
          {
            item_description: `Courier charges for ${formData.month}`,
            quantity: 1,
            unit_price: parseFloat(formData.amount) || 0,
            total_price: parseFloat(formData.amount) || 0,
            booking_date: formData.billDate
          }
        ],
        service_charges: totals.serviceCharges,
        fuel_charges: totals.fuelCharges,
        other_charges: parseFloat(formData.otherCharges) || 0,
        cgst_amount: totals.cgstAmount,
        sgst_amount: totals.sgstAmount,
        igst_amount: totals.igstAmount,
        template: formData.selectedTemplate,
        send_email: formData.sendEmail,
        selected_bookings: Array.isArray(selectedBookings) ? selectedBookings : undefined
      }

      // Generate bill using the real API
      const response = await fetch('/api/bills/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const result = await response.json()
        onBillCreated?.(result.bill)

        if (action === 'generateAndPrint') {
          // Open bill for printing
          window.open(`/api/bills/${result.bill.id}/pdf`, '_blank')
        } else {
          alert('Bill generated successfully!')
        }

        onClose()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to generate bill')
      }
    } catch (error) {
      console.error('Error generating bill:', error)
      setError('Failed to generate bill')
    } finally {
      setLoading(false)
    }
  }

  const totals = calculateTotals()

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white w-full max-w-4xl rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span>💰</span> Add Bill
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Bill No
                  </label>
                  <input
                    type="text"
                    value={formData.billNo}
                    onChange={(e) => handleInputChange('billNo', e.target.value)}
                    disabled={true}
                    className="w-full px-3 py-2 border border-slate-300 rounded bg-slate-100 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Amount *
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.01"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Service Ch. %
                    </label>
                    <input
                      type="number"
                      value={formData.serviceChPercent}
                      onChange={(e) => handleInputChange('serviceChPercent', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      FCh. %
                    </label>
                    <input
                      type="number"
                      value={formData.fchPercent}
                      onChange={(e) => handleInputChange('fchPercent', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Other Ch.
                    </label>
                    <input
                      type="number"
                      value={formData.otherCharges}
                      onChange={(e) => handleInputChange('otherCharges', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      CGST %
                    </label>
                    <input
                      type="number"
                      value={formData.cgstPercent}
                      onChange={(e) => handleInputChange('cgstPercent', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      SGST / UTGST %
                    </label>
                    <input
                      type="number"
                      value={formData.sgstPercent}
                      onChange={(e) => handleInputChange('sgstPercent', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      IGST %
                    </label>
                    <input
                      type="number"
                      value={formData.igstPercent}
                      onChange={(e) => handleInputChange('igstPercent', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Bill Template
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={formData.selectedTemplate}
                      onChange={(e) => handleInputChange('selectedTemplate', e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {templates.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowTemplateModal(true)}
                      className="px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 flex items-center gap-2"
                      title="View all templates"
                    >
                      <Palette className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="sendEmail"
                    checked={formData.sendEmail}
                    onChange={(e) => handleInputChange('sendEmail', e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="sendEmail" className="text-sm text-slate-700">
                    Send bill in email
                  </label>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Party Name *
                  </label>
                  <select
                    value={formData.partyName}
                    onChange={(e) => handleInputChange('partyName', e.target.value)}
                    disabled={!!prefillData?.partyName || partiesLoading}
                    className={`w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${!!prefillData?.partyName || partiesLoading ? 'bg-slate-100 cursor-not-allowed' : ''
                      }`}
                  >
                    <option value="">
                      {partiesLoading ? 'Loading parties...' : 'Select Party'}
                    </option>
                    {parties.map(party => (
                      <option key={party.id} value={party.partyName}>
                        {party.partyName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Month *
                  </label>
                  <select
                    value={formData.month}
                    onChange={(e) => handleInputChange('month', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {/* Generate last 12 months options dynamically */}
                    {Array.from({ length: 12 }).map((_, i) => {
                      const d = new Date()
                      d.setMonth(d.getMonth() - i)
                      const mStr = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                      return (
                        <option key={mStr} value={mStr}>
                          {mStr}
                        </option>
                      )
                    })}
                    {/* Ensure prefilled month is included if not in the last 12 months range */}
                    {prefillData?.month && !Array.from({ length: 12 }).some((_, i) => {
                      const d = new Date()
                      d.setMonth(d.getMonth() - i)
                      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) === prefillData.month
                    }) && (
                        <option value={prefillData.month}>{prefillData.month}</option>
                      )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Bill Date *
                  </label>
                  <input
                    type="date"
                    value={formData.billDate}
                    onChange={(e) => handleInputChange('billDate', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Calculation Summary */}
                <div className="bg-slate-50 p-4 rounded border">
                  <h4 className="font-medium text-slate-700 mb-3">Bill Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Base Amount:</span>
                      <span>₹{(parseFloat(formData.amount) || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Service Charges:</span>
                      <span>₹{totals.serviceCharges.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fuel Charges:</span>
                      <span>₹{totals.fuelCharges.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Other Charges:</span>
                      <span>₹{(parseFloat(formData.otherCharges) || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>CGST:</span>
                      <span>₹{totals.cgstAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SGST:</span>
                      <span>₹{totals.sgstAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>IGST:</span>
                      <span>₹{totals.igstAmount.toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-medium">
                      <span>Grand Total:</span>
                      <span>₹{totals.grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button
                onClick={onClose}
                className="px-4 py-2 text-slate-600 border border-slate-300 rounded hover:bg-slate-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmit('generate')}
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Generate Bill'}
              </button>
              <button
                onClick={() => handleSubmit('generateAndPrint')}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Generate and Print'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <TemplateSelectionModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelect={(template) => handleInputChange('selectedTemplate', template)}
        currentTemplate={formData.selectedTemplate}
      />
    </>
  )
}
