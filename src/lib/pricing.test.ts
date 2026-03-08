import { describe, it, expect } from 'vitest'
import { calculatePricing, type PricingInput } from './pricing'

function makeInput(overrides: Partial<PricingInput> = {}): PricingInput {
  return {
    nightlyRate: 500,
    cleaningFee: 200,
    nights: 3,
    guestCount: 8,
    guestThreshold: null,
    perPersonRate: null,
    selectedAddOns: [],
    ...overrides,
  }
}

describe('calculatePricing', () => {
  it('calculates basic pricing with no surcharge and no add-ons', () => {
    const result = calculatePricing(makeInput())
    expect(result.accommodationSubtotal).toBe(1500) // 500 * 3
    expect(result.perPersonSurcharge).toBe(0)
    expect(result.surchargeDetail).toBeNull()
    expect(result.addOnsTotal).toBe(0)
    expect(result.cleaningFee).toBe(200)
    // processingFee = (1500 + 0 + 200 + 0) * 0.029 + 0.30 = 49.30 + 0.30 = 49.60
    expect(result.processingFee).toBe(49.6)
    expect(result.total).toBe(1500 + 0 + 200 + 0 + 49.6)
  })

  it('calculates per-person surcharge when guests exceed threshold', () => {
    const result = calculatePricing(
      makeInput({ guestThreshold: 6, perPersonRate: 50 })
    )
    // surcharge = (8 - 6) * 50 * 3 = 300
    expect(result.perPersonSurcharge).toBe(300)
    expect(result.surchargeDetail).toEqual({
      extraGuests: 2,
      ratePerNight: 50,
    })
  })

  it('returns zero surcharge when guests are at or below threshold', () => {
    const result = calculatePricing(
      makeInput({ guestCount: 6, guestThreshold: 6, perPersonRate: 50 })
    )
    expect(result.perPersonSurcharge).toBe(0)
    expect(result.surchargeDetail).toBeNull()
  })

  it('returns zero surcharge when threshold/rate are null', () => {
    const result = calculatePricing(
      makeInput({ guestThreshold: null, perPersonRate: null })
    )
    expect(result.perPersonSurcharge).toBe(0)
    expect(result.surchargeDetail).toBeNull()
  })

  it('calculates tiered add-on when guests exceed included_guests', () => {
    const result = calculatePricing(
      makeInput({
        guestCount: 12,
        selectedAddOns: [
          {
            id: '1',
            name: 'Chef Dinner',
            price: 500,
            pricingUnit: 'per_booking',
            includedGuests: 8,
            perPersonAbove: 75,
          },
        ],
      })
    )
    // baseCost = 500, tierCost = (12 - 8) * 75 = 300, totalCost = 800
    expect(result.addOnItems[0].baseCost).toBe(500)
    expect(result.addOnItems[0].tierCost).toBe(300)
    expect(result.addOnItems[0].totalCost).toBe(800)
    expect(result.addOnItems[0].tierDetail).toEqual({
      includedGuests: 8,
      extraGuests: 4,
      perPersonRate: 75,
    })
    expect(result.addOnsTotal).toBe(800)
  })

  it('calculates tiered add-on with guests within included_guests (base only)', () => {
    const result = calculatePricing(
      makeInput({
        guestCount: 6,
        selectedAddOns: [
          {
            id: '1',
            name: 'Chef Dinner',
            price: 500,
            pricingUnit: 'per_booking',
            includedGuests: 8,
            perPersonAbove: 75,
          },
        ],
      })
    )
    expect(result.addOnItems[0].baseCost).toBe(500)
    expect(result.addOnItems[0].tierCost).toBe(0)
    expect(result.addOnItems[0].totalCost).toBe(500)
    expect(result.addOnItems[0].tierDetail).toBeNull()
  })

  it('calculates non-tiered per_person add-on (backward compatible)', () => {
    const result = calculatePricing(
      makeInput({
        guestCount: 8,
        selectedAddOns: [
          {
            id: '2',
            name: 'Surf Lessons',
            price: 100,
            pricingUnit: 'per_person',
            includedGuests: null,
            perPersonAbove: null,
          },
        ],
      })
    )
    // per_person: 100 * 8 = 800
    expect(result.addOnItems[0].baseCost).toBe(800)
    expect(result.addOnItems[0].tierCost).toBe(0)
    expect(result.addOnItems[0].totalCost).toBe(800)
    expect(result.addOnItems[0].tierDetail).toBeNull()
  })

  it('calculates non-tiered per_booking add-on (backward compatible)', () => {
    const result = calculatePricing(
      makeInput({
        selectedAddOns: [
          {
            id: '3',
            name: 'Airport Transfer',
            price: 250,
            pricingUnit: 'per_booking',
            includedGuests: null,
            perPersonAbove: null,
          },
        ],
      })
    )
    expect(result.addOnItems[0].baseCost).toBe(250)
    expect(result.addOnItems[0].tierCost).toBe(0)
    expect(result.addOnItems[0].totalCost).toBe(250)
    expect(result.addOnItems[0].tierDetail).toBeNull()
  })

  it('includes surcharge in processing fee base', () => {
    const result = calculatePricing(
      makeInput({ guestThreshold: 6, perPersonRate: 50 })
    )
    // surcharge = 300
    // processingFee = (1500 + 300 + 200 + 0) * 0.029 + 0.30 = 58.0 + 0.30 = 58.30
    expect(result.processingFee).toBe(58.3)
    // total = 1500 + 300 + 200 + 0 + 58.30 = 2058.30
    expect(result.total).toBe(2058.3)
  })
})
