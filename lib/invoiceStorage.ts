import { Invoice } from '@/types/invoice'

// Mock data storage using localStorage for demo purposes
// In production, this would be replaced with actual API calls

export class InvoiceStorage {
  private static STORAGE_KEY = 'billing_portal_invoices'

  static getAll(): Invoice[] {
    if (typeof window === 'undefined') return []
    
    const stored = localStorage.getItem(this.STORAGE_KEY)
    if (!stored) {
      return []
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
      invoices.push({
        ...invoice,
        id: this.generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    }
    
    this.saveAll(invoices)
  }

  static delete(id: string): void {
    const invoices = this.getAll().filter(invoice => invoice.id !== id)
    this.saveAll(invoices)
  }

  private static saveAll(invoices: Invoice[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(invoices))
    }
  }

  private static generateId(): string {
    return 'invoice_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }
}
