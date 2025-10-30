import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: '2024-06-20' })

type Tier = 'standard' | 'urgent'
const PRICING: Record<string, Record<Tier, number>> = {
  USD: { standard: 500, urgent: 1500 },
  EUR: { standard: 500, urgent: 1500 },
  EGP: { standard: 1500, urgent: 4500 },
  SAR: { standard: 2000, urgent: 6000 },
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method Not Allowed' }) }
  try {
    const origin = (req.headers.origin as string) || process.env.PUBLIC_BASE_URL || ''
    const { title, description, country, city, tier = 'standard', currency = 'USD', clientEmail } = req.body || {}
    if (!clientEmail) return res.status(400).json({ error: 'Missing clientEmail' })
    if (!PRICING[currency] || !PRICING[currency][tier]) return res.status(400).json({ error: 'Unsupported currency or tier' })

    const amount = PRICING[currency][tier]
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: clientEmail,
      line_items: [{
        price_data: {
          currency,
          product_data: { name: tier === 'urgent' ? 'i2U Posting Fee (Urgent)' : 'i2U Posting Fee' },
          unit_amount: amount
        },
        quantity: 1
      }],
      metadata: { title, description, country, city, tier, currency, clientEmail },
      success_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?cancelled=1`
    })
    return res.status(200).json({ id: session.id, url: session.url })
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ error: err.message || 'Internal Server Error' })
  }
}
