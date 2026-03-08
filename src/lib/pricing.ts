/**
 * Shared pricing calculation module.
 * Pure functions -- no framework dependencies.
 * Used by PricingWidget (client) and bookings.ts (server).
 */

export interface PricingInput {
  nightlyRate: number
  cleaningFee: number
  nights: number
  guestCount: number
  guestThreshold: number | null
  perPersonRate: number | null
  selectedAddOns: {
    id: string
    name: string
    price: number
    pricingUnit: 'per_person' | 'per_booking'
    includedGuests: number | null
    perPersonAbove: number | null
  }[]
}

export interface AddOnLineItem {
  id: string
  name: string
  baseCost: number
  tierCost: number
  totalCost: number
  tierDetail: {
    includedGuests: number
    extraGuests: number
    perPersonRate: number
  } | null
}

export interface PricingBreakdown {
  accommodationSubtotal: number
  perPersonSurcharge: number
  surchargeDetail: { extraGuests: number; ratePerNight: number } | null
  addOnItems: AddOnLineItem[]
  addOnsTotal: number
  cleaningFee: number
  processingFee: number
  total: number
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function calculatePricing(input: PricingInput): PricingBreakdown {
  const {
    nightlyRate,
    cleaningFee,
    nights,
    guestCount,
    guestThreshold,
    perPersonRate,
    selectedAddOns,
  } = input

  // Accommodation
  const accommodationSubtotal = nightlyRate * nights

  // Per-person surcharge
  let perPersonSurcharge = 0
  let surchargeDetail: PricingBreakdown['surchargeDetail'] = null

  if (
    guestThreshold != null &&
    perPersonRate != null &&
    guestCount > guestThreshold
  ) {
    const extraGuests = guestCount - guestThreshold
    perPersonSurcharge = extraGuests * perPersonRate * nights
    surchargeDetail = { extraGuests, ratePerNight: perPersonRate }
  }

  // Add-ons
  const addOnItems: AddOnLineItem[] = selectedAddOns.map((addOn) => {
    // Tiered pricing: includedGuests is set
    if (addOn.includedGuests != null && addOn.perPersonAbove != null) {
      const baseCost = addOn.price
      const extraGuests = Math.max(0, guestCount - addOn.includedGuests)
      const tierCost = extraGuests * addOn.perPersonAbove
      return {
        id: addOn.id,
        name: addOn.name,
        baseCost,
        tierCost,
        totalCost: baseCost + tierCost,
        tierDetail:
          extraGuests > 0
            ? {
                includedGuests: addOn.includedGuests,
                extraGuests,
                perPersonRate: addOn.perPersonAbove,
              }
            : null,
      }
    }

    // Non-tiered: existing per_person / per_booking logic
    const baseCost =
      addOn.pricingUnit === 'per_person'
        ? addOn.price * guestCount
        : addOn.price

    return {
      id: addOn.id,
      name: addOn.name,
      baseCost,
      tierCost: 0,
      totalCost: baseCost,
      tierDetail: null,
    }
  })

  const addOnsTotal = addOnItems.reduce((sum, item) => sum + item.totalCost, 0)

  // Processing fee (Stripe): includes surcharge in base
  const processingFee = round2(
    (accommodationSubtotal + perPersonSurcharge + cleaningFee + addOnsTotal) *
      0.029 +
      0.3
  )

  const total = round2(
    accommodationSubtotal +
      perPersonSurcharge +
      cleaningFee +
      addOnsTotal +
      processingFee
  )

  return {
    accommodationSubtotal,
    perPersonSurcharge,
    surchargeDetail,
    addOnItems,
    addOnsTotal,
    cleaningFee,
    processingFee,
    total,
  }
}
