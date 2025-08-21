import { db } from '@/lib/db'

// Basic state name/code mapping for India (extendable)
const STATE_ALIASES: Record<string, string> = {
  'MAHARASHTRA': 'MH', 'MH': 'MH', 'BOMBAY': 'MH', 'MUMBAI': 'MH', 'PUNE': 'MH',
  'DELHI': 'DL', 'DL': 'DL', 'NEW DELHI': 'DL',
  'KARNATAKA': 'KA', 'KA': 'KA', 'BANGALORE': 'KA', 'BENGALURU': 'KA',
  'TAMIL NADU': 'TN', 'TN': 'TN', 'CHENNAI': 'TN', 'MADRAS': 'TN',
  'WEST BENGAL': 'WB', 'WB': 'WB', 'KOLKATA': 'WB', 'CALCUTTA': 'WB',
  'TELANGANA': 'TS', 'TS': 'TS', 'HYDERABAD': 'TS',
  'GUJARAT': 'GJ', 'GJ': 'GJ', 'AHMEDABAD': 'GJ',
  'UTTAR PRADESH': 'UP', 'UP': 'UP',
  'MADHYA PRADESH': 'MP', 'MP': 'MP',
  'RAJASTHAN': 'RJ', 'RJ': 'RJ',
  'HARYANA': 'HR', 'HR': 'HR',
  'PUNJAB': 'PB', 'PB': 'PB',
  'BIHAR': 'BR', 'BR': 'BR',
  'ODISHA': 'OD', 'ORISSA': 'OD', 'OD': 'OD',
  'JHARKHAND': 'JH', 'JH': 'JH',
  'CHHATTISGARH': 'CG', 'CG': 'CG',
  'ANDHRA PRADESH': 'AP', 'AP': 'AP',
  'ASSAM': 'AS', 'AS': 'AS',
  'KERALA': 'KL', 'KL': 'KL',
  'TELANGANA STATE': 'TS'
}

function normalize(s?: string | null): string {
  return (s || '').toString().trim()
}

function upper(s?: string | null): string {
  return normalize(s).toUpperCase()
}

export type ParsedAddress = { city?: string; stateCode?: string; pincode?: string }

export function parseAddressBasic(addr?: string | null): ParsedAddress {
  const text = upper(addr)
  if (!text) return {}
  // Extract 6-digit pincode if present
  const pinMatch = text.match(/\b\d{6}\b/)
  const pincode = pinMatch ? pinMatch[0] : undefined

  // Try detect any state alias present
  let stateCode: string | undefined
  for (const key of Object.keys(STATE_ALIASES)) {
    if (text.includes(key)) {
      stateCode = STATE_ALIASES[key]
      break
    }
  }

  // Heuristic city extraction: try to find a known metro city substring
  const METRO_CITIES = ['MUMBAI','DELHI','PUNE','BENGALURU','BANGALORE','CHENNAI','KOLKATA','HYDERABAD','AHMEDABAD']
  let city: string | undefined
  for (const c of METRO_CITIES) {
    if (text.includes(c)) {
      // Normalize Bangalore -> Bengaluru
      city = c === 'BANGALORE' ? 'Bengaluru' : c.charAt(0) + c.slice(1).toLowerCase()
      if (c === 'MUMBAI') city = 'Mumbai'
      if (c === 'DELHI') city = 'Delhi'
      if (c === 'PUNE') city = 'Pune'
      if (c === 'CHENNAI') city = 'Chennai'
      if (c === 'KOLKATA') city = 'Kolkata'
      if (c === 'HYDERABAD') city = 'Hyderabad'
      if (c === 'AHMEDABAD') city = 'Ahmedabad'
      break
    }
  }

  return { city, stateCode, pincode }
}

export async function isMetroCity(city?: string): Promise<boolean> {
  if (!city) return false
  try {
    const res = await db.query(`SELECT 1 FROM metro_cities WHERE is_active = true AND city ILIKE $1 LIMIT 1`, [city])
    return ((res as any).rowCount ?? 0) > 0
  } catch (e: any) {
    // If table missing or any DB error, default to non-metro to avoid crashes
    return false
  }
}

export async function areNeighborStates(a?: string, b?: string): Promise<boolean> {
  if (!a || !b) return false
  try {
    const res = await db.query(
      `SELECT 1 FROM state_neighbors WHERE (state_code = $1 AND neighbor_state_code = $2) OR (state_code = $2 AND neighbor_state_code = $1) LIMIT 1`,
      [a, b]
    )
    return ((res as any).rowCount ?? 0) > 0
  } catch (e: any) {
    // If neighbors table missing, conservatively treat different states as Out of State (neighbor-like) to align with common slabs
    return true
  }
}

export type DistanceCategoryCode = 'METRO_CITIES' | 'WITHIN_STATE' | 'OUT_OF_STATE' | 'OTHER_STATE'

export async function resolveDistanceCategoryFromAddresses(originAddr?: string | null, destAddr?: string | null): Promise<DistanceCategoryCode | null> {
  const o = parseAddressBasic(originAddr)
  const d = parseAddressBasic(destAddr)

  // 1) Metro Cities rule
  const bothMetro = (await isMetroCity(o.city)) && (await isMetroCity(d.city))
  if (bothMetro) return 'METRO_CITIES'

  // 2) Within State
  if (o.stateCode && d.stateCode && o.stateCode === d.stateCode) return 'WITHIN_STATE'

  // 3) Neighboring states => Out of State
  if (o.stateCode && d.stateCode && await areNeighborStates(o.stateCode, d.stateCode)) return 'OUT_OF_STATE'

  // 4) Otherwise Other State (if we at least have any state)
  if (o.stateCode && d.stateCode) return 'OTHER_STATE'

  // Unknown
  return null
}

export async function getDistanceSlabByCode(code: DistanceCategoryCode) {
  const res = await db.query(`SELECT id, code, title FROM distance_slabs WHERE code = $1`, [code])
  return res.rows?.[0] || null
}

export async function resolveDistanceFromAddresses(originAddr?: string | null, destAddr?: string | null) {
  const code = await resolveDistanceCategoryFromAddresses(originAddr, destAddr)
  if (!code) return { code: null, title: null, slabId: null }
  const slab = await getDistanceSlabByCode(code)
  return { code, title: slab?.title || null, slabId: slab?.id || null }
}
