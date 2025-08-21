import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest, hasRole } from '@/lib/auth';
import { createPaymentSchema } from '@/lib/validations';

// POST /api/payments - Add a payment to an invoice
export async function POST(request: NextRequest) {
  const client = await db.getClient();
  try {
    const user = await getUserFromRequest(request);
    if (!user || !hasRole(user, 'billing_operator')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createPaymentSchema.parse(body);
    const { invoice_id, amount, payment_date, payment_method, reference_number, notes } = validatedData;

    await client.query('BEGIN');

    // 1. Fetch the invoice to check its status and total amount
    const invoiceResult = await client.query('SELECT total_amount, payment_amount FROM invoices WHERE id = $1 FOR UPDATE', [invoice_id]);
    if (invoiceResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoice = invoiceResult.rows[0];
    const newPaymentAmount = parseFloat(invoice.payment_amount) + amount;

    if (newPaymentAmount > parseFloat(invoice.total_amount)) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Payment exceeds invoice total amount' }, { status: 400 });
    }

    // 2. Insert the new payment record
    const paymentResult = await client.query(`
        INSERT INTO payments (invoice_id, payment_date, amount, payment_method, reference_number, notes, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
    `, [invoice_id, payment_date, amount, payment_method, reference_number, notes, user.id]);

    // 3. Update the invoice's payment amount and status
    let newPaymentStatus = 'partial';
    if (newPaymentAmount >= parseFloat(invoice.total_amount)) {
        newPaymentStatus = 'paid';
    }

    await client.query(`
        UPDATE invoices
        SET payment_amount = $1, payment_status = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
    `, [newPaymentAmount, newPaymentStatus, invoice_id]);

    await client.query('COMMIT');

    return NextResponse.json(paymentResult.rows[0], { status: 201 });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating payment:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid input', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
