import { db } from './db'
import { randomUUID } from 'crypto'

export type CSVInvoiceRow = {
  id: string
  booking_date: string | null
  booking_reference: string | null
  consignment_no: string | null
  mode: string | null
  service_type: string | null
  weight: number | null
  prepaid_amount: number | null
  final_collected: number | null
  retail_price: number | null
  sender_name: string | null
  sender_phone: string | null
  sender_address: string | null
  recipient_name: string | null
  recipient_phone: string | null
  recipient_address: string | null
  booking_mode: string | null
  shipment_type: string | null
  risk_surcharge_amount: number | null
  risk_surcharge_type: string | null
  contents: string | null
  declared_value: number | null
  eway_bill: string | null
  gst_invoice: string | null
  customer: string | null
  service_code: string | null
  region: string | null
  payment_mode: string | null
  chargeable_weight: number | null
  payment_utr: string | null
  employee_code: string | null
  employee_discount_percent: number | null
  employee_discount_amount: number | null
  promocode: string | null
  promocode_discount: number | null
  packing_material: string | null
  no_of_stretch_films: number | null
  calculated_amount?: number | null
  pricing_meta?: any
  created_at?: string
  updated_at?: string
}

export async function ensureCsvInvoicesTable(): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS csv_invoices (
      id UUID PRIMARY KEY,
      booking_date DATE,
      booking_reference TEXT,
      consignment_no TEXT,
      mode TEXT,
      service_type TEXT,
      weight NUMERIC,
      prepaid_amount NUMERIC,
      final_collected NUMERIC,
      retail_price NUMERIC,
      sender_name TEXT,
      sender_phone TEXT,
      sender_address TEXT,
      recipient_name TEXT,
      recipient_phone TEXT,
      recipient_address TEXT,
      booking_mode TEXT,
      shipment_type TEXT,
      risk_surcharge_amount NUMERIC,
      risk_surcharge_type TEXT,
      contents TEXT,
      declared_value NUMERIC,
      eway_bill TEXT,
      gst_invoice TEXT,
      customer TEXT,
      service_code TEXT,
      region TEXT,
      payment_mode TEXT,
      chargeable_weight NUMERIC,
      payment_utr TEXT,
      employee_code TEXT,
      employee_discount_percent NUMERIC,
      employee_discount_amount NUMERIC,
      promocode TEXT,
      promocode_discount NUMERIC,
      packing_material TEXT,
      no_of_stretch_films INTEGER,
      calculated_amount NUMERIC,
      pricing_meta JSONB,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `)
  // Ensure columns exist for older deployments
  await db.query(`ALTER TABLE csv_invoices ADD COLUMN IF NOT EXISTS calculated_amount NUMERIC`)
  await db.query(`ALTER TABLE csv_invoices ADD COLUMN IF NOT EXISTS pricing_meta JSONB`)
}

function toNum(val: any): number | null {
  if (val === undefined || val === null || val === '') return null
  const n = Number(val)
  return Number.isFinite(n) ? n : null
}

function toDate(val: any): string | null {
  if (!val) return null
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

export function mapRecordToRow(record: Record<string, any>): CSVInvoiceRow {
  return {
    id: randomUUID(),
    booking_date: toDate(record['DATE OF BOOKING']),
    booking_reference: record['BOOKING REFERENCE'] || null,
    consignment_no: record['CONSIGNMENT NO'] || null,
    mode: record['MODE'] || null,
    service_type: record['SERVICE TYPE'] || null,
    weight: toNum(record['WEIGHT (IN Kg)']),
    prepaid_amount: toNum(record['PREPAID AMOUNT']),
    final_collected: toNum(record['FINAL COLLECTED']),
    retail_price: toNum(record['RETAIL PRICE']),
    sender_name: record['SENDER NAME'] || null,
    sender_phone: record['SENDER PHONE'] || null,
    sender_address: record['SENDER ADDRESS'] || null,
    recipient_name: record['RECIPIENT NAME'] || null,
    recipient_phone: record['RECIPIENT PHONE'] || null,
    recipient_address: record['RECIPIENT ADDRESS'] || null,
    booking_mode: record['MODE OF BOOKING'] || null,
    shipment_type: record['SHIPMENT TYPE'] || null,
    risk_surcharge_amount: toNum(record['RISK SURCHARGE AMOUNT']),
    risk_surcharge_type: record['RISK SURCHARGE TYPE'] || null,
    contents: record['CONTENTS'] || null,
    declared_value: toNum(record['DECLARED VALUE']),
    eway_bill: record['EWAY-BILL'] || null,
    gst_invoice: record['GSTInvoice'] || null,
    customer: record['CUSTOMER'] || null,
    service_code: record['SERVICE CODE'] || null,
    region: record['REGION'] || null,
    payment_mode: record['PAYMENT MODE'] || null,
    chargeable_weight: toNum(record['CHARGEABLE WEIGHT']),
    payment_utr: record['PAYMENT UTR'] || null,
    employee_code: record['EMPLOYEE CODE'] || null,
    employee_discount_percent: toNum(record['EMPLOYEE DISCOUNT PERCENT']),
    employee_discount_amount: toNum(record['EMPLOYEE DISCOUNT AMOUNT']),
    promocode: record['PROMOCODE'] || null,
    promocode_discount: toNum(record['PROMOCODE DISCOUNT']),
    packing_material: record['PACKING MATERIAL'] || null,
    no_of_stretch_films: toNum(record['NO OF STRETCH FILMS']) as number | null,
  }
}

export async function insertCsvInvoices(rows: CSVInvoiceRow[]): Promise<number> {
  if (!rows.length) return 0
  const cols = [
    'id','booking_date','booking_reference','consignment_no','mode','service_type','weight','prepaid_amount','final_collected','retail_price','sender_name','sender_phone','sender_address','recipient_name','recipient_phone','recipient_address','booking_mode','shipment_type','risk_surcharge_amount','risk_surcharge_type','contents','declared_value','eway_bill','gst_invoice','customer','service_code','region','payment_mode','chargeable_weight','payment_utr','employee_code','employee_discount_percent','employee_discount_amount','promocode','promocode_discount','packing_material','no_of_stretch_films','calculated_amount','pricing_meta'
  ]

  const values: any[] = []
  const placeholders: string[] = []

  rows.forEach((r, i) => {
    const base = i * cols.length
    placeholders.push(`(${cols.map((_, j) => `$${base + j + 1}`).join(',')})`)
    values.push(
      r.id, r.booking_date, r.booking_reference, r.consignment_no, r.mode, r.service_type,
      r.weight, r.prepaid_amount, r.final_collected, r.retail_price, r.sender_name, r.sender_phone, r.sender_address,
      r.recipient_name, r.recipient_phone, r.recipient_address, r.booking_mode, r.shipment_type, r.risk_surcharge_amount,
      r.risk_surcharge_type, r.contents, r.declared_value, r.eway_bill, r.gst_invoice, r.customer, r.service_code,
      r.region, r.payment_mode, r.chargeable_weight, r.payment_utr, r.employee_code, r.employee_discount_percent,
      r.employee_discount_amount, r.promocode, r.promocode_discount, r.packing_material, r.no_of_stretch_films,
      (r as any).calculated_amount ?? null, (r as any).pricing_meta ?? null
    )
  })

  // Skip duplicates on booking_reference or consignment_no via unique indexes
  // Return the number of rows actually inserted
  const sql = `INSERT INTO csv_invoices (${cols.join(',')}) VALUES ${placeholders.join(',')} ON CONFLICT DO NOTHING RETURNING 1`
  const res = await db.query(sql, values)
  // rowCount corresponds to inserted rows when using RETURNING
  return ((res as any).rowCount ?? 0) as number
}

export async function listCsvInvoices(limit = 50, offset = 0) {
  const { rows } = await db.query(
    `SELECT * FROM csv_invoices ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  )
  const countRes = await db.query(`SELECT COUNT(*)::int AS count FROM csv_invoices`)
  return { rows: rows as CSVInvoiceRow[], total: (countRes.rows?.[0]?.count as number) || 0 }
}

