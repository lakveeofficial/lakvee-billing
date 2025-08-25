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
  try {
    // First try to get any company (without is_active check)
    const res = await db.query(`SELECT * FROM companies ORDER BY id LIMIT 1`);
    if (res.rows.length) return res.rows[0] as Company;
    
    // Fallback to checking with is_active in case the column exists
    try {
      const res2 = await db.query(`SELECT * FROM companies WHERE is_active = TRUE ORDER BY id LIMIT 1`);
      if (res2.rows.length) return res2.rows[0] as Company;
    } catch (error) {
      // Ignore error if is_active column doesn't exist
      if (!(error as any).message?.includes('column "is_active" does not exist')) {
        console.error('Error querying companies with is_active:', error);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error in getAnyActiveCompany:', error);
    return null;
  }
}
