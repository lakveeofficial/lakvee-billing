export type StatusFilter = 'all' | 'paid' | 'unpaid' | 'partial' | 'overdue'

export interface ReportFilters {
  dateFrom: string
  dateTo: string
  firmId?: string
  userId?: string
  customerId?: string
  reportType: ReportType
  statusFilter?: StatusFilter
}

export type ReportType = 'sales' | 'party_statement' | 'daybook' | 'outstanding' | 'party_summary' | 'gst_summary'

export interface SalesReportData {
  invoiceNumber: string
  invoiceDate: string
  customerName: string
  customerPhone: string
  totalAmount: number
  receivedAmount: number
  balance: number
  paymentType: string
  status: string
  paymentStatus: string
}

export interface PartyStatementData {
  partyName: string
  partyPhone: string
  transactions: PartyTransaction[]
  openingBalance: number
  closingBalance: number
  totalSales: number
  totalReceived: number
}

export interface PartyTransaction {
  date: string
  invoiceNumber: string
  description: string
  debit: number
  credit: number
  balance: number
  type: 'invoice' | 'payment'
}

export interface DaybookData {
  date: string
  entries: DaybookEntry[]
  totalSales: number
  totalReceived: number
  totalBalance: number
}

export interface DaybookEntry {
  time: string
  invoiceNumber: string
  customerName: string
  description: string
  amount: number
  receivedAmount: number
  balance: number
  paymentType: string
  status: string
}

export interface ReportSummary {
  totalInvoices: number
  totalSales: number
  totalReceived: number
  totalBalance: number
  paidInvoices: number
  unpaidInvoices: number
  partialInvoices: number
  dateRange: {
    from: string
    to: string
  }
}

export const REPORT_TYPES: { value: ReportType; label: string; description: string }[] = [
  { 
    value: 'sales', 
    label: 'Sales Report', 
    description: 'Comprehensive sales analysis with invoice details and payment status' 
  },
  { 
    value: 'party_statement', 
    label: 'Party Statement', 
    description: 'Customer-wise transaction history and outstanding balances' 
  },
  { 
    value: 'daybook', 
    label: 'Daybook Report', 
    description: 'Daily transaction summary with chronological entries' 
  },
  {
    value: 'outstanding',
    label: 'Outstanding Report',
    description: 'Open invoices with balances by customer'
  },
  {
    value: 'party_summary',
    label: 'Party Summary',
    description: 'Totals by customer (sales, received, balance)'
  },
  {
    value: 'gst_summary',
    label: 'GST Summary',
    description: 'Taxable amount and GST collected summary'
  }
]

// Additional optional data shapes for new reports
export interface OutstandingRow {
  invoiceNumber: string
  invoiceDate: string
  customerName: string
  totalAmount: number
  receivedAmount: number
  balance: number
}

export interface PartySummaryRow {
  partyName: string
  totalSales: number
  totalReceived: number
  totalBalance: number
}

export interface GstSummaryRow {
  date: string
  invoiceNumber: string
  taxableAmount: number
  taxAmount: number
}
