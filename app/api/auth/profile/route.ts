import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, hashPassword, verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        // 1. Get token from cookies
        const token = request.cookies.get('token')?.value;
        if (!token) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Verify token
        const payload = verifyToken(token);
        if (!payload) {
            return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
        }

        const userId = payload.userId as number;
        const { email, currentPassword, newPassword } = await request.json();

        if (!currentPassword) {
            return NextResponse.json({ success: false, error: 'Current password is required' }, { status: 400 });
        }

        // 3. Fetch user from DB
        const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        const user = userResult.rows[0];

        // 4. Verify current password
        const isPasswordCorrect = await verifyPassword(currentPassword, user.password_hash);
        if (!isPasswordCorrect) {
            return NextResponse.json({ success: false, error: 'Incorrect current password' }, { status: 401 });
        }

        // 5. Build update query
        let updateQuery = 'UPDATE users SET email = $1';
        const queryParams: any[] = [email];
        let paramCount = 2;

        if (newPassword) {
            if (newPassword.length < 6) {
                return NextResponse.json({ success: false, error: 'New password must be at least 6 characters' }, { status: 400 });
            }
            const newHashedPassword = await hashPassword(newPassword);
            updateQuery += `, password_hash = $${paramCount}`;
            queryParams.push(newHashedPassword);
            paramCount++;
        }

        updateQuery += `, updated_at = NOW() WHERE id = $${paramCount} RETURNING id, username, email, role`;
        queryParams.push(userId);

        // 6. Execute update
        const result = await db.query(updateQuery, queryParams);

        return NextResponse.json({
            success: true,
            message: 'Profile updated successfully',
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Profile update API error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
