import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/auth'

// POST copy quotations from one party to multiple parties
export const POST = withAuth(async ({ user }, req) => {
  try {
    const body = await req.json()
    const { sourcePartyId, targetPartyIds } = body

    if (!sourcePartyId || !targetPartyIds || !Array.isArray(targetPartyIds)) {
      return NextResponse.json(
        { success: false, error: 'Source party ID and target party IDs are required' },
        { status: 400 }
      )
    }

    // Get source party quotations
    const sourceQuotations = await db.query(`
      SELECT package_type, rates
      FROM party_quotations 
      WHERE party_id = $1
    `, [sourcePartyId])

    if (sourceQuotations.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No quotations found for source party' },
        { status: 404 }
      )
    }

    // Also fetch source party package types (if any)
    const sourcePackageTypesResult = await db.query(`
      SELECT package_types 
      FROM party_package_types 
      WHERE party_id = $1
    `, [sourcePartyId])
    const sourcePackageTypes = sourcePackageTypesResult.rows[0]?.package_types || null

    // Ensure party_package_types table exists (safety)
    await db.query(`
      CREATE TABLE IF NOT EXISTS party_package_types (
        id SERIAL PRIMARY KEY,
        party_id INTEGER NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
        package_types JSONB NOT NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(party_id)
      )
    `)

    // Copy quotations and package types to target parties
    let copiedCount = 0
    const results: Array<{ targetPartyId: number; package_type?: string; status: 'ok' | 'error'; error?: string; copiedPackageTypes?: boolean }> = []

    for (const targetPartyId of targetPartyIds) {
      for (const quotation of sourceQuotations.rows) {
        try {
          // Normalize rates to JSON object (avoid double-stringifying)
          let ratesValue: any = quotation.rates
          if (typeof ratesValue === 'string') {
            try {
              const parsed = JSON.parse(ratesValue)
              ratesValue = parsed
            } catch (e) {
              // keep original string if not JSON; still store as JSONB string
            }
          }

          await db.query(`
            INSERT INTO party_quotations (party_id, package_type, rates, created_by, updated_by)
            VALUES ($1, $2, $3, $4, $4)
            ON CONFLICT (party_id, package_type)
            DO UPDATE SET 
              rates = EXCLUDED.rates,
              updated_by = EXCLUDED.updated_by,
              updated_at = CURRENT_TIMESTAMP
          `, [targetPartyId, quotation.package_type, JSON.stringify(ratesValue), user.id])

          results.push({ targetPartyId, package_type: quotation.package_type, status: 'ok' })
          copiedCount++
        } catch (error: any) {
          console.error(`Error copying quotation to party ${targetPartyId}:`, error)
          results.push({ targetPartyId, package_type: quotation.package_type, status: 'error', error: String(error?.message || error) })
        }
      }

      // Copy package types if source has them
      if (sourcePackageTypes) {
        try {
          await db.query(`
            INSERT INTO party_package_types (party_id, package_types, created_by, updated_by)
            VALUES ($1, $2, $3, $3)
            ON CONFLICT (party_id)
            DO UPDATE SET 
              package_types = EXCLUDED.package_types,
              updated_by = EXCLUDED.updated_by,
              updated_at = CURRENT_TIMESTAMP
          `, [targetPartyId, JSON.stringify(sourcePackageTypes), user.id])
          results.push({ targetPartyId, status: 'ok', copiedPackageTypes: true })
        } catch (error: any) {
          console.error(`Error copying package types to party ${targetPartyId}:`, error)
          results.push({ targetPartyId, status: 'error', error: String(error?.message || error), copiedPackageTypes: false })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully copied quotations to ${targetPartyIds.length} parties`,
      copiedCount,
      results
    })
  } catch (error) {
    console.error('Error copying quotations:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to copy quotations' },
      { status: 500 }
    )
  }
})
