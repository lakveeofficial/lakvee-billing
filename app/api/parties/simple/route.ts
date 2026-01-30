import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/parties/simple - Simple parties list for dropdowns (no auth, no pagination)
export async function GET() {
  try {
    console.log('GET /api/parties/simple - fetching all parties')
    
    const result = await db.query(
      `SELECT id, party_name as "partyName" 
       FROM parties 
       ORDER BY party_name ASC 
       LIMIT 1000`
    )

    console.log(`Found ${result.rows.length} parties`)
    
    return NextResponse.json({
      success: true,
      data: result.rows
    })
  } catch (error) {
    console.error('Error fetching simple parties:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch parties',
        details: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
    )
  }
}
