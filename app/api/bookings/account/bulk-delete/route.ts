import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/auth'

// POST /api/bookings/account/bulk-delete
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
      DELETE FROM account_bookings 
      WHERE id = ANY($1::int[])
      RETURNING id
    `, [ids])

        return NextResponse.json({
            success: true,
            message: `${result.rowCount} account bookings deleted successfully`,
            count: result.rowCount
        })
    } catch (error) {
        console.error('Error bulk deleting account bookings:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to bulk delete account bookings' },
            { status: 500 }
        )
    }
})
