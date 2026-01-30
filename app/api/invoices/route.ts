import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/invoices - Get invoices for reports
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get('limit') || '100')
        const page = parseInt(searchParams.get('page') || '1')
        const offset = (page - 1) * limit

        // Filters
        const dateFrom = searchParams.get('date_from')
        const dateTo = searchParams.get('date_to')
        const partyId = searchParams.get('party_id')
        const sort = searchParams.get('sort') || 'created_at'
        const order = searchParams.get('order') || 'desc'

        let queryText = `
      SELECT 
        i.id,
        i.invoice_number,
        i.invoice_date,
        i.total_amount,
        i.subtotal,
        i.tax_amount,
        i.received_amount,
        i.status as payment_status,
        i.created_at,
        p.party_name,
        p.phone as party_phone,
        p.gstin as party_gstin
      FROM invoices i
      LEFT JOIN parties p ON i.party_id = p.id
      WHERE 1=1
    `
        const queryParams: any[] = []
        let paramIndex = 1

        if (dateFrom) {
            queryText += ` AND i.invoice_date >= $${paramIndex}`
            queryParams.push(dateFrom)
            paramIndex++
        }

        if (dateTo) {
            queryText += ` AND i.invoice_date <= $${paramIndex}`
            queryParams.push(dateTo)
            paramIndex++
        }

        if (partyId && partyId !== 'all') {
            queryText += ` AND i.party_id = $${paramIndex}`
            queryParams.push(partyId)
            paramIndex++
        }

        // Add sorting
        const allowedSorts = ['created_at', 'invoice_date', 'total_amount']
        const safeSort = allowedSorts.includes(sort) ? `i.${sort}` : 'i.created_at'
        const safeOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC'

        queryText += ` ORDER BY ${safeSort} ${safeOrder} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
        queryParams.push(limit, offset)

        const result = await db.query(queryText, queryParams)

        // Count query for pagination meta
        let countQuery = `SELECT COUNT(*) as total FROM invoices i WHERE 1=1`
        const countParams: any[] = []
        let countParamIndex = 1

        if (dateFrom) {
            countQuery += ` AND i.invoice_date >= $${countParamIndex}`
            countParams.push(dateFrom)
            countParamIndex++
        }
        if (dateTo) {
            countQuery += ` AND i.invoice_date <= $${countParamIndex}`
            countParams.push(dateTo)
            countParamIndex++
        }
        if (partyId && partyId !== 'all') {
            countQuery += ` AND i.party_id = $${countParamIndex}`
            countParams.push(partyId)
            countParamIndex++
        }

        const countResult = await db.query(countQuery, countParams)
        const totalCount = parseInt(countResult.rows[0].total || '0')

        return NextResponse.json({
            success: true,
            data: result.rows.map(row => ({
                id: row.id,
                invoice_number: row.invoice_number,
                invoice_date: row.invoice_date,
                party_name: row.party_name,
                party_phone: row.party_phone,
                party_gstin: row.party_gstin,
                subtotal: parseFloat(row.subtotal || 0),
                tax_amount: parseFloat(row.tax_amount || 0),
                total_amount: parseFloat(row.total_amount || 0),
                received_amount: parseFloat(row.received_amount || 0),
                payment_status: row.payment_status,
                created_at: row.created_at
            })),
            pagination: {
                totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit)
            }
        })

    } catch (error) {
        console.error('Error fetching invoices:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch invoices' },
            { status: 500 }
        )
    }
}
