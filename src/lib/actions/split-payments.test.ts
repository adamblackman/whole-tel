/**
 * Unit tests for split-payments Server Actions.
 *
 * Server Actions cannot be invoked directly in unit tests (they rely on Next.js
 * request context). We mock all external dependencies (Supabase, Stripe, DAL)
 * and call the exported action functions directly to test business logic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks ---
// vi.mock is hoisted to the top of the file by Vitest.
// All factory functions must be self-contained (no outer variable references).

vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/stripe', () => ({
  getStripe: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Import after mocks so we get the mocked versions
import { saveSplits, generatePaymentLink } from './split-payments'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'

const BOOKING_ID = '987fcdeb-51a2-43d7-b654-123456789abc'
const INVITATION_ID = '123e4567-e89b-12d3-a456-426614174000'
const INVITATION_ID_2 = '223e4567-e89b-12d3-a456-426614174001'
const USER_ID = 'aaaabbbb-cccc-dddd-eeee-ffffffffffff'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

/** Builds a fluent Supabase chain that resolves to `response` at `.single()`. */
function buildChain(response: unknown): AnyClient {
  const chain: Record<string, unknown> = {}
  const self = () => chain
  chain.select = self
  chain.eq = self
  chain.single = () => Promise.resolve(response)
  return chain
}

describe('saveSplits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifySession).mockResolvedValue({ id: USER_ID } as Awaited<ReturnType<typeof verifySession>>)
  })

  it('returns error when split sum in cents does not equal booking total', async () => {
    // Booking total = 1000.00; splits sum = 900.00 → mismatch
    const bookingChain = buildChain({
      data: { id: BOOKING_ID, total: 1000.00, status: 'confirmed' },
      error: null,
    })
    vi.mocked(createClient).mockResolvedValue({ from: () => bookingChain } as AnyClient)

    const result = await saveSplits({
      bookingId: BOOKING_ID,
      splits: [
        { invitationId: INVITATION_ID, amount: 500.00 },
        { invitationId: INVITATION_ID_2, amount: 400.00 },
      ],
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('must equal the booking total')
  })

  it('returns error when booking is not found (non-owner or not confirmed)', async () => {
    const bookingChain = buildChain({ data: null, error: { message: 'Not found' } })
    vi.mocked(createClient).mockResolvedValue({ from: () => bookingChain } as AnyClient)

    const result = await saveSplits({
      bookingId: BOOKING_ID,
      splits: [{ invitationId: INVITATION_ID, amount: 500.00 }],
    })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/not found/i)
  })

  it('succeeds when split amounts sum exactly to the booking total', async () => {
    // total = 1000.00, splits = 600.00 + 400.00 = 1000.00
    const bookingChain = buildChain({
      data: { id: BOOKING_ID, total: 1000.00, status: 'confirmed' },
      error: null,
    })
    vi.mocked(createClient).mockResolvedValue({ from: () => bookingChain } as AnyClient)

    const upsertMock = vi.fn().mockReturnValue({ error: null })
    vi.mocked(createAdminClient).mockReturnValue({
      from: () => ({ upsert: upsertMock }),
    } as AnyClient)

    const result = await saveSplits({
      bookingId: BOOKING_ID,
      splits: [
        { invitationId: INVITATION_ID, amount: 600.00 },
        { invitationId: INVITATION_ID_2, amount: 400.00 },
      ],
    })

    expect(result.success).toBe(true)
    expect(upsertMock).toHaveBeenCalled()
  })

  it('handles float imprecision: 0.1 + 0.2 matching 0.3 total succeeds', async () => {
    // 0.1 + 0.2 in IEEE 754 ≠ 0.3 exactly — centsEqual must handle this
    const bookingChain = buildChain({
      data: { id: BOOKING_ID, total: 0.30, status: 'confirmed' },
      error: null,
    })
    vi.mocked(createClient).mockResolvedValue({ from: () => bookingChain } as AnyClient)

    const upsertMock = vi.fn().mockReturnValue({ error: null })
    vi.mocked(createAdminClient).mockReturnValue({
      from: () => ({ upsert: upsertMock }),
    } as AnyClient)

    const result = await saveSplits({
      bookingId: BOOKING_ID,
      splits: [
        { invitationId: INVITATION_ID, amount: 0.10 },
        { invitationId: INVITATION_ID_2, amount: 0.20 },
      ],
    })

    expect(result.success).toBe(true)
  })
})

describe('generatePaymentLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifySession).mockResolvedValue({ id: USER_ID } as Awaited<ReturnType<typeof verifySession>>)
  })

  it('returns error when split is already paid', async () => {
    // Server client for booking lookup
    const bookingChain = buildChain({
      data: {
        id: BOOKING_ID,
        total: 500.00,
        status: 'confirmed',
        properties: { name: 'Villa Paraíso' },
      },
      error: null,
    })
    vi.mocked(createClient).mockResolvedValue({ from: () => bookingChain } as AnyClient)

    // Admin client for split lookup
    const splitChain = buildChain({
      data: {
        id: 'split-id',
        amount: 500.00,
        payment_status: 'paid',
        stripe_payment_link_id: null,
      },
      error: null,
    })
    vi.mocked(createAdminClient).mockReturnValue({
      from: () => splitChain,
    } as AnyClient)

    const result = await generatePaymentLink({
      bookingId: BOOKING_ID,
      invitationId: INVITATION_ID,
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('already been paid')
  })

  it('calls stripe.paymentLinks.create with correct unit_amount in cents', async () => {
    // amount = 250.50 → unit_amount = 25050
    const bookingChain = buildChain({
      data: {
        id: BOOKING_ID,
        total: 250.50,
        status: 'confirmed',
        properties: { name: 'Villa Paraíso' },
      },
      error: null,
    })
    vi.mocked(createClient).mockResolvedValue({ from: () => bookingChain } as AnyClient)

    // Admin client returns split on first call, handles update chain on second
    let adminFromCallCount = 0
    vi.mocked(createAdminClient).mockReturnValue({
      from: () => {
        adminFromCallCount++
        if (adminFromCallCount === 1) {
          return buildChain({
            data: {
              id: 'split-id',
              amount: 250.50,
              payment_status: 'unpaid',
              stripe_payment_link_id: null,
            },
            error: null,
          })
        }
        // Update chain (called after link creation)
        const updateChain: Record<string, unknown> = {}
        const selfFn = () => updateChain
        updateChain.update = selfFn
        updateChain.eq = selfFn
        return updateChain
      },
    } as AnyClient)

    const mockCreate = vi.fn().mockResolvedValue({
      id: 'plink_test_123',
      url: 'https://buy.stripe.com/test_plink_123',
    })
    vi.mocked(getStripe).mockReturnValue({
      paymentLinks: { create: mockCreate, update: vi.fn() },
    } as AnyClient)

    const result = await generatePaymentLink({
      bookingId: BOOKING_ID,
      invitationId: INVITATION_ID,
    })

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: expect.arrayContaining([
          expect.objectContaining({
            price_data: expect.objectContaining({
              unit_amount: 25050,
            }),
          }),
        ]),
      })
    )
    expect(result.success).toBe(true)
    expect(result.url).toBe('https://buy.stripe.com/test_plink_123')
  })
})
