import { InvoiceStorage } from './invoiceStorage'
import { PartyStorage } from './storage'
import {
  ReportFilters,
  SalesReportData,
  PartyStatementData,
  DaybookData,
  ReportSummary,
  PartyTransaction,
  DaybookEntry
} from '@/types/reports'
import { Invoice } from '@/types/invoice'
import { Party } from '@/types/party'

export class ReportService {
  static generateSalesReport(filters: ReportFilters): {
    data: SalesReportData[]
    summary: ReportSummary
  } {
    const invoices = this.getFilteredInvoices(filters)

    const data: SalesReportData[] = invoices.map(invoice => ({
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      customerName: invoice.customer.partyName,
      customerPhone: invoice.customer.phoneNumber,
      totalAmount: invoice.totalAmount,
      receivedAmount: invoice.receivedAmount,
      balance: invoice.balance,
      paymentType: invoice.paymentInfo.paymentType,
      status: invoice.status,
      paymentStatus: invoice.paymentInfo.status
    }))

    const summary = this.calculateSummary(invoices, filters)

    return { data, summary }
  }

  static generatePartyStatement(filters: ReportFilters): PartyStatementData[] {
    const invoices = this.getFilteredInvoices(filters)
    const parties = PartyStorage.getAll()

    // Group invoices by customer
    const partyInvoices = new Map<string, Invoice[]>()
    invoices.forEach(invoice => {
      const customerId = invoice.customer.id
      if (!partyInvoices.has(customerId)) {
        partyInvoices.set(customerId, [])
      }
      partyInvoices.get(customerId)!.push(invoice)
    })

    const statements: PartyStatementData[] = []

    partyInvoices.forEach((customerInvoices, customerId) => {
      const party = parties.find(p => p.id === customerId)
      if (!party) return

      const transactions: PartyTransaction[] = []
      let runningBalance = 0

      // Sort invoices by date
      customerInvoices.sort((a, b) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime())

      customerInvoices.forEach(invoice => {
        // Add invoice transaction
        runningBalance += invoice.totalAmount
        transactions.push({
          date: invoice.invoiceDate,
          invoiceNumber: invoice.invoiceNumber,
          description: `Invoice for ${invoice.items.length} item(s)`,
          debit: invoice.totalAmount,
          credit: 0,
          balance: runningBalance,
          type: 'invoice'
        })

        // Add payment transaction if any amount received
        if (invoice.receivedAmount > 0) {
          runningBalance -= invoice.receivedAmount
          transactions.push({
            date: invoice.invoiceDate,
            invoiceNumber: invoice.invoiceNumber,
            description: `Payment received - ${invoice.paymentInfo.paymentType}`,
            debit: 0,
            credit: invoice.receivedAmount,
            balance: runningBalance,
            type: 'payment'
          })
        }
      })

      const totalSales = customerInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
      const totalReceived = customerInvoices.reduce((sum, inv) => sum + inv.receivedAmount, 0)

      statements.push({
        partyName: party.partyName,
        partyPhone: party.phoneNumber,
        transactions,
        openingBalance: 0,
        closingBalance: runningBalance,
        totalSales,
        totalReceived
      })
    })

    return statements.sort((a, b) => a.partyName.localeCompare(b.partyName))
  }

