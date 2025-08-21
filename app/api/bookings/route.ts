import { NextRequest, NextResponse } from 'next/server'
import { ZodError, z } from 'zod'
import { db } from '@/lib/db'
import { getUserFromRequest, hasRole } from '@/lib/auth'

// Schema compatible with payload sent from NewBookingPage
const senderSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().default(''),
  address: z.string().optional().default(''),
  billingAddress: z.string().optional().default(''),
  gstin: z.string().optional().default(''),
  email: z.string().optional().default(''),
})

const shipmentSchema = z.object({
  shipmentType: z.enum(['DOCUMENT', 'NON_DOCUMENT']),
  modeId: z.number().int().min(1),
  serviceTypeId: z.number().int().min(1).optional(),
  serviceCode: z.string().optional().default(''),
  regionId: z.number().int().min(1),
  weightSlabId: z.number().int().min(1),
  rate: z.number().min(0),
})

const detailsSchema = z.object({
  destination: z.string().optional().default(''),
  weightKg: z.number().optional(),
  chargeableWeight: z.number().optional(),
  charges: z.object({
    shipping: z.number().optional().default(0),
    packaging: z.number().optional().default(0),
    fuel: z.number().optional().default(0),
    riskType: z.enum(['NONE', 'PERCENT', 'FIXED']).optional().default('NONE'),
    riskValue: z.number().optional().default(0),
    riskAmount: z.number().optional().default(0),
  }),
  discounts: z.object({
    empPct: z.number().optional().default(0),
    empAmt: z.number().optional().default(0),
    promoCode: z.string().optional().default(''),
    promoAmt: z.number().optional().default(0),
  }),
  totals: z.object({
    retailPrice: z.number().optional().default(0),
    totalBeforeDiscounts: z.number().optional().default(0),
    totalDiscounts: z.number().optional().default(0),
    finalAmount: z.number().optional().default(0),
  }),
})

const receiverSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  address: z.string().optional().default(''),
})

const otherSchema = z.object({
  bookingMode: z.string().optional().default('Counter'),
  contents: z.string().optional().default(''),
  declaredValue: z.number().optional(),
  ewayBill: z.string().optional().default(''),
  gstInvoice: z.boolean().optional().default(false),
})

const paymentSchema = z.object({
  mode: z.string().optional().default('Cash'),
  utr: z.string().optional().default(''),
})

const staffSchema = z.object({
  employeeCode: z.string().optional().default(''),
  packingMaterial: z.string().optional().default(''),
  stretchFilmsUsed: z.number().optional().default(0),
})

const bookingSchema = z.object({
  bookingDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date'),
  bookingRef: z.string().min(1),
  consignmentNo: z.string().min(1),
  partyId: z.number().int().min(1),
  sender: senderSchema,
  shipment: shipmentSchema,
  details: detailsSchema,
  receiver: receiverSchema,
  other: otherSchema,
  payment: paymentSchema,
  staff: staffSchema,
})

export async function POST(_request: NextRequest) {
  // Bookings feature removed from the system
  return NextResponse.json({ error: 'Bookings feature removed' }, { status: 410 })
}

export async function GET(_request: NextRequest) {
  // Bookings feature removed from the system
  return NextResponse.json({ error: 'Bookings feature removed' }, { status: 410 })
}
