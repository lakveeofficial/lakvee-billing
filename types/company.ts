export interface Company {
  id: string
  businessName: string
  phoneNumber: string
  gstin?: string
  emailId: string
  businessType: string
  businessCategory: string
  state: string
  pincode: string
  businessAddress: string
  logo?: string // Base64 encoded image
  signature?: string // Base64 encoded image
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CompanyFilters {
  search: string
  businessType: string
  state: string
  isActive: 'all' | 'active' | 'inactive'
}

export const BUSINESS_TYPES = [
  { value: 'service', label: 'Service' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'trading', label: 'Trading' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'courier', label: 'Courier' },
  { value: 'transport', label: 'Transport' },
  { value: 'others', label: 'Others' }
]

export const BUSINESS_CATEGORIES = [
  { value: 'logistics', label: 'Logistics' },
  { value: 'courier', label: 'Courier Services' },
  { value: 'transport', label: 'Transportation' },
  { value: 'freight', label: 'Freight Forwarding' },
  { value: 'warehouse', label: 'Warehousing' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'retail', label: 'Retail' },
  { value: 'wholesale', label: 'Wholesale' },
  { value: 'others', label: 'Others' }
]

export const INVOICE_TEMPLATES = [
  { 
    id: 'standard', 
    name: 'Standard Template', 
    description: 'Clean and professional invoice template',
    preview: '/templates/standard-preview.png'
  },
  { 
    id: 'modern', 
    name: 'Modern Template', 
    description: 'Contemporary design with accent colors',
    preview: '/templates/modern-preview.png'
  },
  {
    id: 'courier_aryan',
    name: 'Courier – Aryan Style',
    description: 'Courier invoice format similar to Aryan Logistics (single-row with totals and GST split).',
    preview: '/templates/courier-aryan-preview.png'
  },
  { 
    id: 'classic', 
    name: 'Classic Template', 
    description: 'Traditional business invoice format',
    preview: '/templates/classic-preview.png'
  }
]
