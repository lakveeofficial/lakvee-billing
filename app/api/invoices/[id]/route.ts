import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest, hasRole } from '@/lib/auth';
import { updateInvoiceSchema } from '@/lib/validations';

interface RouteParams {
  params: { id: string };
}

// GET /api/invoices/[id] - Get a single invoice by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const invoiceResult = await db.query('SELECT * FROM invoices WHERE id = $1', [id]);

    if (invoiceResult.rows.length === 0) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const itemsResult = await db.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [id]);
    const paymentsResult = await db.query('SELECT * FROM payments WHERE invoice_id = $1', [id]);
    // Attempt to fetch linked CSV rows to surface booking_reference and consignment_no
    // This table is optional in some deployments; guard with information_schema check
    let csvRows: any[] = [];
    try {
      const colCheck = await db.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = 'csv_invoices' AND column_name = 'invoice_id' LIMIT 1`
      );
      if (colCheck.rows.length > 0) {
        const csvRes = await db.query(
          `SELECT id, booking_date, booking_reference, consignment_no, mode, service_type, region, weight, pricing_meta
           FROM csv_invoices WHERE invoice_id = $1 ORDER BY created_at ASC`,
          [id]
        );
        csvRows = csvRes.rows || [];
      }
    } catch (e) {
      // Non-fatal if csv_invoices does not exist
      csvRows = [];
    }

    const invoice = invoiceResult.rows[0];
    invoice.items = itemsResult.rows;
    invoice.payments = paymentsResult.rows;
    if (csvRows.length) {
      invoice.csv_rows = csvRows;
      // Convenience: expose first booking_reference at invoice level if present
      const firstRef = csvRows.find(r => r && r.booking_reference);
      if (firstRef && firstRef.booking_reference) {
        invoice.booking_ref = firstRef.booking_reference;
      }
    }

    return NextResponse.json(invoice);

  } catch (error) {
    console.error(`Error fetching invoice ${params.id}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/invoices/[id] - Update an invoice
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const client = await db.getClient();
  try {
    const user = await getUserFromRequest(request);
    if (!user || !hasRole(user, 'billing_operator')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const { items, ...invoiceData } = updateInvoiceSchema.parse(body);
    // Use a separate mutable object for DB updates to allow server-computed fields
    const updates: Record<string, any> = { ...invoiceData };

    await client.query('BEGIN');

    // Fetch existing invoice values for fallback calculations
    const existingRes = await client.query('SELECT subtotal, tax_amount, additional_charges, apply_slab, slab_amount FROM invoices WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    const existing = existingRes.rows[0];

    if (items) {
        // Recalculate subtotal if items are updated
        const subtotal = items.reduce((acc, item) => acc + item.total_price, 0);
        updates.subtotal = subtotal;

        // Delete old items and insert new ones (including item meta fields)
        await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);
        const itemInsertPromises = items.map(item => {
            return client.query(
                `INSERT INTO invoice_items (
                  invoice_id, item_description, quantity, unit_price, total_price, booking_date,
                  shipment_type, mode_id, service_type_id, distance_slab_id, weight_kg,
                  consignment_no
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                [
                  id,
                  item.item_description,
                  item.quantity,
                  item.unit_price,
                  item.total_price,
                  item.booking_date ? new Date(item.booking_date) : null,
                  item.shipment_type ?? null,
                  item.mode_id ?? null,
                  item.service_type_id ?? null,
                  item.distance_slab_id ?? null,
                  item.weight_kg ?? null,
                  (item as any).consignment_no ?? (item as any).consignmentNo ?? null,
                ]
            );
        });
        await Promise.all(itemInsertPromises);
    }

    // Compute effective values (prefer updates, fallback to existing)
    const effSubtotal = (typeof updates.subtotal === 'number') ? updates.subtotal : Number(existing.subtotal) || 0;
    const effTax = (typeof updates.tax_amount === 'number') ? updates.tax_amount : Number(existing.tax_amount) || 0;
    const effAdd = (typeof updates.additional_charges === 'number') ? updates.additional_charges : Number(existing.additional_charges) || 0;
    const effApply = (typeof updates.apply_slab === 'boolean') ? updates.apply_slab : !!existing.apply_slab;
    const effSlab = (typeof updates.slab_amount === 'number') ? updates.slab_amount : Number(existing.slab_amount) || 0;
    // If any of the components changed, or if we updated items (subtotal), recompute total_amount
    if ('subtotal' in updates || 'tax_amount' in updates || 'additional_charges' in updates || 'apply_slab' in updates || 'slab_amount' in updates) {
      updates.total_amount = effSubtotal + effTax + effAdd + (effApply ? effSlab : 0);
    }

    const fields = Object.keys(updates);
    const values = Object.values(updates);

    if (fields.length > 0) {
        const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
        const query = `UPDATE invoices SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${fields.length + 1} RETURNING *`;
        await client.query(query, [...values, id]);
    }

    await client.query('COMMIT');

    // Refetch the updated invoice to return it
    const updatedInvoiceResult = await client.query('SELECT * FROM invoices WHERE id = $1', [id]);
    const updatedItemsResult = await client.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [id]);
    const updatedInvoice = updatedInvoiceResult.rows[0];
    updatedInvoice.items = updatedItemsResult.rows;

    return NextResponse.json(updatedInvoice);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Error updating invoice ${params.id}:`, error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid input', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}

// DELETE /api/invoices/[id] - Delete an invoice
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || !hasRole(user, 'admin')) { // Only admins can delete invoices
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    // Deleting an invoice will cascade delete related items and payments due to foreign key constraints
    const result = await db.query('DELETE FROM invoices WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Invoice deleted successfully' });

  } catch (error) {
    console.error(`Error deleting invoice ${params.id}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
