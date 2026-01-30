'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface WeightRange {
  id?: number
  weight: string
  unit: string
}

interface PackageType {
  name: string
  unit: string
  ranges: WeightRange[]
  extraWeight?: string
}

interface PackageTypesContextType {
  packageTypes: PackageType[]
  setPackageTypes: (types: PackageType[]) => void
  updatePackageTypes: (updater: (prev: PackageType[]) => PackageType[]) => void
}

const PackageTypesContext = createContext<PackageTypesContextType | undefined>(undefined)

export function PackageTypesProvider({ children }: { children: ReactNode }) {
  const [packageTypes, setPackageTypes] = useState<PackageType[]>([
    {
      name: 'DOX',
      unit: 'GM',
      ranges: [
        { weight: '100', unit: 'g' },
        { weight: '250', unit: 'g' },
        { weight: '500', unit: 'g' },
        { weight: '750', unit: 'g' },
        { weight: '1000', unit: 'g' }
      ],
      extraWeight: '1000'
    },
    {
      name: 'Parcel',
      unit: 'KG',
      ranges: [
        { weight: '1000', unit: 'g' }
      ],
      extraWeight: ''
    }
  ])

  const updatePackageTypes = (updater: (prev: PackageType[]) => PackageType[]) => {
    setPackageTypes(updater)
  }

  return (
    <PackageTypesContext.Provider value={{ packageTypes, setPackageTypes, updatePackageTypes }}>
      {children}
    </PackageTypesContext.Provider>
  )
}

export function usePackageTypes() {
  const context = useContext(PackageTypesContext)
  if (context === undefined) {
    throw new Error('usePackageTypes must be used within a PackageTypesProvider')
  }
  return context
}
