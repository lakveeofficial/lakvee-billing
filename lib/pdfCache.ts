// Simple in-memory PDF cache to improve performance
class PdfCache {
  private cache = new Map<string, { blob: Blob; timestamp: number }>()
  private readonly maxAge = 5 * 60 * 1000 // 5 minutes
  private readonly maxSize = 50 // Maximum number of cached PDFs

  private generateKey(url: string): string {
    return btoa(url).replace(/[^a-zA-Z0-9]/g, '')
  }

  set(url: string, blob: Blob): void {
    const key = this.generateKey(url)
    
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0]
      this.cache.delete(oldestKey)
    }

    this.cache.set(key, { blob, timestamp: Date.now() })
  }

  get(url: string): Blob | null {
    const key = this.generateKey(url)
    const entry = this.cache.get(key)
    
    if (!entry) return null
    
    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key)
      return null
    }
    
    return entry.blob
  }

  clear(): void {
    this.cache.clear()
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now()
    const entries = Array.from(this.cache.entries())
    for (const [key, entry] of entries) {
      if (now - entry.timestamp > this.maxAge) {
        this.cache.delete(key)
      }
    }
  }
}

// Global cache instance
export const pdfCache = new PdfCache()

// Cleanup expired entries every 2 minutes
if (typeof window !== 'undefined') {
  setInterval(() => pdfCache.cleanup(), 2 * 60 * 1000)
}
