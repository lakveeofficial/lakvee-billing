import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/auth'

// POST /api/bookings/cash/bulk-delete
export const POST = withAuth(async ({ user }, req) => {
    try {
        const { ids } = await req.json()

        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Ids array is required and should not be empty' },
                { status: 400 }
            )
        }

        const result = await db.query(`
      DELETE FROM cash_bookings 
      WHERE id = ANY($1::int[])
      RETURNING id
    `, [ids])

        return NextResponse.json({
            success: true,
            message: `${result.rowCount} cash bookings deleted successfully`,
            count: result.rowCount
        })
    } catch (error) {
        console.error('Error bulk deleting cash bookings:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to bulk delete cash bookings' },
            { status: 500 }
        )
    }
})
