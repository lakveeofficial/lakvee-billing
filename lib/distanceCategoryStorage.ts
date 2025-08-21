import { DistanceCategoryConfig, MetroCityConfig } from '../types/slab'

const DISTANCE_CATEGORY_KEY = 'DistanceCategoryConfig'

export class DistanceCategoryStorage {
  static getConfig(): DistanceCategoryConfig {
    if (typeof window === 'undefined') return { metroCities: [], otherStates: [] }
    const data = localStorage.getItem(DISTANCE_CATEGORY_KEY)
    if (data) return JSON.parse(data)
    // Default config (can be customized by admin)
    return {
      metroCities: [
        { state: 'Delhi', cities: ['Delhi'] },
        { state: 'Maharashtra', cities: ['Mumbai'] },
        { state: 'Karnataka', cities: ['Bengaluru'] },
        { state: 'Tamil Nadu', cities: ['Chennai'] }
      ],
      otherStates: []
    }
  }

  static saveConfig(config: DistanceCategoryConfig) {
    if (typeof window === 'undefined') return
    localStorage.setItem(DISTANCE_CATEGORY_KEY, JSON.stringify(config))
  }

  static addMetroCity(state: string, city: string) {
    const config = this.getConfig()
    let found = config.metroCities.find(m => m.state === state)
    if (!found) {
      config.metroCities.push({ state, cities: [city] })
    } else if (!found.cities.includes(city)) {
      found.cities.push(city)
    }
    this.saveConfig(config)
  }

  static removeMetroCity(state: string, city: string) {
    const config = this.getConfig()
    let found = config.metroCities.find(m => m.state === state)
    if (found) {
      found.cities = found.cities.filter(c => c !== city)
      if (found.cities.length === 0) {
        config.metroCities = config.metroCities.filter(m => m.state !== state)
      }
    }
    this.saveConfig(config)
  }

  static addOtherState(state: string) {
    const config = this.getConfig()
    if (!config.otherStates.includes(state)) {
      config.otherStates.push(state)
    }
    this.saveConfig(config)
  }

  static removeOtherState(state: string) {
    const config = this.getConfig()
    config.otherStates = config.otherStates.filter(s => s !== state)
    this.saveConfig(config)
  }
}
