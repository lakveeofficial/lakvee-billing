'use client'

import { useState, useEffect } from 'react'
import { X, DollarSign, Save } from 'lucide-react'

interface QuotationData {
  [packageType: string]: {
    [region: string]: {
      [weight: string]: string
    }
  }
}

interface WeightRange {
  weight: number
  unit: string
}

interface PackageType {
  name: string
  ranges: WeightRange[]
  extraWeight?: number
  unit: string
}

interface PartyQuotationModalProps {
  isOpen: boolean
  onClose: () => void
  partyId: number
  partyName: string
}

export default function PartyQuotationModal({ isOpen, onClose, partyId, partyName }: PartyQuotationModalProps) {
  const [activeTab, setActiveTab] = useState('DOX')
  const [quotationData, setQuotationData] = useState<QuotationData>({})
  const [regions, setRegions] = useState<string[]>([])
  const [packageTypes, setPackageTypes] = useState<PackageType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen && partyId) {
      fetchData()
    }
  }, [isOpen, partyId])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch regions
      const regionsResponse = await fetch('/api/regions', {
        credentials: 'include'
      })
      const regionsData = await regionsResponse.json()
      setRegions(regionsData.data?.map((r: any) => r.name) || [])

      // Fetch party package types
      const packageTypesResponse = await fetch(`/api/parties/${partyId}/package-types`, {
        credentials: 'include'
      })
      const packageTypesData = await packageTypesResponse.json()
      
      const types = packageTypesData.success ? packageTypesData.data : [
        {
          name: 'DOX',
          ranges: [
            { weight: 100, unit: 'gm' },
            { weight: 250, unit: 'gm' },
            { weight: 500, unit: 'gm' },
            { weight: 750, unit: 'gm' },
            { weight: 1000, unit: 'gm' }
          ],
          extraWeight: 1000,
          unit: 'gm'
        },
        {
          name: 'Parcel',
          ranges: [{ weight: 1000, unit: 'gm' }],
          extraWeight: 1000,
          unit: 'kg'
        }
      ]
      
      setPackageTypes(types)
      if (types.length > 0) {
        setActiveTab(types[0].name)
      }

      // Fetch existing quotations
      const quotationsResponse = await fetch(`/api/parties/${partyId}/quotations`, {
        credentials: 'include'
      })
      const quotationsData = await quotationsResponse.json()
      
      if (quotationsData.success && quotationsData.data) {
        const formattedData: QuotationData = {}
        quotationsData.data.forEach((quotation: any) => {
          if (quotation.rates) {
            formattedData[quotation.package_type] = quotation.rates
          }
        })
        setQuotationData(formattedData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCurrentPackageType = () => {
    return packageTypes.find(pkg => pkg.name === activeTab)
  }

  const getWeightColumns = () => {
    const currentPackageType = getCurrentPackageType()
    if (!currentPackageType) return []
    
    // Display strictly using the package type's selected unit.
    // Interpret each range.weight as being in the package type unit to avoid mixed-unit headers.
    const targetUnit = (currentPackageType.unit || '').toLowerCase()
    const columns = currentPackageType.ranges.map((range: WeightRange) => {
      const weightText = String(range.weight)
      return `${weightText}_${targetUnit}`
    })
    
    if (currentPackageType.extraWeight) {
      const extraText = String(currentPackageType.extraWeight)
      columns.push(`Add_${extraText}_${targetUnit}`)
    }
    
    return columns
  }

  const updateQuotation = (region: string, weight: string, value: string) => {
    setQuotationData(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [region]: {
          ...prev[activeTab]?.[region],
          [weight]: value
        }
      }
    }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      const currentData = quotationData[activeTab] || {}
      
      const response = await fetch(`/api/parties/${partyId}/quotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          package_type: activeTab,
          rates: currentData
        })
      })

      const data = await response.json()
      if (data.success) {
        alert('Quotation saved successfully!')
      } else {
        alert('Failed to save quotation: ' + data.error)
      }
    } catch (error) {
      console.error('Error saving quotation:', error)
      alert('Failed to save quotation')
    } finally {
      setSaving(false)
    }
  }

  const sendQuotationMail = () => {
    alert('Send Quotation Mail functionality will be implemented')
  }

  if (!isOpen) return null

  const weightColumns = getWeightColumns()
  const currentQuotationData = quotationData[activeTab] || {}

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-xl">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Party Quotation</h2>
              <p className="text-sm text-slate-500">{partyName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-slate-500">Loading...</div>
            </div>
          ) : (
            <>
              {/* Package Type Tabs */}
              <div className="flex gap-1 mb-4 border-b border-slate-200">
                {packageTypes.map((packageType) => (
                  <button
                    key={packageType.name}
                    onClick={() => setActiveTab(packageType.name)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === packageType.name
                        ? 'border-blue-500 text-blue-600 bg-blue-50'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {packageType.name}
                  </button>
                ))}
              </div>

              {/* Quotation Table */}
              <div className="overflow-x-auto">
                <table className="w-full border border-slate-300">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="border border-slate-300 px-3 py-2 text-left text-sm font-medium text-slate-700">
                        Region
                      </th>
                      {weightColumns.map((weight) => (
                        <th key={weight} className="border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700">
                          {weight.replace('_', ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {regions.map((region) => (
                      <tr key={region} className="hover:bg-slate-50">
                        <td className="border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-50">
                          {region}
                        </td>
                        {weightColumns.map((weight) => (
                          <td key={weight} className="border border-slate-300 px-2 py-1">
                            <input
                              type="text"
                              value={currentQuotationData[region]?.[weight] || ''}
                              onChange={(e) => updateQuotation(region, weight, e.target.value)}
                              className="w-full px-2 py-1 text-sm border-0 focus:ring-1 focus:ring-blue-500 rounded"
                              placeholder="0"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-4 border-t border-slate-200">
          <button
            onClick={sendQuotationMail}
            className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
          >
            Send Quotation Mail
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
