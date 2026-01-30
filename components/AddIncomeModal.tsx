"use client"

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface AddIncomeModalProps {
  isOpen: boolean
  onClose: () => void
  onIncomeAdded?: (income: any) => void
  clientData?: {
    partyId?: number;
    clientName?: string
    totalBalance?: number
    unpaidBills?: Array<{
      billNo: string
      month: string
      amount: number
      dueAmount: number
    }>
  }
}

interface Party {
  id: number
  party_name: string
}

export default function AddIncomeModal({ isOpen, onClose, onIncomeAdded, clientData }: AddIncomeModalProps) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    clientName: '',
    amount: '',
    tdsDeduct: '',
    discount: '',
    description: ''
  })
  
  const [parties, setParties] = useState<Party[]>([])
  const [selectedBills, setSelectedBills] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        clientName: clientData?.clientName || '',
        amount: clientData?.totalBalance?.toString() || '',
        tdsDeduct: '',
        discount: '',
        description: ''
      });
      if (!clientData?.clientName) {
        loadParties();
      }
    }
  }, [isOpen, clientData]);

  const loadParties = async () => {
    try {
      const response = await fetch('/api/parties?limit=1000', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setParties(data.data || [])
      }
    } catch (error) {
      console.error('Error loading parties:', error)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleBillSelection = (billNo: string, checked: boolean) => {
    setSelectedBills(prev => ({
      ...prev,
      [billNo]: checked
    }))
  }

  const calculateTotalSelected = () => {
    if (!clientData?.unpaidBills) return 0
    return clientData.unpaidBills
      .filter(bill => selectedBills[bill.billNo])
      .reduce((sum, bill) => sum + bill.dueAmount, 0)
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      setError('')

      let partyId = clientData?.partyId;
      if (!partyId) {
        const selectedParty = parties.find(p => p.party_name === formData.clientName);
        if (!selectedParty) {
          setError('Please select a valid client');
          return;
        }
        partyId = selectedParty.id;
      }

      if (!partyId) {
        setError('Could not determine client ID.');
        return;
      }

      const selectedBillsList = clientData?.unpaidBills?.filter(bill => selectedBills[bill.billNo]) || []

      const payload = {
        party_id: partyId,
        payment_date: formData.date,
        amount: parseFloat(formData.amount) || 0,
        tds_deduct: parseFloat(formData.tdsDeduct) || 0,
        discount: parseFloat(formData.discount) || 0,
        description: formData.description,
        selected_bills: selectedBillsList.map(bill => ({
          bill_no: bill.billNo,
          month: bill.month,
          amount: bill.dueAmount
        }))
      }

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const income = await response.json()
        onIncomeAdded?.(income)
        onClose()
      } else {
        const errorData = await response.json();
        const detailMessage = errorData.details ? ` (${errorData.details})` : '';
        setError(`${errorData.error || 'Failed to add income'}${detailMessage}`);
      }
    } catch (error) {
      console.error('Error adding income:', error)
      setError('Failed to add income')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span>₹</span> Add Income
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

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Client Name *
              </label>
              <select
                value={formData.clientName}
                onChange={(e) => handleInputChange('clientName', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-100 disabled:opacity-75"
                disabled={!!clientData?.clientName}
              >
                {clientData?.clientName ? (
                  <option value={clientData.clientName}>{clientData.clientName}</option>
                ) : (
                  <>
                    <option value="">Select Client</option>
                    {parties.map(party => (
                      <option key={party.id} value={party.party_name}>
                        {party.party_name}
                      </option>
                    ))}
                  </>
                )}
              </select>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  TDS Deduct
                </label>
                <input
                  type="number"
                  value={formData.tdsDeduct}
                  onChange={(e) => handleInputChange('tdsDeduct', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Discount (Rs)
                </label>
                <input
                  type="number"
                  value={formData.discount}
                  onChange={(e) => handleInputChange('discount', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.01"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Payment description..."
              />
            </div>

            {/* Unpaid Bills Section */}
            {clientData?.unpaidBills && clientData.unpaidBills.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-medium text-slate-700 mb-3">Unpaid Bills</h4>
                <div className="text-sm text-slate-600 mb-2">
                  Total Balance/Credit: <span className="font-medium">{clientData.totalBalance || 0}</span>
                </div>
                <div className="text-xs text-slate-500 mb-3">
                  Bills that automatically checked can be paid from your balance/credit amount.
                </div>

                <div className="bg-slate-50 rounded border">
                  <div className="grid grid-cols-4 gap-4 p-3 border-b bg-slate-100 text-sm font-medium text-slate-700">
                    <div>Mark as Paid?</div>
                    <div>Month</div>
                    <div>Dues ( Total: {clientData.totalBalance || 0})</div>
                    <div>Bill No.</div>
                  </div>
                  
                  {clientData.unpaidBills.map((bill, index) => (
                    <div key={index} className="grid grid-cols-4 gap-4 p-3 border-b last:border-b-0 text-sm">
                      <div>
                        <input
                          type="checkbox"
                          checked={selectedBills[bill.billNo] || false}
                          onChange={(e) => handleBillSelection(bill.billNo, e.target.checked)}
                          className="rounded"
                        />
                      </div>
                      <div>{bill.month}</div>
                      <div>{bill.dueAmount.toFixed(2)}</div>
                      <div>{bill.billNo}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 text-sm">
                  <span className="font-medium">Selected Bills Total: </span>
                  <span className="text-green-600">₹{calculateTotalSelected().toFixed(2)}</span>
                </div>
              </div>
            )}
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
              onClick={handleSubmit}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Income'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
