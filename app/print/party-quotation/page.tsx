'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

interface Company {
  id: number
  business_name: string
  business_address: string
  phone_number?: string
  email_id?: string
  logo?: string
  signature?: string
}

interface Party {
  id: number
  name: string
  contact_person_name?: string
  phone?: string
  email?: string
  city?: string
  state?: string
}

interface WeightRange {
  weight: string
  unit: string
}

interface PackageType {
  name: string
  unit: string
  ranges: WeightRange[]
  extraWeight?: string
}

interface QuotationRates {
  [region: string]: {
    [weight: string]: string
  }
}

interface PartyQuotation {
  package_type: string
  rates: QuotationRates
  created_at: string
  updated_at: string
}

export default function PrintPartyQuotationPage() {
  const searchParams = useSearchParams()
  const partyId = searchParams.get('partyId')
  
  const [company, setCompany] = useState<Company | null>(null)
  const [party, setParty] = useState<Party | null>(null)
  const [packageTypes, setPackageTypes] = useState<PackageType[]>([])
  const [quotations, setQuotations] = useState<PartyQuotation[]>([])
  const [regions, setRegions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-GB'))
    
    if (partyId) {
      fetchPartyAndQuotation()
    }
  }, [partyId])

  const fetchPartyAndQuotation = async () => {
    try {
      setLoading(true)
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
      
      // Fetch active company details
      const companyResponse = await fetch('/api/companies/active', { headers })
      if (companyResponse.ok) {
        const companyData = await companyResponse.json()
        console.log('Company data:', companyData)
        setCompany(companyData)
      } else {
        console.error('Failed to fetch company:', companyResponse.status)
      }

      // Fetch party details
      const partyResponse = await fetch(`/api/clients/${partyId}`, { headers })
      if (partyResponse.ok) {
        const partyResult = await partyResponse.json()
        console.log('Party data:', partyResult)
        if (partyResult.success) {
          setParty(partyResult.data)
        }
      } else {
        console.error('Failed to fetch party:', partyResponse.status)
      }

      // Fetch regions
      const regionsResponse = await fetch('/api/regions', { headers })
      if (regionsResponse.ok) {
        const regionsResult = await regionsResponse.json()
        if (regionsResult.success) {
          setRegions(regionsResult.data.map((region: any) => region.name))
        }
      }

      // Instead of fetching party-specific package types, derive them from quotations
      // This ensures we only show package types that have actual quotation data
      console.log('Skipping party package types API - will derive from quotations')

      // Fetch party-specific quotations (for Account Booking)
      // Note: This fetches from party_quotations table, not quotation_defaults (which is for Cash Booking)
      const quotationResponse = await fetch(`/api/parties/${partyId}/quotations`, { headers })
      if (quotationResponse.ok) {
        const quotationResult = await quotationResponse.json()
        console.log('Party Quotation API Response:', quotationResult)
        console.log('Raw quotation data:', quotationResult.data)
        if (quotationResult.success) {
          // Parse each quotation's rates if they're JSON strings
          const parsedQuotations = quotationResult.data.map((q: any) => {
            let parsedRates = q.rates
            if (typeof q.rates === 'string') {
              try {
                parsedRates = JSON.parse(q.rates)
              } catch (e) {
                console.error('Failed to parse rates for package:', q.package_type, e)
                parsedRates = {}
              }
            }
            console.log(`Parsed rates for ${q.package_type}:`, parsedRates)
            return {
              ...q,
              rates: parsedRates
            }
          })
          console.log('Final parsed quotations:', parsedQuotations)
          setQuotations(parsedQuotations || [])
          
          // Derive package types from quotation data
          const derivedPackageTypes: PackageType[] = parsedQuotations.map((q: any) => {
            // Get all regions' rates to find the most complete weight structure
            const allWeightKeys = new Set<string>()
            Object.values(q.rates || {}).forEach((regionRates: any) => {
              Object.keys(regionRates || {}).forEach(key => allWeightKeys.add(key))
            })
            
            const weightKeys = Array.from(allWeightKeys)
            console.log(`Deriving package type for ${q.package_type}:`, weightKeys)
            
            // Convert weight keys to ranges with more flexible parsing
            const ranges = weightKeys
              .filter(key => !key.toLowerCase().includes('add'))
              .map(key => {
                // Try multiple patterns to extract weight and unit
                let match = key.match(/(\d+)\s*(gm|kg|g)/i) || 
                           key.match(/(\d+)(gm|kg|g)/i) ||
                           key.match(/(\d+)\s*(GM|KG|G)/i) ||
                           key.match(/(\d+)(GM|KG|G)/i)
                
                if (match) {
                  return {
                    weight: match[1],
                    unit: match[2].toLowerCase()
                  }
                }
                
                // If no unit found, try to extract just the number
                const numberMatch = key.match(/(\d+)/)
                if (numberMatch) {
                  return {
                    weight: numberMatch[1],
                    unit: 'g' // default unit
                  }
                }
                
                return null
              })
              .filter(Boolean) as WeightRange[]
            
            // Find extra weight key with more flexible matching
            const extraWeightKey = weightKeys.find(key => 
              key.toLowerCase().includes('add') || 
              key.toLowerCase().includes('extra') ||
              key.includes('Add_')
            )
            let extraWeight = undefined
            if (extraWeightKey) {
              const match = extraWeightKey.match(/(\d+)/i)
              if (match) {
                extraWeight = match[1]
              }
            }
            
            // Determine unit based on weight keys with better logic
            const hasKg = weightKeys.some(key => key.toLowerCase().includes('kg'))
            const hasGm = weightKeys.some(key => key.toLowerCase().includes('gm') || key.toLowerCase().includes('g'))
            const unit = hasKg ? 'KG' : (hasGm ? 'GM' : 'GM')
            
            return {
              name: q.package_type,
              unit: unit,
              ranges: ranges.length > 0 ? ranges : [{ weight: '1', unit: 'g' }], // fallback
              extraWeight: extraWeight
            }
          })
          
          console.log('Derived package types:', derivedPackageTypes)
          setPackageTypes(derivedPackageTypes)
        }
      } else {
        console.error('Failed to fetch party quotations:', quotationResponse.status)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to generate weight columns for a package type
  const generateWeightColumns = (packageType: PackageType) => {
    const columns = packageType.ranges.map(range => {
      let displayWeight = range.weight
      let displayUnit = packageType.unit.toLowerCase()
      
      // Convert weight to package type's unit if needed
      if (packageType.unit === 'KG' && range.unit === 'g') {
        displayWeight = (parseInt(range.weight) / 1000).toString()
      } else if (packageType.unit === 'GM' && range.unit === 'kg') {
        displayWeight = (parseInt(range.weight) * 1000).toString()
      }
      
      return `${displayWeight} ${displayUnit}`
    })
    
    if (packageType.extraWeight) {
      columns.push(`Add_${packageType.extraWeight} ${packageType.unit.toLowerCase()}`)
    }
    
    return columns
  }

  // Helper function to find the best matching key for a weight column
  const findBestMatchingKey = (rates: any, region: string, weightColumn: string): string => {
    if (!rates[region]) return ''
    
    const regionRates = rates[region]
    const availableKeys = Object.keys(regionRates)
    
    // Direct match first
    if (regionRates[weightColumn]) {
      return regionRates[weightColumn]
    }
    
    // Try variations of the weight column
    const variations = [
      weightColumn,
      weightColumn.replace(' ', ''), // Remove spaces: "100 gm" -> "100gm"
      weightColumn.replace(' gm', 'gm'), // "100 gm" -> "100gm"
      weightColumn.replace(' kg', 'kg'), // "1 kg" -> "1kg"
      weightColumn.replace(' g', 'g'), // "100 g" -> "100g"
      weightColumn.replace('gm', 'g'), // "100gm" -> "100g"
      weightColumn.replace('g', 'gm'), // "100g" -> "100gm"
      weightColumn.toUpperCase(),
      weightColumn.toLowerCase(),
    ]
    
    // Try each variation
    for (const variation of variations) {
      if (regionRates[variation]) {
        return regionRates[variation]
      }
    }
    
    // Try to find by extracting just the number
    const numberMatch = weightColumn.match(/(\d+)/)
    if (numberMatch) {
      const number = numberMatch[1]
      for (const key of availableKeys) {
        if (key.includes(number)) {
          return regionRates[key]
        }
      }
    }
    
    return ''
  }

  // Helper function to get quotation rates for a package type
  const getQuotationRates = (packageTypeName: string): QuotationRates => {
    const quotation = quotations.find(q => q.package_type === packageTypeName)
    if (!quotation) return {}
    
    // Parse rates if they're stored as JSON string
    let rates = quotation.rates
    if (typeof rates === 'string') {
      try {
        rates = JSON.parse(rates)
      } catch (e) {
        console.error('Failed to parse quotation rates:', e)
        return {}
      }
    }
    
    return rates || {}
  }

  // Function to delete a package type quotation
  const deletePackageType = async (packageType: string) => {
    if (!partyId) return
    
    setDeleting(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
      
      const response = await fetch(`/api/parties/${partyId}/quotations?package_type=${packageType}`, {
        method: 'DELETE',
        headers
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log(`Deleted ${packageType}:`, result)
        alert(`Successfully deleted ${packageType} quotation`)
        // Refresh the data
        fetchPartyAndQuotation()
      } else {
        console.error(`Failed to delete ${packageType}:`, response.status)
        alert(`Failed to delete ${packageType} quotation`)
      }
    } catch (error) {
      console.error(`Error deleting ${packageType}:`, error)
      alert(`Error deleting ${packageType} quotation`)
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    // Auto-print when page loads - temporarily disabled for debugging
    // const timer = setTimeout(() => {
    //   if (!loading) {
    //     window.print()
    //   }
    // }, 1500)

    // return () => clearTimeout(timer)
  }, [loading])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading quotation...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-8 print:p-0">
      <div className="max-w-4xl mx-auto">
        {/* Company Header */}
        <div className="text-center mb-6">
          {company?.logo && (
            <img 
              src={company.logo} 
              alt="Company Logo" 
              className="mx-auto mb-2 max-h-16"
            />
          )}
          <h1 className="text-2xl font-bold mb-2">{company?.business_name || 'Loading Company...'}</h1>
          <div className="border-t-2 border-b-2 border-black py-2 mb-4">
            <p className="text-sm">
              {company?.business_address || 'Shalimar complex Sadhu shree Garden Road saman Rewa, REWA - 486011'} 
              {company?.phone_number && ` PH. ${company.phone_number}`}
            </p>
          </div>
        </div>

        {/* Quotation Header */}
        <div className="text-center mb-6">
          <div className="inline-block border-2 border-blue-500 px-6 py-2">
            <span className="text-blue-600 font-semibold">PARTY QUOTATION</span>
          </div>
        </div>

        {/* Party Details */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <span className="font-semibold">M/s. </span>
            <span className="font-semibold">{party?.name || 'Loading Party...'}</span>
          </div>
          <div>
            <span className="font-semibold">Date : </span>
            <span>{currentDate}</span>
          </div>
        </div>

        {/* Dynamic Package Type Tables */}
        {packageTypes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No quotation data available for this party.</p>
          </div>
        ) : (
          packageTypes.map((packageType) => {
          const weightColumns = generateWeightColumns(packageType)
          const rates = getQuotationRates(packageType.name)
          
          // Temporary debug for values
          console.log('=== DEBUG INFO ===')
          console.log('Package Type:', packageType.name)
          console.log('Weight Columns:', weightColumns)
          console.log('Rates Object:', rates)
          console.log('Regions:', regions)
          console.log('Sample Cell Check:', rates[regions[0]]?.[weightColumns[0]])
          
          return (
            <div key={packageType.name} className="mb-8">
              <h3 className="font-bold text-lg mb-4">{packageType.name}</h3>
              {/* Debug info - remove after fixing */}
              <div className="text-xs text-gray-500 mb-2 print:hidden">
                Debug: {Object.keys(rates).length} regions, {weightColumns.length} weights
              </div>
              <table className="w-full border-collapse border border-black">
                <thead>
                  <tr>
                    <th className="border border-black p-2 bg-gray-100"></th>
                    {weightColumns.map((weight) => (
                      <th key={weight} className="border border-black p-2 bg-gray-100">
                        {weight.includes('Add_') ? (
                          <>
                            {weight.split('_')[0]}_<br/>{weight.split('_')[1]}
                          </>
                        ) : (
                          weight
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {regions.map((region) => (
                    <tr key={region}>
                      <td className="border border-black p-2 font-semibold bg-gray-50 text-right">
                        {region}
                      </td>
                      {weightColumns.map((weight) => {
                        const cellValue = findBestMatchingKey(rates, region, weight)
                        // Debug each cell
                        if (!cellValue) {
                          console.log(`Empty cell: [${region}][${weight}] - Available keys:`, Object.keys(rates[region] || {}))
                        } else {
                          console.log(`Found value: [${region}][${weight}] = ${cellValue}`)
                        }
                        return (
                          <td key={weight} className="border border-black p-2 text-center">
                            {cellValue || <span className="text-red-500 text-xs print:hidden">Empty</span>}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })
        )}

        {/* Signature Section */}
        <div className="mt-16 text-right">
          <div className="mb-4">
            <p>For, {company?.business_name || 'Pandey Services'}</p>
          </div>
          {company?.signature && (
            <div className="mb-4">
              <img 
                src={company.signature} 
                alt="Signature" 
                className="ml-auto max-h-12"
              />
            </div>
          )}
          <div className="mt-8">
            <p>Autho / Sign.</p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}
