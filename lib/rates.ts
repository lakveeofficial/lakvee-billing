export interface RateBreakdown {
  baseRate: number
  fuelAmount: number
  preGstTotal: number
  gstAmount: number
  total: number
  slabName: string
}

export function calculateRate(
  baseRate: number,
  fuelPct: number = 0,
  handling: number = 0,
  gstPct: number = 0,
  slabName: string = ''
): RateBreakdown {
  // Round to 2 decimal places at each step for financial precision
  const fuelAmount = round2(baseRate * (fuelPct / 100))
  const preGstTotal = round2(baseRate + fuelAmount + handling)
  const gstAmount = round2(preGstTotal * (gstPct / 100))
  const total = round2(preGstTotal + gstAmount)
  
  return {
    baseRate: round2(baseRate),
    fuelAmount,
    preGstTotal,
    gstAmount,
    total,
    slabName
  }
}

// Helper to round to 2 decimal places
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// Resolves the applicable rate for a booking
// Returns null if no rate is configured
export async function resolveRate({
  partyId,
  shipmentType,
  modeId,
  serviceTypeId,
  distanceSlabId,
  weightGrams,
  slabId
}: {
  partyId: number
  shipmentType: 'DOCUMENT' | 'NON_DOCUMENT'
  modeId: number
  serviceTypeId: number
  distanceSlabId: number
  weightGrams?: number
  slabId?: number
}) {
  try {
    const params = new URLSearchParams({
      partyId: String(partyId),
      shipmentType,
      modeId: String(modeId),
      serviceTypeId: String(serviceTypeId),
      distanceSlabId: String(distanceSlabId),
      ...(weightGrams !== undefined ? { weightGrams: String(weightGrams) } : {}),
      ...(slabId !== undefined ? { slabId: String(slabId) } : {})
    })

    const res = await fetch(`/api/party-rate-slabs/resolve?${params}`)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to resolve rate')
    }
    
    const { data } = await res.json()
    if (!data) throw new Error('No rate data returned')
    
    return calculateRate(
      data.baseRate,
      data.fuelPct,
      data.handling,
      data.gstPct,
      data.slabName
    )
  } catch (e) {
    console.error('Failed to resolve rate:', e)
    throw e
  }
}
