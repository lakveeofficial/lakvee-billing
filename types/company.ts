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
    id: 'Default', 
    name: 'Orange Professional', 
    description: 'Modern orange gradient design with clean layout and professional styling',
    color: '#ff6b35'
  },
  { 
    id: 'Template 1', 
    name: 'Blue Corporate', 
    description: 'Professional blue theme with Times New Roman font for classic look',
    color: '#2c5aa0'
  },
  {
    id: 'Template 2',
    name: 'Purple Modern',
    description: 'Contemporary purple gradient with rounded corners and modern design',
    color: '#667eea'
  },
  { 
    id: 'Template 3', 
    name: 'Green Fresh', 
    description: 'Eco-friendly green theme with modern styling',
    color: '#10b981'
  },
  { 
    id: 'Template 4', 
    name: 'Red Bold', 
    description: 'Bold red design for impactful invoices',
    color: '#ef4444'
  },
  { 
    id: 'Template 5', 
    name: 'Teal Elegant', 
    description: 'Elegant teal color scheme',
    color: '#14b8a6'
  },
  { 
    id: 'Template 6', 
    name: 'Indigo Classic', 
    description: 'Classic indigo professional look',
    color: '#6366f1'
  },
  { 
    id: 'Template 7', 
    name: 'Amber Warm', 
    description: 'Warm amber tones for friendly invoices',
    color: '#f59e0b'
  },
  { 
    id: 'Template 8', 
    name: 'Rose Soft', 
    description: 'Soft rose pink modern design',
    color: '#f43f5e'
  },
  { 
    id: 'Template 9', 
    name: 'Cyan Bright', 
    description: 'Bright cyan for tech-forward look',
    color: '#06b6d4'
  },
  { 
    id: 'Template 10', 
    name: 'Lime Vibrant', 
    description: 'Vibrant lime for energetic invoices',
    color: '#84cc16'
  },
  { 
    id: 'Template 11', 
    name: 'Violet Royal', 
    description: 'Royal violet for premium feel',
    color: '#8b5cf6'
  },
  { 
    id: 'Template 12', 
    name: 'Sky Light', 
    description: 'Light sky blue for clean look',
    color: '#0ea5e9'
  },
  { 
    id: 'Template 13', 
    name: 'Emerald Rich', 
    description: 'Rich emerald for luxury invoices',
    color: '#059669'
  }
]
