import { Company } from '@/types/company'

export class CompanyStorage {
  private static readonly STORAGE_KEY = 'billing_companies'
  private static readonly ACTIVE_COMPANY_KEY = 'active_company_id'

  static getAll(): Company[] {
    if (typeof window === 'undefined') return []
    
    try {
      const data = localStorage.getItem(this.STORAGE_KEY)
      if (!data) {
        this.initializeSampleData()
        return this.getAll()
      }
      return JSON.parse(data)
    } catch (error) {
      console.error('Error loading companies:', error)
      return []
    }
  }

  static getById(id: string): Company | null {
    const companies = this.getAll()
    return companies.find(company => company.id === id) || null
  }

  static getActive(): Company | null {
    if (typeof window === 'undefined') return null
    
    const activeId = localStorage.getItem(this.ACTIVE_COMPANY_KEY)
    if (activeId) {
      return this.getById(activeId)
    }
    
    // If no active company set, return the first one
    const companies = this.getAll()
    if (companies.length > 0) {
      this.setActive(companies[0].id)
      return companies[0]
    }
    
    return null
  }

  static setActive(companyId: string): boolean {
    if (typeof window === 'undefined') return false
    
    const company = this.getById(companyId)
    if (company) {
      localStorage.setItem(this.ACTIVE_COMPANY_KEY, companyId)
      return true
    }
    return false
  }

  static save(company: Company): Company {
    const companies = this.getAll()
    const now = new Date().toISOString()
    
    if (company.id) {
      // Update existing
      const index = companies.findIndex(c => c.id === company.id)
      if (index !== -1) {
        companies[index] = { ...company, updatedAt: now }
        this.saveAll(companies)
        return companies[index]
      }
    }
    
    // Create new
    const newCompany: Company = {
      ...company,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now
    }
    
    companies.push(newCompany)
    this.saveAll(companies)
    
    // Set as active if it's the first company
    if (companies.length === 1) {
      this.setActive(newCompany.id)
    }
    
    return newCompany
  }

  static delete(id: string): boolean {
    const companies = this.getAll()
    const index = companies.findIndex(company => company.id === id)
    
    if (index !== -1) {
      companies.splice(index, 1)
      this.saveAll(companies)
      
      // If deleted company was active, set another as active
      const activeCompany = this.getActive()
      if (!activeCompany || activeCompany.id === id) {
        if (companies.length > 0) {
          this.setActive(companies[0].id)
        } else {
          localStorage.removeItem(this.ACTIVE_COMPANY_KEY)
        }
      }
      
      return true
    }
    
    return false
  }

  static search(query: string): Company[] {
    const companies = this.getAll()
    if (!query.trim()) return companies
    
    const searchTerm = query.toLowerCase()
    return companies.filter(company =>
      company.businessName.toLowerCase().includes(searchTerm) ||
      company.phoneNumber.includes(searchTerm) ||
      company.emailId.toLowerCase().includes(searchTerm) ||
      company.gstin?.toLowerCase().includes(searchTerm) ||
      company.businessAddress.toLowerCase().includes(searchTerm)
    )
  }

  private static saveAll(companies: Company[]): void {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(companies))
    } catch (error) {
      console.error('Error saving companies:', error)
    }
  }

  private static generateId(): string {
    return 'comp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  private static initializeSampleData(): void {
    const sampleCompanies: Company[] = [
      {
        id: 'comp_1',
        businessName: 'LakVee Softwares',
        phoneNumber: '9340052512',
        gstin: '23AABCU9603R1ZX',
        emailId: 'lakveeofficial@gmail.com',
        businessType: 'service',
        businessCategory: 'logistics',
        state: 'Madhya Pradesh',
        pincode: '486001',
        businessAddress: 'First Floor, Samdartya Gold, Sirmour Chowk, Rewa (M.P)',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'comp_2',
        businessName: 'Express Logistics Pvt Ltd',
        phoneNumber: '9876543210',
        gstin: '27AABCU9603R1ZY',
        emailId: 'info@expresslogistics.com',
        businessType: 'logistics',
        businessCategory: 'courier',
        state: 'Maharashtra',
        pincode: '400001',
        businessAddress: '123 Industrial Area, Sector 15, Mumbai, Maharashtra',
        isActive: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
    
    this.saveAll(sampleCompanies)
    this.setActive('comp_1') // Set first company as active
  }

  static uploadImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('Please select an image file'))
        return
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        reject(new Error('Image size should be less than 5MB'))
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        resolve(result)
      }
      reader.onerror = () => {
        reject(new Error('Failed to read image file'))
      }
      reader.readAsDataURL(file)
    })
  }

  static getSummary() {
    const companies = this.getAll()
    const activeCompany = this.getActive()
    
    return {
      total: companies.length,
      active: companies.filter(c => c.isActive).length,
      inactive: companies.filter(c => !c.isActive).length,
      currentCompany: activeCompany?.businessName || 'No Company Selected'
    }
  }
}
