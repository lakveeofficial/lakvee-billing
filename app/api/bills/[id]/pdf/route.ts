import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/bills/[id]/pdf - Generate PDF for a bill
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const billId = parseInt(params.id)
    
    // Get bill details with party information
    const billResult = await db.query(`
      SELECT 
        b.*,
        p.party_name,
        p.contact_person,
        p.phone,
        p.email,
        p.address,
        p.city,
        p.state,
        p.pincode,
        p.gst_number,
        p.gst_type
      FROM bills b
      JOIN parties p ON b.party_id = p.id
      WHERE b.id = $1
    `, [billId])

    if (billResult.rows.length === 0) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    const bill = billResult.rows[0]

    // Fetch active company details (including logo)
    const companyResult = await db.query(`SELECT * FROM companies WHERE is_active = true LIMIT 1`)
    const company = companyResult.rows[0] || { businessname: 'Company Name', logo: '', businessaddress: '', phone: '', emailid: '', gstin: '', state: '', pincode: '' }

    // Prefer explicit selected bookings if present in bill_bookings mapping
    let bookings: any[] = []
    let mappingRows: any[] = []
    try {
      const mappingRes = await db.query(`SELECT booking_type, booking_id FROM bill_bookings WHERE bill_id = $1`, [billId])
      mappingRows = mappingRes.rows
    } catch (e) {
      mappingRows = []
    }
    if (mappingRows.length > 0) {
      const accountIds = mappingRows.filter((r: any) => r.booking_type === 'account').map((r: any) => r.booking_id)
      const cashIds = mappingRows.filter((r: any) => r.booking_type === 'cash').map((r: any) => r.booking_id)

      let accountRows: any[] = []
      let cashRows: any[] = []

      if (accountIds.length > 0) {
        const res = await db.query(`
          SELECT 
            booking_date as date,
            receiver,
            center,
            reference_number as consignment_no,
            remarks as remark,
            package_type,
            carrier,
            weight,
            net_amount as charges
          FROM account_bookings
          WHERE id = ANY($1::int[])
          ORDER BY booking_date DESC
        `, [accountIds])
        accountRows = res.rows
      }

      if (cashIds.length > 0) {
        const res = await db.query(`
          SELECT 
            date,
            receiver,
            center,
            reference_number as consignment_no,
            remarks as remark,
            package_type,
            carrier,
            weight,
            net_amount as charges
          FROM cash_bookings
          WHERE id = ANY($1::int[])
          ORDER BY date DESC
        `, [cashIds])
        cashRows = res.rows
      }

      bookings = [...accountRows, ...cashRows]
    } else {
      // Fallback: Get booking details for this party and month
      const billDate = new Date(bill.bill_date)
      const monthStart = new Date(billDate.getFullYear(), billDate.getMonth(), 1)
      const monthEnd = new Date(billDate.getFullYear(), billDate.getMonth() + 1, 0)

      const bookingsResult = await db.query(`
        SELECT 
          booking_date as date,
          receiver,
          center,
          reference_number as consignment_no,
          remarks as remark,
          package_type,
          carrier,
          weight,
          net_amount as charges
        FROM account_bookings
        WHERE LOWER(TRIM(sender)) = LOWER(TRIM($1))
          AND booking_date >= $2 
          AND booking_date <= $3
        ORDER BY booking_date DESC
      `, [bill.party_name, monthStart.toISOString().split('T')[0], monthEnd.toISOString().split('T')[0]])

      const cashBookingsResult = await db.query(`
        SELECT 
          date,
          receiver,
          center,
          reference_number as consignment_no,
          remarks as remark,
          package_type,
          carrier,
          weight,
          net_amount as charges
        FROM cash_bookings
        WHERE LOWER(TRIM(sender)) = LOWER(TRIM($1))
          AND date >= $2 
          AND date <= $3
        ORDER BY date DESC
      `, [bill.party_name, monthStart.toISOString().split('T')[0], monthEnd.toISOString().split('T')[0]])

      bookings = [...bookingsResult.rows, ...cashBookingsResult.rows]
    }

    // Generate HTML for the bill with booking details
    const billHtml = generateBillHTML(bill, bookings, company)

    // For now, return HTML that can be printed
    // In a real implementation, you would use a PDF library like puppeteer
    return new NextResponse(billHtml, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="bill-${bill.bill_number}.html"`
      }
    })

  } catch (error) {
    console.error('Error generating bill PDF:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate bill PDF',
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

function generateBillHTML(bill: any, bookings: any[] = [], company: any = {}): string {
  const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-IN')
  
  // Convert amount to words (simplified version)
  const numberToWords = (amount: number): string => {
    const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN']
    const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY']
    
    if (amount === 0) return 'ZERO ONLY'
    
    const convert = (num: number): string => {
      if (num < 20) return ones[num]
      if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '')
      if (num < 1000) return ones[Math.floor(num / 100)] + ' HUNDRED' + (num % 100 !== 0 ? ' ' + convert(num % 100) : '')
      return 'LARGE NUMBER'
    }
    
    return convert(Math.floor(amount)) + ' ONLY'
  }

  // Generate template based on bill.template
  const getTemplate = () => {
    switch (bill.template) {
      case 'Template 1':
        return generateTemplate1()
      case 'Template 2':
        return generateTemplate2()
      default:
        return generateDefaultTemplate()
    }
  }

  const generateDefaultTemplate = () => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Bill - ${bill.bill_number}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; font-size: 12px; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 3px solid #ff6b35; padding-bottom: 15px; }
        .company-name { font-size: 24px; font-weight: bold; color: #ff6b35; margin-bottom: 5px; }
        .company-logo { max-height: 60px; margin-bottom: 10px; }
        .company-address { font-size: 11px; color: #666; margin-bottom: 10px; }
        .bill-title { font-size: 16px; font-weight: bold; background: linear-gradient(135deg, #ff6b35, #ff8c61); color: white; padding: 8px 20px; display: inline-block; border-radius: 5px; }
        .bill-info { display: flex; justify-content: space-between; margin: 20px 0; background: #fff5f0; padding: 15px; border-radius: 8px; border-left: 4px solid #ff6b35; }
        .party-details { margin: 15px 0; }
        .charges-table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 11px; }
        .charges-table th, .charges-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .charges-table th { background: linear-gradient(135deg, #ff6b35, #ff8c61); color: white; font-weight: bold; }
        .charges-table tr:nth-child(even) { background-color: #fff5f0; }
        .bookings-table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 10px; }
        .bookings-table th, .bookings-table td { border: 1px solid #ddd; padding: 4px; text-align: center; }
        .bookings-table th { background: linear-gradient(135deg, #ff6b35, #ff8c61); color: white; font-weight: bold; }
        .bookings-table tr:nth-child(even) { background-color: #fff5f0; }
        .total-row { font-weight: bold; background-color: #ff6b35 !important; color: white; }
        .amount-words { margin: 15px 0; padding: 10px; background: #fff5f0; border-left: 4px solid #ff6b35; font-weight: bold; }
        .bank-details { margin: 15px 0; font-size: 10px; background: #fff5f0; padding: 15px; border-radius: 8px; }
        .payment-terms { margin: 15px 0; font-size: 10px; background: #fff5f0; padding: 15px; border-radius: 8px; }
        .signature { text-align: right; margin-top: 40px; }
        .signature-img { max-height: 50px; margin-bottom: 5px; }
        .print-btn { background: linear-gradient(135deg, #ff6b35, #ff8c61); color: white; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; margin: 20px 0; font-weight: bold; }
        @media print { .print-btn { display: none; } }
    </style>
</head>
<body>
    <div class="header">
        ${company.logo ? `<img src="${company.logo}" alt="Logo" class="company-logo" />` : ''}
        <div class="company-name">${company.businessname || 'PANDEY SERVICES'}</div>
        <div class="company-address">${company.businessaddress || 'Shalimar complex Sadhu shree Garden Road saman Rewa, REWA - 486011'}</div>
        <div class="bill-title">MONTHLY BILL / ${(() => {
          const dateStr = formatDate(bill.bill_date);
          const parts = dateStr.split('/');
          return parts.length >= 3 ? `${parts[1]} ${parts[2]}` : 'OCT 2025';
        })()}</div>
    </div>

    <div class="bill-info">
        <div>
            <strong>M/s.</strong> ${(bill.party_name || '').toUpperCase()}<br>
            <strong>Address:</strong> ${bill.address || bill.city || 'REWA REWA'}<br>
            <strong>Phone:</strong> ${bill.phone || company.phone || '7967970121'}<br>
            ${bill.gst_number ? `<strong>GST:</strong> ${bill.gst_number}` : ''}
        </div>
        <div style="text-align: right;">
            <strong>Bill No.</strong> ${(bill.bill_number || '').includes('STC') ? bill.bill_number.split('STC')[1] : '3'}<br>
            <strong>Date:</strong> ${formatDate(bill.bill_date)}<br>
            ${company.gstin ? `<strong>Our GST:</strong> ${company.gstin}` : ''}
        </div>
    </div>

    <table class="charges-table">
        <thead>
            <tr>
                <th style="width: 70%;">PARTICULAR</th>
                <th style="width: 30%;">AMOUNT</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>COURIER CHARGES FOR THE MONTH OF ${(() => {
                  const dateStr = formatDate(bill.bill_date);
                  const parts = dateStr.split('/');
                  return parts.length >= 3 ? `${parts[1]} ${parts[2]}` : 'OCT 2025';
                })()}</td>
                <td style="text-align: right;">${formatCurrency(parseFloat(bill.base_amount) || 800)}</td>
            </tr>
            ${parseFloat(bill.fuel_charges) > 0 ? `
            <tr>
                <td>F.Ch. % (10)</td>
                <td style="text-align: right;">${formatCurrency(parseFloat(bill.fuel_charges))}</td>
            </tr>` : `
            <tr>
                <td>F.Ch. % (10)</td>
                <td style="text-align: right;">${formatCurrency(80)}</td>
            </tr>`}
            <tr class="total-row">
                <td><strong>GRAND TOTAL</strong></td>
                <td style="text-align: right;"><strong>${formatCurrency(parseFloat(bill.total_amount))}</strong></td>
            </tr>
        </tbody>
    </table>

    <div class="amount-words">
        (Rupees in words) &nbsp;&nbsp;&nbsp; <strong>${numberToWords(parseFloat(bill.total_amount))}</strong>
    </div>

    <div style="display: flex; margin: 20px 0;">
        <div class="bank-details" style="width: 40%;">
            <strong style="color: #ff6b35;">BANK DETAILS</strong><br>
            ${company.bankname || 'HDFC BANK'}<br>
            A/C. No. - ${company.accountnumber || '12345678'}<br>
            IFSC CODE - ${company.ifsccode || 'HDFC123'}<br>
            MSME No. - ${company.msmenumber || ''}<br>
            HSN/SAC CODE - ${company.hsncode || '996812'}<br>
            Pan Card No.- ${company.pannumber || 'abcd1234e'}<br>
            Mo. ${company.phone || '9033344536'}
        </div>
        <div style="width: 60%; padding-left: 20px;">
            <div class="payment-terms" style="border: 2px solid #ff6b35; padding: 15px; margin-bottom: 10px; background: white;">
                <strong style="color: #ff6b35;">PLEASE MAKE PAYMENT BY A/c. PAYEE CHEQUE IN FAVOR OF ${company.businessname || 'PANDEY SERVICES'}</strong>
            </div>
            <div class="payment-terms" style="border: 2px solid #ff6b35; padding: 15px; background: white;">
                <strong style="color: #ff6b35;">PLEASE MAKE PAYMENT BY AMOUNT DUE ON 1 TO 5 DAYS</strong>
            </div>
        </div>
    </div>

    <div class="signature">
        ${company.signature ? `<img src="${company.signature}" alt="Signature" class="signature-img" />` : ''}
        <p>For, ${company.businessname || 'Pandey Services'}</p>
        <br><br>
        <p>Autho / Sign.</p>
    </div>

    ${bookings.length > 0 ? `
    <div style="page-break-before: always;">
        <div class="header">
            <div class="bill-title">BILL DETAIL / ${(() => {
              const dateStr = formatDate(bill.bill_date);
              const parts = dateStr.split('/');
              return parts.length >= 3 ? `${parts[1]} ${parts[2]}` : 'OCT 2025';
            })()}</div>
        </div>

        <table class="bookings-table">
            <thead>
                <tr>
                    <th>Sr</th>
                    <th>Receiver</th>
                    <th>Center</th>
                    <th>Date</th>
                    <th>Cons_No</th>
                    <th>Remark</th>
                    <th>Package</th>
                    <th>Carrier</th>
                    <th>Weight</th>
                    <th>Ins./ RS. Chrg</th>
                    <th>Charges</th>
                </tr>
            </thead>
            <tbody>
                ${bookings.map((booking, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${booking.receiver || ''}</td>
                    <td>${booking.center || 'INDORE'}</td>
                    <td>${formatDate(booking.date)}</td>
                    <td>${booking.consignment_no || 'VP16043064'}</td>
                    <td>${booking.remark || ''}</td>
                    <td>${booking.package_type || 'PROFESSIONAL COURIER'}</td>
                    <td>${booking.carrier || ''}</td>
                    <td>${booking.weight || '500 KG (1 Box)'}</td>
                    <td>000</td>
                    <td>${formatCurrency(parseFloat(booking.charges) || 800)}</td>
                </tr>
                `).join('')}
                <tr class="total-row">
                    <td colspan="9"><strong>Amount</strong></td>
                    <td><strong>${formatCurrency(parseFloat(bill.base_amount) || 800)}</strong></td>
                    <td></td>
                </tr>
                <tr>
                    <td colspan="9">F.Ch. % (10)</td>
                    <td>${formatCurrency(parseFloat(bill.fuel_charges) || 80)}</td>
                    <td></td>
                </tr>
                <tr class="total-row">
                    <td colspan="9"><strong>GRAND TOTAL</strong></td>
                    <td><strong>${formatCurrency(parseFloat(bill.total_amount))}</strong></td>
                    <td></td>
                </tr>
            </tbody>
        </table>

        <div class="amount-words">
            (Rupees in words) &nbsp;&nbsp;&nbsp; <strong>${numberToWords(parseFloat(bill.total_amount))}</strong>
        </div>

        <div class="signature">
            ${company.signature ? `<img src="${company.signature}" alt="Signature" class="signature-img" />` : ''}
            <p>For, ${company.businessname || 'Pandey Services'}</p>
            <br><br>
            <p>Autho / Sign.</p>
        </div>
    </div>
    ` : ''}

    <button class="print-btn" onclick="window.print()">Print Bill</button>

    <script>
        if (window.opener) {
            setTimeout(() => window.print(), 500);
        }
    </script>
</body>
</html>`

  const generateTemplate1 = () => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Bill - ${bill.bill_number}</title>
    <style>
        body { font-family: 'Times New Roman', serif; margin: 0; padding: 15px; font-size: 11px; }
        .header { text-align: center; margin-bottom: 15px; border-bottom: 3px solid #2c5aa0; padding-bottom: 15px; }
        .company-name { font-size: 22px; font-weight: bold; color: #2c5aa0; }
        .company-logo { max-height: 50px; margin-bottom: 8px; }
        .company-address { font-size: 10px; color: #666; margin-bottom: 8px; }
        .bill-title { font-size: 14px; font-weight: bold; background: #2c5aa0; color: white; padding: 6px 16px; display: inline-block; border-radius: 3px; margin: 10px 0; }
        .content { margin: 10px 0; }
        .bill-info { background: #e8f0fe; padding: 12px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #2c5aa0; }
        .charges-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        .charges-table th, .charges-table td { border: 1px solid #2c5aa0; padding: 6px; }
        .charges-table th { background: #2c5aa0; color: white; font-weight: bold; }
        .charges-table tr:nth-child(even) { background: #e8f0fe; }
        .total-row { font-weight: bold; background: #2c5aa0 !important; color: white; }
        .bank-details { background: #e8f0fe; padding: 12px; border-radius: 5px; margin: 15px 0; }
        .signature { text-align: right; margin-top: 30px; }
        .signature-img { max-height: 40px; margin-bottom: 5px; }
        .print-btn { background: #2c5aa0; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; }
        @media print { .print-btn { display: none; } }
    </style>
</head>
<body>
    <div class="header">
        ${company.logo ? `<img src="${company.logo}" alt="Logo" class="company-logo" />` : ''}
        <div class="company-name">${company.businessname || 'COURIER SERVICES LTD'}</div>
        <div class="company-address">${company.businessaddress || '123 Business Park, City - 123456'}</div>
        <div class="bill-title">INVOICE - ${bill.bill_number}</div>
    </div>
    
    <div class="bill-info">
        <div>
            <strong>Bill To:</strong> ${bill.party_name}<br>
            <strong>Address:</strong> ${bill.address || bill.city || ''}<br>
            <strong>Phone:</strong> ${bill.phone || company.phone || ''}<br>
            ${bill.gst_number ? `<strong>GST:</strong> ${bill.gst_number}` : ''}
        </div>
        <div style="text-align: right;">
            <strong>Date:</strong> ${formatDate(bill.bill_date)}<br>
            ${company.gstin ? `<strong>Our GST:</strong> ${company.gstin}` : ''}
        </div>
    </div>
    
    <div class="content">
        <table class="charges-table">
            <thead>
                <tr><th>Description</th><th style="text-align: right;">Amount</th></tr>
            </thead>
            <tbody>
                <tr>
                    <td>Courier Services for the month</td>
                    <td style="text-align: right;">${formatCurrency(parseFloat(bill.total_amount))}</td>
                </tr>
                <tr class="total-row">
                    <td><strong>Total</strong></td>
                    <td style="text-align: right;"><strong>${formatCurrency(parseFloat(bill.total_amount))}</strong></td>
                </tr>
            </tbody>
        </table>
        
        <div style="margin: 15px 0; padding: 10px; background: #e8f0fe; border-left: 4px solid #2c5aa0;">
            <strong>Amount in words:</strong> ${numberToWords(parseFloat(bill.total_amount))}
        </div>
        
        <div class="bank-details">
            <strong style="color: #2c5aa0;">Bank Details:</strong><br>
            Bank: ${company.bankname || 'Bank Name'}<br>
            A/C No: ${company.accountnumber || '12345678'}<br>
            IFSC: ${company.ifsccode || 'IFSC123'}
        </div>
        
        <div class="signature">
            ${company.signature ? `<img src="${company.signature}" alt="Signature" class="signature-img" />` : ''}
            <p>For, ${company.businessname || 'Courier Services Ltd'}</p>
            <br><br>
            <p>Authorized Signatory</p>
        </div>
    </div>
    
    <button class="print-btn" onclick="window.print()">Print Invoice</button>
    
    <script>
        if (window.opener) setTimeout(() => window.print(), 500);
    </script>
</body>
</html>`

  const generateTemplate2 = () => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Bill - ${bill.bill_number}</title>
    <style>
        body { font-family: Calibri, sans-serif; margin: 0; padding: 20px; font-size: 12px; background: #f8f9fa; }
        .container { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; margin: -25px -25px 20px -25px; }
        .company-logo { max-height: 60px; margin-bottom: 10px; }
        .company-name { font-size: 24px; font-weight: bold; }
        .company-address { font-size: 11px; opacity: 0.9; margin-top: 5px; }
        .bill-title { font-size: 16px; font-weight: bold; margin-top: 15px; background: rgba(255,255,255,0.2); padding: 8px 20px; display: inline-block; border-radius: 20px; }
        .content { margin: 15px 0; }
        .bill-info { background: linear-gradient(135deg, #f5f7fa 0%, #e8f0fe 100%); padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
        .charges-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .charges-table th, .charges-table td { border: 1px solid #e0e0e0; padding: 10px; }
        .charges-table th { background: linear-gradient(135deg, #667eea, #764ba2); color: white; font-weight: bold; }
        .charges-table tr:nth-child(even) { background: #f8f9fa; }
        .total-row { font-weight: bold; background: linear-gradient(135deg, #667eea, #764ba2) !important; color: white; }
        .amount-words { margin: 15px 0; padding: 12px; background: linear-gradient(135deg, #f5f7fa 0%, #e8f0fe 100%); border-left: 4px solid #667eea; border-radius: 5px; }
        .bank-details { margin: 15px 0; background: linear-gradient(135deg, #f5f7fa 0%, #e8f0fe 100%); padding: 15px; border-radius: 8px; }
        .signature { text-align: right; margin-top: 40px; }
        .signature-img { max-height: 50px; margin-bottom: 5px; }
        .print-btn { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; margin-top: 20px; }
        @media print { .print-btn { display: none; } body { background: white; } .container { box-shadow: none; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            ${company.logo ? `<img src="${company.logo}" alt="Logo" class="company-logo" />` : ''}
            <div class="company-name">${company.businessname || 'MODERN LOGISTICS'}</div>
            <div class="company-address">${company.businessaddress || '456 Tech Park, Business District, City - 123456'}</div>
            <div class="bill-title">Tax Invoice - ${bill.bill_number}</div>
        </div>
        
        <div class="bill-info">
            <div>
                <strong>Bill To:</strong> ${bill.party_name}<br>
                <strong>Address:</strong> ${bill.address || bill.city || ''}<br>
                <strong>Phone:</strong> ${bill.phone || company.phone || ''}<br>
                ${bill.gst_number ? `<strong>GST:</strong> ${bill.gst_number}` : ''}
            </div>
            <div style="text-align: right;">
                <strong>Invoice Date:</strong> ${formatDate(bill.bill_date)}<br>
                ${company.gstin ? `<strong>Our GST:</strong> ${company.gstin}` : ''}
            </div>
        </div>
        
        <div class="content">
            <table class="charges-table">
                <thead>
                    <tr><th>Description</th><th style="text-align: right;">Amount</th></tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Courier Services - Monthly Billing</td>
                        <td style="text-align: right;">${formatCurrency(parseFloat(bill.total_amount))}</td>
                    </tr>
                    <tr class="total-row">
                        <td><strong>Total Amount</strong></td>
                        <td style="text-align: right;"><strong>${formatCurrency(parseFloat(bill.total_amount))}</strong></td>
                    </tr>
                </tbody>
            </table>
            
            <div class="amount-words">
                <strong>Amount in words:</strong> ${numberToWords(parseFloat(bill.total_amount))}
            </div>
            
            <div class="bank-details">
                <strong style="color: #667eea;">Payment Details:</strong><br>
                Bank: ${company.bankname || 'Modern Bank'}<br>
                Account No: ${company.accountnumber || '87654321'}<br>
                IFSC Code: ${company.ifsccode || 'MODRN123'}
            </div>
            
            <div class="signature">
                ${company.signature ? `<img src="${company.signature}" alt="Signature" class="signature-img" />` : ''}
                <p>For, ${company.businessname || 'Modern Logistics'}</p>
                <br><br>
                <p>Authorized Signatory</p>
            </div>
        </div>
        
        <button class="print-btn" onclick="window.print()">Print Invoice</button>
    </div>
    
    <script>
        if (window.opener) setTimeout(() => window.print(), 500);
    </script>
</body>
</html>`

  return getTemplate()
}
