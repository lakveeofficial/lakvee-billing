import { RateSlab } from '../types/slab'

const SLAB_STORAGE_KEY = 'RateSlabs'

export class SlabStorage {
  static getAll(): RateSlab[] {
    if (typeof window === 'undefined') return []
    const data = localStorage.getItem(SLAB_STORAGE_KEY)
    if (!data) return []
    return JSON.parse(data)
  }

  static saveAll(slabs: RateSlab[]) {
    if (typeof window === 'undefined') return
    localStorage.setItem(SLAB_STORAGE_KEY, JSON.stringify(slabs))
  }

  static addOrUpdate(slab: RateSlab) {
    const slabs = this.getAll()
    const idx = slabs.findIndex(s => s.id === slab.id)
    if (idx >= 0) {
      slabs[idx] = slab
    } else {
      slabs.push(slab)
    }
    this.saveAll(slabs)
  }

  static delete(id: string) {
    const slabs = this.getAll().filter(s => s.id !== id)
    this.saveAll(slabs)
  }

  static getById(id: string): RateSlab | undefined {
    return this.getAll().find(s => s.id === id)
  }

  static filterByType(type: string) {
    return this.getAll().filter(s => s.slabType === type)
  }

  static importFromCSV(rows: any[]): { imported: RateSlab[]; errors: { row: number; error: string }[] } {
    // rows: array of objects from parsed CSV
    const imported: RateSlab[] = []
    const errors: { row: number; error: string }[] = []
    rows.forEach((row, idx) => {
      try {
        const slab: RateSlab = {
          id: row.id || crypto.randomUUID(),
          slabType: row.slabType,
          slabLabel: row.slabLabel,
          fromValue: parseFloat(row.fromValue),
          toValue: parseFloat(row.toValue),
          unitType: row.unitType,
          rate: parseFloat(row.rate),
          effectiveDate: row.effectiveDate,
          status: row.status === 'active' ? 'active' : 'inactive',
          distanceCategory: row.distanceCategory || undefined
        }
        imported.push(slab)
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        errors.push({ row: idx + 1, error: message })
      }
    })
    if (imported.length > 0) {
      const slabs = this.getAll().concat(imported)
      this.saveAll(slabs)
    }
    return { imported, errors }
  }
}
