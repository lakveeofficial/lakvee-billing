import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest, hasRole } from '@/lib/auth';

// GET /api/party-outstanding?party_id=ID
// Returns outstanding summary and open invoices for a party
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

  // Fetch invoices and compute outstanding per invoice
  const invRes = await db.query(
    `SELECT id, invoice_number, invoice_date, total_amount, COALESCE(received_amount, 0) AS received_amount
     FROM invoices
     WHERE party_id = $1
     ORDER BY invoice_date DESC, id DESC`,
    [party_id]
  );

  const invoices = invRes.rows.map((r: any) => {
    const outstanding = Number(r.total_amount) - Number(r.received_amount || 0);
    return { ...r, outstanding: Math.max(outstanding, 0) };
  });
  const open_invoices = invoices.filter((i: any) => i.outstanding > 0);

  const total_outstanding = open_invoices.reduce((sum: number, i: any) => sum + i.outstanding, 0);
  const total_invoices = invoices.length;
  const total_open = open_invoices.length;

  return NextResponse.json({
    party_id,
    summary: {
      total_invoices,
      total_open,
      total_outstanding,
    },
    open_invoices,
  }, { status: 200 });
}
