import { Party } from '@/types/party'

// Mock data storage using localStorage for demo purposes
// In production, this would be replaced with actual API calls

export class PartyStorage {
  private static STORAGE_KEY = 'billing_portal_parties'

  static getAll(): Party[] {
    if (typeof window === 'undefined') return []
    
    const stored = localStorage.getItem(this.STORAGE_KEY)
    if (!stored) {
      // Initialize with sample data
      const sampleParties = this.getSampleParties()
      this.saveAll(sampleParties)
      return sampleParties
    }
    return JSON.parse(stored)
  }

  static getById(id: string): Party | null {
    const parties = this.getAll()
    return parties.find(party => party.id === id) || null
  }

  static save(party: Party): void {
    const parties = this.getAll()
    const existingIndex = parties.findIndex(p => p.id === party.id)
    
    if (existingIndex >= 0) {
      parties[existingIndex] = { ...party, updatedAt: new Date().toISOString() }
    } else {
      parties.push({
        ...party,
        id: this.generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    }
    
    this.saveAll(parties)
  }

  static delete(id: string): void {
    const parties = this.getAll().filter(party => party.id !== id)
    this.saveAll(parties)
  }

  static search(query: string): Party[] {
    const parties = this.getAll()
    if (!query.trim()) return parties

    const searchTerm = query.toLowerCase()
    return parties.filter(party =>
      party.partyName.toLowerCase().includes(searchTerm) ||
      party.phoneNumber.includes(searchTerm) ||
      party.email?.toLowerCase().includes(searchTerm) ||
      party.gstin?.toLowerCase().includes(searchTerm)
    )
  }

  private static saveAll(parties: Party[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(parties))
    }
  }

  private static generateId(): string {
    return 'party_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  private static getSampleParties(): Party[] {
    return [
      {
        id: 'party_1',
        partyName: 'ABC Logistics Pvt Ltd',
        gstin: '27AABCU9603R1ZX',
        phoneNumber: '+91-9876543210',
        email: 'contact@abclogistics.com',
        billingAddress: {
          street: '123 Industrial Area, Sector 15',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          country: 'India'
        },
        shippingAddress: {
          street: '456 Warehouse Complex, MIDC',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411019',
          country: 'India'
        },
        useShippingAddress: true,
        gstType: 'registered',
        state: 'Maharashtra',
        createdAt: '2025-01-15T10:30:00.000Z',
        updatedAt: '2025-01-15T10:30:00.000Z'
      },
      {
        id: 'party_2',
        partyName: 'XYZ Courier Services',
        gstin: '09AABCU9603R1ZY',
        phoneNumber: '+91-8765432109',
        email: 'info@xyzcourier.com',
        billingAddress: {
          street: '789 Transport Nagar',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
          country: 'India'
        },
        shippingAddress: {
          street: '789 Transport Nagar',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
          country: 'India'
        },
        useShippingAddress: false,
        gstType: 'registered',
        state: 'Delhi',
        createdAt: '2025-01-20T14:15:00.000Z',
        updatedAt: '2025-01-20T14:15:00.000Z'
      },
      {
        id: 'party_3',
        partyName: 'Quick Delivery Co',
        phoneNumber: '+91-7654321098',
        email: 'orders@quickdelivery.com',
        billingAddress: {
          street: '321 Commercial Street',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560001',
          country: 'India'
        },
        shippingAddress: {
          street: '321 Commercial Street',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560001',
          country: 'India'
        },
        useShippingAddress: false,
        gstType: 'unregistered',
        state: 'Karnataka',
        createdAt: '2025-02-01T09:45:00.000Z',
        updatedAt: '2025-02-01T09:45:00.000Z'
      }
    ]
  }
}
