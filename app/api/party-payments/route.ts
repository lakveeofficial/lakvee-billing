import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest, hasRole } from '@/lib/auth';
import { createPartyPaymentSchema } from '@/lib/validations';

// POST /api/party-payments - Create a party-level payment with optional allocations
export async function POST(request: NextRequest) {
  const client = await db.getClient();
  try {
    const user = await getUserFromRequest(request);
    if (!user || !hasRole(user, 'billing_operator')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const input = createPartyPaymentSchema.parse(body);

    const { party_id, payment_date, amount, payment_method, reference_no, notes, allocations } = input;

    await client.query('BEGIN');

    // Insert party payment
    const payRes = await client.query(
      `INSERT INTO party_payments (party_id, payment_date, amount, payment_method, reference_no, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [party_id, payment_date, amount, payment_method ?? null, reference_no ?? null, notes ?? null, user.id]
    );

    const partyPayment = payRes.rows[0];

    // Handle allocations if provided
    const affectedInvoiceIds = new Set<number>();
    if (allocations && allocations.length > 0) {
      for (const alloc of allocations) {
        await client.query(
          `INSERT INTO payment_allocations (party_payment_id, invoice_id, amount)
           VALUES ($1, $2, $3)`,
          [partyPayment.id, alloc.invoice_id, alloc.amount]
        );
        affectedInvoiceIds.add(alloc.invoice_id);
      }
    }

    // Recompute received_amount for affected invoices from allocations sum
    for (const invoiceId of Array.from(affectedInvoiceIds)) {
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

    return NextResponse.json({ party_payment: partyPayment }, { status: 201 });
  } catch (err: any) {
    await client.query('ROLLBACK');
    if (err?.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid input', details: err.issues }, { status: 400 });
    }
    console.error('Error creating party payment:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}

// GET /api/party-payments?party_id=ID - List party payments
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user || !hasRole(user, 'billing_operator')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const partyIdStr = searchParams.get('party_id');
  const party_id = partyIdStr ? Number(partyIdStr) : NaN;
  if (!party_id || isNaN(party_id)) {
    return NextResponse.json({ error: 'party_id is required' }, { status: 400 });
  }

  const res = await db.query(
    `SELECT id, party_id, payment_date, amount, payment_method, reference_no, notes, created_by, created_at
     FROM party_payments
     WHERE party_id = $1
     ORDER BY payment_date DESC, id DESC`,
    [party_id]
  );
  return NextResponse.json({ payments: res.rows }, { status: 200 });
}
