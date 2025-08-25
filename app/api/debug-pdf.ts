// This is a temporary debug endpoint to help diagnose PDF generation issues
import { NextResponse } from 'next/server';
import { getCsvInvoiceById } from '@/lib/csvInvoices';
import { getAnyActiveCompany } from '@/lib/company';
import jsPDF from 'jspdf';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(request.url);
  const template = searchParams.get('template') || 'default';
  const debugInfo: any = { template };

  try {
    // 1. Get the invoice
    debugInfo.step = 'Fetching invoice';
    const row = await getCsvInvoiceById(params.id);
    if (!row) {
      debugInfo.error = 'Invoice not found';
      return NextResponse.json(debugInfo, { status: 404 });
    }
    debugInfo.invoiceId = row.id;
    debugInfo.sender = row.sender_name;
    debugInfo.recipient = row.recipient_name;

    // 2. Get company info
    debugInfo.step = 'Fetching company';
    const company = await getAnyActiveCompany();
    if (!company) {
      debugInfo.error = 'No active company found';
      return NextResponse.json(debugInfo, { status: 500 });
    }
    debugInfo.company = company.business_name;

    // 3. Try to create PDF
    debugInfo.step = 'Creating PDF';
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    
    // Add a simple test page
    doc.setFont('helvetica');
    doc.setFontSize(20);
    doc.text('Test PDF Generation', 50, 50);
    doc.text(`Invoice: ${row.id}`, 50, 80);
    
    const pdfBytes = doc.output('arraybuffer');
    
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="test-${row.id}.pdf"`,
      },
    });
    
  } catch (error: any) {
    debugInfo.error = error.message;
    debugInfo.stack = error.stack;
    return NextResponse.json(debugInfo, { status: 500 });
  }
}
