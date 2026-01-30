export interface Invoice {
  id: string
  invoiceNumber: string
  invoiceDate: string
  customer: {
    id: string
    partyName: string
    phoneNumber: string
  }
  items: InvoiceItem[]
  totalAmount: number
  receivedAmount: number
  balance: number
  paymentInfo: {
    paymentType: string
    status: 'pending' | 'partial' | 'paid' | 'overdue'
  }
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  createdAt?: string
  updatedAt?: string
}

export interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
}
