import { Invoice, InvoiceItem, InvoiceStatus, PaymentStatus } from '@/types/invoice'
import { PartyStorage } from './storage'

// Mock data storage using localStorage for demo purposes
// In production, this would be replaced with actual API calls

export class InvoiceStorage {
  private static STORAGE_KEY = 'billing_portal_invoices'
  private static COUNTER_KEY = 'billing_portal_invoice_counter'

  static getAll(): Invoice[] {
    if (typeof window === 'undefined') return []
    
    const stored = localStorage.getItem(this.STORAGE_KEY)
    if (!stored) {
      // Initialize with sample data
      const sampleInvoices = this.getSampleInvoices()
      this.saveAll(sampleInvoices)
      return sampleInvoices
    }
    return JSON.parse(stored)
  }

  static getById(id: string): Invoice | null {
    const invoices = this.getAll()
    return invoices.find(invoice => invoice.id === id) || null
  }

  static save(invoice: Invoice): void {
    const invoices = this.getAll()
    const existingIndex = invoices.findIndex(i => i.id === invoice.id)
    
    if (existingIndex >= 0) {
      invoices[existingIndex] = { ...invoice, updatedAt: new Date().toISOString() }
    } else {
      const newInvoice = {
        ...invoice,
        id: this.generateId(),
        invoiceNumber: this.generateInvoiceNumber(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      invoices.push(newInvoice)
    }
    
    this.saveAll(invoices)
  }

  static delete(id: string): void {
    const invoices = this.getAll().filter(invoice => invoice.id !== id)
    this.saveAll(invoices)
  }

  static search(query: string): Invoice[] {
    const invoices = this.getAll()
    if (!query.trim()) return invoices

    const searchTerm = query.toLowerCase()
    return invoices.filter(invoice =>
      invoice.invoiceNumber.toLowerCase().includes(searchTerm) ||
      invoice.customer.partyName.toLowerCase().includes(searchTerm) ||
      invoice.customer.phoneNumber.includes(searchTerm) ||
      invoice.stateOfSupply.toLowerCase().includes(searchTerm)
    )
  }

  static getByDateRange(from: string, to: string): Invoice[] {
    const invoices = this.getAll()
    const fromDate = new Date(from)
    const toDate = new Date(to)
    
    return invoices.filter(invoice => {
      const invoiceDate = new Date(invoice.invoiceDate)
      return invoiceDate >= fromDate && invoiceDate <= toDate
    })
  }

  static getByCustomer(customerId: string): Invoice[] {
    const invoices = this.getAll()
    return invoices.filter(invoice => invoice.customer.id === customerId)
  }

  static getSummary() {
    const invoices = this.getAll()
    const totalSales = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
    const totalReceived = invoices.reduce((sum, inv) => sum + inv.receivedAmount, 0)
    const totalBalance = invoices.reduce((sum, inv) => sum + inv.balance, 0)
    
    return {
      totalInvoices: invoices.length,
      totalSales,
      totalReceived,
      totalBalance,
      paidInvoices: invoices.filter(inv => inv.status === 'paid').length,
      unpaidInvoices: invoices.filter(inv => inv.paymentInfo.status === 'unpaid').length,
      overdueInvoices: invoices.filter(inv => inv.status === 'overdue').length
    }
  }

  private static saveAll(invoices: Invoice[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(invoices))
    }
  }

  private static generateId(): string {
    return 'inv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  private static generateInvoiceNumber(): string {
    if (typeof window === 'undefined') return 'INV-001'
    
    const currentCounter = parseInt(localStorage.getItem(this.COUNTER_KEY) || '0')
    const newCounter = currentCounter + 1
    localStorage.setItem(this.COUNTER_KEY, newCounter.toString())
    
    return `INV-${newCounter.toString().padStart(3, '0')}`
  }

  private static getSampleInvoices(): Invoice[] {
    const parties = PartyStorage.getAll()
    if (parties.length === 0) return []

    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const lastWeek = new Date(today)
    lastWeek.setDate(lastWeek.getDate() - 7)

    return [
      {
        id: 'inv_1',
        invoiceNumber: 'INV-001',
        invoiceDate: today.toISOString().split('T')[0],
        customer: parties[0],
        billingAddress: parties[0].billingAddress,
        shippingAddress: parties[0].shippingAddress || parties[0].billingAddress,
        stateOfSupply: parties[0].state,
        items: [
          {
            id: 'item_1',
            itemNumber: 'ITEM-001',
            invoiceDate: today.toISOString().split('T')[0],
            bookingDate: today.toISOString().split('T')[0],
            destination: 'Mumbai to Delhi',
            quantity: 2,
            unit: 1,
            pricePerUnit: 500,
            discount: { percentage: 5, amount: 50 },
            tax: { percentage: 18, amount: 162 },
            totalAmount: 1112
          }
        ],
        additionalCharges: {
          shipping: 100,
          packaging: 50,
          fuelCharges: 75,
          tcs: 25,
          otherCharges: 0
        },
        paymentInfo: {
          paymentType: 'online',
          totalAmount: 1362,
          receivedAmount: 1362,
          balance: 0,
          status: 'paid'
        },
        roundOff: 0,
        totalAmount: 1362,
        receivedAmount: 1362,
        balance: 0,
        status: 'paid',
        attachments: [],
        notes: 'Express delivery required',
        createdAt: today.toISOString(),
        updatedAt: today.toISOString()
      },
      {
        id: 'inv_2',
        invoiceNumber: 'INV-002',
        invoiceDate: yesterday.toISOString().split('T')[0],
        customer: parties[1],
        billingAddress: parties[1].billingAddress,
        shippingAddress: parties[1].shippingAddress || parties[1].billingAddress,
        stateOfSupply: parties[1].state,
        items: [
          {
            id: 'item_2',
            itemNumber: 'ITEM-002',
            invoiceDate: yesterday.toISOString().split('T')[0],
            bookingDate: yesterday.toISOString().split('T')[0],
            destination: 'Delhi to Bangalore',
            quantity: 1,
            unit: 1,
            pricePerUnit: 800,
            discount: { percentage: 0, amount: 0 },
            tax: { percentage: 18, amount: 144 },
            totalAmount: 944
          }
        ],
        additionalCharges: {
          shipping: 150,
          packaging: 30,
          fuelCharges: 100,
          tcs: 20,
          otherCharges: 50
        },
        paymentInfo: {
          paymentType: 'cash',
          totalAmount: 1294,
          receivedAmount: 500,
          balance: 794,
          status: 'partial'
        },
        roundOff: 0,
        totalAmount: 1294,
        receivedAmount: 500,
        balance: 794,
        status: 'sent',
        attachments: [],
        createdAt: yesterday.toISOString(),
        updatedAt: yesterday.toISOString()
      },
      {
        id: 'inv_3',
        invoiceNumber: 'INV-003',
        invoiceDate: lastWeek.toISOString().split('T')[0],
        customer: parties[2] || parties[0],
        billingAddress: (parties[2] || parties[0]).billingAddress,
        shippingAddress: (parties[2] || parties[0]).shippingAddress || (parties[2] || parties[0]).billingAddress,
        stateOfSupply: (parties[2] || parties[0]).state,
        items: [
          {
            id: 'item_3',
            itemNumber: 'ITEM-003',
            invoiceDate: lastWeek.toISOString().split('T')[0],
            bookingDate: lastWeek.toISOString().split('T')[0],
            destination: 'Bangalore to Chennai',
            quantity: 3,
            unit: 2,
            pricePerUnit: 300,
            discount: { percentage: 10, amount: 180 },
            tax: { percentage: 18, amount: 280.8 },
            totalAmount: 1900.8
          }
        ],
        additionalCharges: {
          shipping: 200,
          packaging: 75,
          fuelCharges: 125,
          tcs: 40,
          otherCharges: 25
        },
        paymentInfo: {
          paymentType: 'cheque',
          totalAmount: 2365.8,
          receivedAmount: 0,
          balance: 2365.8,
          status: 'unpaid'
        },
        roundOff: -0.8,
        totalAmount: 2365,
        receivedAmount: 0,
        balance: 2365,
        status: 'overdue',
        attachments: [],
        notes: 'Fragile items - handle with care',
        createdAt: lastWeek.toISOString(),
        updatedAt: lastWeek.toISOString()
      }
    ]
  }
}
