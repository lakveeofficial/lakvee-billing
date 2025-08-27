import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest, hasRole } from '@/lib/auth';

// GET /api/invoices/[id]/allocations - list allocations applied to this invoice
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(_request);
  if (!user || !hasRole(user, 'billing_operator')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const invoiceId = Number(params.id);
  if (!invoiceId || Number.isNaN(invoiceId)) {
    return NextResponse.json({ error: 'Invalid invoice id' }, { status: 400 });
  }

  const q = `
    SELECT pa.id, pa.party_payment_id, pa.invoice_id, pa.amount, pa.created_at,
           pp.payment_date, pp.amount AS party_payment_amount, pp.payment_method, pp.reference_no
    FROM payment_allocations pa
    JOIN party_payments pp ON pp.id = pa.party_payment_id
    WHERE pa.invoice_id = $1
    ORDER BY pa.created_at DESC, pa.id DESC
  `;
  const res = await db.query(q, [invoiceId]);

  // Also include current received_amount and total to help UI compute outstanding quickly
  const invRes = await db.query(
    'SELECT id, invoice_number, total_amount, COALESCE(received_amount,0) AS received_amount FROM invoices WHERE id = $1',
    [invoiceId]
  );
  const invoice = invRes.rows[0] || null;

  return NextResponse.json({ allocations: res.rows, invoice }, { status: 200 });
}