export async function getCsvInvoiceById(id: string): Promise<CSVInvoiceRow | null> {
  const { rows } = await db.query(`SELECT * FROM csv_invoices WHERE id = $1`, [id])
  return (rows?.[0] as CSVInvoiceRow) || null
}

export async function deleteCsvInvoice(id: string): Promise<boolean> {
  const res = await db.query(`DELETE FROM csv_invoices WHERE id = $1`, [id])
  return ((res as any).rowCount ?? 0) > 0
}

export async function updateCsvInvoice(id: string, patch: Partial<CSVInvoiceRow>): Promise<CSVInvoiceRow | null> {
  const allowed = [
    'booking_date','booking_reference','consignment_no','mode','service_type','weight','prepaid_amount','final_collected','retail_price','sender_name','sender_phone','sender_address','recipient_name','recipient_phone','recipient_address','booking_mode','shipment_type','risk_surcharge_amount','risk_surcharge_type','contents','declared_value','eway_bill','gst_invoice','customer','service_code','region','payment_mode','chargeable_weight','payment_utr','employee_code','employee_discount_percent','employee_discount_amount','promocode','promocode_discount','packing_material','no_of_stretch_films','calculated_amount','pricing_meta'
  ] as const
  const entries = Object.entries(patch).filter(([k,v]) => allowed.includes(k as any))
  if (!entries.length) return await getCsvInvoiceById(id)
  const sets = entries.map(([k], i) => `${k} = $${i+1}`)
  const values = entries.map(([,v]) => v)
  values.push(id)
  await db.query(`UPDATE csv_invoices SET ${sets.join(', ')}, updated_at = now() WHERE id = $${entries.length+1}`, values as any[])
  return await getCsvInvoiceById(id)
}

export async function listAllCsvInvoices(): Promise<CSVInvoiceRow[]> {
  const { rows } = await db.query(`SELECT * FROM csv_invoices ORDER BY created_at DESC`)
  return rows as CSVInvoiceRow[]
}

export async function clearCsvInvoices(): Promise<number> {
  // Use DELETE to return affected row count
  const res = await db.query(`DELETE FROM csv_invoices`)
  return ((res as any).rowCount ?? 0) as number
}
