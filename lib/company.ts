import { db } from './db'

export type Company = {
  id: number
  business_name: string
  phone_number: string | null
  gstin: string | null
  email_id: string | null
  business_type: string | null
  business_category: string | null
  state: string | null
  pincode: string | null
  business_address: string | null
  logo: string | null
  signature: string | null
}

export async function getAnyActiveCompany(): Promise<Company | null> {
  const res = await db.query(`SELECT * FROM companies WHERE is_active = TRUE ORDER BY id LIMIT 1`)
  if (res.rows.length) return res.rows[0] as Company
  const res2 = await db.query(`SELECT * FROM companies ORDER BY id LIMIT 1`)
  return (res2.rows?.[0] as Company) || null
}
