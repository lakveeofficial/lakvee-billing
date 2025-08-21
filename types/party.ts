export interface Party {
  id: string
  partyName: string
  gstin?: string
  phoneNumber: string
  email?: string
  billingAddress: Address
  shippingAddress?: Address
  useShippingAddress: boolean
  gstType: GSTType
  state: string
  createdAt: string
  updatedAt: string
  // Rate slab assignments
  weightSlabId?: string
  distanceSlabId?: string
  distanceCategory?: import('./slab').SlabDistanceCategory
  volumeSlabId?: string
  codSlabId?: string
}

export interface Address {
  street: string
  city: string
  state: string
  pincode: string
  country: string
}

export type GSTType = 'unregistered' | 'consumer' | 'registered' | 'composition' | 'overseas'

export interface PartyFormData {
  partyName: string
  contactPerson?: string
  gstin: string
  panNumber?: string
  phoneNumber: string
  email: string
  billingAddress: Address
  shippingAddress: Address
  useShippingAddress: boolean
  gstType: GSTType
  state: string
  // Slab assignments for the form
  weightSlabId?: string
  distanceSlabId?: string
  distanceCategory?: import('./slab').SlabDistanceCategory
  volumeSlabId?: string
  codSlabId?: string
}

export interface PartyFilters {
  search: string
  gstType: GSTType | 'all'
  state: string | 'all'
}

export const GST_TYPES: { value: GSTType; label: string }[] = [
  { value: 'unregistered', label: 'Unregistered' },
  { value: 'consumer', label: 'Consumer' },
  { value: 'registered', label: 'Registered' },
  { value: 'composition', label: 'Composition' },
  { value: 'overseas', label: 'Overseas' }
]

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
]
