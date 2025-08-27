import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest, hasRole } from '@/lib/auth';
import { createPaymentAllocationsSchema } from '@/lib/validations';

// POST /api/payment-allocations - Add allocations to an existing party payment
export async function POST(request: NextRequest) {
  const client = await db.getClient();
  try {
    const user = await getUserFromRequest(request);
    if (!user || !hasRole(user, 'billing_operator')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const input = createPaymentAllocationsSchema.parse(body);

    const { party_payment_id, allocations } = input;

    await client.query('BEGIN');

    // Ensure party payment exists
    const pp = await client.query('SELECT id FROM party_payments WHERE id = $1 FOR UPDATE', [party_payment_id]);
    if (pp.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Party payment not found' }, { status: 404 });
    }

    const affectedInvoiceIds = new Set<number>();

    for (const alloc of allocations) {
      await client.query(
        `INSERT INTO payment_allocations (party_payment_id, invoice_id, amount)
         VALUES ($1, $2, $3)`,
        [party_payment_id, alloc.invoice_id, alloc.amount]
      );
      affectedInvoiceIds.add(alloc.invoice_id);
    }

    // Recompute received_amount for affected invoices from allocations sum
    for (const invoiceId of affectedInvoiceIds) {
      const sumRes = await client.query(
        `SELECT COALESCE(SUM(amount), 0) AS rec FROM payment_allocations WHERE invoice_id = $1`,
        [invoiceId]
      );
      const rec = Number(sumRes.rows[0]?.rec ?? 0);
      await client.query(
        `UPDATE invoices SET received_amount = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [rec, invoiceId]
      );
    }

    await client.query('COMMIT');

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err: any) {
    await client.query('ROLLBACK');
    if (err?.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid input', details: err.issues }, { status: 400 });
    }
    console.error('Error creating payment allocations:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
