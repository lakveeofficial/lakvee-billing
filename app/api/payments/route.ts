import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth';

// POST /api/payments - Add a payment/income
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      party_id,
      payment_date,
      amount,
      tds_deduct = 0,
      discount = 0,
      description = '',
      selected_bills = [],
      invoice_id,
      payment_method = 'cash',
      reference_number,
      notes
    } = body;

    // Temporary user context since we removed withAuth
    const user = { id: 1 }; // Assuming admin ID 1

    // Handle both new income format and legacy payment format
    if (invoice_id) {
      // Legacy payment to specific invoice
      return handleInvoicePayment({ invoice_id, amount, payment_date, payment_method, reference_number, notes, user });
    } else {
      // New income/payment format
      return handlePartyPayment({ party_id, payment_date, amount, tds_deduct, discount, description, selected_bills, user });
    }
  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handlePartyPayment({ party_id, payment_date, amount, tds_deduct, discount, description, selected_bills, user }: any) {
  try {
    // Insert party payment record
    const result = await db.query(`
      INSERT INTO party_payments (
        party_id, payment_date, amount, tds_deduct, discount, description, 
        selected_bills, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      party_id, payment_date, amount, tds_deduct, discount, description,
      JSON.stringify(selected_bills), user.id
    ]);

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (dbError: any) {
    console.error('Error creating party payment:', dbError);
    const errPayload: Record<string, any> = {
      error: 'Failed to create payment',
      details: dbError?.message || String(dbError),
    };
    for (const k of ['code', 'constraint', 'table', 'column', 'detail', 'schema', 'hint', 'position']) {
      if (dbError && dbError[k]) errPayload[k] = dbError[k];
    }
    return NextResponse.json(errPayload, { status: 500 });
  }
}

async function handleInvoicePayment({ invoice_id, amount, payment_date, payment_method, reference_number, notes, user }: any) {
  const client = await db.getClient();
  try {

    await client.query('BEGIN');

    // 1. Fetch the invoice to check its status and total amount
    const invoiceResult = await client.query('SELECT total_amount, payment_amount FROM invoices WHERE id = $1 FOR UPDATE', [invoice_id]);
    if (invoiceResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoice = invoiceResult.rows[0];
    const currentPaymentAmount = parseFloat(invoice.payment_amount || 0);
    const newPaymentAmount = currentPaymentAmount + amount;

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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