  static generateDaybookReport(filters: ReportFilters): DaybookData[] {
    const invoices = this.getFilteredInvoices(filters)

    // Group invoices by date
    const dailyInvoices = new Map<string, Invoice[]>()
    invoices.forEach(invoice => {
      const date = invoice.invoiceDate
      if (!dailyInvoices.has(date)) {
        dailyInvoices.set(date, [])
      }
      dailyInvoices.get(date)!.push(invoice)
    })

    const daybookData: DaybookData[] = []

    dailyInvoices.forEach((dayInvoices, date) => {
      const entries: DaybookEntry[] = dayInvoices
        .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
        .map(invoice => ({
          time: new Date(invoice.createdAt || 0).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customer.partyName,
          description: `${invoice.items.length} item(s)`,
          amount: invoice.totalAmount,
          receivedAmount: invoice.receivedAmount,
          balance: invoice.balance,
          paymentType: invoice.paymentInfo.paymentType,
          status: invoice.status
        }))

      const totalSales = dayInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
      const totalReceived = dayInvoices.reduce((sum, inv) => sum + inv.receivedAmount, 0)
      const totalBalance = dayInvoices.reduce((sum, inv) => sum + inv.balance, 0)

      daybookData.push({
        date,
        entries,
        totalSales,
        totalReceived,
        totalBalance
      })
    })

    return daybookData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  private static getFilteredInvoices(filters: ReportFilters): Invoice[] {
    let invoices = InvoiceStorage.getAll()

    // Filter by date range
    if (filters.dateFrom) {
      invoices = invoices.filter(inv => inv.invoiceDate >= filters.dateFrom)
    }
    if (filters.dateTo) {
      invoices = invoices.filter(inv => inv.invoiceDate <= filters.dateTo)
    }

    // Filter by customer
    if (filters.customerId && filters.customerId !== 'all') {
      invoices = invoices.filter(inv => inv.customer.id === filters.customerId)
    }

    return invoices
  }

  private static calculateSummary(invoices: Invoice[], filters: ReportFilters): ReportSummary {
    const totalInvoices = invoices.length
    const totalSales = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
    const totalReceived = invoices.reduce((sum, inv) => sum + inv.receivedAmount, 0)
    const totalBalance = invoices.reduce((sum, inv) => sum + inv.balance, 0)

    const paidInvoices = invoices.filter(inv => inv.paymentInfo.status === 'paid').length
    const unpaidInvoices = invoices.filter(inv => inv.paymentInfo.status === 'pending').length
    const partialInvoices = invoices.filter(inv => inv.paymentInfo.status === 'partial').length

    return {
      totalInvoices,
      totalSales,
      totalReceived,
      totalBalance,
      paidInvoices,
      unpaidInvoices,
      partialInvoices,
      dateRange: {
        from: filters.dateFrom,
        to: filters.dateTo
      }
    }
  }

  static async exportToPDF(data: any, reportType: string, filters: ReportFilters): Promise<void> {
    // Resolve company logo before creating iframe so it renders reliably in srcdoc
    function absUrl(url?: string): string {
      try {
        if (!url) return ''
        if (url.startsWith('data:')) return url
        if (url.startsWith('http://') || url.startsWith('https://')) return url
        if (url.startsWith('/')) return window.location.origin + url
        return new URL(url, window.location.origin + '/').toString()
      } catch {
        return ''
      }
    }

    let logoSrc = ''
    try {
      const r = await fetch('/api/company/active', { cache: 'no-store' })
      if (r.ok) {
        const c = await r.json()
        if (c && c.logo) {
          const raw = String(c.logo)
          const lower = raw.toLowerCase()
          if (raw.startsWith('data:') || raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/')) {
            logoSrc = absUrl(raw)
            // Try upgrading to data URL to avoid mixed-content/CORS issues inside srcdoc
            try {
              const abs = logoSrc
              if (abs && (abs.startsWith('http://') || abs.startsWith('https://'))) {
                const imgRes = await fetch(abs, { mode: 'cors', credentials: 'omit' })
                if (imgRes.ok) {
                  const blob = await imgRes.blob()
                  const reader = new FileReader()
                  const dataUrl: string = await new Promise((resolve, reject) => {
                    reader.onerror = () => reject(new Error('reader error'))
                    reader.onload = () => resolve(String(reader.result || ''))
                    reader.readAsDataURL(blob)
                  })
                  if (dataUrl.startsWith('data:')) logoSrc = dataUrl
                }
              }
            } catch { }
          } else {
            // Possibly bare base64 string
            const looksB64 = /^[a-z0-9+/=\r\n]+$/i.test(raw) && raw.length > 100
            logoSrc = looksB64 ? `data:image/png;base64,${raw.replace(/\r?\n/g, '')}` : absUrl(raw)
          }
        }
      }
    } catch { }

    // Use hidden iframe for reliable printing in user-gesture context
    const html = this.generatePrintHTML(data, reportType, filters, logoSrc)
    const iframe: HTMLIFrameElement = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.style.visibility = 'hidden'

    const cleanup = () => {
      try { document.body.removeChild(iframe) } catch { }
    }

    iframe.onload = () => {
      const win = iframe.contentWindow
      if (!win) { cleanup(); return }
      // Slight delay to allow layout before print
      setTimeout(() => {
        try { win.focus() } catch { }
        try { win.print() } catch { }
        try { (win as any).onafterprint = cleanup } catch { setTimeout(cleanup, 500) }
      }, 50)
    }

    document.body.appendChild(iframe)
    if (typeof (iframe as any).srcdoc !== 'undefined') {
      ; (iframe as any).srcdoc = html
    } else {
      const doc = iframe.contentDocument || iframe.contentWindow?.document
      if (doc) {
        doc.open()
        doc.write(html)
        doc.close()
      }
    }
  }

  static exportToCSV(data: any, reportType: string): void {
    let csvContent = ''
    let filename = ''

    switch (reportType) {
      case 'sales':
        csvContent = this.generateSalesCSV(data.data)
        filename = `sales_report_${new Date().toISOString().split('T')[0]}.csv`
        break
      case 'party_statement':
        csvContent = this.generatePartyStatementCSV(data)
        filename = `party_statement_${new Date().toISOString().split('T')[0]}.csv`
        break
      case 'daybook':
        csvContent = this.generateDaybookCSV(data)
        filename = `daybook_report_${new Date().toISOString().split('T')[0]}.csv`
        break
    }

    // Prepend BOM for Excel compatibility and ensure UTF-8
    const bom = '\uFEFF'
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  private static generateSalesCSV(data: SalesReportData[]): string {
    const esc = (v: any) => {
      const s = String(v ?? '')
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
    }
    const headers = [
      'Invoice Number', 'Date', 'Customer', 'Phone', 'Total Amount',
      'Received Amount', 'Balance', 'Payment Type', 'Status', 'Payment Status'
    ]

    const rows = data.map(row => [
      esc(row.invoiceNumber),
      esc(row.invoiceDate),
      esc(row.customerName),
      esc(row.customerPhone),
      esc(row.totalAmount),
      esc(row.receivedAmount),
      esc(row.balance),
      esc(row.paymentType),
      esc(row.status),
      esc(row.paymentStatus)
    ])

    return [headers.map(esc), ...rows].map(row => row.join(',')).join('\n')
  }

  private static generatePartyStatementCSV(data: PartyStatementData[]): string {
    const esc = (v: any) => {
      const s = String(v ?? '')
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
    }
    const headers = ['Party Name', 'Phone', 'Total Sales', 'Total Received', 'Closing Balance']
    const rows = data.map(party => [
      esc(party.partyName),
      esc(party.partyPhone),
      esc(party.totalSales),
      esc(party.totalReceived),
      esc(party.closingBalance)
    ])
    return [headers.map(esc), ...rows].map(r => r.join(',')).join('\n')
  }

  private static generateDaybookCSV(data: DaybookData[]): string {
    const esc = (v: any) => {
      const s = String(v ?? '')
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
    }
    const headers = [
      'Date', 'Time', 'Invoice Number', 'Customer', 'Description',
      'Amount', 'Received', 'Balance', 'Payment Type', 'Status'
    ]

    const rows: string[][] = []

    data.forEach(day => {
      day.entries.forEach(entry => {
        rows.push([
          esc(day.date),
          esc(entry.time),
          esc(entry.invoiceNumber),
          esc(entry.customerName),
          esc(entry.description),
          esc(entry.amount),
          esc(entry.receivedAmount),
          esc(entry.balance),
          esc(entry.paymentType),
          esc(entry.status)
        ])
      })
    })

    return [headers.map(esc), ...rows].map(row => row.join(',')).join('\n')
  }

  private static generatePrintHTML(data: any, reportType: string, filters: ReportFilters, logoSrc?: string): string {
    const today = new Date().toLocaleDateString('en-IN')
    const dateRange = filters.dateFrom && filters.dateTo
      ? `${new Date(filters.dateFrom).toLocaleDateString('en-IN')} to ${new Date(filters.dateTo).toLocaleDateString('en-IN')}`
      : 'All dates'

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportType.replace('_', ' ').toUpperCase()} Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { display: block; margin: 0 auto 8px auto; height: 50px; max-width: 160px; object-fit: contain; }
          .company { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
          .report-title { font-size: 18px; margin-bottom: 10px; }
          .date-range { font-size: 14px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .text-right { text-align: right; }
          .summary { margin-top: 20px; background: #f9f9f9; padding: 15px; }
          @media print { body { margin: 0; } }
        </style>
        <script>
          (function() {
            function doPrint() {
              try { window.focus(); } catch (e) {}
              try { window.print(); } catch (e) {}
              try { (window).onafterprint = function(){ try { window.close(); } catch (e) {} }; } catch (e) { setTimeout(function(){ try { window.close(); } catch (e) {} }, 500); }
            }
            window.addEventListener('load', function() {
              var logoEl = document.getElementById('companyLogo');
              var done = false;
              function go(){ if (!done) { done = true; setTimeout(doPrint, 50); } }
              if (logoEl && logoEl.getAttribute('src')) {
                logoEl.addEventListener('load', go);
                logoEl.addEventListener('error', go);
                setTimeout(go, 600);
              } else {
                setTimeout(go, 100);
              }
            });
          })();
        </script>
      </head>
      <body>
        <div class="header">
          <img id="companyLogo" class="logo" alt="Company Logo" src="${logoSrc || ''}" />
          <div class="company">LakVee Softwares</div>
          <div class="company">LakVee Softwares & Solutions</div>
          <div class="report-title">${reportType.replace('_', ' ').toUpperCase()} REPORT</div>
          <div class="date-range">Period: ${dateRange} | Generated: ${today}</div>
        </div>
        ${this.generateReportContent(data, reportType)}
      </body>
      </html>
    `
  }

  private static generateReportContent(data: any, reportType: string): string {
    switch (reportType) {
      case 'sales':
        return this.generateSalesHTML(data)
      case 'party_statement':
        return this.generatePartyStatementHTML(data)
      case 'daybook':
        return this.generateDaybookHTML(data)
      default:
        return '<p>Report content not available</p>'
    }
  }

  private static generateSalesHTML(data: { data: SalesReportData[], summary: ReportSummary }): string {
    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)

    let html = `
      <table>
        <thead>
          <tr>
            <th>Invoice #</th>
            <th>Date</th>
            <th>Customer</th>
            <th>Phone</th>
            <th class="text-right">Amount</th>
            <th class="text-right">Received</th>
            <th class="text-right">Balance</th>
            <th>Payment</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
    `

    data.data.forEach(row => {
      html += `
        <tr>
          <td>${row.invoiceNumber}</td>
          <td>${new Date(row.invoiceDate).toLocaleDateString('en-IN')}</td>
          <td>${row.customerName}</td>
          <td>${row.customerPhone}</td>
          <td class="text-right">${formatCurrency(row.totalAmount)}</td>
          <td class="text-right">${formatCurrency(row.receivedAmount)}</td>
          <td class="text-right">${formatCurrency(row.balance)}</td>
          <td>${row.paymentType}</td>
          <td>${row.status}</td>
        </tr>
      `
    })

    html += `
        </tbody>
      </table>
      <div class="summary">
        <h3>Summary</h3>
        <p><strong>Total Invoices:</strong> ${data.summary.totalInvoices}</p>
        <p><strong>Total Sales:</strong> ${formatCurrency(data.summary.totalSales)}</p>
        <p><strong>Total Received:</strong> ${formatCurrency(data.summary.totalReceived)}</p>
        <p><strong>Total Balance:</strong> ${formatCurrency(data.summary.totalBalance)}</p>
        <p><strong>Paid Invoices:</strong> ${data.summary.paidInvoices}</p>
        <p><strong>Unpaid Invoices:</strong> ${data.summary.unpaidInvoices}</p>
      </div>
    `

    return html
  }

  private static generatePartyStatementHTML(data: PartyStatementData[]): string {
    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)

    let html = '<div>'

    data.forEach(party => {
      html += `
        <div style="page-break-before: auto; margin-bottom: 30px;">
          <h3>${party.partyName} - ${party.partyPhone}</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Invoice #</th>
                <th>Description</th>
                <th class="text-right">Debit</th>
                <th class="text-right">Credit</th>
                <th class="text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
      `

      party.transactions.forEach(txn => {
        html += `
          <tr>
            <td>${new Date(txn.date).toLocaleDateString('en-IN')}</td>
            <td>${txn.invoiceNumber}</td>
            <td>${txn.description}</td>
            <td class="text-right">${txn.debit > 0 ? formatCurrency(txn.debit) : ''}</td>
            <td class="text-right">${txn.credit > 0 ? formatCurrency(txn.credit) : ''}</td>
            <td class="text-right">${formatCurrency(txn.balance)}</td>
          </tr>
        `
      })

      html += `
            </tbody>
          </table>
          <div style="margin-top: 10px; text-align: right;">
            <strong>Closing Balance: ${formatCurrency(party.closingBalance)}</strong>
          </div>
        </div>
      `
    })

    html += '</div>'
    return html
  }

  private static generateDaybookHTML(data: DaybookData[]): string {
    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)

    let html = '<div>'

    data.forEach(day => {
      html += `
        <div style="margin-bottom: 30px;">
          <h3>Date: ${new Date(day.date).toLocaleDateString('en-IN')}</h3>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Description</th>
                <th class="text-right">Amount</th>
                <th class="text-right">Received</th>
                <th class="text-right">Balance</th>
                <th>Payment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
      `

      day.entries.forEach(entry => {
        html += `
          <tr>
            <td>${entry.time}</td>
            <td>${entry.invoiceNumber}</td>
            <td>${entry.customerName}</td>
            <td>${entry.description}</td>
            <td class="text-right">${formatCurrency(entry.amount)}</td>
            <td class="text-right">${formatCurrency(entry.receivedAmount)}</td>
            <td class="text-right">${formatCurrency(entry.balance)}</td>
            <td>${entry.paymentType}</td>
            <td>${entry.status}</td>
          </tr>
        `
      })

      html += `
            </tbody>
          </table>
          <div style="margin-top: 10px; text-align: right; background: #f0f0f0; padding: 10px;">
            <strong>Daily Total: ${formatCurrency(day.totalSales)} | Received: ${formatCurrency(day.totalReceived)} | Balance: ${formatCurrency(day.totalBalance)}</strong>
          </div>
        </div>
      `
    })

    html += '</div>'
    return html
  }
}
