// Master data types
export interface WeightSlab {
  id: number
  slab_name: string
  min_weight_grams: number
  max_weight_grams: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DistanceSlab {
  id: number
  code: 'LOCAL' | 'STATE' | 'ZONAL' | 'NATIONAL'
  title: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ServiceType {
  id: number
  // Allow any code string to support dynamic, DB-driven service types
  code: string
  title: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Mode {
  id: number
  // Updated to align with DB: use shipment-like codes; keep string to be future-proof
  code: 'DOCUMENT' | 'NON_DOCUMENT' | string
  title: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ShipmentType = 'DOCUMENT' | 'NON_DOCUMENT'

export interface PartyRateSlab {
  id: number
  party_id: number
  shipment_type: ShipmentType
  mode_id: number
  service_type_id: number
  distance_slab_id: number
  slab_id: number
  rate: number
  fuel_pct: number
  packing: number
  handling: number
  gst_pct: number
  is_active: boolean
  created_at: string
  updated_at: string
  
  // Joined fields
  slab_name?: string
  mode_title?: string
  service_type_title?: string
  distance_slab_title?: string
}

export interface ResolvedRate {
  slabId: number
  slabName: string
  baseRate: number
  fuelPct: number
  packing?: number
  handling: number
  gstPct: number
}

export interface RateBreakdown {
  baseRate: number
  fuelAmount: number
  packing?: number
  preGstTotal: number
  gstAmount: number
  total: number
  slabName: string
}
