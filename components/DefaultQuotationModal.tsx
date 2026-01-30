'use client'

import { useState, useEffect } from 'react'
import { X, DollarSign } from 'lucide-react'
import { usePackageTypes } from './SharedPackageTypesContext'

interface QuotationData {
  [region: string]: {
    [weight: string]: string
  }
}

interface DefaultQuotationModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function DefaultQuotationModal({ isOpen, onClose }: DefaultQuotationModalProps) {
  const { packageTypes } = usePackageTypes()
  const [activeTab, setActiveTab] = useState('DOX')
  const [quotationData, setQuotationData] = useState<QuotationData>({})
  const [regions, setRegions] = useState<string[]>([])
  const [loadingRegions, setLoadingRegions] = useState(true)
  
  // Get current package type data
  const currentPackageType = packageTypes.find(pkg => pkg.name === activeTab)
  
  // Generate weight columns strictly using the package type's selected unit.
  // Interpret each range.weight as already being in the package type's unit to avoid mixed-unit confusion.
  const weightColumns = currentPackageType ? [
    ...currentPackageType.ranges.map(range => {
      const displayUnit = currentPackageType.unit.toLowerCase()
      const displayWeight = String(range.weight)
      return `${displayWeight} ${displayUnit}`
    }),
    ...(currentPackageType.extraWeight ? [`Add_${currentPackageType.extraWeight} ${currentPackageType.unit.toLowerCase()}`] : [])
  ] : []
  
  // Initialize quotation data when package types, active tab, or regions change
  useEffect(() => {
    if (currentPackageType && regions.length > 0) {
      setQuotationData(prev => {
        const newData: QuotationData = {}
        regions.forEach(region => {
          newData[region] = {}
          weightColumns.forEach(weight => {
            newData[region][weight] = prev[region]?.[weight] || ''
          })
        })
        return newData
      })
    }
  }, [activeTab, packageTypes, regions])
  
  // Set default active tab to first available package type
  useEffect(() => {
    if (packageTypes.length > 0 && !packageTypes.find(pkg => pkg.name === activeTab)) {
      setActiveTab(packageTypes[0].name)
    }
  }, [packageTypes])
  
  // Fetch regions from API
  useEffect(() => {
    const fetchRegions = async () => {
      try {
        setLoadingRegions(true)
        const response = await fetch('/api/regions')
        const data = await response.json()
        setRegions(data.data.map((region: any) => region.name))
      } catch (error) {
        console.error('Error fetching regions:', error)
        // Fallback to default regions if API fails
        setRegions(['MUMBAI', 'REST OF INDIA', 'metro', 'Gujarat', 'MP', 'NORTH EST'])
      } finally {
        setLoadingRegions(false)
      }
    }
    
    if (isOpen) {
      fetchRegions()
    }
  }, [isOpen])

  if (!isOpen) return null

  const updateQuotation = (region: string, weight: string, value: string) => {
    setQuotationData(prev => ({
      ...prev,
      [region]: {
        ...prev[region],
        [weight]: value
      }
    }))
  }

  const saveChanges = async () => {
    // Here you would typically save to API
    console.log('Saving quotation data:', quotationData)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold">Default Quotation</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
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
            {loadingRegions ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-slate-500">Loading regions...</div>
              </div>
            ) : (
              <table className="w-full border border-slate-300">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-300 px-3 py-2 text-left text-sm font-medium text-slate-700">
                      Region
                    </th>
                    {weightColumns.map((weight) => (
                      <th key={weight} className="border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700">
                        {weight}
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
                            value={quotationData[region]?.[weight] || ''}
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
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={saveChanges}
            className="px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
