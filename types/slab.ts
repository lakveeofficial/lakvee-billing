export type SlabType = 'weight' | 'distance' | 'volume' | 'cod';

export type SlabDistanceCategory = 'within_state' | 'metro_state' | 'out_of_state' | 'other_state';

export interface RateSlab {
  id: string;
  slabType: SlabType;
  slabLabel: string; // e.g., '0-500g'
  fromValue: number;
  toValue: number;
  unitType: string; // g, kg, km, Rs, etc.
  rate: number;
  effectiveDate: string; // ISO date
  status: 'active' | 'inactive';
  distanceCategory?: SlabDistanceCategory; // Only for distance slabs
}

export interface MetroCityConfig {
  state: string;
  cities: string[];
}

export interface DistanceCategoryConfig {
  metroCities: MetroCityConfig[];
  otherStates: string[]; // For special/remote rates
}
